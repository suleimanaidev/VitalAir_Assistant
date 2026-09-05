"""Geocoding fallback for Lahore areas not in area_mapping using Photon + Nominatim."""

import httpx

LAHORE_BOUNDS = {"min_lat": 31.15, "max_lat": 31.85, "min_lon": 73.85, "max_lon": 74.65}
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
PHOTON_URL = "https://photon.komoot.io/api"
LAHORE_CENTER = (31.5204, 74.3587)


def _in_lahore(lat: float, lon: float) -> bool:
    return (
        LAHORE_BOUNDS["min_lat"] <= lat <= LAHORE_BOUNDS["max_lat"]
        and LAHORE_BOUNDS["min_lon"] <= lon <= LAHORE_BOUNDS["max_lon"]
    )


def geocode_lahore_area(query: str) -> tuple[float, float, str] | None:
    """
    Resolve free-text location to lat/lon within Lahore using Photon + Nominatim.
    Returns (lat, lon, display_name) or None.
    """
    q = query.strip()
    if not q:
        return None

    headers = {"User-Agent": "VitalAir/1.0 (Lahore AQI assistant)"}

    # 1. Try Photon first (fast OSM index)
    try:
        photon_q = q if "lahore" in q.lower() else f"{q} lahore"
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(
                PHOTON_URL,
                params={"q": photon_q, "lat": LAHORE_CENTER[0], "lon": LAHORE_CENTER[1], "limit": 3},
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                for feat in data.get("features", []):
                    lon, lat = feat["geometry"]["coordinates"]
                    if _in_lahore(lat, lon):
                        props = feat.get("properties", {})
                        name = props.get("name") or props.get("street") or q
                        return float(lat), float(lon), str(name)
    except Exception:
        pass

    # 2. Try Nominatim
    try:
        nom_q = q if "lahore" in q.lower() else f"{q}, Lahore, Pakistan"
        params = {
            "q": nom_q,
            "format": "json",
            "limit": 1,
            "countrycodes": "pk",
            "viewbox": "73.85,31.85,74.65,31.15",
        }
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(NOMINATIM_URL, params=params, headers=headers)
            if resp.status_code == 200:
                results = resp.json()
                if results:
                    hit = results[0]
                    lat = float(hit["lat"])
                    lon = float(hit["lon"])
                    if _in_lahore(lat, lon):
                        display = hit.get("display_name", q)
                        return lat, lon, display
    except Exception:
        pass

    return None

