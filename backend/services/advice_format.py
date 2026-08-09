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

SEASON_MEALS: dict[str, dict[str, list[str]]] = {
    "monsoon": {
        "breakfast": [
            "[Nashta (Breakfast) • Monsoon] Fresh Nimbu Paani aur Taza Seb — Monsoon humidity aur airway immunity ke liye.",
            "[Nashta (Breakfast) • Monsoon] Subah Dalia, Badam aur Filtered Paani — Subah ki digestive energy aur heart protection.",
            "[Nashta (Breakfast) • Monsoon] Sprouted Moong Chat aur Boiled Anda — Airway clearing & protein for asthma in monsoon.",
        ],
        "lunch": [
            "[☀️ Dopahar Ka Khana (Lunch) • Monsoon] Ghar ki Moong Daal, Naram Roti aur Kheera Raita — Dopahar mein halka hazma.",
            "[☀️ Dopahar Ka Khana (Lunch) • Monsoon] Jamun, Mixed Sabzi aur Chappati — Low sugar, dil aur asthma protection.",
            "[☀️ Dopahar Ka Khana (Lunch) • Monsoon] Steamed Chukandar Salad aur Bhindi — Heavy monsoon stomach relief.",
        ],
        "snack": [
            "[🌆 Shaam Ka Snack (Evening) • Monsoon] Falsa Juice ya Papita — Shaam ke waqt high antioxidant & lung defense.",
            "[🌆 Shaam Ka Snack (Evening) • Monsoon] Bhuni Chana aur Nimbu Paani — High energy, low-moisture healthy snack.",
            "[🌆 Shaam Ka Snack (Evening) • Monsoon] Fresh Anar ke Daane — Shaam ke waqt blood circulation boost.",
        ],
        "dinner": [
            "[🌙 Raat Ka Khana (Dinner) • Monsoon] Ubla Filtered Paani aur Chicken Yakhni Soup — Raat ko chest clearance.",
            "[🌙 Raat Ka Khana (Dinner) • Monsoon] Halki Moong Khichdi aur Dahi — Raat ko mold spore infection se bachao.",
            "[🌙 Raat Ka Khana (Dinner) • Monsoon] Garam Haldi Doodh aur Naram Roti — Night-time airway & joint relief.",
        ],
    },
    "summer_heatwave": {
        "breakfast": [
            "[🌅 Nashta (Breakfast) • Heatwave] Nariyal Paani aur Taza Seb — Early hydration aur electrolyte balance.",
            "[🌅 Nashta (Breakfast) • Heatwave] Oatmeal aur Thanda Doodh — Low sodium breakfast for heat.",
            "[🌅 Nashta (Breakfast) • Heatwave] Kacha Aam Panna aur Toast — Heatstroke resistance & stamina.",
        ],
        "lunch": [
            "[☀️ Dopahar Ka Khana (Lunch) • Heatwave] Thanda Kheera Raita, Lauki Sabzi aur Roti — Dopahar ki garmi aur ozone se bachao.",
            "[☀️ Dopahar Ka Khana (Lunch) • Heatwave] Tarbuz Ke Tukray aur Meethi/Namkeen Lassi — Dopahar mein maximum cooling.",
            "[☀️ Dopahar Ka Khana (Lunch) • Heatwave] Sattu Sharbat aur Sprouted Moong Chat — Light digestive protein.",
        ],
        "snack": [
            "[🌆 Shaam Ka Snack (Evening) • Heatwave] Falsa Crush / Kharbooza — Body heat control & anti-inflammatory.",
            "[🌆 Shaam Ka Snack (Evening) • Heatwave] Thanda Nimbu Paani Podina Ke Sath — Afternoon hydration recharge.",
            "[🌆 Shaam Ka Snack (Evening) • Heatwave] Sabza Seeds Rooh Afza / Bel Sharbat — Cooling gut health.",
        ],
        "dinner": [
            "[🌙 Raat Ka Khana (Dinner) • Heatwave] Halki Moong Khichdi aur Dahi — Raat ko light digestion before sleep.",
            "[🌙 Raat Ka Khana (Dinner) • Heatwave] Steamed Sabzi aur Naram Roti — Restful sleep without heavy heat.",
            "[🌙 Raat Ka Khana (Dinner) • Heatwave] Thanda Plain Doodh — Sone se pehle acidity & heat relief.",
        ],
    },
    "winter_smog": {
        "breakfast": [
            "[🌅 Nashta (Breakfast) • Smog Season] Garam Yakhni Soup, Taza Seb aur Badam — Subah smog particles se immunity.",
            "[🌅 Nashta (Breakfast) • Smog Season] Garam Anda & Oats — Respiratory strength for cold morning.",
            "[🌅 Nashta (Breakfast) • Smog Season] Local Shahad aur Garam Paani — Morning airway lining coating.",
        ],
        "lunch": [
            "[☀️ Dopahar Ka Khana (Lunch) • Smog Season] Palak Saag, Whole Wheat Roti aur Lehsan — Iron & anti-inflammatory.",
            "[☀️ Dopahar Ka Khana (Lunch) • Smog Season] Garam Moong Daal Soup aur Steamed Sabzi — Clear lungs at lunchtime.",
            "[☀️ Dopahar Ka Khana (Lunch) • Smog Season] Rohu Machli / Fish Curry — Omega-3 cardiovascular & lung protection.",
        ],
        "snack": [
            "[🌆 Shaam Ka Snack (Evening) • Smog Season] Gajar aur Chukandar Fresh Juice — Oxygen delivery & antioxidants.",
            "[🌆 Shaam Ka Snack (Evening) • Smog Season] Anar ke Daane aur Akhrot — Smog oxidative stress defense.",
            "[🌆 Shaam Ka Snack (Evening) • Smog Season] Amrood (Guava) — Vitamin C lung tissue repair.",
        ],
        "dinner": [
            "[🌙 Raat Ka Khana (Dinner) • Smog Season] Garam Haldi Doodh aur Naram Roti — Raat ko lungs restoration.",
            "[🌙 Raat Ka Khana (Dinner) • Smog Season] Garam Chicken Yakhni Soup — Night-time throat & airway clearing.",
            "[🌙 Raat Ka Khana (Dinner) • Smog Season] Moong Khichdi aur Pakaye Khane Mein Lehsan — Respiratory recovery.",
        ],
    },
    "spring_dust": {
        "breakfast": [
            "[🌅 Nashta (Breakfast) • Spring Dust] Dalia, Local Shahad aur Seb — Pollen allergy & airway support.",
            "[🌅 Nashta (Breakfast) • Spring Dust] Gajar-Apple Fresh Juice — Airway lining refreshment.",
        ],
        "lunch": [
            "[☀️ Dopahar Ka Khana (Lunch) • Spring Dust] Steamed Mixed Sabzi aur Podina Chutney — Dusty days mein halki digestion.",
            "[☀️ Dopahar Ka Khana (Lunch) • Spring Dust] Sprouted Moong Chat & Chappati — Protein & immunity boost.",
        ],
        "snack": [
            "[🌆 Shaam Ka Snack (Evening) • Spring Dust] Falsa / Aloo Bukhara — Dust particle stress defense.",
            "[🌆 Shaam Ka Snack (Evening) • Spring Dust] Amrood & Ber — Seasonal fruit boost.",
        ],
        "dinner": [
            "[🌙 Raat Ka Khana (Dinner) • Spring Dust] Chukandar Raita & Naram Roti — Dust detox & hydration.",
            "[🌙 Raat Ka Khana (Dinner) • Spring Dust] Moong Daal & Normal Temperature Water — Light night digestive care.",
        ],
    },
}

