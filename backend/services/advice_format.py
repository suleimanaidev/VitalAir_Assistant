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
        "Airway PPE & Barrier: Deploy a certified N95/FFP2 respirator with an airtight nasal seal to filter out 95%+ of deep alveolar PM2.5 micro-particulates.",
        "Micro-Environment Isolation: Lock indoor residential zones using True HEPA (H13) purifiers and sealed apertures to maintain indoor AQI < 25.",
        "Cardiopulmonary Limits: Cap continuous outdoor walking to <20 minutes; maintain heart rate <110 bpm to avoid exercise-induced hyperventilation.",
        "Smog Chronobiology: Strictly avoid transit during thermal inversion spikes (06:00–09:30 AM & 07:00–10:00 PM); utilize midday safe windows.",
        "Vehicular Isolation: Enforce 100% AC Recirculation Mode in transit, blocking >80% of road-level diesel and combustion soot penetration.",
        "Post-Exposure Protocol: Perform hypertonic saline nasal irrigation and warm water facial wash immediately upon returning indoors.",
    ],
    "spring_dust": [
        "Airway Defense: Wear an N95 respirator during high-wind intervals to arrest coarse PM10 dust and seasonal pollen allergens.",
        "Bronchodilator Protocol: Keep rapid-acting Salbutamol rescue bronchodilator on standby; monitor peak flow if history of allergic airway spasm.",
        "Hydration & Mucosal Care: Maintain cellular hydration (>2.5L filtered water) to protect respiratory mucosal barrier integrity against dust irritation.",
        "Ventilation Window: Ventilate indoor spaces exclusively during midday moderate AQI dips; keep windows sealed during dust storm advisories.",
        "Cardiorespiratory Pacing: Restrict strenuous outdoor interval cardio workouts during active PM10 dust surge alerts.",
    ],
    "summer_heatwave": [
        "Electrolyte & Vascular Homeostasis: Hydrate every 20-30 minutes with electrolyte-balanced fluids (ORS/coconut water) to prevent heat-induced hemoconcentration.",
        "Peak Ozone & Solar Window: Restrict outdoor transit during peak secondary photochemical ozone production (12:00–04:30 PM); prioritize early morning or post-6 PM transit.",
        "Cardiovascular Load: Monitor for heat exhaustion biomarkers (dizziness, tachycardia >110 bpm, profuse diaphoresis); rest immediately in shaded, cooled areas.",
        "Microclimate Protection: Pre-cool vehicular cabins and run active AC Recirculation to reduce simultaneous thermal stress and particulate inhalation.",
        "Respiratory Membrane Shield: Avoid high-traffic industrial corridors where extreme heat accelerates ground-level toxic VOC gas formation.",
    ],
    "monsoon": [
        "Fungal & Mold Airway Alert: Maintain indoor relative humidity below 55% with dehumidification to prevent fungal spore propagation and acute bronchospasm.",
        "Vehicular Safety: Wet road dynamics and post-precipitation dust surges elevate local particulates — keep car AC in 100% Recirculation Mode.",
        "Microbial Hygiene: Consume boiled or multi-stage filtered water only to protect against seasonal gastrointestinal waterborne pathogens.",
        "Aerosol Protection: Wear a protective mask during windy post-rain dust spikes to prevent acute upper airway hyperresponsiveness.",
        "Clothing & Skin Protocol: Immediately replace moisture-laden garments after transit to prevent bronchial cold-shock and mold contact.",
    ],
}

