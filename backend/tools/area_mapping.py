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
    # Gulberg & Commercial Hubs
    AreaRecord("gulberg", "Gulberg", 31.5204, 74.3437),
    AreaRecord("gulberg-ii", "Gulberg II", 31.518, 74.34),
    AreaRecord("liberty", "Liberty Market", 31.511, 74.344),
    AreaRecord("mm-alam-road", "MM Alam Road", 31.515, 74.348),
    AreaRecord("cavalry-ground", "Cavalry Ground", 31.508, 74.368),
    AreaRecord("cantt", "Lahore Cantt", 31.52, 74.39),

    # DHA Phases
    AreaRecord("dha-phase-1", "DHA Phase 1", 31.492, 74.385),
    AreaRecord("dha-phase-2", "DHA Phase 2", 31.488, 74.398),
    AreaRecord("dha-phase-3", "DHA Phase 3", 31.478, 74.38),
    AreaRecord("dha-phase-4", "DHA Phase 4", 31.47, 74.405),
    AreaRecord("dha-phase-5", "DHA Phase 5", 31.4734, 74.4586),
    AreaRecord("dha-phase-6", "DHA Phase 6", 31.48, 74.47),
    AreaRecord("dha-phase-7", "DHA Phase 7", 31.465, 74.492),
    AreaRecord("dha-phase-8", "DHA Phase 8", 31.448, 74.455),
    AreaRecord("dha-phase-9", "DHA Phase 9 Prism", 31.425, 74.482),
    AreaRecord("dha-rahbar", "DHA Rahbar (Phase 11)", 31.392, 74.268),
    AreaRecord("defence-ravi", "Defence Raya", 31.455, 74.445),

    # Johar Town & Southern Suburbs
    AreaRecord("johar-town", "Johar Town", 31.4697, 74.2728),
    AreaRecord("faisal-town", "Faisal Town", 31.4906, 74.3018),
    AreaRecord("township", "Township", 31.4661, 74.3152),
    AreaRecord("wapda-town", "Wapda Town", 31.4428, 74.2581),
    AreaRecord("valencia", "Valencia Town", 31.3775, 74.2389),
    AreaRecord("lake-city", "Lake City", 31.3927, 74.2552),
    AreaRecord("bahria-town", "Bahria Town", 31.3704, 74.1845),
    AreaRecord("bahria-orchard", "Bahria Orchard", 31.325, 74.195),
    AreaRecord("ali-town", "Ali Town", 31.448, 74.268),
    AreaRecord("dubai-town", "Dubai Town", 31.435, 74.278),
    AreaRecord("izmir-town", "Izmir Town", 31.442, 74.292),
    AreaRecord("green-town", "Green Town", 31.455, 74.305),

    # Central & Historic Lahore
    AreaRecord("model-town", "Model Town", 31.4834, 74.325),
    AreaRecord("garden-town", "Garden Town", 31.5036, 74.3234),
    AreaRecord("allama-iqbal-town", "Allama Iqbal Town", 31.5126, 74.2949),
    AreaRecord("mall-road", "Mall Road", 31.568, 74.31),
    AreaRecord("anarkali", "Anarkali", 31.5686, 74.312),
    AreaRecord("punjab-assembly", "Punjab Assembly", 31.568, 74.302),
    AreaRecord("ichhra", "Ichhra", 31.528, 74.318),
    AreaRecord("shadman", "Shadman", 31.542, 74.328),
    AreaRecord("samanabad", "Samanabad", 31.538, 74.318),
    AreaRecord("gulshan-ravi", "Gulshan Ravi", 31.548, 74.328),
    AreaRecord("empress-road", "Empress Road", 31.572, 74.318),
    AreaRecord("garhi-shahu", "Garhi Shahu", 31.565, 74.335),
    AreaRecord("islampura", "Islampura", 31.562, 74.302),
    AreaRecord("mozang", "Mozang", 31.552, 74.315),
    AreaRecord("data-darbar", "Data Darbar", 31.578, 74.308),
    AreaRecord("walled-city", "Walled City (Androon Lahore)", 31.588, 74.315),

    # Askari Housing Schemes
    AreaRecord("askari-10", "Askari 10", 31.498, 74.412),
    AreaRecord("askari-11", "Askari 11", 31.468, 74.418),
    AreaRecord("askari-1", "Askari 1 & 2", 31.535, 74.372),
    AreaRecord("askari-5", "Askari 5", 31.512, 74.385),

    # Eastern & Northern Suburbs
    AreaRecord("mughalpura", "Mughalpura", 31.575, 74.365),
    AreaRecord("harbanspura", "Harbanspura", 31.588, 74.378),
    AreaRecord("shalamar", "Shalamar Gardens", 31.585, 74.382),
    AreaRecord("tajpura", "Tajpura", 31.572, 74.398),
    AreaRecord("daroghawala", "Daroghawala", 31.595, 74.415),
    AreaRecord("batapur", "Batapur", 31.602, 74.468),
    AreaRecord("jallo", "Jallo Park", 31.562, 74.498),
    AreaRecord("shahdara", "Shahdara", 31.613, 74.284),
    AreaRecord("ravi-town", "Ravi Town", 31.598, 74.348),
    AreaRecord("misri-shah", "Misri Shah", 31.588, 74.332),

    # Arterial Roads & Highways
    AreaRecord("barki-road", "Barki Road", 31.512, 74.442),
    AreaRecord("bedian-road", "Bedian Road", 31.465, 74.415),
    AreaRecord("raiwind-road", "Raiwind Road", 31.398, 74.225),
    AreaRecord("ferozepur-road", "Ferozepur Road", 31.478, 74.332),
    AreaRecord("multan-road", "Multan Road", 31.485, 74.262),
    AreaRecord("walton-road", "Walton Road", 31.495, 74.368),
    AreaRecord("jail-road", "Jail Road", 31.54, 74.335),
    AreaRecord("canal-bank-road", "Canal Bank Road", 31.505, 74.325),
    AreaRecord("pine-avenue", "Pine Avenue", 31.395, 74.248),
    AreaRecord("khayaban-e-jinnah", "Khayaban-e-Jinnah", 31.435, 74.265),

    # Housing Societies
    AreaRecord("paragon-city", "Paragon City", 31.535, 74.468),
    AreaRecord("state-life", "State Life Society", 31.458, 74.432),
    AreaRecord("central-park", "Central Park Housing Scheme", 31.348, 74.358),
    AreaRecord("sui-gas-society", "Sui Gas Housing Society", 31.442, 74.448),
    AreaRecord("park-view-city", "Park View City", 31.435, 74.195),
    AreaRecord("pak-arab", "Pak Arab Housing Society", 31.448, 74.388),
    AreaRecord("punjab-society", "Punjab Society", 31.478, 74.355),
    AreaRecord("nfc", "NFC Society", 31.462, 74.378),
    AreaRecord("bhobtian-chowk", "Bhobtian Chowk", 31.4486, 74.4094),
    AreaRecord("thokar-niaz-baig", "Thokar Niaz Baig", 31.458, 74.248),
    AreaRecord("college-road", "College Road", 31.438, 74.268),
    AreaRecord("sabzazar", "Sabzazar", 31.472, 74.288),
    AreaRecord("chung", "Chung", 31.438, 74.318),
    AreaRecord("kahna", "Kahna Nau", 31.368, 74.368),
    AreaRecord("hall-road", "Hall Road", 31.562, 74.318),
    AreaRecord("wapda-city", "Wapda City", 31.425, 74.235),
]

