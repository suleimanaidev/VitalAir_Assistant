"""Geocoding fallback for Lahore areas not in area_mapping."""

import httpx

LAHORE_BOUNDS = {"min_lat": 31.2, "max_lat": 31.8, "min_lon": 73.9, "max_lon": 74.6}
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def _in_lahore(lat: float, lon: float) -> bool:
    return (
        LAHORE_BOUNDS["min_lat"] <= lat <= LAHORE_BOUNDS["max_lat"]
        and LAHORE_BOUNDS["min_lon"] <= lon <= LAHORE_BOUNDS["max_lon"]
    )


def geocode_lahore_area(query: str) -> tuple[float, float, str] | None:
    """
    Resolve free-text location to lat/lon within Lahore using Nominatim.
    Returns (lat, lon, display_name) or None.
    """
    q = query.strip()
    if not q:
        return None

    params = {
        "q": f"{q}, Lahore, Punjab, Pakistan",
        "format": "json",
        "limit": 1,
        "countrycodes": "pk",
    }
    headers = {"User-Agent": "VitalAir/1.0 (Lahore AQI assistant)"}

    with httpx.Client(timeout=12.0) as client:
        resp = client.get(NOMINATIM_URL, params=params, headers=headers)
        resp.raise_for_status()
        results = resp.json()

    if not results:
        return None

    hit = results[0]
    lat = float(hit["lat"])
    lon = float(hit["lon"])
    if not _in_lahore(lat, lon):
        return None

    display = hit.get("display_name", q)
    return lat, lon, display
