"""Innovation 7 — 30-day exposure history & behavioral trends."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from tools.waqi_core import aqi_label


def aqi_category(aqi: int) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


def _parse_ts(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _day_key(dt: datetime) -> str:
    return dt.date().isoformat()


def _pes_from_record(rec: dict) -> int | None:
    if rec.get("pes_score") is not None:
        return int(rec["pes_score"])
    pes = rec.get("personal_exposure_score")
    if isinstance(pes, dict) and pes.get("score") is not None:
        return int(pes["score"])
    return None


def _aqi_from_record(rec: dict) -> int:
    return int(rec.get("aqi_at_time") or rec.get("aqi") or 0)


def _safest_route_chosen(rec: dict) -> bool:
    if rec.get("chose_safest_route") is not None:
        return bool(rec["chose_safest_route"])
    rank = rec.get("route_rank_chosen")
    if rank is not None:
        return int(rank) == 1
    return True


def _mask_recommended_for(rec: dict) -> bool:
    if rec.get("mask_recommended") is not None:
        return bool(rec["mask_recommended"])
    pes = _pes_from_record(rec)
    aqi = _aqi_from_record(rec)
    return (pes is not None and pes >= 60) or aqi >= 150


def _mask_compliant(rec: dict) -> bool:
    if rec.get("mask_worn") is not None:
        return bool(rec["mask_worn"])
    if rec.get("advisory_compliant") is not None:
        return bool(rec["advisory_compliant"])
    return _safest_route_chosen(rec)


def _generate_tip(records: list[dict]) -> str:
    if not records:
        return "Run route analyses regularly to unlock personalized corridor tips."

    corridor_counts: dict[str, int] = defaultdict(int)
    for rec in records:
        safe = rec.get("safe_route") or {}
        options = safe.get("route_options") or []
        if options:
            via = options[0].get("via_areas") or []
            if via:
                corridor_counts[", ".join(via[:2])] += 1
        elif safe.get("recommendation"):
            corridor_counts[str(safe["recommendation"])[:80]] += 1

    if corridor_counts:
        best = max(corridor_counts, key=corridor_counts.get)
        return (
            f"Your lowest-AQI corridor lately: {best}. "
            "Sticking to rank-1 route suggestions can lower daily PES."
        )

    last = records[0]
    src, dst = last.get("source"), last.get("destination")
    if src and dst:
        return (
            f"Tip: Re-run {src} → {dst} before morning commute to pick the "
            "lowest-AQI path shown in route suggestions."
        )
    return "Choose rank-1 (lowest AQI) route options to reduce cumulative exposure."


def build_exposure_trends(records: list[dict], *, days: int = 30) -> dict[str, Any]:
    today = date.today()
    start = today - timedelta(days=days - 1)

    by_day: dict[str, list[dict]] = defaultdict(list)
    for rec in records:
        ts = _parse_ts(rec.get("timestamp"))
        if not ts:
            continue
        if ts.date() < start:
            continue
        by_day[_day_key(ts)].append(rec)

    daily_pes: list[dict[str, Any]] = []
    category_days: dict[str, int] = defaultdict(int)
    safest_count = 0
    total_route_decisions = 0
    mask_recommended_days = 0
    mask_compliant_days = 0
    pes_values: list[int] = []
    hazardous_days = 0
    safe_days = 0

    for i in range(days):
        d = start + timedelta(days=i)
        key = d.isoformat()
        day_recs = by_day.get(key, [])

        if day_recs:
            day_pes = [p for p in (_pes_from_record(r) for r in day_recs) if p is not None]
            day_aqi = max(_aqi_from_record(r) for r in day_recs)
            avg_pes = int(sum(day_pes) / len(day_pes)) if day_pes else None

            cat = aqi_category(day_aqi)
            category_days[cat] += 1
            if cat in ("Very Unhealthy", "Hazardous"):
                hazardous_days += 1
            if cat in ("Good", "Moderate"):
                safe_days += 1

            for rec in day_recs:
                total_route_decisions += 1
                if _safest_route_chosen(rec):
                    safest_count += 1
                if _mask_recommended_for(rec):
                    mask_recommended_days += 1
                    if _mask_compliant(rec):
                        mask_compliant_days += 1

            if avg_pes is not None:
                pes_values.append(avg_pes)
        else:
            avg_pes = None
            day_aqi = None

        daily_pes.append(
            {
                "date": key,
                "label": d.strftime("%b %d"),
                "pes": avg_pes,
                "aqi": day_aqi,
            }
        )

    safest_pct = (
        round(100 * safest_count / total_route_decisions)
        if total_route_decisions
        else 0
    )
    other_pct = max(0, 100 - safest_pct)

    avg_pes = round(sum(pes_values) / len(pes_values)) if pes_values else 0

    aqi_category_bars = [
        {"category": cat, "days": count}
        for cat, count in sorted(category_days.items(), key=lambda x: -x[1])
    ]

    return {
        "summary": {
            "average_pes": avg_pes,
            "hazardous_days": hazardous_days,
            "safe_days": safe_days,
            "safest_route_pct": safest_pct,
            "mask_compliance_days": mask_compliant_days,
            "mask_recommended_days": mask_recommended_days,
            "total_analyses": len(records),
            "days_with_data": len([d for d in daily_pes if d["pes"] is not None]),
            "tip": _generate_tip(records),
        },
        "daily_pes": daily_pes,
        "aqi_categories": aqi_category_bars,
        "route_choices": [
            {"name": "Safest route (rank 1)", "value": safest_pct},
            {"name": "Other routes", "value": other_pct},
        ],
    }
