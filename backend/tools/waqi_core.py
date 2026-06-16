"""Real-time WAQI fetch for Lahore — geo-first, verified station fallback."""

from datetime import datetime, timezone
import re

import httpx

from config import get_settings
from tools.area_mapping import resolve_area
from tools.geocode_core import geocode_lahore_area

WAQI_BASE = "https://api.waqi.info/feed"
TIMEOUT = 12.0
STALE_HOURS = 3

LAHORE_BOUNDS = {"min_lat": 31.2, "max_lat": 31.8, "min_lon": 73.9, "max_lon": 74.6}
INDIA_PATTERN = re.compile(
    r"india|amritsar|delhi|chandigarh|jalandhar|ludhiana|punjab,\s*india", re.I
)

LAHORE_WAQI_STATIONS = [
    {"id": "A471607", "lat": 31.5482, "lon": 74.344, "label": "Lahore (G.O.R.)"},
    {"id": "A540730", "lat": 31.5659, "lon": 74.2994, "label": "Civil Secretariat"},
    {"id": "@11765", "lat": 31.5601, "lon": 74.3359, "label": "Lahore US Embassy"},
]

APP_CITY = "Lahore"


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


def aqi_health_advice(aqi: int) -> dict[str, str]:
    if aqi >= 300:
        return {
            "en": "Hazardous — avoid all outdoor activity. Stay indoors with windows closed.",
            "ur": "Bohat khatarnak — bahir mat jayein. Darwaze band kar ke ghar mein rahein.",
        }
    if aqi >= 200:
        return {
            "en": "Very unhealthy — limit outdoor exertion. Use N95 if you must go out.",
            "ur": "Bohat unhealthy — kam se kam bahir jayein. Zaroorat par N95 mask pehnein.",
        }
    if aqi >= 150:
        return {
            "en": "Unhealthy for sensitive groups — children, elderly, and asthmatics should stay indoors.",
            "ur": "Sensitive log (bachay, buzurg, asthma) ghar mein rahein.",
        }
    if aqi >= 100:
        return {
            "en": "Moderate — sensitive individuals should reduce prolonged outdoor exertion.",
            "ur": "Moderate — sensitive log outdoor activity kam karein.",
        }
    if aqi >= 50:
        return {
            "en": "Acceptable for most — unusually sensitive people may limit outdoor time.",
            "ur": "Aam tor par theek — sensitive log thori ehtiyat karein.",
        }
    return {
        "en": "Good air quality — enjoy outdoor activities normally.",
        "ur": "Hawa achi hai — aam outdoor activities kar sakte hain.",
    }


def _in_lahore(lat: float, lon: float) -> bool:
    return (
        LAHORE_BOUNDS["min_lat"] <= lat <= LAHORE_BOUNDS["max_lat"]
        and LAHORE_BOUNDS["min_lon"] <= lon <= LAHORE_BOUNDS["max_lon"]
    )


def _is_lahore_reading(data: dict) -> bool:
    city = data.get("city") or {}
    blob = f"{city.get('name', '')} {city.get('location', '')}".lower()
    if INDIA_PATTERN.search(blob):
        return False
    geo = city.get("geo")
    if isinstance(geo, list) and len(geo) >= 2:
        try:
            return _in_lahore(float(geo[0]), float(geo[1]))
        except (TypeError, ValueError):
            pass
    return "lahore" in blob or "pakistan" in blob


def _resolve_waqi_aqi(data: dict) -> int:
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


def _nearest_station(lat: float, lon: float) -> dict:
    best = LAHORE_WAQI_STATIONS[0]
    best_dist = float("inf")
    for station in LAHORE_WAQI_STATIONS:
        d_lat = lat - station["lat"]
        d_lon = lon - station["lon"]
        dist = d_lat * d_lat + d_lon * d_lon
        if dist < best_dist:
            best_dist = dist
            best = station
    return best


def _waqi_get(path: str, api_key: str) -> dict | None:
    with httpx.Client(timeout=TIMEOUT) as client:
        resp = client.get(f"{WAQI_BASE}/{path}/", params={"token": api_key})
        resp.raise_for_status()
        payload = resp.json()
    if payload.get("status") != "ok":
        return None
    data = payload.get("data")
    return data if isinstance(data, dict) else None


def _fetch_live_waqi(lat: float, lon: float, api_key: str) -> tuple[dict, str] | None:
    """Geo-first real-time fetch; fallback to nearest verified Lahore station."""
    geo = _waqi_get(f"geo:{lat};{lon}", api_key)
    if geo and _is_lahore_reading(geo):
        return geo, "geo"

    station = _nearest_station(lat, lon)
    feed = _waqi_get(station["id"], api_key)
    if feed:
        return feed, "station"
    return None


def _build_response(
    data: dict,
    area_name: str,
    lat: float,
    lon: float,
    location_source: str,
    fetch_method: str,
) -> dict | None:
    aqi = _resolve_waqi_aqi(data)
    if aqi <= 0:
        return None

    iaqi = data.get("iaqi") or {}
    pm25 = iaqi.get("pm25", {}).get("v") if isinstance(iaqi.get("pm25"), dict) else None
    station_time = data.get("time", {}).get("iso")
    fetched_at = datetime.now(timezone.utc).isoformat()
    advice = aqi_health_advice(aqi)
    waqi_station = (data.get("city") or {}).get("name") or "Lahore monitoring station"

    is_stale = False
    if station_time:
        try:
            st = datetime.fromisoformat(station_time.replace("Z", "+00:00"))
            age_h = (datetime.now(timezone.utc) - st.astimezone(timezone.utc)).total_seconds() / 3600
            is_stale = age_h > STALE_HOURS
        except ValueError:
            pass

    return {
        "area": area_name,
        "city": APP_CITY,
        "lat": lat,
        "lon": lon,
        "location_source": location_source,
        "fetch_method": fetch_method,
        "is_stale": is_stale,
        "aqi": aqi,
        "label": aqi_label(aqi),
        "pm25": float(pm25) if pm25 is not None else 0.0,
        "dominent": data.get("dominentpol"),
        "source": "waqi",
        "station": waqi_station,
        "updated_at": station_time or fetched_at,
        "station_reported_at": station_time,
        "fetched_at": fetched_at,
        "health_advice_en": advice["en"],
        "health_advice_ur": advice["ur"],
    }


def fetch_aqi_at_coords(
    lat: float,
    lon: float,
    area_name: str,
    *,
    location_source: str = "mapping",
) -> dict | None:
    settings = get_settings()
    api_key = settings.effective_waqi_key
    if not api_key:
        return None

    live = _fetch_live_waqi(lat, lon, api_key)
    if not live:
        return None
    data, method = live
    return _build_response(data, area_name, lat, lon, location_source, method)


def fetch_aqi_for_area(area_query: str) -> dict:
    mapped = resolve_area(area_query)
    if mapped:
        result = fetch_aqi_at_coords(
            mapped.lat, mapped.lon, mapped.name, location_source="area_mapping"
        )
        if result:
            result["area_id"] = mapped.id
            return result

    geocoded = geocode_lahore_area(area_query)
    if geocoded:
        lat, lon, display = geocoded
        result = fetch_aqi_at_coords(
            lat, lon, area_query.strip(), location_source="geocode"
        )
        if result:
            result["geocoded_name"] = display
            return result

    raise ValueError(f"Could not resolve '{area_query}' in Lahore or fetch WAQI data.")