SEASON_MEALS: dict[str, dict[str, list[str]]] = {
    "monsoon": {
        "breakfast": [
            "[Breakfast • Monsoon] Fresh Lemon Water & Crisp Apple — Boosts airway immunity and counters humidity.",
            "[Breakfast • Monsoon] Morning Oatmeal with Almonds & Filtered Water — Sustained digestive energy and heart wellness.",
            "[Breakfast • Monsoon] Sprouted Moong Salad & Boiled Egg — Airway clearing protein for asthma and respiratory care.",
        ],
        "lunch": [
            "[Lunch • Monsoon] Homemade Moong Dal, Soft Roti & Cucumber Raita — Light, easy-to-digest midday meal.",
            "[Lunch • Monsoon] Black Jamun, Steamed Vegetables & Chapati — Low glycemic index, protects heart and lungs.",
            "[Lunch • Monsoon] Steamed Beetroot Salad with Okra (Bhindi) — Gentle on the stomach during humid monsoon days.",
        ],
        "snack": [
            "[Evening Snack • Monsoon] Fresh Falsa / Papaya Bowl — High antioxidant intake for lung defense.",
            "[Evening Snack • Monsoon] Roasted Chickpeas & Fresh Lemon Water — High energy, low-moisture healthy snack.",
            "[Evening Snack • Monsoon] Fresh Pomegranate Seeds — Boosts blood circulation and cellular defense.",
        ],
        "dinner": [
            "[Dinner • Monsoon] Warm Chicken Broth Soup with Boiled Water — Clears chest and throat before sleep.",
            "[Dinner • Monsoon] Light Moong Khichdi with Fresh Yogurt — Protects against seasonal gut infections and mold spores.",
            "[Dinner • Monsoon] Warm Turmeric Milk & Soft Whole Wheat Roti — Soothes airways and reduces overnight inflammation.",
        ],
    },
    "summer_heatwave": {
        "breakfast": [
            "[Breakfast • Heatwave] Pure Coconut Water & Fresh Apple — Early morning hydration and electrolyte replenishment.",
            "[Breakfast • Heatwave] Oatmeal with Chilled Milk & Chia Seeds — Low sodium, heart-healthy breakfast for heat.",
            "[Breakfast • Heatwave] Raw Mango Cooler (Aam Panna) & Whole Grain Toast — Boosts stamina and heatstroke resistance.",
        ],
        "lunch": [
            "[Lunch • Heatwave] Chilled Cucumber Mint Raita, Bottle Gourd & Roti — Defends against peak afternoon ozone and heat.",
            "[Lunch • Heatwave] Fresh Watermelon Slices & Probiotic Yogurt Lassi — Maximum daytime hydration and cellular cooling.",
            "[Lunch • Heatwave] Barley Sattu Drink & Sprouted Moong Bowl — Light digestive protein without thermal stress.",
        ],
        "snack": [
            "[Evening Snack • Heatwave] Falsa Berry Crush / Sweet Musk Melon — Controls body heat and relieves oxidative stress.",
            "[Evening Snack • Heatwave] Chilled Lemon Water with Fresh Mint — Restores electrolyte balance after daytime heat.",
            "[Evening Snack • Heatwave] Basil Seed (Sabza) Herbal Drink — Natural gut-cooling and soothing drink.",
        ],
        "dinner": [
            "[Dinner • Heatwave] Light Moong Khichdi & Plain Yogurt — Effortless digestion for restful sleep in hot weather.",
            "[Dinner • Heatwave] Steamed Seasonal Greens & Soft Flatbread — Prevents heavy thermal load before bedtime.",
            "[Dinner • Heatwave] Chilled Plain Milk with a pinch of Cardamom — Soothes acidity and cools internal heat.",
        ],
    },
    "winter_smog": {
        "breakfast": [
            "[Breakfast • Smog Season] Warm Chicken Yakhni Soup, Fresh Apple & Walnuts — Builds immunity against fine PM2.5 particles.",
            "[Breakfast • Smog Season] Warm Boiled Eggs & Whole Grain Oats — Sustained respiratory energy for cold mornings.",
            "[Breakfast • Smog Season] Pure Honey with Warm Ginger Water — Coats and protects the morning airway lining.",
        ],
        "lunch": [
            "[Lunch • Smog Season] Fresh Spinach (Palak/Saag), Whole Wheat Roti & Garlic — Rich in iron and anti-inflammatory compounds.",
            "[Lunch • Smog Season] Hot Moong Dal Soup & Steamed Vegetables — Clears bronchial tubes at midday.",
            "[Lunch • Smog Season] Grilled Fish (Rohu / Trout) — High Omega-3 fatty acids for cardiovascular and lung resilience.",
        ],
        "snack": [
            "[Evening Snack • Smog Season] Fresh Carrot & Beetroot Juice — Enhances oxygen delivery and provides deep antioxidants.",
            "[Evening Snack • Smog Season] Pomegranate Seeds & Raw Walnuts — Fights smog-induced oxidative stress.",
            "[Evening Snack • Smog Season] Fresh Guava with Black Pepper — High Vitamin C for lung tissue repair.",
        ],
        "dinner": [
            "[Dinner • Smog Season] Warm Golden Turmeric Milk & Soft Flatbread — Overnight lung restoration and throat soothing.",
            "[Dinner • Smog Season] Steaming Chicken Soup with Crushed Garlic — Clears throat and chest before sleep.",
            "[Dinner • Smog Season] Moong Dal Khichdi with Cooked Garlic — Restorative and easy-to-digest evening dinner.",
        ],
    },
    "spring_dust": {
        "breakfast": [
            "[Breakfast • Spring Dust] Oatmeal with Pure Honey & Fresh Apple — Pollen allergy support and respiratory lining care.",
            "[Breakfast • Spring Dust] Fresh Carrot-Apple Juice — Refreshes and fortifies the airway lining.",
        ],
        "lunch": [
            "[Lunch • Spring Dust] Steamed Mixed Vegetables & Fresh Mint Chutney — Easy digestion during dusty conditions.",
            "[Lunch • Spring Dust] Sprouted Moong Salad & Soft Chapati — Lean protein and immune fortification.",
        ],
        "snack": [
            "[Evening Snack • Spring Dust] Fresh Falsa / Plums — Shields cells from particulate dust stress.",
            "[Evening Snack • Spring Dust] Guava & Fresh Seasonal Berries — Rich Vitamin C booster.",
        ],
        "dinner": [
            "[Dinner • Spring Dust] Beetroot Yogurt Raita & Soft Flatbread — Supports natural detoxification and hydration.",
            "[Dinner • Spring Dust] Yellow Moong Dal with Room Temperature Water — Gentle nighttime digestive recovery.",
        ],
    },
}

