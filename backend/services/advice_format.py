"""Format health/diet advice as concise bullet lines for the frontend."""

from __future__ import annotations

import hashlib
import re

from services.patient_doc_advice import build_patient_doc_bullets
from services.seasonal_intelligence import (
    get_season_profile,
    lahore_now,
    normalize_season_id,
)
from tools.lahore_season import is_smog_season

SEASON_HEALTH_FALLBACK: dict[str, list[str]] = {
    "winter_smog": [
        "Wear an N95 or KN95 mask when outdoors — mandatory in Lahore smog.",
        "Stay indoors when possible; keep windows closed.",
        "Use HEPA filtration or an air purifier at home.",
        "Limit strenuous outdoor activity until AQI improves.",
        "Avoid industrial corridors (Kot Lakhpat) when commuting.",
        "Shower after returning home to remove fine particles.",
    ],
    "spring_dust": [
        "AQI is variable — check readings before long outdoor plans.",
        "Dust and pollen may irritate airways; mask if sensitive.",
        "Stay hydrated and limit exertion on high-AQI windy days.",
        "Keep rescue inhaler accessible if you have asthma.",
        "Postpone outdoor workouts during dust storm alerts.",
        "Open windows only when AQI is in the green/moderate range.",
    ],
    "summer_heatwave": [
        "Drink water every 30 minutes — heat plus pollution dehydrates faster.",
        "Avoid outdoor activity 12–4 PM; travel before 10 AM if possible.",
        "Watch for heat exhaustion: dizziness, nausea, heavy sweating.",
        "Keep electrolytes balanced — ORS or coconut water helps.",
        "Use a damp cloth on neck/wrists to cool down indoors.",
        "Ozone peaks in afternoon — limit exertion near busy roads.",
    ],
    "monsoon": [
        "Mold allergy alert — keep indoor humidity controlled.",
        "Drive carefully; wet roads and post-rain dust spikes are common.",
        "Avoid flooded underpasses and waterlogged streets.",
        "Use mask if post-rain dust pushes AQI up.",
        "Dry footwear and change clothes if caught in rain.",
        "Boiled/filtered water only during heavy monsoon weeks.",
    ],
}

SEASON_DIET_POOL: dict[str, list[str]] = {
    "winter_smog": [
        "Subah taza seb (apple) — fiber aur vitamins ke liye",
        "Garam yakhni ya soup — throat clear rakhne ke liye",
        "Thori si badam ya akhrot — subah ke nashte ke sath",
        "Raat ko haldi wala doodh (haldi doodh)",
        "Ghar ka palak saag ya aloo palak",
        "Taza pani aur nimbu — din mein ek cup",
        "Rohu machli ya anda — hafte mein do dafa protein",
        "Gajar aur chukandar ka fresh juice",
        "Moong ki daal ka halka soup",
        "Anar ke daane — antioxidants ke liye",
        "Pakaye hue khane mein thora lehsan",
        "Amrood ke tukray — sardi mein milta hai",
    ],
    "spring_dust": [
        "Amrood aur ber — seasonal phal",
        "Falsa ya aloo bukhara",
        "Local shahad — pollen season (agar sugar theek ho)",
        "Halka khana — zyada oily na ho",
        "Sprouted moong ki chat — ghar pe",
        "Gajar-apple ka fresh juice",
        "Steamed mixed sabzi — ghar ka",
        "Podina ki chutney — khane ke sath",
        "Chukandar ka raita",
        "Normal temperature pani zyada peena",
        "Dalia ya oats — subah",
    ],
    "summer_heatwave": [
        "Thanda nimbu pani — podina aur kala namak ke sath",
        "Meethi ya namkeen lassi — bina zyada shakkar",
        "Tarbuz ke thande tukray — roz dopahar ko",
        "Kharbooza — thanda, iftar ya shaam ko",
        "Nariyal pani — garmi mein behtareen",
        "Kheera ka raita — khane ke sath",
        "Sattu sharbat — thanda, namkeen",
        "Aam panna — kacha aam ka sharbat",
        "Falsa ka crush — jab season ho",
        "Thanda plain doodh — sone se pehle",
        "Sabza seeds wala rooh afza — thora sa",
        "Halki moong ki khichdi — raat ka khana",
        "Dahi ke sath kela — snack",
        "Lauki ka juice — ghar pe nikala hua",
        "Anar ka thanda juice",
        "Thanda chaas (lassi jaisa)",
        "Bel sharbat — agar maujood ho",
    ],
    "monsoon": [
        "Ubalta hua ya filter pani hi peena",
        "Halka khana — moong daal, sabzi, dahi",
        "Ghar ka pakaya khana — street food skip karein",
        "Jamun — immunity ke liye",
        "Garam sabzi soup agar zukam ho",
        "Adrak wali khichdi",
        "Garam roti — naram, taza",
        "Tulsi aur adrak ka pani",
        "Papita — hazma theek rehne ke liye",
        "Ghar ka chicken yakhni soup",
        "Thori si bhuni chana — snack",
        "Halki haldi wali doodh",
    ],
}

