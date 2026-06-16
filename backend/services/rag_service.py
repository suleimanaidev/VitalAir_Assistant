"""
RAG retrieval for health + diet advice.
Uses ChromaDB when installed; otherwise keyword search over rag/docs/*.txt.
"""

from __future__ import annotations

import re
from pathlib import Path

from config import get_settings

DOCS_ROOT = Path(__file__).resolve().parent.parent / "rag" / "docs"

_FALLBACK_HEALTH = (
    "WHO guidance: Limit outdoor exertion when AQI is unhealthy. "
    "Sensitive groups should use N95 masks and keep rescue medication available."
)

_FALLBACK_DIET = (
    "Vitamin C foods, ginger tea, green tea, omega-3 sources, "
    "and anti-inflammatory spices help during high pollution exposure."
)


def _split_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end].strip())
        start = end - overlap
    return [c for c in chunks if len(c) > 40]


def _load_txt_chunks(folder: Path) -> list[str]:
    if not folder.is_dir():
        return []
    chunks: list[str] = []
    for path in sorted(folder.glob("*.txt")):
        try:
            raw = path.read_text(encoding="utf-8")
        except OSError:
            continue
        chunks.extend(_split_text(raw))
    return chunks


def _keyword_search(chunks: list[str], query: str, k: int = 4) -> list[str]:
    if not chunks:
        return []
    words = [w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 2]
    if not words:
        return chunks[:k]

    def score(chunk: str) -> int:
        lower = chunk.lower()
        return sum(1 for w in words if w in lower)

    ranked = sorted(chunks, key=score, reverse=True)
    top = [c for c in ranked if score(c) > 0][:k]
    return top or ranked[:k]


def _chroma_search(collection: str, query: str, k: int = 4) -> list[str] | None:
    try:
        from rag.chroma_client import chroma_is_available, get_diet_retriever, get_health_retriever
    except ImportError:
        return None

    if not chroma_is_available():
        return None

    retriever = (
        get_health_retriever(k=k)
        if collection == "health"
        else get_diet_retriever(k=k)
    )
    if retriever is None:
        return None

    docs = retriever.invoke(query)
    if not docs:
        return None
    return [d.page_content for d in docs]


def retrieve_health_context(
    query: str,
    k: int = 4,
    *,
    user_id: str | None = None,
    user_doc_chunks: list[str] | None = None,
) -> str:
    """WHO / health knowledge + patient-uploaded documents (Chroma + keyword)."""
    chroma_hits = _chroma_search("health", query, k=k)
    if chroma_hits:
        base = "\n\n".join(chroma_hits)
    else:
        chunks = _load_txt_chunks(DOCS_ROOT / "health")
        hits = _keyword_search(chunks, query, k=k)
        base = "\n\n".join(hits) if hits else _FALLBACK_HEALTH

    if user_id or user_doc_chunks:
        from services.user_patient_rag import retrieve_patient_health_context

        personal = retrieve_patient_health_context(
            user_id,
            query,
            k=min(3, k),
            keyword_chunks=user_doc_chunks,
        )
        if personal:
            return f"{base}\n\n--- Your health documents ---\n{personal}"
    return base


def retrieve_diet_context(query: str, k: int = 4) -> str:
    """Nutrition knowledge for agent output."""
    chroma_hits = _chroma_search("diet", query, k=k)
    if chroma_hits:
        return "\n\n".join(chroma_hits)

    chunks = _load_txt_chunks(DOCS_ROOT / "diet")
    hits = _keyword_search(chunks, query, k=k)
    if hits:
        return "\n\n".join(hits)
    return _FALLBACK_DIET


def ensure_rag_index() -> bool:
    """
    Build Chroma index from txt docs if RAG packages installed and store is empty.
    Returns True if Chroma is ready after call.
    """
    try:
        from rag.chroma_client import chroma_is_available
        from rag.ingest import ingest_health_docs
    except ImportError:
        return False

    if not chroma_is_available():
        return False

    persist = Path(get_settings().chroma_persist_dir)
    if not persist.is_absolute():
        persist = Path(__file__).resolve().parent.parent / persist

    if persist.exists() and any(persist.iterdir()):
        return True

    try:
        ingest_health_docs()
        return True
    except Exception:
        return False
