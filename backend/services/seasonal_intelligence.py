"""
Lahore Seasonal Intelligence Engine — Pakistan-specific agent behaviour by season.
Innovation 3: built FOR Lahore, not adapted from a global model.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

LAHORE_TZ = timezone(timedelta(hours=5))

# Legacy season ids from earlier builds → canonical Innovation 3 ids
SEASON_ALIASES: dict[str, str] = {
    "smog_winter": "winter_smog",
    "autumn_buildup": "winter_smog",
    "spring_transition": "spring_dust",
    "pre_monsoon_heat": "summer_heatwave",
}


@dataclass(frozen=True)
class SeasonProfile:
    id: str
    name: str
    months: str
    label_en: str
    label_ur: str
    primary_hazard: str
    pollutants: tuple[str, ...]
    health_agent_focus: str
    nutrition_agent_focus: str
    route_agent_focus: str
    avoid_areas: tuple[str, ...]
    preferred_travel_window: str


SEASON_PROFILES: dict[str, SeasonProfile] = {
    "winter_smog": SeasonProfile(
        id="winter_smog",
        name="Winter Smog",
        months="Oct–Jan",
        label_en="Winter smog / sardi",
        label_ur="Smog / sardi season",
        primary_hazard="PM2.5, PM10, NO₂ from crop burning & inversion",
        pollutants=("PM2.5", "PM10", "NO₂"),
        health_agent_focus="N95 mandatory outdoors; stay indoors when AQI > 150; HEPA at home.",
        nutrition_agent_focus="Ginger tea, vitamin C (kinnow), turmeric, omega-3, warm fluids.",
        route_agent_focus="Avoid industrial corridors (Kot Lakhpat, Quaid-e-Azam Industrial) — higher PM load.",
        avoid_areas=("Kot Lakhpat", "Quaid-e-Azam Industrial Estate", "Raiwind Road industrial belt"),
        preferred_travel_window="Mid-morning 10 AM–2 PM when inversion sometimes lifts",
    ),
    "spring_dust": SeasonProfile(
        id="spring_dust",
        name="Spring Dust",
        months="Feb–Apr",
        label_en="Spring dust & pollen",
        label_ur="Spring / beech ka mausam",
        primary_hazard="Dust storms, pollen, variable AQI",
        pollutants=("PM10", "Pollen", "Dust"),
        health_agent_focus="Mask for dust storms; antihistamine plan if allergic; limit exertion on windy days.",
        nutrition_agent_focus="Vitamin C, local honey, anti-inflammatory greens, plenty of water.",
        route_agent_focus="Avoid open arterial roads during dust spikes; prefer tree-lined corridors.",
        avoid_areas=("Canal Bank Road (open dust)", "GT Road dusty stretches"),
        preferred_travel_window="Early morning before construction & wind pick-up",
    ),
    "summer_heatwave": SeasonProfile(
        id="summer_heatwave",
        name="Summer Heatwave",
        months="May–Jul",
        label_en="Garmi / heatwave",
        label_ur="Garmi season",
        primary_hazard="Ozone (O₃), heat stress, dehydration",
        pollutants=("O₃", "Heat", "PM2.5"),
        health_agent_focus="Hydration every 30 min; heat stroke watch; avoid 12–4 PM outdoors.",
        nutrition_agent_focus="Electrolytes, watermelon, ORS, lassi, coconut water — NOT heavy ginger tea.",
        route_agent_focus="Travel before 10 AM or after 6 PM; shaded corridors; shortest time outdoors.",
        avoid_areas=("Open sun corridors", "Mall Road midday without shade"),
        preferred_travel_window="Before 10 AM or after 6 PM",
    ),
    "monsoon": SeasonProfile(
        id="monsoon",
        name="Monsoon",
        months="Aug–Sep",
        label_en="Barsaat / monsoon",
        label_ur="Barsaat / monsoon",
        primary_hazard="Humidity, mold spores, post-rain dust",
        pollutants=("Humidity", "Mold spores", "PM10"),
        health_agent_focus="Mold allergy alert; dry indoor air; avoid flooded underpasses.",
        nutrition_agent_focus="Anti-fungal foods (garlic, turmeric), boiled water, light cooked meals.",
        route_agent_focus="Flood-prone road avoidance; check underpasses after heavy rain.",
        avoid_areas=("Underpasses", "Low-lying Shahdara approaches", "Waterlogged Mughalpura"),
        preferred_travel_window="Between rain spells — check live weather before leaving",
    ),
}


def normalize_season_id(season_id: str) -> str:
    return SEASON_ALIASES.get(season_id, season_id)


def get_season_profile(season_id: str) -> SeasonProfile:
    canonical = normalize_season_id(season_id)
    return SEASON_PROFILES.get(canonical, SEASON_PROFILES["winter_smog"])


def is_smog_season(season_id: str) -> bool:
    return normalize_season_id(season_id) == "winter_smog"


def season_profile_to_dict(profile: SeasonProfile) -> dict:
    return {
        "id": profile.id,
        "name": profile.name,
        "months": profile.months,
        "label_en": profile.label_en,
        "label_ur": profile.label_ur,
        "primary_hazard": profile.primary_hazard,
        "pollutants": list(profile.pollutants),
        "health_agent_focus": profile.health_agent_focus,
        "nutrition_agent_focus": profile.nutrition_agent_focus,
        "route_agent_focus": profile.route_agent_focus,
        "avoid_areas": list(profile.avoid_areas),
        "preferred_travel_window": profile.preferred_travel_window,
    }


def agent_directives(season_id: str) -> dict[str, str]:
    p = get_season_profile(season_id)
    return {
        "health": p.health_agent_focus,
        "nutrition": p.nutrition_agent_focus,
        "route": p.route_agent_focus,
    }


def lahore_now() -> datetime:
    return datetime.now(LAHORE_TZ)


def _time_window(hour: int) -> str:
    if 5 <= hour < 10:
        return "early_morning"
    if 10 <= hour < 12:
        return "late_morning"
    if 12 <= hour < 16:
        return "afternoon"
    if 16 <= hour < 18:
        return "late_afternoon"
    if 18 <= hour < 22:
        return "evening"
    return "night"


def build_time_recommendation(
    *,
    season_id: str,
    aqi: int,
    temp_c: float = 0.0,
    conditions: list[str] | None = None,
    sensitivity: str = "medium",
) -> dict:
    """Build a time-aware travel/outdoor recommendation dict.

    Returns {hour, time_label, emoji, safe_to_go, title_ur, message_ur, message_en}.
    Pure logic — zero API calls, zero cost.
    """
    now = lahore_now()
    hour = now.hour
    window = _time_window(hour)
    canonical = normalize_season_id(season_id)
    conds = _normalize_conditions(conditions)

    time_label = now.strftime("%I:%M %p PKT")  # e.g. "04:50 PM PKT"
    has_respiratory = any(c in conds for c in ("asthma", "copd"))
    has_heart = "heart disease" in conds
    is_sensitive = sensitivity == "high" or has_respiratory or has_heart

    # Default: safe
    safe_to_go = True
    emoji = "✅"
    title_ur = f"🕐 Abhi {time_label} — bahar jaana theek hai"
    message_ur = "Ehtiyaat ke sath safar kar sakte hain."
    message_en = f"Current time {time_label}. Outdoor activity is acceptable."

    # ---- Hazardous AQI overrides everything ----
    if aqi >= 200:
        safe_to_go = False
        emoji = "🚫"
        title_ur = f"🕐 Abhi {time_label} — bilkul bahar na jayein"
        message_ur = f"AQI {aqi} bohat kharab hai. Ghar mein rahein aur windows band rakhein."
        message_en = f"AQI {aqi} is hazardous. Stay indoors regardless of time."

    # ---- Summer heatwave ----
    elif canonical == "summer_heatwave":
        if window == "afternoon":
            safe_to_go = False
            emoji = "🔥"
            title_ur = f"🕐 Abhi {time_label} — dopahar ki garmi, bahar na jayein"
            if is_sensitive:
                message_ur = (
                    f"Abhi peak garmi ka waqt hai aur AQI {aqi} hai. "
                    "Aap ki health condition ke liye yeh waqt risky hai — 6 PM ke baad jayein."
                )
            else:
                message_ur = (
                    f"Dopahar 12-4 PM garmi aur ozone peak hai. AQI {aqi}. "
                    "Agar zaruri na ho to 6 PM ke baad jayein."
                )
            message_en = (
                f"It's {time_label} — peak heat hours (12-4 PM). AQI {aqi}. "
                "Delay travel until after 6 PM if possible."
            )
        elif window == "late_afternoon":
            if aqi >= 150 or (is_sensitive and aqi >= 100):
                safe_to_go = False
                emoji = "⏳"
                title_ur = f"🕐 Abhi {time_label} — thori der aur ruk jayein"
                message_ur = (
                    f"Garmi abhi bhi hai aur AQI {aqi} hai. "
                    "1-2 ghantay baad (6 PM ke baad) jaana behtar hoga."
                )
            else:
                emoji = "⏳"
                title_ur = f"🕐 Abhi {time_label} — thori der mein behtar hoga"
                message_ur = (
                    "Garmi kam ho rahi hai. Agar zaruri ho to ja sakte hain, "
                    "warna 6 PM ke baad ideal hai."
                )
            message_en = (
                f"It's {time_label}. Heat is still high. "
                "Wait 1-2 hours for the evening window if you can."
            )
        elif window in ("evening", "night"):
            emoji = "✅"
            title_ur = f"🕐 Abhi {time_label} — shaam ka acha waqt hai"
            message_ur = "Garmi kam ho gayi hai. Safar ke liye yeh acha waqt hai, paani peete rahein."
            message_en = f"It's {time_label}. Evening window — good time to travel. Stay hydrated."
            if aqi >= 150:
                emoji = "⚠️"
                message_ur += f" Lekin AQI {aqi} abhi bhi zyada hai, mask lagayein."
        elif window == "early_morning":
            emoji = "✅"
            title_ur = f"🕐 Abhi {time_label} — subah ka behtareen waqt"
            message_ur = "11 AM se pehle safar kar lein, yeh din ka sabse acha window hai."
            message_en = f"It's {time_label}. Best travel window before heat builds."
        elif window == "late_morning":
            emoji = "⚠️"
            title_ur = f"🕐 Abhi {time_label} — jaldi nikal jayein"
            message_ur = "Garmi barhne lagi hai. Agar jaana hai to abhi nikal jayein."
            message_en = f"It's {time_label}. Heat building — leave soon or wait until evening."

    # ---- Winter smog ----
    elif canonical == "winter_smog":
        if window in ("early_morning", "night") and aqi >= 150:
            safe_to_go = False
            emoji = "🌫️"
            title_ur = f"🕐 Abhi {time_label} — subah smog peak hai"
            message_ur = (
                f"AQI {aqi} aur early morning inversion — smog zyada hai. "
                "10 AM ke baad jaana behtar hai."
            )
            message_en = f"It's {time_label}. Morning smog inversion is peaking. Wait until mid-morning."
        elif aqi >= 150:
            safe_to_go = False
            emoji = "🌫️"
            title_ur = f"🕐 Abhi {time_label} — smog bohat zyada hai"
            message_ur = f"AQI {aqi} unhealthy hai. N95 mask zaruri hai, trip short rakhein."
            message_en = f"AQI {aqi} in smog season. N95 mandatory for any outdoor exposure."

    # ---- Monsoon ----
    elif canonical == "monsoon":
        if window in ("evening", "night"):
            emoji = "🌧️"
            title_ur = f"🕐 Abhi {time_label} — baarish check karein"
            message_ur = "Barsaat ke baad sadkein gili hoti hain. Underpasses avoid karein."
            message_en = f"It's {time_label}. Check for post-rain flooding before traveling."

    # ---- Sensitive profile override ----
    if safe_to_go and is_sensitive and aqi >= 120:
        emoji = "⚠️"
        title_ur = f"🕐 Abhi {time_label} — ehtiyaat se jayein"
        message_ur += f" AQI {aqi} aap ke liye moderate risk hai — mask use karein."
        message_en += f" AQI {aqi} is borderline for your health profile."

    return {
        "hour": hour,
        "time_label": time_label,
        "emoji": emoji,
        "safe_to_go": safe_to_go,
        "title_ur": title_ur,
        "message_ur": message_ur,
        "message_en": message_en,
    }


def _normalize_conditions(conditions: list[str] | None) -> list[str]:
    if not conditions:
        return []
    return [
        c.strip().lower()
        for c in conditions
        if c.strip() and c.strip().lower() not in ("none", "")
    ]


def build_personalized_season_intelligence(
    season_id: str,
    *,
    aqi: int,
    temp_c: float = 0.0,
    conditions: list[str] | None = None,
    age: int = 25,
    sensitivity: str = "medium",
    commute_mode: str = "car",
    when: datetime | None = None,
) -> dict:
    """
    Season profile adjusted for Lahore local time, AQI, and user health profile.
    """
    canonical = normalize_season_id(season_id)
    base = season_profile_to_dict(get_season_profile(canonical))
    now = when or lahore_now()
    hour = now.hour
    window = _time_window(hour)
    conds = _normalize_conditions(conditions)

    health = base["health_agent_focus"]
    nutrition = base["nutrition_agent_focus"]
    route = base["route_agent_focus"]
    travel_window = base["preferred_travel_window"]
    time_note = f"Local time {hour:02d}:00 PKT"

    if canonical == "summer_heatwave":
        if window == "afternoon":
            health = (
                f"{time_note} — peak heat now. Stay indoors if you can; "
                "hydrate every 30 min and watch for heat exhaustion."
            )
            route = (
                "Avoid non-urgent travel until after 6 PM — open sun and ozone are highest now."
            )
            travel_window = "Not ideal right now — wait until after 6 PM"
        elif window in ("evening", "night"):
            health = (
                f"{time_note} — evening is safer for travel. Heat is easing; "
                "still drink water and limit exertion near busy roads."
            )
            route = (
                "Good time to commute now — evening window is open. "
                "Pick shaded corridors and keep the trip as short as possible."
            )
            travel_window = "Good time to travel now (after 6 PM)"
        elif window == "early_morning":
            health = (
                f"{time_note} — morning window is ideal. Hydrate before leaving and "
                "avoid strenuous activity after 11 AM."
            )
            route = "Travel now before heat builds — this is the best window of the day."
            travel_window = "Good time to travel now (before 10 AM)"
        elif window == "late_afternoon":
            health = (
                f"{time_note} — heat still high. If you must travel, leave within the "
                "next hour or wait until after 6 PM."
            )
            route = "Late afternoon — consider waiting 1–2 hours for the evening window."
            travel_window = "Better after 6 PM unless urgent"
    elif canonical == "winter_smog":
        if window in ("early_morning", "night"):
            health = (
                f"{time_note} — early morning smog often peaks. Check live AQI; "
                "delay outdoor plans if readings are above 150."
            )
            route = "Morning inversion may trap pollution — prefer mid-morning if AQI is high."
            travel_window = "Check AQI — mid-morning often clearer than dawn"
        elif window == "afternoon" and aqi >= 150:
            health = f"{time_note} — AQI {aqi} is unhealthy. N95 mask essential for any outdoor time."
    elif canonical == "spring_dust":
        if window in ("late_morning", "afternoon"):
            route = "Wind and dust often peak midday — morning or evening routes are safer."
            travel_window = "Early morning or after sunset preferred"
    elif canonical == "monsoon":
        if window in ("evening", "night"):
            route = "After rain, roads may be wet — avoid flooded underpasses on this route."
            travel_window = "Travel between rain spells; check underpass status"

    if "asthma" in conds:
        if aqi >= 100:
            health = (
                f"Asthma on your profile — keep rescue inhaler ready at AQI {aqi}. "
                + health
            )
            nutrition = (
                "Anti-inflammatory foods help airways — vitamin C, warm fluids; "
                + nutrition
            )
        else:
            health = (
                "Asthma profile — inhaler saath rakhein; aaj ki hawa theek hai. "
                + health
            )

    if "heart disease" in conds:
        if temp_c >= 35 and aqi >= 100:
            health = (
                f"Heart condition — avoid heavy exertion when heat and AQI are both high. "
                + health
            )
            route = (
                "Cardiovascular strain rises in heat + pollution — prefer AC car or postpone if possible. "
                + route
            )
        elif aqi >= 100:
            health = (
                "Heart condition on your profile — take it easy in heat; air is moderate today. "
                + health
            )
        else:
            health = (
                "Heart profile — normal commute OK; stay hydrated and avoid sudden exertion. "
                + health
            )

    if "diabetes" in conds:
        nutrition = (
            "Unsweetened drinks only (no sugary lassi or rooh afza). "
            + nutrition
        )

    if sensitivity == "high" and aqi >= 100:
        health = (
            f"High pollution sensitivity — take extra care when AQI is {aqi} or above. "
            + health
        )

    if commute_mode in ("walk", "bike"):
        if aqi >= 100:
            route = (
                f"Walking/cycling raises exposure — consider a mask on this {commute_mode} commute. "
                + route
            )
        else:
            route = (
                f"Bike/walk commute is fine today — air is acceptable; stay hydrated. "
                + route
            )
    elif commute_mode == "public_transport":
        route = (
            "Stand away from bus exhaust at stops; keep a spare N95 for dusty platforms. "
            + route
        )

    if age >= 60:
        health = f"Age {age}+ — shorten outdoor time when AQI exceeds 100. " + health
    elif age <= 12:
        health = f"Child profile (age {age}) — limit outdoor play when AQI is above 100. " + health

    if aqi >= 200:
        route = f"AQI {aqi} is hazardous — postpone travel unless absolutely necessary."
        travel_window = "Stay indoors if possible"
    elif aqi >= 150:
        health = f"AQI {aqi} is unhealthy — N95 mask for any outdoor exposure. " + health

    result = dict(base)
    result["health_agent_focus"] = health
    result["nutrition_agent_focus"] = nutrition
    result["route_agent_focus"] = route
    result["preferred_travel_window"] = travel_window
    return result
