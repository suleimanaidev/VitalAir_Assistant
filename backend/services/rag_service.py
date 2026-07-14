"""
RAG retrieval for health + diet advice.
Uses FAISS semantic search when installed; otherwise keyword search over rag/docs/*.txt.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path

from config import get_settings

logger = logging.getLogger(__name__)

DOCS_ROOT = Path(__file__).resolve().parent.parent / "rag" / "docs"

_FALLBACK_HEALTH = (
    "WHO guidance: Limit outdoor exertion when AQI is unhealthy. "
    "Sensitive groups should use N95 masks and keep rescue medication available."
)

_FALLBACK_DIET = (
    "Vitamin C foods, ginger tea, green tea, omega-3 sources, "
    "and anti-inflammatory spices help during high pollution exposure."
)


def _load_txt_chunks(folder: Path) -> list[str]:
    if not folder.is_dir():
        return []
    chunks: list[str] = []
    for path in sorted(folder.glob("*.txt")):
        try:
            from rag.chunking import split_text

            chunks.extend(split_text(path.read_text(encoding="utf-8")))
        except OSError:
            continue
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


def _faiss_search(collection: str, query: str, k: int = 4) -> list[str] | None:
    try:
        from rag.faiss_client import (
            faiss_is_available,
            search_diet_documents,
            search_health_documents,
        )
    except ImportError:
        return None

    if not faiss_is_available():
        return None

    if collection == "health":
        hits = search_health_documents(query, top_k=k)
    else:
        hits = search_diet_documents(query, top_k=k)
    return hits or None


def retrieve_health_context(
    query: str,
    k: int = 4,
    *,
    user_id: str | None = None,
    user_doc_chunks: list[str] | None = None,
    extra_queries: list[str] | None = None,
) -> str:
    """WHO / health knowledge + patient-uploaded documents (FAISS + keyword)."""
    queries = [query.strip()]
    for eq in extra_queries or []:
        q = eq.strip()
        if q and q not in queries:
            queries.append(q)

    merged: list[str] = []
    seen: set[str] = set()

    for q in queries:
        faiss_hits = _faiss_search("health", q, k=k)
        if faiss_hits:
            hits = faiss_hits
        else:
            chunks = _load_txt_chunks(DOCS_ROOT / "health")
            hits = _keyword_search(chunks, q, k=k)
        for hit in hits:
            key = hit[:120].lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(hit)

    base = "\n\n".join(merged) if merged else _FALLBACK_HEALTH

    if user_id or user_doc_chunks:
        from services.user_patient_rag import retrieve_patient_health_context

        personal = retrieve_patient_health_context(
            user_id,
            query,
            k=min(4, k + 1),
            keyword_chunks=user_doc_chunks,
        )
        if personal:
            return f"{base}\n\n--- Your health documents ---\n{personal}"
    return base


def build_health_rag_query(
    *,
    aqi: int,
    area: str,
    conditions: list[str],
    age: int,
    sensitivity: str,
    commute_mode: str,
    outdoor_time: str,
    season_id: str,
    temp_c: float,
    destination: str | None = None,
) -> str:
    """Rich retrieval query for WHO + condition-specific health RAG."""
    cond = ", ".join(conditions) if conditions else "general population"
    parts = [
        f"WHO air pollution health guidelines AQI {aqi} Lahore {area}",
        f"season {season_id} temperature {temp_c}C",
        f"age {age} conditions {cond} sensitivity {sensitivity}",
        f"commute {commute_mode} outdoor {outdoor_time}",
    ]
    if destination:
        parts.append(f"travel to {destination}")
    return " ".join(parts)


def build_health_rag_extra_queries(conditions: list[str], aqi: int) -> list[str]:
    """Condition-focused follow-up queries to widen RAG recall."""
    extra: list[str] = []
    joined = " ".join(conditions).lower()
    if "asthma" in joined:
        extra.append(f"asthma Lahore smog PM2.5 inhaler rescue medication AQI {aqi}")
    if "heart" in joined or "cardiac" in joined:
        extra.append(f"cardiovascular heart disease air pollution exposure AQI {aqi}")
    if "diabetes" in joined:
        extra.append(f"diabetes air pollution inflammation diet exercise AQI {aqi}")
    if "copd" in joined or "lung" in joined:
        extra.append(f"COPD respiratory Lahore smog N95 mask AQI {aqi}")
    if aqi >= 150:
        extra.append("unhealthy air sensitive groups limit outdoor exertion WHO")
    elif aqi >= 100:
        extra.append("moderate air quality sensitive individuals precautions")
    return extra


def count_rag_chunks(context: str) -> int:
    """Rough count of distinct knowledge chunks in merged RAG context."""
    if not context.strip():
        return 0
    parts = [p.strip() for p in context.split("\n\n") if len(p.strip()) > 40]
    return max(1, len(parts))


def build_diet_rag_query(
    *,
    aqi: int,
    area: str,
    season_id: str,
    temp_c: float,
    conditions: list[str],
    age: int = 25,
    sensitivity: str = "medium",
    commute_mode: str = "car",
) -> str:
    cond = ", ".join(conditions) if conditions else "general"
    return (
        f"anti pollution nutrition diet vitamin C omega-3 Lahore AQI {aqi} "
        f"{area} season {season_id} {temp_c}C conditions {cond} "
        f"age {age} sensitivity {sensitivity} commute {commute_mode}"
    )


def retrieve_diet_context(query: str, k: int = 4, *, extra_queries: list[str] | None = None) -> str:
    """Nutrition knowledge for agent output."""
    queries = [query.strip()]
    for eq in extra_queries or []:
        q = eq.strip()
        if q and q not in queries:
            queries.append(q)

    merged: list[str] = []
    seen: set[str] = set()
    for q in queries:
        faiss_hits = _faiss_search("diet", q, k=k)
        if faiss_hits:
            hits = faiss_hits
        else:
            chunks = _load_txt_chunks(DOCS_ROOT / "diet")
            hits = _keyword_search(chunks, q, k=k)
        for hit in hits:
            key = hit[:120].lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(hit)

    if merged:
        return "\n\n".join(merged)
    return _FALLBACK_DIET


def ensure_rag_index() -> bool:
    """
    Build FAISS indexes from txt docs if packages installed and store is empty.
    Returns True if FAISS global indexes are ready after call.
    """
    try:
        from rag.faiss_client import faiss_is_available, global_indexes_ready
        from rag.ingest import ingest_health_docs
    except ImportError:
        return False

    if not faiss_is_available():
        return False

    if global_indexes_ready():
        return True

    try:
        return ingest_health_docs()
    except Exception as exc:
        logger.exception("FAISS ingest failed: %s", exc)
        return False
