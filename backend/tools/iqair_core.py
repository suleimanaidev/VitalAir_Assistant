from datetime import datetime, timezone

import httpx

from config import get_settings

# Civil Secretariat (Urban Unit) — monitor at Punjab Assembly / govt secretariat area, Lahore
WAQI_FEED_URL = "https://api.waqi.info/feed/A540730/"
WAQI_FEED_FALLBACK = "https://api.waqi.info/feed/A471607/"
PUNJAB_ASSEMBLY_STATION_LABEL = "Punjab Assembly, Lahore"
LAHORE_FALLBACK = {
    "city": "Lahore",
    "aqi": 187,
    "label": "Unhealthy",
    "pm25": 142.0,
    "breakdown": {"pm25": 142, "pm10": 98, "o3": 45},
}

APP_CITY = "Lahore"
LAHORE_COORDS = (31.5204, 74.3587, "Punjab", "Pakistan")


def aqi_label(aqi: int) -> str:
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


def _parse_waqi_forecast(data: dict) -> list[dict]:
    """Last 7 days PM2.5 forecast averages (US EPA AQI scale from WAQI)."""
    daily = (data.get("forecast") or {}).get("daily") or {}
    pm25 = daily.get("pm25") or []
    sorted_items = sorted(pm25, key=lambda x: x.get("day", ""))
    tail = sorted_items[-7:]
    out: list[dict] = []
    for item in tail:
        avg = item.get("avg")
        day = item.get("day")
        if avg is not None and day:
            out.append({"day": str(day), "aqi": int(avg)})
    return out


def _parse_waqi_time(time_block: dict | None) -> datetime | None:
    if not time_block:
        return None
    iso = time_block.get("iso")
    if iso:
        try:
            return datetime.fromisoformat(iso.replace("Z", "+00:00"))
        except ValueError:
            pass
    return None


def _resolve_waqi_aqi(data: dict) -> int:
    """Top-level aqi can be '-' on some Pakistan stations; use iaqi PM2.5 (EPA AQI)."""
    raw = data.get("aqi")
    if raw not in (None, "-", ""):
        try:
            value = int(raw)
            if value > 0:
                return value
        except (TypeError, ValueError):
            pass
    iaqi = data.get("iaqi") or {}
    for key in ("pm25", "pm10"):
        entry = iaqi.get(key)
        if isinstance(entry, dict) and entry.get("v") is not None:
            return int(round(float(entry["v"])))
    return 0


def _waqi_payload(api_key: str, feed_url: str) -> dict | None:
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(feed_url, params={"token": api_key})
        resp.raise_for_status()
        payload = resp.json()
    if payload.get("status") != "ok":
        return None
    data = payload.get("data")
    return data if isinstance(data, dict) else None


def _effective_updated_at(station_time: datetime | None) -> datetime:
    """Use station time only if recent; otherwise mark as fetched now."""
    now = datetime.now(timezone.utc)
    if station_time is None:
        return now
    st = station_time if station_time.tzinfo else station_time.replace(tzinfo=timezone.utc)
    age_hours = (now - st.astimezone(timezone.utc)).total_seconds() / 3600
    if age_hours <= 6:
        return st
    return now


def _fetch_waqi(city: str, api_key: str) -> dict | None:
    """WAQI — Punjab Assembly area (Civil Secretariat), fallback G.O.R. Lahore."""
    city = APP_CITY
    primary = _waqi_payload(api_key, WAQI_FEED_URL)
    data = primary or _waqi_payload(api_key, WAQI_FEED_FALLBACK)
    if not data:
        return None
    aqi = _resolve_waqi_aqi(data)
    if aqi <= 0:
        return None
    iaqi = data.get("iaqi") or {}

    def pollutant(key: str) -> float | None:
        entry = iaqi.get(key)
        if isinstance(entry, dict) and entry.get("v") is not None:
            return float(entry["v"])
        return None

    city_info = data.get("city") or {}
    waqi_name = city_info.get("name") or city
    if primary:
        station_name = PUNJAB_ASSEMBLY_STATION_LABEL
    else:
        station_name = f"{PUNJAB_ASSEMBLY_STATION_LABEL} (nearest: {waqi_name})"
    station_time = _parse_waqi_time(data.get("time"))
    fetched_at = datetime.now(timezone.utc)
    return {
        "city": city,
        "aqi": aqi,
        "label": aqi_label(aqi),
        "pm25": pollutant("pm25") or 0.0,
        "breakdown": {
            "pm25": pollutant("pm25"),
            "pm10": pollutant("pm10"),
            "o3": pollutant("o3"),
            "no2": pollutant("no2"),
            "co": pollutant("co"),
            "so2": pollutant("so2"),
        },
        "source": "waqi",
        "station": station_name,
        "updated_at": _effective_updated_at(station_time),
        "station_reported_at": station_time,
        "fetched_at": fetched_at,
        "forecast": _parse_waqi_forecast(data),
    }


def _fetch_iqair(city: str, api_key: str) -> dict | None:
    """IQAir AirVisual v2 — returns None if key rejected or request fails."""
    lat, lon, state, country = LAHORE_COORDS
    city = APP_CITY
    endpoints = [
        (
            "https://api.airvisual.com/v2/city",
            {"city": city, "state": state, "country": country, "key": api_key},
        ),
        (
            "https://api.airvisual.com/v2/nearest_city",
            {"lat": str(lat), "lon": str(lon), "key": api_key},
        ),
    ]
    with httpx.Client(timeout=15.0) as client:
        for url, params in endpoints:
            resp = client.get(url, params=params)
            if resp.status_code == 403:
                continue
            resp.raise_for_status()
            payload = resp.json()
            if payload.get("status") == "fail":
                continue
            current = payload["data"]["current"]["pollution"]
            aqi = int(current.get("aqius", 0))
            if aqi <= 0:
                continue
            return {
                "city": city,
                "aqi": aqi,
                "label": aqi_label(aqi),
                "pm25": float(current.get("p2") or 0),
                "breakdown": {
                    "pm25": current.get("p2"),
                    "pm10": current.get("p1"),
                    "o3": current.get("o3"),
                },
                "source": "iqair",
            }
    return None


def _fetch_open_meteo(city: str) -> dict | None:
    """Free live air quality — used when IQAir key is missing or forbidden."""
    city = APP_CITY
    lat, lon, _, _ = LAHORE_COORDS
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "us_aqi,pm2_5,pm10,ozone",
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        current = resp.json().get("current", {})
    aqi = current.get("us_aqi")
    if aqi is None:
        return None
    aqi = int(round(aqi))
    return {
        "city": city,
        "aqi": aqi,
        "label": aqi_label(aqi),
        "pm25": float(current.get("pm2_5") or 0),
        "breakdown": {
            "pm25": current.get("pm2_5"),
            "pm10": current.get("pm10"),
            "o3": current.get("ozone"),
        },
        "source": "open-meteo",
    }


def fetch_aqi_for_api(city: str = APP_CITY) -> dict:
    city = APP_CITY
    settings = get_settings()

    if settings.effective_waqi_key:
        try:
            data = _fetch_waqi(city, settings.effective_waqi_key)
            if data:
                return data
        except Exception:
            pass

    try:
        data = _fetch_open_meteo(city)
        if data:
            return data
    except Exception:
        pass

    return {
        **LAHORE_FALLBACK,
        "city": city,
        "source": "mock",
        "updated_at": datetime.now(timezone.utc),
    }