SEASON_DIET_POOL: dict[str, list[str]] = {
    "winter_smog": [
        "[Breakfast • Winter Smog] Fresh Apple & Raw Almonds — Lung immunity and smog resistance.",
        "[Lunch • Winter Smog] Hot Moong Dal Soup — Clears throat and reduces airway inflammation.",
        "[Evening Snack • Winter Smog] Fresh Carrot & Beetroot Juice — Oxygen delivery and antioxidant support.",
        "[Dinner • Winter Smog] Warm Turmeric Milk — Overnight lung restoration and throat relief.",
        "[Breakfast • Winter Smog] Warm Bone Broth Soup — Keeps morning airways clear.",
        "[Lunch • Winter Smog] Steamed Spinach & Garlic — Rich in bioavailable iron and vitamins.",
        "[Evening Snack • Winter Smog] Pomegranate Seeds — Antioxidant shield against smog particulates.",
        "[Dinner • Winter Smog] Cooked Garlic in Warm Broth — Natural respiratory antimicrobial protection.",
    ],
    "spring_dust": [
        "[Breakfast • Spring Dust] Pure Honey & Warm Oatmeal — Pollen allergy and airway soothing.",
        "[Lunch • Spring Dust] Steamed Vegetables with Mint Chutney — Light digestion on dusty days.",
        "[Evening Snack • Spring Dust] Fresh Plums or Berries — Cellular defense against dust particles.",
        "[Dinner • Spring Dust] Beetroot Raita with Filtered Water — Natural detox and hydration.",
        "[Breakfast • Spring Dust] Fresh Carrot-Apple Juice — Refreshes respiratory tract.",
        "[Lunch • Spring Dust] Sprouted Moong Salad — Protein and immune defense.",
    ],
    "summer_heatwave": [
        "[Breakfast • Summer Heat] Chilled Coconut Water & Apple — Early hydration and electrolyte balance.",
        "[Lunch • Summer Heat] Fresh Lemon Mint Water & Watermelon — Combats midday heat and ozone dehydration.",
        "[Evening Snack • Summer Heat] Sattu Beverage & Falsa Crush — Regulates core temperature and fights inflammation.",
        "[Dinner • Summer Heat] Cucumber Raita & Light Khichdi — Cooling, effortless digestion before sleep.",
        "[Breakfast • Summer Heat] Raw Mango Drink (Aam Panna) — Shields against heat exhaustion and dehydration.",
        "[Lunch • Summer Heat] Chilled Sweet or Salted Yogurt Lassi — Natural midday gut hydration.",
    ],
    "monsoon": [
        "[Breakfast • Monsoon] Warm Lemon Ginger Water — Guards against humidity and throat irritation.",
        "[Lunch • Monsoon] Black Jamun & Cucumber Raita — Healthy digestion, blood sugar control and heart care.",
        "[Evening Snack • Monsoon] Fresh Papaya / Falsa Bowl — High antioxidants and airway protection.",
        "[Dinner • Monsoon] Boiled Filtered Water & Moong Dal Soup — Shields against airborne mold spores.",
        "[Breakfast • Monsoon] Holy Basil (Tulsi) Ginger Tea — Airway defense and asthma support.",
        "[Lunch • Monsoon] Warm Flatbread with Yellow Moong Dal — Gentle monsoonal digestion.",
        "[Evening Snack • Monsoon] Roasted Gram / Chickpea Snack — Healthy, crisp, low-moisture energy.",
        "[Dinner • Monsoon] Warm Chicken Yakhni Soup — Clears chest and throat on rainy evenings.",
    ],
}

