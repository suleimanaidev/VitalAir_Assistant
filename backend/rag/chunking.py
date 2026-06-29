"""Professional text chunking for RAG indexes."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 50


def split_text(
    text: str,
    *,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    """Split document text into overlapping chunks for embedding."""
    cleaned = (text or "").strip()
    if not cleaned:
        return []

    try:
        try:
            from langchain_text_splitters import RecursiveCharacterTextSplitter
        except ImportError:
            from langchain.text_splitter import RecursiveCharacterTextSplitter

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        chunks = splitter.split_text(cleaned)
        logger.debug("RecursiveCharacterTextSplitter produced %d chunks", len(chunks))
        return [c.strip() for c in chunks if len(c.strip()) > 40]
    except ImportError:
        logger.warning("langchain not installed — using simple character splitter")
        return _simple_split(cleaned, chunk_size=chunk_size, overlap=chunk_overlap)


def _simple_split(text: str, *, chunk_size: int, overlap: int) -> list[str]:
    parts: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        piece = text[start:end].strip()
        if len(piece) > 40:
            parts.append(piece)
        start = end - overlap
    return parts
