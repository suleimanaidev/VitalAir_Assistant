"""
Per-user patient document RAG — FAISS semantic search + keyword fallback.
Used by mock analysis and live CrewAI health agent.
"""

from __future__ import annotations

import logging
import re
import time
from contextvars import ContextVar, Token

from rag.chunking import split_text

logger = logging.getLogger(__name__)

_active_user_id: ContextVar[str | None] = ContextVar("active_user_id", default=None)
_active_keyword_chunks: ContextVar[list[str] | None] = ContextVar(
    "active_keyword_chunks", default=None
)

_sync_cache: dict[str, float] = {}
_SYNC_TTL_SEC = 300.0


def set_active_keyword_chunks(chunks: list[str] | None) -> Token:
    return _active_keyword_chunks.set(chunks)


def reset_active_keyword_chunks(token: Token) -> None:
    _active_keyword_chunks.reset(token)


def get_active_keyword_chunks() -> list[str] | None:
    return _active_keyword_chunks.get()


def set_active_user_id(user_id: str | None) -> Token:
    return _active_user_id.set(user_id)


def reset_active_user_id(token: Token) -> None:
    _active_user_id.reset(token)


def get_active_user_id() -> str | None:
    return _active_user_id.get()


# Health-relevant terms that should always pull a patient chunk into context.
_HEALTH_HINTS = (
    "diagnos", "prescrib", "medic", "dose", "mg", "tablet", "inhaler",
    "asthma", "copd", "allerg", "bp", "blood pressure", "sugar", "diabet",
    "heart", "cardiac", "lab", "report", "test", "result", "doctor",
    "symptom", "treatment", "condition", "history",
)


def _keyword_search(chunks: list[str], query: str, k: int = 3) -> list[str]:
    if not chunks:
        return []
    words = [w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 2]

    def score(chunk: str) -> int:
        lower = chunk.lower()
        s = sum(1 for w in words if w in lower)
        # Boost chunks that look medically relevant even if query words miss.
        s += sum(1 for hint in _HEALTH_HINTS if hint in lower)
        return s

    ranked = sorted(chunks, key=score, reverse=True)
    top = [c for c in ranked if score(c) > 0][:k]
    # Always return something so uploaded docs reach the agent.
    return top or ranked[:k]


def _faiss_patient_search(user_id: str, query: str, k: int = 3) -> list[str]:
    try:
        from rag.faiss_client import faiss_is_available, search_user_documents
    except ImportError:
        return []

    if not faiss_is_available():
        return []

    hits = search_user_documents(user_id, query, top_k=k)
    logger.debug(
        "FAISS patient search user=%s query=%r hits=%d", user_id, query[:60], len(hits)
    )
    return hits


def index_user_document(
    user_id: str,
    document_id: str,
    filename: str,
    text_content: str,
) -> bool:
    """Chunk, embed, and index patient document into per-user FAISS index."""
    try:
        from rag.faiss_client import faiss_is_available, index_user_document_chunks
    except ImportError:
        return False

    if not faiss_is_available():
        return False

    count = index_user_document_chunks(user_id, document_id, filename, text_content)
    if count > 0:
        logger.info(
            "Indexed document %s for user %s (%d chunks)", document_id, user_id, count
        )
        return True
    return False


def remove_document_from_index(user_id: str, document_id: str) -> None:
    try:
        from rag.faiss_client import remove_user_document_from_index
    except ImportError:
        return
    remove_user_document_from_index(user_id, document_id)


def remove_all_user_documents_from_index(user_id: str) -> None:
    try:
        from rag.faiss_client import remove_all_user_documents_from_index
    except ImportError:
        return
    remove_all_user_documents_from_index(user_id)


async def sync_user_patient_index_from_mongo(
    user_id: str, *, force: bool = False
) -> int:
    """
    Rebuild FAISS index for a user from MongoDB (idempotent).
    Cached 5 min per user unless force=True.
    Returns number of documents indexed.
    """
    now = time.monotonic()
    if not force and user_id in _sync_cache:
        if now - _sync_cache[user_id] < _SYNC_TTL_SEC:
            return 0

    from db.connection import get_db_async
    from bson import ObjectId

    if not ObjectId.is_valid(user_id):
        return 0

    db = await get_db_async()
    cursor = db.user_documents.find({"user_id": ObjectId(user_id)}).sort(
        "created_at", -1
    )

    remove_all_user_documents_from_index(user_id)
    indexed = 0
    async for doc in cursor:
        text = (doc.get("text_content") or "").strip()
        if not text:
            continue
        ok = index_user_document(
            user_id,
            str(doc["_id"]),
            doc.get("filename", "document"),
            text,
        )
        if ok:
            indexed += 1
    _sync_cache[user_id] = time.monotonic()
    logger.info("Synced %d patient documents to FAISS for user %s", indexed, user_id)
    return indexed


def retrieve_patient_health_context(
    user_id: str | None,
    query: str,
    k: int = 3,
    *,
    keyword_chunks: list[str] | None = None,
) -> str:
    """FAISS semantic search on patient uploads; falls back to keyword chunks from Mongo."""
    if user_id:
        vector_hits = _faiss_patient_search(user_id, query, k=k)
        if vector_hits:
            return "\n\n".join(vector_hits)

    if keyword_chunks:
        keyword_hits = _keyword_search(keyword_chunks, query, k=k)
        if keyword_hits:
            return "\n\n".join(keyword_hits)

    return ""


def retrieve_patient_health_for_active_user(query: str, k: int = 3) -> str:
    """CrewAI tool entry — uses request-scoped user id + keyword fallback."""
    user_id = get_active_user_id()
    if not user_id:
        return "No patient health records available for this session."
    text = retrieve_patient_health_context(
        user_id,
        query,
        k=k,
        keyword_chunks=get_active_keyword_chunks(),
    )
    if text:
        return f"Patient Health Records:\n{text}"
    return "No matching content in this patient's uploaded health documents."


def split_document_text(text: str) -> list[str]:
    """Public helper — professional chunking for patient documents."""
    return split_text(text)