CONDITION_HEALTH: dict[str, list[str]] = {
    "asthma": [
        "Pre-medicate 15 minutes before your commute if your doctor advised it.",
        "Keep salbutamol/rescue inhaler in your bag — not in a hot car glove box.",
        "Avoid sudden cold-to-hot air changes; they can trigger bronchospasm.",
        "Track peak flow twice daily during high-AQI weeks.",
        "Skip outdoor runs on AQI above 150; use indoor alternatives.",
    ],
    "heart disease": [
        "Avoid heavy exertion outdoors when AQI and heat are both high.",
        "Watch for chest tightness or unusual fatigue during your route.",
        "Take prescribed heart meds on time — heat stress raises cardiovascular load.",
        "Prefer shorter, shaded segments if you must walk in peak hours.",
        "Limit salty street food — sodium plus heat strains blood pressure.",
    ],
    "diabetes": [
        "Check blood sugar before long commutes — heat can shift glucose levels.",
        "Carry fast-acting glucose if you use insulin or sulfonylureas.",
        "Avoid skipping meals before outdoor travel in hot weather.",
        "Stay extra hydrated — dehydration can spike blood sugar readings.",
        "Wear breathable footwear to prevent foot issues on long walks.",
    ],
}

CONDITION_DIET: dict[str, list[str]] = {
    "asthma": [
        "Garam pani aur adrak — thanda drink kam karein",
        "Rohu machli — hafte mein do dafa (omega-3)",
        "Anda ya doodh — vitamin D ke liye",
    ],
    "heart disease": [
        "Kam namak wala khana — fruit chaat par extra namak na dalein",
        "Dalia ya jau ka kanji — subah",
        "Kela — moderation mein (doctor se pooch kar)",
    ],
    "diabetes": [
        "Bina shakkar lassi ya chaas",
        "Whole wheat roti — naan kam",
        "Kheera-tamatar salad — halka snack",
    ],
}

COMMUTE_HEALTH: dict[str, list[str]] = {
    "walk": [
        "Walking exposes you longer — choose the lowest-AQI corridor shown.",
        "Take a 2-minute shade break every 15 minutes in garmi season.",
        "Wear a well-fitted N95; cloth masks are not enough at AQI 120+.",
    ],
    "bike": [
        "Cycling raises breathing rate — mask fit is critical.",
        "Plan route before 10 AM or after 6 PM in pre-monsoon heat.",
        "Carry a small water bottle — sip every 10 minutes.",
    ],
    "car": [
        "Use recirculation mode in traffic jams near high-AQI zones.",
        "Replace cabin air filter if you commute daily through smog corridors.",
        "Park in shade — car interiors amplify heat and VOC exposure.",
    ],
    "public_transport": [
        "Stand away from bus exhaust at stops; exhaust worsens local AQI.",
        "Keep a spare N95 in your bag for crowded, dusty platforms.",
        "Exit one stop early and walk the last stretch through greener streets.",
    ],
}

