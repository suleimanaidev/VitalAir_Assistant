"""Personal Exposure Score (PES) — composite 0–100 risk metric for VitalAir."""

from __future__ import annotations

import re

from schemas.models import PersonalExposureScore, PesBreakdown
from services.seasonal_intelligence import lahore_now
from tools.waqi_core import aqi_label

W1_AQI = 0.40
W2_DISTANCE = 0.25
W3_COMMUTE = 0.20
W4_HEALTH = 0.15

MAX_AQI = 300.0
MAX_DISTANCE_KM = 50.0

COMMUTE_FACTORS: dict[str, float] = {
    "bike": 1.0,
    "walk": 0.95,
    "public_transport": 0.75,
    "car": 0.6,
    "indoor": 0.1,
}

COMMUTE_LABELS: dict[str, str] = {
    "bike": "Bike / motorcycle — high exposure",
    "walk": "Walking — high exposure",
    "public_transport": "Public transport — moderate exposure",
    "car": "Car — enclosed, moderate exposure",
    "indoor": "Indoor — minimal exposure",
}

CONDITION_SCORES: dict[str, float] = {
    "asthma": 1.0,
    "heart disease": 0.9,
    "diabetes": 0.7,
}

SENSITIVITY_MULT: dict[str, float] = {
    "high": 1.0,
    "medium": 0.75,
    "low": 0.5,
}

LEVEL_META: dict[str, dict[str, str]] = {
    "low": {"label": "Low exposure", "emoji": "🟢"},
    "moderate": {"label": "Moderate exposure", "emoji": "🟡"},
    "high": {"label": "Elevated exposure", "emoji": "🟠"},
    "critical": {"label": "High risk", "emoji": "🔴"},
}


def _adjust_score_for_aqi(score: int, aqi: int) -> int:
    """Good/moderate air should not feel like a pollution emergency."""
    if aqi <= 50:
        return max(0, score - 18)
    if aqi <= 100:
        return max(0, score - 14)
    if aqi <= 150:
        return max(0, score - 6)
    return score


def parse_distance_km(distance: str | None) -> float:
    if not distance:
        return 10.0
    m = re.search(r"([\d.]+)\s*km", distance.lower())
    if m:
        return float(m.group(1))
    m = re.search(r"([\d.]+)\s*m\b", distance.lower())
    if m:
        return max(0.5, float(m.group(1)) / 1000.0)
    return 10.0


def _health_factor(conditions: list[str], sensitivity: str) -> tuple[float, list[str]]:
    flags: list[str] = []
    base = 0.3
    for cond in conditions:
        key = cond.strip().lower()
        if key in ("none", ""):
            continue
        score = CONDITION_SCORES.get(key, 0.5)
        base = max(base, score)
        flags.append(f"{cond.title()} detected")

    if not flags:
        flags.append("No chronic conditions listed")

    mult = SENSITIVITY_MULT.get(sensitivity, 0.75)
    if sensitivity == "high":
        flags.append("High pollution sensitivity")
    elif sensitivity == "medium":
        flags.append("Medium pollution sensitivity")

    return min(1.0, base * mult), flags


def _risk_level(score: int, aqi: int) -> str:
    score = _adjust_score_for_aqi(score, aqi)
    if score >= 80:
        return "critical" if aqi >= 150 else "high"
    if score >= 60:
        return "high" if aqi >= 120 else "moderate"
    if score >= 40:
        return "moderate"
    return "low"


