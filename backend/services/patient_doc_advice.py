"""Turn patient RAG context into concrete health advice bullets."""

from __future__ import annotations

import re


def _lines_from_text(text: str, max_items: int = 3) -> list[str]:
    lines = [
        re.sub(r"^[\s•\-*–—\d.)\]]+", "", line.strip())
        for line in text.splitlines()
    ]
    lines = [l for l in lines if 20 < len(l) < 200]
    if lines:
        return lines[:max_items]
    sentences = re.split(r"(?<=[.!?])\s+", text.replace("\n", " "))
    return [s.strip() for s in sentences if 20 < len(s.strip()) < 200][:max_items]

_MEDICATION_RULES: list[tuple[str, str]] = [
    (
        r"salbutamol|ventolin|albuterol",
        "Based on your Salbutamol prescription — keep your rescue inhaler accessible; "
        "avoid outdoor exertion when AQI exceeds 150.",
    ),
    (
        r"budesonide|symbicort|seretide|fluticasone",
        "Your inhaled corticosteroid plan means consistent preventer use matters — "
        "do not skip doses during high-AQI weeks.",
    ),
    (
        r"metformin",
        "Your records mention Metformin — stay well hydrated in heat and "
        "check blood sugar before long outdoor commutes.",
    ),
    (
        r"insulin",
        "Insulin noted in your documents — carry fast-acting glucose and extra water "
        "during travel in heat and pollution.",
    ),
    (
        r"aspirin|clopidogrel|statin|atorvastatin|rosuvastatin",
        "Cardiovascular medications on file — avoid heavy exertion when AQI and heat are both elevated.",
    ),
    (
        r"warfarin|apixaban|rivaroxaban",
        "Anticoagulant therapy in your records — seek urgent care for unusual breathlessness outdoors.",
    ),
]


def _patient_section(rag_text: str) -> str:
    if "--- Your health documents ---" not in rag_text:
        return ""
    return rag_text.split("--- Your health documents ---", 1)[1].strip()


def build_patient_doc_bullets(rag_text: str, *, aqi: int = 100) -> list[str]:
    """Extract prescription-aware bullets from uploaded patient documents."""
    section = _patient_section(rag_text)
    if not section:
        return []

    lower = section.lower()
    bullets: list[str] = []
    seen: set[str] = set()

    for pattern, message in _MEDICATION_RULES:
        if re.search(pattern, lower) and message.lower() not in seen:
            bullets.append(message)
            seen.add(message.lower())

    if aqi >= 150 and re.search(r"asthma|wheez|copd|respiratory", lower):
        bullets.append(
            "Your uploaded respiratory records + current AQI warrant N95 mask "
            "and minimal outdoor time today."
        )

    for line in _lines_from_text(section, max_items=3):
        if len(line) < 25:
            continue
        msg = f"From your health records: {line[:170]}"
        if msg.lower() not in seen:
            bullets.append(msg)
            seen.add(msg.lower())

    if not bullets:
        bullets.append(
            "Advice below is merged with your uploaded health documents — "
            "confirm travel decisions with your doctor."
        )

    return bullets[:4]