SENSITIVITY_HEALTH: dict[str, list[str]] = {
    "high": [
        "Your high pollution sensitivity means even moderate AQI can trigger symptoms.",
        "Consider postponing non-essential trips when AQI exceeds 100.",
        "Run a HEPA purifier in the room where you sleep.",
    ],
    "medium": [
        "Limit outdoor exertion to under 30 minutes when AQI is above 120.",
        "Keep windows closed during morning and evening rush-hour pollution peaks.",
    ],
    "low": [
        "You tolerate pollution better, but still avoid strenuous activity above AQI 200.",
    ],
}

OUTDOOR_HEALTH: dict[str, list[str]] = {
    "under_30": [
        "Short outdoor exposure — a fitted N95 is usually sufficient for your trip.",
    ],
    "30_60": [
        "30–60 min outdoors daily — schedule around AQI dips, not peak heat.",
    ],
    "1_2": [
        "1–2 hours outdoors — take a hydration break halfway through your route.",
    ],
    "2_plus": [
        "2+ hours outdoors — you need shade, water every 30 min, and a spare mask.",
    ],
}

SUMMARY_UR: dict[str, str] = {
    "winter_smog": "Smog season — mask pehnein, ghar mein rahein jab ho sake.",
    "spring_dust": "Spring dust — AQI variable hai, mask aur ehtiyat karein.",
    "summer_heatwave": "Garmi season — paani zyada, dopahar mein bahir kam jayein.",
    "monsoon": "Barsaat — paani aur safe commute, ganda pani se bachein.",
}


def _clean_line(line: str) -> str:
    line = re.sub(r"^[\s•\-*–—\d.)\]]+", "", line.strip())
    return line.strip()


def bullets_from_text(text: str, max_items: int = 5) -> list[str]:
    if not text or not text.strip():
        return []

    lines = [_clean_line(l) for l in text.splitlines()]
    lines = [l for l in lines if len(l) > 10 and len(l) < 200]

    if len(lines) >= 2:
        return lines[:max_items]

    sentences = re.split(r"(?<=[.!?])\s+", text.replace("\n", " "))
    sentences = [s.strip() for s in sentences if 12 < len(s.strip()) < 200]
    return sentences[:max_items]


def _variation_seed(*parts: str) -> int:
    raw = "|".join(p.strip().lower() for p in parts if p)
    return int(hashlib.md5(raw.encode()).hexdigest(), 16)


def _pick_varied(pool: list[str], seed: int, count: int, *, skip: set[str] | None = None) -> list[str]:
    skip = skip or set()
    if not pool:
        return []
    start = seed % len(pool)
    picked: list[str] = []
    seen: set[str] = set(skip)
    for i in range(len(pool)):
        item = pool[(start + i) % len(pool)]
        key = item.lower()
        if key in seen:
            continue
        picked.append(item)
        seen.add(key)
        if len(picked) >= count:
            break
    return picked


def _parse_conditions(conditions: str) -> list[str]:
    raw = conditions.lower()
    found: list[str] = []
    for key in ("asthma", "heart disease", "diabetes"):
        if key in raw:
            found.append(key)
    return found


def _time_aware_tip(season_id: str, hour: int) -> str | None:
    if season_id == "summer_heatwave":
        if 12 <= hour < 16:
            return (
                f"It is {hour:02d}:00 now — peak heat hours. "
                "Delay non-urgent travel until after 6 PM if you can."
            )
        if hour >= 18:
            return (
                f"It is {hour:02d}:00 now — evening window is open. "
                "This is a safer time to travel; still hydrate and avoid rush-hour exhaust."
            )
        if hour < 10:
            return (
                f"It is {hour:02d}:00 now — good morning window. "
                "Travel before heat and ozone peak this afternoon."
            )
    if season_id == "winter_smog" and hour < 9:
        return (
            f"It is {hour:02d}:00 now — early morning smog often peaks. "
            "Check live AQI before leaving."
        )
    return None


