import math

import httpx

from config import get_settings

# Lahore area lookup for mock GeoJSON routes (lat, lon)
_LAHORE_COORDS: dict[str, tuple[float, float]] = {
    "gulberg": (31.5204, 74.3437),
    "johar town": (31.4697, 74.2728),
    "lake city": (31.3927, 74.2552),
    "dha phase 5": (31.4734, 74.4586),
    "dha": (31.4734, 74.4586),
    "model town": (31.4834, 74.325),
    "liberty market": (31.511, 74.344),
    "mm alam road": (31.515, 74.348),
    "punjab assembly": (31.568, 74.302),
    "bhobtian chowk": (31.4486, 74.4094),
    "bahria town": (31.3704, 74.1845),
    "mall road": (31.568, 74.31),
    "faisal town": (31.4906, 74.3018),
    "lahore cantt": (31.52, 74.39),
    "garden town": (31.5036, 74.3234),
    "allama iqbal town": (31.5126, 74.2949),
    "township": (31.4661, 74.3152),
    "wapda town": (31.4428, 74.2581),
    "valencia": (31.3775, 74.2389),
    "shahdara": (31.613, 74.284),
    "anarkali": (31.5686, 74.312),
    "kot lakhpat": (31.464, 74.335),
    "mughalpura": (31.575, 74.365),
}

_AREA_DISPLAY: dict[str, str] = {
    "gulberg": "Gulberg",
    "johar town": "Johar Town",
    "lake city": "Lake City",
    "dha phase 5": "DHA Phase 5",
    "dha": "DHA",
    "model town": "Model Town",
    "liberty market": "Liberty Market",
    "mm alam road": "MM Alam Road",
    "punjab assembly": "Punjab Assembly",
    "bhobtian chowk": "Bhobtian Chowk",
    "bahria town": "Bahria Town",
    "mall road": "Mall Road",
    "faisal town": "Faisal Town",
    "lahore cantt": "Lahore Cantt",
    "garden town": "Garden Town",
    "allama iqbal town": "Allama Iqbal Town",
    "township": "Township",
    "wapda town": "Wapda Town",
    "valencia": "Valencia Town",
    "shahdara": "Shahdara",
    "anarkali": "Anarkali",
    "kot lakhpat": "Kot Lakhpat",
    "mughalpura": "Mughalpura",
}

# User spellings → canonical area key
_AREA_ALIASES: dict[str, str] = {
    "bhoobtian chowk": "bhobtian chowk",
    "bhoobtian": "bhobtian chowk",
    "bhobtian": "bhobtian chowk",
    "bhobtian chowk": "bhobtian chowk",
}


