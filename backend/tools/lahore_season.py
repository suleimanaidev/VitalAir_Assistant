"""Lahore season detection — mirrors frontend/lib/lahoreSeason.ts (Innovation 3)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime

from services.seasonal_intelligence import get_season_profile, is_smog_season as _is_smog

HEATWAVE_C = 42


@dataclass(frozen=True)
class LahoreSeason:
    id: str
    label_en: str
    label_ur: str


def get_lahore_season(when: date | datetime | None = None) -> LahoreSeason:
    """
    Pakistan-specific 4-season calendar for Lahore:
    Winter Smog (Oct–Jan), Spring Dust (Feb–Apr),
    Summer Heatwave (May–Jul), Monsoon (Aug–Sep).
    """
    d = when.date() if isinstance(when, datetime) else (when or date.today())
    month = d.month

    if month in (10, 11, 12, 1):
        profile = get_season_profile("winter_smog")
    elif month in (2, 3, 4):
        profile = get_season_profile("spring_dust")
    elif month in (5, 6, 7):
        profile = get_season_profile("summer_heatwave")
    else:
        profile = get_season_profile("monsoon")

    return LahoreSeason(profile.id, profile.label_en, profile.label_ur)


def is_heatwave(temp_c: float) -> bool:
    return temp_c >= HEATWAVE_C


def is_smog_season(season_id: str) -> bool:
    return _is_smog(season_id)
