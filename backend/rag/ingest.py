"""
Document ingestion for ChromaDB (plan §2.5).
Run ONCE before starting the backend: python rag/ingest.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow running as script from backend/
BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from dotenv import load_dotenv

load_dotenv(BACKEND_ROOT / ".env")

PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_store")
DOCS_ROOT = Path(__file__).resolve().parent / "docs"


def _load_docs(folder: Path, extensions: tuple[str, ...]) -> list:
    from langchain_community.document_loaders import PyPDFLoader, TextLoader

    docs = []
    if not folder.is_dir():
        return docs
    for file in sorted(folder.iterdir()):
        if file.suffix.lower() not in extensions:
            continue
        loader = (
            PyPDFLoader(str(file))
            if file.suffix.lower() == ".pdf"
            else TextLoader(str(file), encoding="utf-8")
        )
        docs.extend(loader.load())
    return docs


def ingest_health_docs() -> None:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_chroma import Chroma
    from langchain_community.embeddings import HuggingFaceEmbeddings

    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

    health_docs = _load_docs(DOCS_ROOT / "health", (".pdf", ".txt"))
    diet_docs = _load_docs(DOCS_ROOT / "diet", (".pdf", ".txt"))

    if not health_docs and not diet_docs:
        print("No documents found in rag/docs/health or rag/docs/diet")
        return

    health_chunks = splitter.split_documents(health_docs) if health_docs else []
    diet_chunks = splitter.split_documents(diet_docs) if diet_docs else []

    os.makedirs(PERSIST_DIR, exist_ok=True)

    if health_chunks:
        Chroma.from_documents(
            health_chunks,
            embeddings,
            collection_name="who_health_docs",
            persist_directory=PERSIST_DIR,
        )

    if diet_chunks:
        Chroma.from_documents(
            diet_chunks,
            embeddings,
            collection_name="diet_docs",
            persist_directory=PERSIST_DIR,
        )

    print(
        f"Ingested {len(health_chunks)} health chunks, "
        f"{len(diet_chunks)} diet chunks → {PERSIST_DIR}"
    )


if __name__ == "__main__":
    ingest_health_docs()