def _age_tip(age: int, season_id: str, aqi: int) -> str | None:
    if age >= 60:
        return "Age 60+ — avoid outdoor exertion when AQI exceeds 100; ask family for errands."
    if age <= 12:
        return "Children breathe faster — limit outdoor play when AQI is above 100."
    if age >= 45 and season_id == "summer_heatwave":
        return "Mid-life cardiovascular load rises in heat — pace yourself on this route."
    if aqi >= 150 and age >= 50:
        return "Consider rescheduling non-urgent travel until AQI drops below 100."
    return None


def _season_summary_en(
    season_id: str,
    aqi: int,
    temp_c: float,
    *,
    profile_name: str,
    conditions_list: list[str],
) -> str:
    who = profile_name.strip() or "You"
    cond = ", ".join(conditions_list) if conditions_list else "no listed conditions"
    profile = get_season_profile(season_id)
    return (
        f"{who}: {profile.name} ({profile.months}) — AQI {aqi}, {temp_c:.0f}°C, "
        f"profile ({cond}). Hazard: {profile.primary_hazard}."
    )


def _profile_health_bullets(
    *,
    conditions_list: list[str],
    sensitivity: str,
    commute_mode: str,
    outdoor_time: str,
    age: int,
    season_id: str,
    aqi: int,
    source: str,
    destination: str,
    seed: int,
) -> list[str]:
    bullets: list[str] = []

    for cond in conditions_list:
        pool = CONDITION_HEALTH.get(cond, [])
        bullets.extend(_pick_varied(pool, seed + ord(cond[0]), 2))

    bullets.extend(_pick_varied(SENSITIVITY_HEALTH.get(sensitivity, []), seed + 3, 1))
    bullets.extend(_pick_varied(COMMUTE_HEALTH.get(commute_mode, []), seed + 7, 1))
    bullets.extend(_pick_varied(OUTDOOR_HEALTH.get(outdoor_time, []), seed + 11, 1))

    age_tip = _age_tip(age, season_id, aqi)
    if age_tip:
        bullets.append(age_tip)

    time_tip = _time_aware_tip(season_id, lahore_now().hour)
    if time_tip:
        bullets.append(time_tip)

    if source and destination:
        bullets.append(
            f"Route {source} → {destination}: pick the lowest-AQI corridor from suggestions."
        )

    if aqi >= 200:
        bullets.insert(0, "Stay indoors — air is hazardous for your profile right now.")
    elif aqi >= 150 and is_smog_season(season_id):
        bullets.insert(0, "Wear an N95 mask for any outdoor exposure on this route.")

    return bullets


def format_health_advice(
    rag_text: str,
    aqi: int,
    conditions: str,
    *,
    season_id: str = "winter_smog",
    temp_c: float = 0.0,
    source: str = "",
    destination: str = "",
    age: int = 25,
    sensitivity: str = "medium",
    commute_mode: str = "car",
    outdoor_time: str = "30_60",
    profile_name: str = "",
    user_id: str | None = None,
) -> str:
    season_id = normalize_season_id(season_id)
    season_intel = get_season_profile(season_id)
    conditions_list = _parse_conditions(conditions)
    hour_bucket = lahore_now().strftime("%Y-%m-%d-%H")
    seed = _variation_seed(
        user_id or profile_name,
        conditions,
        sensitivity,
        commute_mode,
        outdoor_time,
        str(age),
        source,
        destination,
        str(aqi),
        season_id,
        hour_bucket,
    )

    patient_bullets = build_patient_doc_bullets(rag_text, aqi=aqi)
    rag_bullets = bullets_from_text(rag_text, max_items=2)
    profile_bullets = _profile_health_bullets(
        conditions_list=conditions_list,
        sensitivity=sensitivity,
        commute_mode=commute_mode,
        outdoor_time=outdoor_time,
        age=age,
        season_id=season_id,
        aqi=aqi,
        source=source,
        destination=destination,
        seed=seed,
    )

    season_pool = SEASON_HEALTH_FALLBACK.get(
        season_id, SEASON_HEALTH_FALLBACK["winter_smog"]
    )
    season_bullets = _pick_varied(season_pool, seed + 19, 2)

    bullets: list[str] = []
    seen: set[str] = set()
    for group in (patient_bullets, profile_bullets, season_bullets, rag_bullets):
        for b in group:
            key = b.lower()[:60]
            if key not in seen:
                bullets.append(b)
                seen.add(key)
            if len(bullets) >= 4:
                break
        if len(bullets) >= 4:
            break

    if not is_smog_season(season_id):
        bullets = [b for b in bullets if "smog season" not in b.lower()]

    if season_id == "summer_heatwave" and temp_c >= 38 and not any(
        "water" in b.lower() or "hydr" in b.lower() for b in bullets
    ):
        bullets.insert(0, "Drink water every 30 minutes — heat plus pollution is risky.")

    summary_en = _season_summary_en(
        season_id, aqi, temp_c, profile_name=profile_name, conditions_list=conditions_list
    )
    summary_ur = SUMMARY_UR.get(season_id, "Lahore hawa ke liye neeche guidance follow karein.")

    body = "\n".join(f"• {b}" for b in bullets[:4])
    return f"{summary_en}\n{summary_ur}\n\n{body}"