CONDITION_HEALTH: dict[str, list[str]] = {
    "asthma": [
        "Pre-medicate 15 minutes before commute if prescribed; ensure tight N95 seal to block 95%+ of deep alveolar PM2.5 particles.",
        "Keep rapid-acting Salbutamol rescue bronchodilator in hand luggage (avoid high car temperatures) and perform post-commute airway rinse.",
        "Maintain outdoor exertion window under 25 minutes to prevent hyperventilation and acute bronchospasm.",
        "Track peak expiratory flow (PEF) twice daily; postpone outdoor cardio workouts whenever AQI exceeds 120.",
        "Ensure vehicle AC is locked in 100% Recirculation Mode to reduce cabin particulate penetration by up to 80%.",
    ],
    "heart disease": [
        "Cap continuous outdoor walking to under 20 minutes to prevent tachycardia, myocardial oxygen mismatch, and arterial vasoconstriction.",
        "Monitor for subtle chest tightness, palpitations, or shortness of breath; adhere strictly to prescribed anti-hypertensive regimen.",
        "Set vehicular AC to Recirculation Mode and run True HEPA air filtration indoors to lower vascular endothelial stress.",
        "Avoid high-traffic combustion corridors during peak thermal inversion hours (06:00-09:30 AM & 07:30-10:30 PM).",
        "Maintain heart rate below 110 bpm during outdoor transit to minimize pollution-induced cardiac strain.",
    ],
    "diabetes": [
        "Check blood glucose before long commutes; ambient particulate exposure combined with heat stress shifts glycemic homeostasis.",
        "Carry fast-acting glucose tablets or oral rehydration solution during travel.",
        "Wear an N95 respirator to prevent systemic microvascular inflammation and oxidative stress.",
        "Maintain optimal cellular hydration with >2.5L filtered water to support renal clearance of airborne toxins.",
        "Use supportive, breathable footwear and schedule travel during lower pollution windows (11:00 AM - 03:30 PM).",
    ],
}

CONDITION_DIET: dict[str, list[str]] = {
    "asthma": [
        "[Morning 🌅 • Asthma Care] Warm water & ginger — helps ease airway constriction.",
        "[Afternoon ☀️ • Asthma Care] Fresh lemon water & Vitamin C — provides antioxidant airway protection.",
        "[Night 🌙 • Asthma Care] Warm turmeric milk & light broth — helps soothe nighttime breathing.",
    ],
    "heart disease": [
        "[Morning 🌅 • Heart Care] Oatmeal or barley porridge — supports healthy cholesterol and blood pressure.",
        "[Afternoon ☀️ • Heart Care] Berries & low-sodium salad — protects vascular and heart health.",
        "[Evening 🌆 • Heart Care] Garlic & anti-inflammatory soup — supports healthy circulation.",
    ],
    "diabetes": [
        "[Morning 🌅 • Diabetes Care] Sprouted moong & oats — helps maintain steady blood glucose.",
        "[Afternoon ☀️ • Diabetes Care] Unsweetened lassi or buttermilk — cooling low-glycemic drink.",
        "[Evening 🌆 • Diabetes Care] Cucumber & tomato salad — light, high-fiber snack.",
    ],
}

