"""
Document ingestion for FAISS RAG indexes.
Run once: python rag/ingest.py
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT / ".env")

from rag.chunking import split_text
from rag.faiss_client import faiss_is_available, ingest_global_documents

logger = logging.getLogger(__name__)
DOCS_ROOT = Path(__file__).resolve().parent / "docs"


def _load_txt_files(folder: Path) -> list[tuple[str, str]]:
    """Return list of (filename, raw_text)."""
    if not folder.is_dir():
        return []
    out: list[tuple[str, str]] = []
    for path in sorted(folder.glob("*.txt")):
        try:
            out.append((path.name, path.read_text(encoding="utf-8")))
        except OSError as exc:
            logger.warning("Could not read %s: %s", path, exc)
    return out


def ingest_health_docs() -> bool:
    if not faiss_is_available():
        print("FAISS/sentence-transformers not installed. pip install -r requirements.txt")
        return False

    health_items: list[tuple[str, dict]] = []
    for filename, raw in _load_txt_files(DOCS_ROOT / "health"):
        for i, chunk in enumerate(split_text(raw)):
            health_items.append(
                (
                    chunk,
                    {"source": filename, "collection": "health", "chunk_index": i},
                )
            )

    diet_items: list[tuple[str, dict]] = []
    for filename, raw in _load_txt_files(DOCS_ROOT / "diet"):
        for i, chunk in enumerate(split_text(raw)):
            diet_items.append(
                (
                    chunk,
                    {"source": filename, "collection": "diet", "chunk_index": i},
                )
            )

    if not health_items and not diet_items:
        print("No documents found in rag/docs/health or rag/docs/diet")
        return False

    h, d = ingest_global_documents(health_texts=health_items, diet_texts=diet_items)
    print(f"Ingested {h} health chunks, {d} diet chunks into FAISS")
    return h > 0 or d > 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ingest_health_docs()
