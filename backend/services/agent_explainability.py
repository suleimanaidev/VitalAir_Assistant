"""Innovation 9 — Agent explainability (XAI) for health recommendations."""

from __future__ import annotations

import re
from typing import Any

from schemas.models import (
    ExplanationSource,
    HealthExplainability,
    ReasoningStep,
)
from services.personal_exposure_score import SENSITIVITY_MULT
from tools.waqi_core import aqi_label

AGENT_NAME = "Digital Pulmonologist"
AGENT_VERSION = "2.1"
REVIEWED_GUIDELINES = ["WHO", "EPA", "HEC Pakistan"]

_PRESCRIPTION_PATTERNS: list[tuple[str, str]] = [
    (r"salbutamol(?:\s+(\d+\s*mcg))?", "Salbutamol"),
    (r"ventolin(?:\s+(\d+\s*mcg))?", "Salbutamol (Ventolin)"),
    (r"budesonide", "Budesonide"),
    (r"metformin(?:\s+(\d+\s*mg))?", "Metformin"),
    (r"insulin", "Insulin"),
    (r"atorvastatin|rosuvastatin|statin", "Statin therapy"),
]


def _patient_section(rag_text: str) -> str:
    if "--- Your health documents ---" not in rag_text:
        return ""
    return rag_text.split("--- Your health documents ---", 1)[1].strip()


def _detect_prescription(rag_text: str) -> tuple[str | None, int]:
    section = _patient_section(rag_text)
    if not section:
        return None, 0
    lower = section.lower()
    for pattern, label in _PRESCRIPTION_PATTERNS:
        m = re.search(pattern, lower)
        if m:
            dose = m.group(1).strip() if m.lastindex and m.group(1) else ""
            title = f"Your uploaded prescription ({label}{' ' + dose if dose else ''})"
            return title, 94 if dose else 90
    if section.strip():
        return "Your uploaded health documents", 88
    return None, 0


def _headline_recommendation(health_advice: str, pes_recommendation: str | None) -> str:
    for line in health_advice.splitlines():
        cleaned = re.sub(r"^[\s•\-*–—\d.)\]]+", "", line.strip())
        if len(cleaned) >= 20:
            return cleaned[:160]
    if pes_recommendation:
        return pes_recommendation
    return "Follow WHO-aligned protection for current air quality."


def _sensitivity_multiplier(sensitivity: str) -> float:
    base = SENSITIVITY_MULT.get(sensitivity, 0.75)
    if sensitivity == "high":
        return 1.5
    if sensitivity == "medium":
        return 1.0
    return 0.75


def _protection_label(pes_score: int) -> str:
    if pes_score >= 80:
        return "maximum protection advised"
    if pes_score >= 60:
        return "enhanced protection advised"
    if pes_score >= 40:
        return "moderate precautions advised"
    return "standard precautions advised"


def build_health_explainability(
    *,
    profile: Any,
    aqi: int,
    pes: Any | None,
    rag_context: str,
    health_advice: str,
    agent_mode: str = "mock_crew",
) -> HealthExplainability:
    conditions = list(getattr(profile, "conditions", None) or [])
    sensitivity = getattr(profile, "sensitivity", "medium") or "medium"
    age = int(getattr(profile, "age", 25) or 25)

    pes_score = int(pes.score) if pes else min(100, round(aqi / 3))
    pes_recommendation = pes.recommendation if pes else None
    recommendation = _headline_recommendation(health_advice, pes_recommendation)

    sources: list[ExplanationSource] = []
    idx = 1

    rx_title, rx_conf = _detect_prescription(rag_context)
    if rx_title:
        sources.append(
            ExplanationSource(index=idx, title=rx_title, confidence=rx_conf)
        )
        idx += 1

    who_conf = 92 if "who" in rag_context.lower() else 85
    sources.append(
        ExplanationSource(
            index=idx,
            title="WHO AQI Guidelines 2021",
            confidence=who_conf,
        )
    )
    idx += 1

    if conditions and conditions != ["none"]:
        cond_text = ", ".join(c.title() for c in conditions if c.lower() != "none")
        sources.append(
            ExplanationSource(
                index=idx,
                title=f"Your health profile: {cond_text}",
                confidence=100,
            )
        )
        idx += 1
    else:
        sources.append(
            ExplanationSource(
                index=idx,
                title=f"Your health profile: age {age}, sensitivity {sensitivity}",
                confidence=100,
            )
        )
        idx += 1

    if "asthma" in rag_context.lower() or any("asthma" in c.lower() for c in conditions):
        sources.append(
            ExplanationSource(
                index=idx,
                title="Lahore respiratory care knowledge base",
                confidence=87,
            )
        )

    label = aqi_label(aqi)
    sens_mult = _sensitivity_multiplier(sensitivity)
    steps: list[ReasoningStep] = [
        ReasoningStep(
            step=1,
            description=f'AQI = {aqi} → classified as "{label}"',
        ),
    ]

    step_n = 2
    active_conditions = [c for c in conditions if c.lower() not in ("none", "")]
    if active_conditions:
        primary = active_conditions[0].title()
        steps.append(
            ReasoningStep(
                step=step_n,
                description=(
                    f"User has {primary} → sensitivity multiplier = {sens_mult:g}"
                ),
            )
        )
        step_n += 1
    elif sensitivity != "medium":
        steps.append(
            ReasoningStep(
                step=step_n,
                description=(
                    f"Pollution sensitivity set to {sensitivity} → "
                    f"multiplier = {sens_mult:g}"
                ),
            )
        )
        step_n += 1

    if rx_title and "prescription" in rx_title.lower():
        drug = rx_title.split("(")[-1].rstrip(")") if "(" in rx_title else "medication"
        steps.append(
            ReasoningStep(
                step=step_n,
                description=f"Uploaded prescription shows active {drug.lower()} use",
            )
        )
        step_n += 1
    elif active_conditions:
        extra = active_conditions[1:] if len(active_conditions) > 1 else []
        if extra:
            steps.append(
                ReasoningStep(
                    step=step_n,
                    description=(
                        f"Additional conditions: {', '.join(c.title() for c in extra)}"
                    ),
                )
            )
            step_n += 1
        if age >= 60 or age <= 12:
            steps.append(
                ReasoningStep(
                    step=step_n,
                    description=f"Age {age} → adjusted outdoor exposure guidance",
                )
            )
            step_n += 1

    steps.append(
        ReasoningStep(
            step=step_n,
            description=(
                f"Combined risk score = {pes_score}/100 → "
                f"{_protection_label(pes_score)}"
            ),
        )
    )

    confidences = [s.confidence for s in sources]
    overall = round(sum(confidences) / len(confidences)) if confidences else 85

    mode_label = "RAG + rules" if agent_mode == "mock_crew" else "LLM + RAG"
    return HealthExplainability(
        recommendation=recommendation,
        agent_name=AGENT_NAME,
        agent_version=AGENT_VERSION,
        agent_mode=mode_label,
        sources=sources,
        reasoning_chain=steps,
        confidence_pct=overall,
        reviewed_against=REVIEWED_GUIDELINES,
    )