_ALIASES: dict[str, str] = {
    "dha": "dha-phase-5",
    "dha 1": "dha-phase-1",
    "dha 2": "dha-phase-2",
    "dha 3": "dha-phase-3",
    "dha 4": "dha-phase-4",
    "dha 5": "dha-phase-5",
    "dha 6": "dha-phase-6",
    "dha 7": "dha-phase-7",
    "dha 8": "dha-phase-8",
    "dha 9": "dha-phase-9",
    "dha phase 1": "dha-phase-1",
    "dha phase 2": "dha-phase-2",
    "dha phase 3": "dha-phase-3",
    "dha phase 4": "dha-phase-4",
    "dha phase 5": "dha-phase-5",
    "dha phase 6": "dha-phase-6",
    "dha phase 7": "dha-phase-7",
    "dha phase 8": "dha-phase-8",
    "dha phase 9": "dha-phase-9",
    "dha prism": "dha-phase-9",
    "dha rahbar": "dha-rahbar",
    "askari 10": "askari-10",
    "askari 11": "askari-11",
    "askari 1": "askari-1",
    "askari 5": "askari-5",
    "burki road": "barki-road",
    "burki": "barki-road",
    "barki": "barki-road",
    "bedian": "bedian-road",
    "raiwind": "raiwind-road",
    "paragon": "paragon-city",
    "state life": "state-life",
    "central park": "central-park",
    "sui gas": "sui-gas-society",
    "shalimar": "shalamar",
    "shalimar gardens": "shalamar",
    "shalamar gardens": "shalamar",
    "androon lahore": "walled-city",
    "badshahi mosque": "walled-city",
    "lahore fort": "walled-city",
    "johar": "johar-town",
    "gor": "model-town",
    "liberty": "liberty",
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

    return None

