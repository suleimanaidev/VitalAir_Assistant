"""Live Lahore weather via Open-Meteo (no API key)."""

from __future__ import annotations

import time
from typing import Any

import httpx

LAHORE_LAT = 31.52
LAHORE_LON = 74.36
CACHE_TTL_SEC = 15 * 60

_cache: dict[str, Any] = {"at": 0.0, "data": None}


def fetch_lahore_weather() -> dict[str, Any]:
    now = time.time()
    if _cache["data"] and now - _cache["at"] < CACHE_TTL_SEC:
        return _cache["data"]

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAHORE_LAT,
        "longitude": LAHORE_LON,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature",
        "timezone": "Asia/Karachi",
    }
    with httpx.Client(timeout=12.0) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        current = resp.json().get("current") or {}

    temp = float(current.get("temperature_2m") or 0)
    data = {
        "city": "Lahore",
        "temperature_c": round(temp, 1),
        "humidity": int(current.get("relative_humidity_2m") or 0),
        "feels_like_c": round(float(current.get("apparent_temperature") or temp), 1),
        "fetched_at": current.get("time"),
    }
    _cache["at"] = now
    _cache["data"] = data
    return data
