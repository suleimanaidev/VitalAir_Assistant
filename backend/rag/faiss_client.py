"""
FAISS vector store for VitalAir RAG.

- Global indexes: WHO health + diet knowledge bases
- Per-user indexes: uploaded patient documents (IndexFlatL2 + sidecar metadata JSON)
"""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import Any

import numpy as np

from config import get_settings
from rag.chunking import split_text

logger = logging.getLogger(__name__)

EMBED_MODEL = "all-MiniLM-L6-v2"
EMBED_DIM = 384

_faiss_available = False
_encoder = None
_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()

try:
    import faiss  # noqa: F401
    from sentence_transformers import SentenceTransformer  # noqa: F401

    _faiss_available = True
except ImportError:
    faiss = None  # type: ignore


def faiss_is_available() -> bool:
    return _faiss_available


def _index_root() -> Path:
    settings = get_settings()
    root = Path(settings.faiss_index_dir)
    if not root.is_absolute():
        root = Path(__file__).resolve().parent.parent / root
    root.mkdir(parents=True, exist_ok=True)
    (root / "users").mkdir(parents=True, exist_ok=True)
    return root


def _lock_for(key: str) -> threading.Lock:
    with _locks_guard:
        if key not in _locks:
            _locks[key] = threading.Lock()
        return _locks[key]


def get_encoder():
    global _encoder
    if not _faiss_available:
        return None
    if _encoder is None:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading embedding model: %s", EMBED_MODEL)
        _encoder = SentenceTransformer(EMBED_MODEL)
    return _encoder


def embed_texts(texts: list[str]) -> np.ndarray:
    model = get_encoder()
    if model is None:
        raise RuntimeError("FAISS/sentence-transformers not available")
    vectors = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return np.asarray(vectors, dtype=np.float32)