def _decode_polyline(polyline_str: str) -> list[list[float]]:
    """Decode Google encoded polyline → [lng, lat] pairs."""
    coords: list[list[float]] = []
    index = 0
    lat = lng = 0
    length = len(polyline_str)

    while index < length:
        shift = result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlat = ~(result >> 1) if result & 1 else result >> 1
        lat += dlat

        shift = result = 0
        while True:
            b = ord(polyline_str[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        dlng = ~(result >> 1) if result & 1 else result >> 1
        lng += dlng

        coords.append([lng / 1e5, lat / 1e5])
    return coords


def _normalize_area_key(name: str) -> str:
    key = name.lower().strip()
    if key in _AREA_ALIASES:
        return _AREA_ALIASES[key]
    for alias, canonical in _AREA_ALIASES.items():
        if alias in key or key in alias:
            return canonical
    return key


def _lookup_coord(name: str) -> tuple[float, float]:
    key = _normalize_area_key(name)
    for area, coord in _LAHORE_COORDS.items():
        if area in key or key in area:
            return coord
    return (31.5204, 74.3587)


def _area_display_name(area_key: str) -> str:
    return _AREA_DISPLAY.get(area_key, area_key.title())


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    )
    return r * 2 * math.asin(math.sqrt(min(1.0, a)))


def _format_distance(km: float) -> str:
    if km < 1:
        return f"{max(100, int(km * 1000))} m"
    return f"{km:.1f} km"


def _exposure_label(km: float) -> str:
    if km < 5:
        return "Low–moderate"
    if km < 14:
        return "Moderate"
    return "Moderate–high"


def _area_aqi_estimate(area_name: str, base_aqi: int = 120, *, live: bool = False) -> int:
    """Deterministic AQI spread; optional live WAQI for endpoints only."""
    if live:
        try:
            from tools.waqi_core import fetch_aqi_for_area

            data = fetch_aqi_for_area(area_name)
            if data and data.get("aqi"):
                return int(data["aqi"])
        except Exception:
            pass
    key = area_name.lower()
    spread = sum(ord(c) for c in key) % 40
    return max(50, min(300, base_aqi + spread - 20))


def _season_aqi_adjustment(area_name: str, base_aqi: int) -> int:
    """Penalize season-specific hazard corridors (Innovation 3)."""
    try:
        from services.seasonal_intelligence import get_season_profile
        from tools.lahore_season import get_lahore_season

        profile = get_season_profile(get_lahore_season().id)
        lower = area_name.lower()
        for avoid in profile.avoid_areas:
            avoid_l = avoid.lower()
            if avoid_l in lower or lower in avoid_l:
                return min(300, base_aqi + 18)
            for token in avoid_l.replace("(", " ").split():
                if len(token) > 4 and token in lower:
                    return min(300, base_aqi + 12)
    except Exception:
        pass
    return base_aqi


def _corridor_candidates(origin: str, destination: str) -> list[dict]:
    o_lat, o_lng = _lookup_coord(origin)
    d_lat, d_lng = _lookup_coord(destination)
    mid_lat, mid_lng = (o_lat + d_lat) / 2, (o_lng + d_lng) / 2
    o_key = _normalize_area_key(origin)
    d_key = _normalize_area_key(destination)
    base_aqi = _area_aqi_estimate(origin, live=True) + _area_aqi_estimate(
        destination, live=True
    )
    base_aqi = max(80, base_aqi // 2)

    candidates: list[dict] = []
    for area_key, (lat, lng) in _LAHORE_COORDS.items():
        if area_key == o_key or area_key == d_key:
            continue
        if area_key in o_key or area_key in d_key:
            continue
        dist = math.hypot(lat - mid_lat, lng - mid_lng)
        name = _area_display_name(area_key)
        raw_aqi = _area_aqi_estimate(name, base_aqi)
        candidates.append(
            {
                "key": area_key,
                "name": name,
                "lat": lat,
                "lng": lng,
                "aqi": _season_aqi_adjustment(name, raw_aqi),
                "dist": dist,
            }
        )
    return candidates


def _make_route_option(
    origin: str,
    destination: str,
    via_areas: list[dict],
    label: str,
    rank: int,
) -> dict:
    o_lat, o_lng = _lookup_coord(origin)
    d_lat, d_lng = _lookup_coord(destination)
    origin_label = origin.strip()
    dest_label = destination.strip()

    waypoints = [origin_label]
    coords: list[list[float]] = [[o_lng, o_lat]]
    total_km = 0.0
    prev_lat, prev_lng = o_lat, o_lng

    for area in via_areas:
        waypoints.append(area["name"])
        coords.append([area["lng"], area["lat"]])
        total_km += _haversine_km(prev_lat, prev_lng, area["lat"], area["lng"])
        prev_lat, prev_lng = area["lat"], area["lng"]

    waypoints.append(dest_label)
    coords.append([d_lng, d_lat])
    total_km += _haversine_km(prev_lat, prev_lng, d_lat, d_lng)
    road_km = max(1.2, total_km * 1.25)

    aqi_values = [a["aqi"] for a in via_areas] + [
        _area_aqi_estimate(origin_label),
        _area_aqi_estimate(dest_label),
    ]
    avg_aqi = int(sum(aqi_values) / len(aqi_values))
    via_names = ", ".join(a["name"] for a in via_areas)

    try:
        from services.seasonal_intelligence import get_season_profile
        from tools.lahore_season import get_lahore_season

        route_intel = get_season_profile(get_lahore_season().id).route_agent_focus
    except Exception:
        route_intel = "Lowest AQI corridor"

    if via_names:
        recommendation = (
            f"Via {via_names} — avg AQI {avg_aqi}. {route_intel}"
        )
    else:
        recommendation = f"Direct path — avg AQI {avg_aqi}. {route_intel}"

    return {
        "rank": rank,
        "label": label,
        "distance": _format_distance(road_km),
        "duration": f"{max(8, int(road_km * 3.2))} mins",
        "avg_aqi": avg_aqi,
        "exposure": _exposure_label(road_km),
        "waypoints": waypoints,
        "via_areas": [a["name"] for a in via_areas],
        "recommendation": recommendation,
        "coords": coords,
    }


def build_three_route_options(origin: str, destination: str) -> list[dict]:
    """Three distinct paths ranked by minimum AQI along the corridor."""
    candidates = _corridor_candidates(origin, destination)
    if not candidates:
        direct = _make_route_option(origin, destination, [], "Direct route", 1)
        return [direct, {**direct, "rank": 2, "label": "Direct route B"}, {**direct, "rank": 3, "label": "Direct route C"}]

    low_aqi = sorted(candidates, key=lambda x: (x["aqi"], x["dist"]))
    near_mid = sorted(candidates, key=lambda x: x["dist"])

    route1_via = low_aqi[:2]

    route2_via: list[dict] = []
    if low_aqi:
        route2_via.append(low_aqi[0])
    for n in near_mid:
        if n["key"] not in {v["key"] for v in route2_via}:
            route2_via.append(n)
            break
    route2_via = route2_via[:2]

    used_keys = {v["key"] for v in route1_via}
    route3_via = [a for a in low_aqi if a["key"] not in used_keys][:2]
    if len(route3_via) < 2:
        for n in near_mid:
            if n["key"] not in used_keys and n["key"] not in {v["key"] for v in route3_via}:
                route3_via.append(n)
            if len(route3_via) >= 2:
                break

    options = [
        _make_route_option(origin, destination, route1_via, "Lowest AQI corridor", 1),
        _make_route_option(origin, destination, route2_via, "Balanced route", 2),
        _make_route_option(origin, destination, route3_via, "Alternative path", 3),
    ]
    return sorted(options, key=lambda x: x["avg_aqi"])


def _build_waypoints(origin: str, destination: str) -> list[str]:
    """Origin → up to 2 corridor areas near midpoint → destination."""
    o_label = origin.strip()
    d_label = destination.strip()
    o_lat, o_lng = _lookup_coord(origin)
    d_lat, d_lng = _lookup_coord(destination)
    mid_lat, mid_lng = (o_lat + d_lat) / 2, (o_lng + d_lng) / 2

    waypoints: list[str] = [o_label]
    seen = {o_label.lower()}

    scored: list[tuple[float, str]] = []
    o_key = _normalize_area_key(origin)
    d_key = _normalize_area_key(destination)
    for area_key, (lat, lng) in _LAHORE_COORDS.items():
        if area_key == o_key or area_key == d_key:
            continue
        if area_key in o_key or area_key in d_key:
            continue
        dist = math.hypot(lat - mid_lat, lng - mid_lng)
        scored.append((dist, _area_display_name(area_key)))

    for _, label in sorted(scored, key=lambda x: x[0])[:2]:
        if label.lower() not in seen:
            waypoints.append(label)
            seen.add(label.lower())

    if d_label.lower() not in seen:
        waypoints.append(d_label)
    return waypoints


def _route_meta(origin: str, destination: str) -> dict:
    o_lat, o_lng = _lookup_coord(origin)
    d_lat, d_lng = _lookup_coord(destination)
    km = _haversine_km(o_lat, o_lng, d_lat, d_lng)
    # Road distance ~1.25× straight line in urban Lahore
    road_km = max(1.2, km * 1.25)
    exposure = _exposure_label(road_km)
    waypoints = _build_waypoints(origin, destination)
    via = ", ".join(waypoints[1:-1]) if len(waypoints) > 2 else ""
    if via:
        recommendation = (
            f"Prefer {via} as a corridor with {exposure.lower()} smog exposure "
            f"when traveling from {origin.strip()} to {destination.strip()}."
        )
    else:
        recommendation = (
            f"Direct urban corridor with {exposure.lower()} exposure "
            f"from {origin.strip()} to {destination.strip()} in Lahore."
        )
    return {
        "distance": _format_distance(road_km),
        "duration": f"{max(8, int(road_km * 3.2))} mins",
        "exposure": exposure,
        "waypoints": waypoints,
        "recommendation": recommendation,
    }


def _mock_linestring(origin: str, destination: str) -> list[list[float]]:
    lat1, lng1 = _lookup_coord(origin)
    lat2, lng2 = _lookup_coord(destination)
    mid_lat = (lat1 + lat2) / 2 + 0.005
    mid_lng = (lng1 + lng2) / 2 - 0.008
    return [[lng1, lat1], [mid_lng, mid_lat], [lng2, lat2]]


def _geojson_feature(
    coords: list[list[float]],
    label: str,
    route_type: str,
) -> dict:
    return {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": coords},
        "properties": {"label": label, "route_type": route_type},
    }


def _aqi_checkpoints(coords: list[list[float]], base_aqi: int = 180) -> list[dict]:
    if len(coords) < 2:
        return []
    checkpoints = []
    for i, (lng, lat) in enumerate(coords):
        aqi = max(50, base_aqi - i * 15 + (i % 2) * 10)
        checkpoints.append({"lat": lat, "lng": lng, "aqi": aqi, "index": i})
    return checkpoints


def _fetch_osrm_routes(origin: str, destination: str) -> dict | None:
    """Free OpenStreetMap driving routes (no API key). Returns coords + meta or None."""
    lat1, lng1 = _lookup_coord(origin)
    lat2, lng2 = _lookup_coord(destination)
    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{lng1},{lat1};{lng2},{lat2}"
    )
    params = {"overview": "full", "geometries": "geojson", "alternatives": "true"}
    try:
        with httpx.Client(timeout=18.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        if data.get("code") != "Ok" or not data.get("routes"):
            return None

        routes = data["routes"]
        fastest = routes[0]
        fastest_coords: list[list[float]] = fastest["geometry"]["coordinates"]
        if len(routes) > 1:
            cleanest_coords = routes[-1]["geometry"]["coordinates"]
        else:
            cleanest_coords = [
                [lng + 0.003, lat - 0.002] for lng, lat in fastest_coords
            ]

        meta = _route_meta(origin, destination)
        road_km = max(0.5, float(fastest.get("distance", 0)) / 1000.0)
        dur_min = max(1, int(float(fastest.get("duration", 0)) / 60.0))

        return {
            "fastest_coords": fastest_coords,
            "cleanest_coords": cleanest_coords,
            "distance": _format_distance(road_km),
            "duration": f"{dur_min} mins",
            "exposure": _exposure_label(road_km),
            "waypoints": meta["waypoints"],
            "recommendation": meta["recommendation"],
            "source": "osrm",
        }
    except Exception:
        return None


def _mock_route_bundle(origin: str, destination: str) -> dict:
    """Area-aware fallback when OSRM / Google unavailable."""
    meta = _route_meta(origin, destination)
    fastest_coords = _mock_linestring(origin, destination)
    cleanest_coords = [
        [lng + 0.003, lat - 0.002] for lng, lat in fastest_coords
    ]
    return {
        "fastest_coords": fastest_coords,
        "cleanest_coords": cleanest_coords,
        **meta,
        "source": "mock",
    }


def _google_directions(origin: str, destination: str, key: str) -> dict | None:
    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "origin": f"{origin}, Lahore, Pakistan",
        "destination": f"{destination}, Lahore, Pakistan",
        "mode": "driving",
        "alternatives": "true",
        "key": key,
    }
    try:
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        routes = data.get("routes", [])
        if not routes:
            return None

        fastest = routes[0]
        fastest_poly = fastest.get("overview_polyline", {}).get("points", "")
        fastest_coords = _decode_polyline(fastest_poly) if fastest_poly else []

        cleanest_coords: list[list[float]] = []
        if len(routes) > 1:
            clean_poly = routes[-1].get("overview_polyline", {}).get("points", "")
            if clean_poly:
                cleanest_coords = _decode_polyline(clean_poly)
        elif fastest_coords:
            cleanest_coords = [
                [lng - 0.004, lat + 0.003] for lng, lat in fastest_coords
            ]

        leg = fastest["legs"][0]
        steps = [
            s.get("html_instructions", "").replace("<b>", "").replace("</b>", "")
            for s in leg.get("steps", [])[:5]
        ]
        meta = _route_meta(origin, destination)

        return {
            "fastest_coords": fastest_coords or _mock_linestring(origin, destination),
            "cleanest_coords": cleanest_coords
            or [[lng + 0.003, lat - 0.002] for lng, lat in fastest_coords],
            "distance": leg.get("distance", {}).get("text") or meta["distance"],
            "duration": leg.get("duration", {}).get("text") or meta["duration"],
            "exposure": meta["exposure"],
            "waypoints": [s for s in steps if s] or meta["waypoints"],
            "recommendation": meta["recommendation"],
            "source": "google_maps",
        }
    except Exception:
        return None


def _resolve_route_bundle(origin: str, destination: str) -> dict:
    settings = get_settings()
    if settings.google_maps_api_key:
        google = _google_directions(origin, destination, settings.google_maps_api_key)
        if google:
            return google

    osrm = _fetch_osrm_routes(origin, destination)
    if osrm:
        return osrm

    return _mock_route_bundle(origin, destination)


def fetch_routes_sync(origin: str, destination: str) -> dict:
    bundle = _resolve_route_bundle(origin, destination)
    geo = fetch_geojson_routes_sync(origin, destination, bundle=bundle)
    route_options = build_three_route_options(origin, destination)
    best = route_options[0] if route_options else None
    return {
        "origin": origin,
        "destination": destination,
        "distance": best["distance"] if best else bundle["distance"],
        "duration": best["duration"] if best else bundle["duration"],
        "exposure": best["exposure"] if best else bundle["exposure"],
        "waypoints": best["waypoints"] if best else bundle["waypoints"],
        "recommendation": best["recommendation"] if best else bundle["recommendation"],
        "source": bundle["source"],
        "geojson": geo,
        "route_options": route_options,
    }


def fetch_geojson_routes_sync(
    origin: str,
    destination: str,
    *,
    bundle: dict | None = None,
) -> dict:
    """Return cleanest + fastest GeoJSON LineStrings with AQI checkpoints."""
    bundle = bundle or _resolve_route_bundle(origin, destination)
    fastest_coords = bundle.get("fastest_coords") or _mock_linestring(origin, destination)
    cleanest_coords = bundle.get("cleanest_coords") or [
        [lng + 0.003, lat - 0.002] for lng, lat in fastest_coords
    ]

    checkpoints = _aqi_checkpoints(cleanest_coords)
    recommendation = bundle.get(
        "recommendation",
        f"Take the cleanest route from {origin} to {destination} in Lahore.",
    )
    return {
        "cleanest": _geojson_feature(
            cleanest_coords,
            f"Cleanest: {origin} → {destination}",
            "cleanest",
        ),
        "fastest": _geojson_feature(
            fastest_coords,
            f"Fastest: {origin} → {destination}",
            "fastest",
        ),
        "recommendation": recommendation,
        "aqi_checkpoints": checkpoints,
    }