def _recommendation(score: int, aqi: int, commute_mode: str, flags: list[str]) -> str:
    has_asthma = any("asthma" in f.lower() for f in flags)
    has_heart = any("heart" in f.lower() for f in flags)
    hour = lahore_now().hour
    evening_ok = hour >= 18

    if aqi <= 100:
        if aqi <= 50:
            air_note = "Air quality is good today."
        else:
            air_note = "Air quality is acceptable (moderate)."

        if commute_mode in ("walk", "bike"):
            if has_asthma or has_heart:
                return (
                    f"{air_note} Stay hydrated on your commute; keep rescue inhaler or "
                    "meds handy as a routine precaution."
                )
            return (
                f"{air_note} Normal commute precautions — drink water and avoid "
                "unnecessary exertion in traffic."
            )

        if has_asthma or has_heart:
            return f"{air_note} Your profile needs routine care — no extra mask needed unless AQI rises."
        return f"{air_note} Usual precautions are enough for most people."

    if score >= 80 or aqi >= 250:
        return "Avoid travel if possible. Stay indoors with windows closed and use HEPA filtration."
    if score >= 60 or aqi >= 150:
        if has_asthma:
            if evening_ok and aqi < 200:
                return (
                    "Evening travel is acceptable — use N95 mask and keep rescue inhaler accessible."
                )
            return "Reschedule travel or use N95 mask. Keep rescue inhaler accessible."
        if has_heart and evening_ok and aqi < 180:
            return (
                "Evening window is open — travel with AC on recirculate; avoid exertion at stops."
            )
        if evening_ok and aqi < 180:
            return (
                "Evening is a better window — use N95 mask and pick the lowest-AQI route shown."
            )
        return "Reschedule non-essential travel or use N95 mask for the entire route."
    if score >= 40:
        if commute_mode in ("walk", "bike"):
            if evening_ok:
                return (
                    "Evening commute is safer — still wear a fitted N95 on walk/bike routes."
                )
            return "Consider switching to car or rescheduling to early morning when AQI is lower."
        if evening_ok:
            return (
                "Exposure is moderate — evening travel is fine; choose the lowest-AQI corridor."
            )
        return "Limit outdoor exertion; choose the lowest-AQI corridor from route suggestions."
    if evening_ok:
        return "Exposure is manageable this evening — still monitor AQI before long outdoor activity."
    return "Exposure is manageable today — still monitor AQI before long outdoor activity."


def compute_personal_exposure_score(
    *,
    aqi: int,
    distance: str | None = None,
    distance_km: float | None = None,
    commute_mode: str = "car",
    conditions: list[str] | None = None,
    sensitivity: str = "medium",
) -> PersonalExposureScore:
    conditions = conditions or []
    km = distance_km if distance_km is not None else parse_distance_km(distance)

    aqi_norm = min(aqi / MAX_AQI, 1.0)
    dist_norm = min(km / MAX_DISTANCE_KM, 1.0)
    commute_key = commute_mode if commute_mode in COMMUTE_FACTORS else "car"
    commute_factor = COMMUTE_FACTORS[commute_key]
    health_factor, health_flags = _health_factor(conditions, sensitivity)

    aqi_comp = W1_AQI * aqi_norm
    dist_comp = W2_DISTANCE * dist_norm
    commute_comp = W3_COMMUTE * commute_factor
    health_comp = W4_HEALTH * health_factor

    raw = aqi_comp + dist_comp + commute_comp + health_comp
    score = round(min(100, max(0, raw * 100)))

    level = _risk_level(score, aqi)
    meta = LEVEL_META[level]
    label = aqi_label(aqi)

    return PersonalExposureScore(
        score=score,
        level=level,
        level_label=meta["label"],
        emoji=meta["emoji"],
        aqi=aqi,
        aqi_label=label,
        commute_mode=commute_key,
        commute_label=COMMUTE_LABELS.get(commute_key, commute_key),
        commute_factor=round(commute_factor, 2),
        health_flags=health_flags,
        health_factor=round(health_factor, 2),
        distance_km=round(km, 1),
        distance_label=f"{km:.1f} km",
        recommendation=_recommendation(score, aqi, commute_key, health_flags),
        breakdown=PesBreakdown(
            aqi_component=round(aqi_comp * 100, 1),
            distance_component=round(dist_comp * 100, 1),
            commute_component=round(commute_comp * 100, 1),
            health_component=round(health_comp * 100, 1),
        ),
    )
