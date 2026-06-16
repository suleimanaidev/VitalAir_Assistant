"""ChromaDB client (plan §2.5)."""

from __future__ import annotations

from config import get_settings

_chroma_available = False
_embeddings = None

try:
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_chroma import Chroma

    _chroma_available = True
except ImportError:
    Chroma = None  # type: ignore
    HuggingFaceEmbeddings = None  # type: ignore


def chroma_is_available() -> bool:
    return _chroma_available


def _get_embeddings():
    global _embeddings
    if _embeddings is None and HuggingFaceEmbeddings is not None:
        _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings


def _persist_dir() -> str:
    return get_settings().chroma_persist_dir


def get_health_retriever(k: int = 4):
    if not _chroma_available or Chroma is None:
        return None
    db = Chroma(
        collection_name="who_health_docs",
        embedding_function=_get_embeddings(),
        persist_directory=_persist_dir(),
    )
    return db.as_retriever(search_kwargs={"k": k})


def get_diet_retriever(k: int = 4):
    if not _chroma_available or Chroma is None:
        return None
    db = Chroma(
        collection_name="diet_docs",
        embedding_function=_get_embeddings(),
        persist_directory=_persist_dir(),
    )
    return db.as_retriever(search_kwargs={"k": k})


PATIENT_COLLECTION = "patient_health_docs"


def get_patient_health_store():
    """Chroma store for per-user uploaded health documents."""
    if not _chroma_available or Chroma is None:
        return None
    return Chroma(
        collection_name=PATIENT_COLLECTION,
        embedding_function=_get_embeddings(),
        persist_directory=_persist_dir(),
    )


def get_patient_collection():
    """Low-level Chroma collection for metadata deletes."""
    if not _chroma_available:
        return None
    store = get_patient_health_store()
    if store is None:
        return None
    return store._collection  # langchain-chroma internal API