SEASON_DIET_POOL: dict[str, list[str]] = {
    "winter_smog": [
        "[Subah 🌅 • Winter Smog] Taza seb aur badam — lung immunity aur smog resistance ke liye.",
        "[Dophar ☀️ • Winter Smog] Garam moong daal soup — throat clear karne aur inflammation kam karne ke liye.",
        "[Shaam 🌆 • Winter Smog] Gajar aur chukandar fresh juice — oxygen delivery aur antioxidants ke liye.",
        "[Raat 🌙 • Winter Smog] Garam haldi wala doodh — raat ko lungs restoration aur throat relief ke liye.",
        "[Subah 🌅 • Winter Smog] Garam yakhni soup — subah airway clear rakhne ke liye.",
        "[Dophar ☀️ • Winter Smog] Ghar ka palak saag — iron aur vitamins ke liye.",
        "[Shaam 🌆 • Winter Smog] Anar ke daane — smog particles se antioxidant defense.",
        "[Raat 🌙 • Winter Smog] Pakaye khane mein lehsan — respiratory protection.",
    ],
    "spring_dust": [
        "[Subah 🌅 • Spring Dust] Subah local shahad aur dalia — pollen allergy aur airway support ke liye.",
        "[Dophar ☀️ • Spring Dust] Steamed sabzi aur podina chutney — dusty days mein halki digestion ke liye.",
        "[Shaam 🌆 • Spring Dust] Falsa ya aloo bukhara — dust particle stress defense ke liye.",
        "[Raat 🌙 • Spring Dust] Chukandar raita aur normal pani — dust detox aur hydration ke liye.",
        "[Subah 🌅 • Spring Dust] Gajar-apple fresh juice — airway lining refresh karne ke liye.",
        "[Dophar ☀️ • Spring Dust] Sprouted moong chat — protein aur immunity boost.",
    ],
    "summer_heatwave": [
        "[Subah 🌅 • Summer Heat] Thanda nariyal pani aur seb — early hydration aur electrolytes ke liye.",
        "[Dophar ☀️ • Summer Heat] Thanda nimbu pani aur tarbuz — dopahar ki garmi aur ozone dehydration se bachao.",
        "[Shaam 🌆 • Summer Heat] Sattu sharbat aur falsa crush — body heat control aur anti-inflammatory support.",
        "[Raat 🌙 • Summer Heat] Thanda kheera raita aur halki khichdi — cooling digestion before sleep.",
        "[Subah 🌅 • Summer Heat] Kacha aam panna — heat stroke resistance ke liye.",
        "[Dophar ☀️ • Summer Heat] Meethi ya namkeen lassi — dopahar ki garmi mein hydration.",
    ],
    "monsoon": [
        "[Subah 🌅 • Monsoon] Garam nimbu & adrak paani — humidity aur throat immunity ke liye.",
        "[Dophar ☀️ • Monsoon] Jamun & kheera raita — dopahar ki garmi mein digestion, sugar control aur dil ke liye.",
        "[Shaam 🌆 • Monsoon] Falsa juice ya papita — high antioxidants aur airway protection ke liye.",
        "[Raat 🌙 • Monsoon] Ubla filtered paani & moong soup — monsoon mold spores aur infection se bachao.",
        "[Subah 🌅 • Monsoon] Tulsi aur adrak ka paani — immunity aur asthma protection.",
        "[Dophar ☀️ • Monsoon] Garam naram roti aur moong daal — light monsoonal digestion.",
        "[Shaam 🌆 • Monsoon] Bhuni chana snack — energy aur low moisture snack.",
        "[Raat 🌙 • Monsoon] Garam chicken yakhni soup — rainy evening chest clearance.",
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
        "[Subah 🌅 • Asthma Care] Garam pani aur adrak — airway constriction kam karne ke liye.",
        "[Dophar ☀️ • Asthma Care] Nimbu paani & Vitamin C — airway inflammation protection ke liye.",
        "[Raat 🌙 • Asthma Care] Haldi doodh & garam soup — night-time wheezing control ke liye.",
    ],
    "heart disease": [
        "[Subah 🌅 • Heart Care] Dalia ya jau ka kanji — cholesterol aur blood pressure balance ke liye.",
        "[Dophar ☀️ • Heart Care] Jamun & kam namak salad — dil aur vascular protection ke liye.",
        "[Shaam 🌆 • Heart Care] Garlic & anti-inflammatory soup — blood circulation smooth rakhne ke liye.",
    ],
    "diabetes": [
        "[Subah 🌅 • Diabetes Care] Sprouted moong & oats — stable sugar balance ke liye.",
        "[Dophar ☀️ • Diabetes Care] Bina shakkar lassi ya chaas — low glycemic cooling drink.",
        "[Shaam 🌆 • Diabetes Care] Kheera-tamatar salad — halka healthy snack.",
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

    if conditions_list:
        cond_names = " aur ".join(c.title() for c in conditions_list)
        summary_ur = f"⚠️ Kyunke aap ko {cond_names} hai, isliye AQI {aqi} aur {season_intel.label_ur} mein zaroori ehtiyat karein."
    else:
        summary_ur = SUMMARY_UR.get(season_id, "Lahore hawa ke liye neeche guidance follow karein.")

    summary_en = _season_summary_en(
        season_id,
        aqi,
        temp_c,
        profile_name=profile_name,
        conditions_list=conditions_list,
    )

    body = "\n".join(f"• {b}" for b in bullets[:4])
    return f"{summary_en}\n{summary_ur}\n\n{body}"


def format_diet_plan(
    rag_text: str,
    *,
    season_id: str | None = None,
    aqi: int = 100,
    conditions: str = "",
    age: int = 25,
    sensitivity: str = "medium",
    source: str = "",
    destination: str = "",
    user_id: str | None = None,
) -> list[str]:
    from tools.lahore_season import get_lahore_season
    season_id = normalize_season_id(season_id or get_lahore_season().id)
    meals = SEASON_MEALS.get(season_id, SEASON_MEALS["monsoon"])
    hour = lahore_now().hour
    if 5 <= hour < 12:
        primary_key = "breakfast"
    elif 12 <= hour < 17:
        primary_key = "lunch"
    elif 17 <= hour < 21:
        primary_key = "snack"
    else:
        primary_key = "dinner"

    import random
    import time
    rng = random.Random(time.time_ns() + hash(conditions + source + str(aqi)))

    items = list(meals[primary_key])
    rng.shuffle(items)
    picked = items[:3]

    next_keys = {"breakfast": "lunch", "lunch": "snack", "snack": "dinner", "dinner": "breakfast"}
    comp_items = list(meals[next_keys[primary_key]])
    picked.append(rng.choice(comp_items))

    return picked
