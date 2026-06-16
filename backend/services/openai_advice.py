"""Direct OpenAI health/diet advice when CrewAI is not installed."""

from __future__ import annotations

from config import get_settings
from services.seasonal_intelligence import lahore_now
from tools.lahore_season import is_smog_season


def _chat(system: str, user: str, max_tokens: int = 600) -> str | None:
    settings = get_settings()
    if not settings.has_openai:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key.strip())
        model = settings.openai_model.strip() or "gpt-4o-mini"
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
            temperature=0.4,
        )
        text = response.choices[0].message.content
        return text.strip() if text else None
    except Exception:
        return None


def generate_health_advice(
    *,
    aqi: int,
    conditions: str,
    rag_context: str,
    profile_summary: str,
    season_id: str = "winter_smog",
    season_label: str = "Lahore",
    temp_c: float = 0.0,
    source: str = "",
    destination: str = "",
    has_patient_docs: bool = False,
) -> str | None:
    no_smog = not is_smog_season(season_id)
    hour = lahore_now().hour
    season_rule = (
        "Do NOT mention smog season or smog episodes — current season is hot/monsoon, focus on heat and hydration."
        if no_smog
        else "Smog season guidance is appropriate (N95, indoor, HEPA)."
    )
    time_rule = ""
    if season_id == "summer_heatwave":
        if hour >= 18:
            time_rule = (
                f"Local time is {hour:02d}:00 PKT (evening). "
                "Tell the user this IS a good time to travel — do NOT say wait until after 6 PM."
            )
        elif 12 <= hour < 16:
            time_rule = (
                f"Local time is {hour:02d}:00 PKT (afternoon peak heat). "
                "Advise delaying travel until after 6 PM if possible."
            )
        elif hour < 10:
            time_rule = (
                f"Local time is {hour:02d}:00 PKT (morning). "
                "This is a good travel window before heat builds."
            )
    doc_rule = (
        "Patient uploaded health documents — cite medications only from the "
        "'Your health documents' section below."
        if has_patient_docs
        else "No patient documents uploaded — do NOT mention prescriptions, Salbutamol, or uploaded records."
    )
    return _chat(
        system=(
            "You are a digital pulmonologist for VitalAir Lahore. "
            "Give 4-5 bullet points (• prefix). Tailor every bullet to the user's age, "
            "conditions, sensitivity, and commute — not generic advice. "
            "Start with one English summary line, then one Roman Urdu summary line, then bullets. "
            f"{season_rule} {time_rule} {doc_rule}"
        ),
        user=(
            f"Season: {season_label} ({season_id})\n"
            f"Local time: {hour:02d}:00 PKT\n"
            f"Temperature: {temp_c}°C\n"
            f"Route: {source} → {destination}\n"
            f"AQI: {aqi}\nProfile: {profile_summary}\nConditions: {conditions}\n\n"
            f"Knowledge base context:\n{rag_context[:4000]}"
        ),
    )


def generate_diet_plan(
    *,
    aqi: int,
    rag_context: str,
    season_id: str = "winter_smog",
    season_label: str = "Lahore",
    conditions: str = "",
    age: int = 25,
    sensitivity: str = "medium",
    commute_mode: str = "car",
    source: str = "",
    destination: str = "",
) -> list[str] | None:
    heat_note = ""
    if season_id in ("pre_monsoon_heat", "summer_heatwave"):
        heat_note = (
            " Prefer varied cooling foods — rotate options like sattu, aam panna, chaas, "
            "coconut water, lauki juice. Avoid repeating the same 4 items every time."
        )
    elif season_id == "monsoon":
        heat_note = " Focus on hydration, light meals, hygiene."
    raw = _chat(
        system=(
            "You are an environmental nutritionist for Lahore. Return ONLY a JSON array of 4-6 "
            f"unique short food/drink strings tailored to the patient's profile. "
            f"Never return the same generic list for every user.{heat_note}"
        ),
        user=(
            f"Season: {season_label} ({season_id})\n"
            f"Local time: {lahore_now().hour:02d}:00 PKT\n"
            f"Route: {source} → {destination}\n"
            f"AQI {aqi} in Lahore.\n"
            f"Age: {age}, Conditions: {conditions}, Sensitivity: {sensitivity}, Commute: {commute_mode}\n"
            f"Vary foods by profile — asthma/heart/diabetes should change recommendations.\n"
            f"Context:\n{rag_context[:3000]}"
        ),
        max_tokens=300,
    )
    if not raw:
        return None
    try:
        import json

        start = raw.find("[")
        end = raw.rfind("]")
        if start < 0 or end <= start:
            return None
        items = json.loads(raw[start : end + 1])
        if isinstance(items, list):
            return [str(x).strip() for x in items if str(x).strip()][:6]
    except Exception:
        pass
    return None
