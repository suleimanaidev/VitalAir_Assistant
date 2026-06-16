"""Build season + weather context for route analysis."""

from __future__ import annotations

from tools.iqair_core import aqi_label
from services.seasonal_intelligence import get_season_profile, season_profile_to_dict
from tools.lahore_season import get_lahore_season, is_heatwave, is_smog_season
from tools.weather_core import fetch_lahore_weather


def get_analysis_context() -> dict:
    season = get_lahore_season()
    profile = get_season_profile(season.id)
    try:
        weather = fetch_lahore_weather()
    except Exception:
        weather = {
            "temperature_c": 0.0,
            "humidity": 0,
            "feels_like_c": 0.0,
        }

    temp = float(weather.get("temperature_c") or 0)
    return {
        "season": season.id,
        "season_label": season.label_en,
        "season_label_ur": season.label_ur,
        "season_profile": season_profile_to_dict(profile),
        "temperature_c": temp,
        "humidity": int(weather.get("humidity") or 0),
        "feels_like_c": float(weather.get("feels_like_c") or temp),
        "heatwave": is_heatwave(temp),
    }


def build_context_summary(
    *,
    aqi: int,
    source: str,
    destination: str,
    ctx: dict | None = None,
) -> str:
    ctx = ctx or get_analysis_context()
    label = aqi_label(aqi)
    temp = ctx.get("temperature_c", 0)
    season_label = ctx.get("season_label", "Lahore")
    heat = " · Heatwave" if ctx.get("heatwave") else ""
    route = f"{source} → {destination}" if source and destination else "Lahore"
    return f"AQI {aqi} · {label} · {temp}°C{heat} · {season_label} · {route}"


def strip_wrong_season_phrases(text: str, season_id: str) -> str:
    """Remove smog-season language during garmi/monsoon."""
    if is_smog_season(season_id):
        return text
    lowered = text.lower()
    if "smog season" not in lowered and "smog episode" not in lowered:
        return text
    lines = []
    for line in text.splitlines():
        low = line.lower()
        if "smog season" in low or "smog episode" in low:
            continue
        lines.append(line)
    return "\n".join(lines) if lines else text
