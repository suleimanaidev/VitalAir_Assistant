"""
Per-user patient document RAG — Chroma vector index + keyword fallback.
Used by mock analysis and live CrewAI health agent.
"""

from __future__ import annotations

import re
from contextvars import ContextVar, Token

from db.repositories import _split_document_text

_active_user_id: ContextVar[str | None] = ContextVar("active_user_id", default=None)


def set_active_user_id(user_id: str | None) -> Token:
    return _active_user_id.set(user_id)


def reset_active_user_id(token: Token) -> None:
    _active_user_id.reset(token)


def get_active_user_id() -> str | None:
    return _active_user_id.get()


def _keyword_search(chunks: list[str], query: str, k: int = 3) -> list[str]:
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


def _chroma_patient_search(user_id: str, query: str, k: int = 3) -> list[str]:
    try:
        from rag.chroma_client import chroma_is_available, get_patient_health_store
    except ImportError:
        return []

    if not chroma_is_available():
        return []

    store = get_patient_health_store()
    if store is None:
        return []

    try:
        docs = store.similarity_search(
            query,
            k=k,
            filter={"user_id": user_id},
        )
    except Exception:
        try:
            docs = store.similarity_search(
                query,
                k=k,
                filter={"user_id": {"$eq": user_id}},
            )
        except Exception:
            return []

    return [d.page_content for d in docs if d.page_content.strip()]


def index_user_document(
    user_id: str,
    document_id: str,
    filename: str,
    text_content: str,
) -> bool:
    """Embed patient document chunks into per-user Chroma collection."""
    try:
        from langchain_core.documents import Document
        from rag.chroma_client import chroma_is_available, get_patient_health_store
    except ImportError:
        return False

    if not chroma_is_available():
        return False

    store = get_patient_health_store()
    if store is None:
        return False

    remove_document_from_index(user_id, document_id)

    chunks = _split_document_text(text_content)
    if not chunks:
        return False

    docs = [
        Document(
            page_content=chunk,
            metadata={
                "user_id": user_id,
                "document_id": document_id,
                "filename": filename[:200],
                "chunk_index": i,
            },
        )
        for i, chunk in enumerate(chunks)
    ]
    ids = [f"{user_id}:{document_id}:{i}" for i in range(len(chunks))]

    try:
        store.add_documents(docs, ids=ids)
        return True
    except Exception:
        return False


def remove_document_from_index(user_id: str, document_id: str) -> None:
    try:
        from rag.chroma_client import get_patient_collection
    except ImportError:
        return

    collection = get_patient_collection()
    if collection is None:
        return

    for where in (
        {"user_id": user_id, "document_id": document_id},
        {"$and": [{"user_id": {"$eq": user_id}}, {"document_id": {"$eq": document_id}}]},
    ):
        try:
            collection.delete(where=where)
            return
        except Exception:
            continue


def remove_all_user_documents_from_index(user_id: str) -> None:
    try:
        from rag.chroma_client import get_patient_collection
    except ImportError:
        return

    collection = get_patient_collection()
    if collection is None:
        return

    for where in ({"user_id": user_id}, {"user_id": {"$eq": user_id}}):
        try:
            collection.delete(where=where)
            return
        except Exception:
            continue


async def sync_user_patient_index_from_mongo(user_id: str) -> int:
    """
    Rebuild Chroma index for a user from MongoDB (idempotent).
    Returns number of documents indexed.
    """
    from db.connection import get_db
    from bson import ObjectId

    if not ObjectId.is_valid(user_id):
        return 0

    db = get_db()
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
    return indexed


def retrieve_patient_health_context(
    user_id: str | None,
    query: str,
    k: int = 3,
    *,
    keyword_chunks: list[str] | None = None,
) -> str:
    """Vector search on patient uploads; falls back to keyword chunks from Mongo."""
    if user_id:
        vector_hits = _chroma_patient_search(user_id, query, k=k)
        if vector_hits:
            return "\n\n".join(vector_hits)

    if keyword_chunks:
        keyword_hits = _keyword_search(keyword_chunks, query, k=k)
        if keyword_hits:
            return "\n\n".join(keyword_hits)

    return ""


def retrieve_patient_health_for_active_user(query: str, k: int = 3) -> str:
    """CrewAI tool entry — uses request-scoped user id."""
    user_id = get_active_user_id()
    if not user_id:
        return "No patient health records available for this session."
    text = retrieve_patient_health_context(user_id, query, k=k)
    if text:
        return f"Patient Health Records:\n{text}"
    return "No matching content in this patient's uploaded health documents."