class FaissIndexManager:
    """Manages one FAISS IndexFlatL2 + parallel metadata store."""

    def __init__(self, index_path: Path, meta_path: Path, *, label: str):
        self.index_path = index_path
        self.meta_path = meta_path
        self.label = label
        self.index = None
        self.entries: list[dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if not _faiss_available:
            return
        if self.index_path.exists() and self.meta_path.exists():
            self.index = faiss.read_index(str(self.index_path))
            raw = json.loads(self.meta_path.read_text(encoding="utf-8"))
            self.entries = list(raw.get("entries") or [])
            logger.info(
                "Loaded FAISS index %s (%d vectors)", self.label, self.index.ntotal
            )
        else:
            self.index = faiss.IndexFlatL2(EMBED_DIM)
            self.entries = []

    def save(self) -> None:
        if not _faiss_available or self.index is None:
            return
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(self.index, str(self.index_path))
        self.meta_path.write_text(
            json.dumps({"entries": self.entries}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        logger.debug("Saved FAISS index %s (%d vectors)", self.label, self.index.ntotal)

    def _rebuild(self, entries: list[dict[str, Any]]) -> None:
        self.index = faiss.IndexFlatL2(EMBED_DIM)
        self.entries = []
        if entries:
            texts = [e["text"] for e in entries]
            vectors = embed_texts(texts)
            self.index.add(vectors)
            for i, entry in enumerate(entries):
                rebuilt = dict(entry)
                rebuilt["vector_id"] = i
                self.entries.append(rebuilt)
        self.save()

    def add_chunks(
        self,
        chunks: list[str],
        metadata_list: list[dict[str, Any]],
    ) -> int:
        if not chunks or not _faiss_available or self.index is None:
            return 0
        vectors = embed_texts(chunks)
        start_id = self.index.ntotal
        self.index.add(vectors)
        for i, (text, meta) in enumerate(zip(chunks, metadata_list)):
            self.entries.append(
                {
                    "vector_id": start_id + i,
                    "text": text,
                    **meta,
                }
            )
        self.save()
        logger.info(
            "Indexed %d chunks into %s (total=%d)",
            len(chunks),
            self.label,
            self.index.ntotal,
        )
        return len(chunks)

    def remove_by_document_id(self, document_id: str) -> None:
        kept = [e for e in self.entries if e.get("document_id") != document_id]
        if len(kept) == len(self.entries):
            return
        logger.info(
            "Rebuilding %s after removing document_id=%s", self.label, document_id
        )
        self._rebuild(kept)

    def remove_all(self) -> None:
        logger.info("Clearing FAISS index %s", self.label)
        self._rebuild([])

    def search(self, query: str, top_k: int = 5) -> list[str]:
        if not _faiss_available or self.index is None or self.index.ntotal == 0:
            return []
        qv = embed_texts([query])
        k = min(top_k, self.index.ntotal)
        _distances, indices = self.index.search(qv, k)
        hits: list[str] = []
        for idx in indices[0]:
            if idx < 0 or idx >= len(self.entries):
                continue
            text = (self.entries[idx].get("text") or "").strip()
            if text:
                hits.append(text)
        logger.debug(
            "Semantic search %s query=%r top_k=%d hits=%d",
            self.label,
            query[:80],
            top_k,
            len(hits),
        )
        return hits

    def search_with_metadata(
        self, query: str, top_k: int = 5
    ) -> list[dict[str, Any]]:
        if not _faiss_available or self.index is None or self.index.ntotal == 0:
            return []
        qv = embed_texts([query])
        k = min(top_k, self.index.ntotal)
        _distances, indices = self.index.search(qv, k)
        hits: list[dict[str, Any]] = []
        for idx in indices[0]:
            if idx < 0 or idx >= len(self.entries):
                continue
            hits.append(dict(self.entries[idx]))
        return hits


def _global_manager(name: str) -> FaissIndexManager:
    root = _index_root()
    return FaissIndexManager(
        root / f"global_{name}.index",
        root / f"global_{name}_meta.json",
        label=f"global_{name}",
    )


def _user_manager(user_id: str) -> FaissIndexManager:
    root = _index_root() / "users"
    safe_id = user_id.replace("/", "_")
    return FaissIndexManager(
        root / f"{safe_id}.index",
        root / f"{safe_id}_meta.json",
        label=f"user:{user_id}",
    )


def get_health_index() -> FaissIndexManager:
    return _global_manager("health")


def get_diet_index() -> FaissIndexManager:
    return _global_manager("diet")


def search_health_documents(query: str, top_k: int = 5) -> list[str]:
    with _lock_for("global_health"):
        return get_health_index().search(query, top_k)


def search_diet_documents(query: str, top_k: int = 5) -> list[str]:
    with _lock_for("global_diet"):
        return get_diet_index().search(query, top_k)


def search_user_documents(user_id: str, query: str, top_k: int = 5) -> list[str]:
    """Semantic search over a user's uploaded health documents."""
    if not user_id:
        return []
    with _lock_for(f"user:{user_id}"):
        return _user_manager(user_id).search(query, top_k)


def index_user_document_chunks(
    user_id: str,
    document_id: str,
    filename: str,
    text_content: str,
) -> int:
    if not faiss_is_available():
        return 0
    chunks = split_text(text_content)
    if not chunks:
        return 0
    meta = [
        {
            "user_id": user_id,
            "document_id": document_id,
            "filename": filename[:200],
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]
    with _lock_for(f"user:{user_id}"):
        mgr = _user_manager(user_id)
        mgr.remove_by_document_id(document_id)
        return mgr.add_chunks(chunks, meta)


def remove_user_document_from_index(user_id: str, document_id: str) -> None:
    with _lock_for(f"user:{user_id}"):
        _user_manager(user_id).remove_by_document_id(document_id)


def remove_all_user_documents_from_index(user_id: str) -> None:
    with _lock_for(f"user:{user_id}"):
        _user_manager(user_id).remove_all()


def ingest_global_documents(
    *,
    health_texts: list[tuple[str, dict[str, Any]]] | None = None,
    diet_texts: list[tuple[str, dict[str, Any]]] | None = None,
) -> tuple[int, int]:
    """Ingest pre-chunked global knowledge. Each item is (text, metadata)."""
    health_count = 0
    diet_count = 0
    if health_texts:
        with _lock_for("global_health"):
            mgr = get_health_index()
            mgr.remove_all()
            texts = [t for t, _ in health_texts]
            metas = [m for _, m in health_texts]
            health_count = mgr.add_chunks(texts, metas)
    if diet_texts:
        with _lock_for("global_diet"):
            mgr = get_diet_index()
            mgr.remove_all()
            texts = [t for t, _ in diet_texts]
            metas = [m for _, m in diet_texts]
            diet_count = mgr.add_chunks(texts, metas)
    return health_count, diet_count


def global_indexes_ready() -> bool:
    if not faiss_is_available():
        return False
    health = get_health_index()
    diet = get_diet_index()
    return health.index is not None and health.index.ntotal > 0