def format_diet_plan(
    rag_text: str,
    *,
    season_id: str = "winter_smog",
    aqi: int = 100,
    conditions: str = "",
    age: int = 25,
    sensitivity: str = "medium",
    source: str = "",
    destination: str = "",
    user_id: str | None = None,
) -> list[str]:
    season_id = normalize_season_id(season_id)
    season_intel = get_season_profile(season_id)
    conditions_list = _parse_conditions(conditions)
    hour_bucket = lahore_now().strftime("%Y-%m-%d-%H")
    seed = _variation_seed(
        user_id or "",
        conditions,
        sensitivity,
        str(age),
        source,
        destination,
        str(aqi),
        season_id,
        hour_bucket,
    )

    patient_bullets = build_patient_doc_bullets(rag_text, aqi=aqi)
    rag_bullets = bullets_from_text(rag_text, max_items=2)

    # --- Priority order: patient docs → conditions → season pool → RAG ---
    # This ensures personalized content is never pushed out by generic items.
    picked: list[str] = []
    seen_lower: set[str] = set()

    def _add(item: str) -> bool:
        """Add item if unique and under limit; return True if added."""
        key = item.strip().lower()[:80]
        if key in seen_lower or len(picked) >= 4:
            return False
        picked.append(item)
        seen_lower.add(key)
        return True

    # 1. Patient-uploaded document bullets (highest priority)
    for item in patient_bullets[:2]:
        _add(item[:90])

    # 2. Condition-specific diet items (asthma, diabetes, heart disease)
    for cond in conditions_list:
        cond_items = _pick_varied(CONDITION_DIET.get(cond, []), seed + ord(cond[0]), 1)
        for item in cond_items:
            _add(item)

    # 3. Season intelligence focus item
    intel_item = season_intel.nutrition_agent_focus.split(";")[0].strip()
    if intel_item:
        _add(intel_item)

    # 4. Season pool items to fill remaining slots
    pool = list(SEASON_DIET_POOL.get(season_id, SEASON_DIET_POOL["winter_smog"]))
    if season_id == "summer_heatwave":
        pool = [p for p in pool if "ginger tea" not in p.lower()]
    for item in _pick_varied(pool, seed, 4):
        _add(item)

    # 5. RAG-sourced bullets
    for item in rag_bullets:
        if len(item) < 90:
            _add(item)

    # 6. High-sensitivity AQI boost
    if sensitivity == "high" and aqi >= 120:
        _add("Aaj extra vitamins — subah taza seb.")

    if not picked:
        picked = list(SEASON_DIET_POOL.get(season_id, SEASON_DIET_POOL["winter_smog"])[:4])

    return picked[:4]
