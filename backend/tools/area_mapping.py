"""Lahore area → lat/lon database for location-specific AQI lookups."""

from dataclasses import dataclass


@dataclass(frozen=True)
class AreaRecord:
    id: str
    name: str
    lat: float
    lon: float


# Canonical Lahore neighborhoods (sync with frontend/lib/lahoreAreas.ts)
AREA_MAPPING: list[AreaRecord] = [
    AreaRecord("gulberg", "Gulberg", 31.5204, 74.3437),
    AreaRecord("johar-town", "Johar Town", 31.4697, 74.2728),
    AreaRecord("lake-city", "Lake City", 31.3927, 74.2552),
    AreaRecord("dha-phase-5", "DHA Phase 5", 31.4734, 74.4586),
    AreaRecord("model-town", "Model Town", 31.4834, 74.325),
    AreaRecord("bahria-town", "Bahria Town", 31.3704, 74.1845),
    AreaRecord("allama-iqbal-town", "Allama Iqbal Town", 31.5126, 74.2949),
    AreaRecord("garden-town", "Garden Town", 31.5036, 74.3234),
    AreaRecord("cantt", "Lahore Cantt", 31.52, 74.39),
    AreaRecord("mall-road", "Mall Road", 31.568, 74.31),
    AreaRecord("faisal-town", "Faisal Town", 31.4906, 74.3018),
    AreaRecord("township", "Township", 31.4661, 74.3152),
    AreaRecord("wapda-town", "Wapda Town", 31.4428, 74.2581),
    AreaRecord("valencia", "Valencia Town", 31.3775, 74.2389),
    AreaRecord("shahdara", "Shahdara", 31.613, 74.284),
    AreaRecord("anarkali", "Anarkali", 31.5686, 74.312),
    AreaRecord("liberty", "Liberty Market", 31.511, 74.344),
    AreaRecord("punjab-assembly", "Punjab Assembly", 31.568, 74.302),
    AreaRecord("ali-town", "Ali Town", 31.448, 74.268),
    AreaRecord("dubai-town", "Dubai Town", 31.435, 74.278),
    AreaRecord("kot-lakhpat", "Kot Lakhpat", 31.464, 74.335),
    AreaRecord("samanabad", "Samanabad", 31.538, 74.318),
    AreaRecord("mughalpura", "Mughalpura", 31.575, 74.365),
    AreaRecord("bhobtian-chowk", "Bhobtian Chowk", 31.4486, 74.4094),
    AreaRecord("mm-alam-road", "MM Alam Road", 31.515, 74.348),
    AreaRecord("green-town", "Green Town", 31.455, 74.305),
    AreaRecord("izmir-town", "Izmir Town", 31.442, 74.292),
    AreaRecord("punjab-society", "Punjab Society", 31.478, 74.355),
    AreaRecord("gulshan-ravi", "Gulshan Ravi", 31.548, 74.328),
    AreaRecord("ichhra", "Ichhra", 31.528, 74.318),
    AreaRecord("shadman", "Shadman", 31.542, 74.328),
    AreaRecord("thokar-niaz-baig", "Thokar Niaz Baig", 31.458, 74.248),
    AreaRecord("college-road", "College Road", 31.438, 74.268),
    AreaRecord("sabzazar", "Sabzazar", 31.472, 74.288),
    AreaRecord("cavalry-ground", "Cavalry Ground", 31.508, 74.368),
    AreaRecord("dha-phase-6", "DHA Phase 6", 31.48, 74.47),
    AreaRecord("gulberg-ii", "Gulberg II", 31.518, 74.34),
]

_ALIASES: dict[str, str] = {
    "dha": "dha-phase-5",
    "dha phase 5": "dha-phase-5",
    "dha phase-5": "dha-phase-5",
    "johar": "johar-town",
    "gor": "model-town",
    "liberty market": "liberty",
    "civil secretariat": "punjab-assembly",
    "cantt": "cantt",
    "lahore cantt": "cantt",
    "dubai town": "dubai-town",
    "thokar": "thokar-niaz-baig",
    "green town": "green-town",
    "shadman": "shadman",
    "ichhra": "ichhra",
    "sabzazar": "sabzazar",
    "gulberg 2": "gulberg-ii",
    "gulberg ii": "gulberg-ii",
    "dha 6": "dha-phase-6",
}

_BY_ID = {a.id: a for a in AREA_MAPPING}
_BY_NAME = {a.name.lower(): a for a in AREA_MAPPING}


def resolve_area(query: str) -> AreaRecord | None:
    """Resolve a user area name to coordinates via internal mapping."""
    q = query.strip().lower()
    if not q:
        return None

    if q in _ALIASES:
        return _BY_ID.get(_ALIASES[q])

    if q in _BY_NAME:
        return _BY_NAME[q]

    by_id = _BY_ID.get(q.replace(" ", "-"))
    if by_id:
        return by_id

    for area in AREA_MAPPING:
        name = area.name.lower()
        area_id = area.id.replace("-", " ")
        if name == q or area_id == q:
            return area
        if q in name or name in q:
            return area
        if "dha" in q and "dha" in name:
            return area
        if "gulberg" in q and area.id == "gulberg":
            return area
        if "dubai" in q and area.id == "dubai-town":
            return area

    return None