COMMUTE_HEALTH: dict[str, list[str]] = {
    "walk": [
        "Pedestrian Dose Mitigation: Continuous walking triples minute ventilation rate — strictly adhere to the designated low-exposure corridor.",
        "Airway Filtration: Wear a sealed N95/FFP2 respirator; basic surgical or cloth masks offer <35% barrier against fine PM2.5 particles.",
        "Thermal & Cardiopulmonary Pacing: Take a 2-minute shaded rest every 15 minutes during elevated temperature or moderate pollution intervals.",
    ],
    "bike": [
        "Minute Ventilation Control: Cycling elevates pulmonary airflow up to 40 L/min — ensure an airtight N95 mask seal to prevent alveolar soot penetration.",
        "Chronobiological Timing: Schedule commutes before 09:30 AM or after 06:00 PM to circumvent peak ground-level photochemical ozone.",
        "Cellular Hydration: Hydrate with electrolyte fluids every 10–15 minutes to counter high pulmonary evaporative fluid loss.",
    ],
    "car": [
        "Cabin Isolation: Lock vehicle AC in 100% Recirculation Mode, blocking up to 80% of road-level toxic carbon soot and NO2.",
        "Filtration Maintenance: Ensure high-efficiency cabin micro-filters (MERV 13 / HEPA) are clean for frequent transit through high-AQI corridors.",
        "Microclimate Protection: Park in shaded areas to prevent interior VOC outgassing and extreme thermal accumulation.",
    ],
    "public_transport": [
        "Exhaust Proximity: Maintain at least 5 meters distance from bus tailpipe exhaust zones at transit stations to avoid localized PM2.5 spikes.",
        "Respiratory PPE: Keep a backup sealed N95 respirator in hand luggage for crowded, unventilated transit platforms.",
        "Route Optimization: Debus at low-density stops and navigate terminal pedestrian stretches through vegetated corridors.",
    ],
}

SENSITIVITY_HEALTH: dict[str, list[str]] = {
    "high": [
        "High Vulnerability Protocol: Elevated bronchial hyperresponsiveness — postpone non-essential outdoor transit when AQI exceeds 100.",
        "Clinical Exposure Cap: Restrict continuous outdoor exposure to <20 minutes with real-time heart rate pacing <105 bpm.",
        "Indoor Sanctuary: Operate True HEPA air filtration continuously in the primary bedroom, targeting an indoor AQI < 20.",
    ],
    "medium": [
        "Moderate Vulnerability: Limit continuous outdoor exertion to under 25 minutes whenever ambient AQI exceeds 120.",
        "Peak Inversion Protection: Maintain airtight window seals during morning and evening rush-hour pollution peaks (07:00–09:30 AM, 07:00–10:00 PM).",
    ],
    "low": [
        "General Preventive Baseline: Maintain standard pulmonary precautions and avoid strenuous high-intensity cardio when AQI exceeds 180.",
    ],
}

OUTDOOR_HEALTH: dict[str, list[str]] = {
    "under_30": [
        "Short Transit Window: Brief exposure (<30 mins) — a certified, well-sealed N95 respirator provides >95% deep alveolar particle protection.",
    ],
    "30_60": [
        "Extended Exposure Protocol (30–60 mins): Pace exertion to keep minute ventilation low; plan route along verified green corridors.",
    ],
    "1_2": [
        "Prolonged Exposure Warning (1–2 hrs): Mandatory hydration break every 25 minutes; replace disposable respirator if breathing resistance increases.",
    ],
    "2_plus": [
        "Heavy Environmental Burden (2+ hrs): Significant toxic particulate inhalation risk — enforce strict N95 seal compliance, scheduled cooling, and electrolyte rehydration.",
    ],
}

SUMMARY_UR: dict[str, str] = {
    "winter_smog": "⚠️ Smog Inversion Alert — Wear sealed N95 PPE and enforce indoor True HEPA isolation.",
    "spring_dust": "⚠️ Dust & Allergen Surge — Monitor airway reactivity and use protective airway barriers.",
    "summer_heatwave": "⚠️ Extreme Heatwave & Ozone Peak — Maintain electrolyte hydration and avoid midday solar exposure.",
    "monsoon": "⚠️ Monsoon Humidity & Mold Alert — Regulate indoor humidity and maintain micro-environment isolation.",
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
        cond_names = " and ".join(c.title() for c in conditions_list)
        summary_ur = f"⚠️ Because your profile includes {cond_names}, take extra care at AQI {aqi} during {season_intel.name}."
    else:
        summary_ur = SUMMARY_UR.get(season_id, "Please follow the protective health guidance below.")

    summary_en = _season_summary_en(
        season_id,
        aqi,
        temp_c,
        profile_name=profile_name,
        conditions_list=conditions_list,
    )

    body = "\n".join(f"• {b}" for b in bullets[:4])
    med_note = "\n\n⚠️ Medical Note: If you experience severe respiratory distress, worsening symptoms, or persistent discomfort, consult a qualified physician or pulmonologist immediately (طبیعت زیادہ خراب ہونے کی صورت میں فوراً ڈاکٹر یا پلمونولوجسٹ سے رجوع کریں)."
    return f"{summary_en}\n{summary_ur}\n\n{body}{med_note}"


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
