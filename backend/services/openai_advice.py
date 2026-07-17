"""Direct OpenAI health/diet advice when CrewAI is not installed."""

from __future__ import annotations

import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

from config import get_settings
from services.seasonal_intelligence import lahore_now
from tools.lahore_season import is_smog_season


def _chat(
    system: str,
    user: str,
    max_tokens: int = 600,
    temperature: float = 0.4,
    timeout_seconds: float = 8.0,
) -> str | None:
    settings = get_settings()
    if not settings.has_openai:
        logger.debug("OpenAI key not configured — skipping _chat")
        return None
    logger.debug("_chat → model=%s timeout=%.1fs", get_settings().openai_model or "gpt-4o-mini", timeout_seconds)
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=settings.openai_api_key.strip(),
            timeout=timeout_seconds,
            max_retries=0,
        )
        model = settings.openai_model.strip() or "gpt-4o-mini"
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        text = response.choices[0].message.content
        return text.strip() if text else None
    except Exception as exc:
        logger.warning("OpenAI _chat failed: %s", exc)
        return None


@lru_cache(maxsize=128)
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
    logger.debug("generate_health_advice  aqi=%d season=%s src=%s dst=%s", aqi, season_id, source, destination)
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
        "Patient uploaded health documents are included below. "
        "You are a professional digital pulmonologist — cite medications and "
        "restrictions ONLY from the 'Your health documents' section. "
        "Cross-reference with WHO guidelines and current AQI."
        if has_patient_docs
        else "No patient documents uploaded — provide general WHO-based advice for "
        "their conditions and AQI. Do NOT invent prescriptions or uploaded records."
    )
    return _chat(
        system=(
            "You are a professional digital pulmonologist for VitalAir Lahore. "
            "Based on the patient's uploaded documents (if any), health profile, "
            "and current air quality, provide structured, highly accurate health advice. "
            "Give exactly 4 bullet points (• prefix), no more. Each bullet one clear, "
            "actionable step tailored to age, conditions, sensitivity, and commute. "
            "Start with one English summary line, then one Roman Urdu summary line, then bullets. "
            "CRITICAL: In the Roman Urdu summary line, you MUST explicitly mention the user's health condition if they have one (e.g., 'Kyunke aap ko asthma hai, isliye...'). "
            "Be cautious and professional — never diagnose; recommend medical care when symptoms are severe. "
            f"{season_rule} {time_rule} {doc_rule}"
        ),
        user=(
            f"Season: {season_label} ({season_id})\n"
            f"Local time: {hour:02d}:00 PKT\n"
            f"Temperature: {temp_c}°C\n"
            f"Route: {source} → {destination}\n"
            f"AQI: {aqi}\nProfile: {profile_summary}\nConditions: {conditions}\n\n"
            f"Retrieved patient & WHO context:\n{rag_context[:4000]}"
        ),
    )


@lru_cache(maxsize=128)
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
    has_patient_docs: bool = False,
    profile_summary: str = "",
) -> list[str] | None:
    logger.debug("generate_diet_plan  aqi=%d season=%s src=%s", aqi, season_id, source)
    season_focus = {
        "summer_heatwave": "cooling, hydrating foods; avoid heavy fried items",
        "pre_monsoon_heat": "cooling drinks and light meals for rising heat",
        "monsoon": "hydration, light meals, hygiene; avoid street food",
        "winter_smog": "vitamin C, anti-inflammatory and warming foods for smog",
        "post_monsoon": "immunity-building seasonal fruits and light meals",
        "spring": "fresh seasonal fruits and balanced light meals",
    }.get(season_id, "season-appropriate Punjab home foods")

    doc_rule = (
        "Patient uploaded health documents are included. Tailor food advice to "
        "medications/conditions mentioned there. Do not invent prescriptions."
        if has_patient_docs
        else "No patient documents — use profile conditions and general anti-pollution diet guidance."
    )

    raw = _chat(
        system=(
            "You are a Lahore/Punjab nutrition advisor. Return ONLY a JSON array of exactly 4 "
            "strings in natural, conversational ROMAN URDU (like how Pakistanis chat on WhatsApp, avoid overly formal or literal translations). "
            "Each string must be ONE clear actionable tip: "
            "food/drink + kab + kyun (for this user's conditions and AQI). "
            "CRITICAL: You MUST tailor each tip to the user's specific health conditions, "
            "age, sensitivity, and commute mode from the profile below. "
            "If the user has asthma, recommend anti-inflammatory foods. "
            "If diabetic, avoid sugary items and mention sugar-safe alternatives. "
            "If heart disease, recommend low-sodium heart-healthy options. "
            "Use only common Lahore/Punjab foods. Avoid random exotic items. "
            "Do NOT repeat the same food in multiple tips. "
            "Keep each tip under 90 characters. "
            f"{doc_rule}"
        ),
        user=(
            f"Health profile: {profile_summary or 'not provided'}\n"
            f"Season: {season_label} ({season_id}) — focus on {season_focus}.\n"
            f"Local time: {lahore_now().hour:02d}:00 PKT\n"
            f"Area: {source}\n"
            f"AQI {aqi} in Lahore.\n"
            f"Age: {age}, Conditions: {conditions or 'none'}, "
            f"Sensitivity: {sensitivity}, Commute: {commute_mode}\n"
            f"Retrieved context:\n{rag_context[:3500]}"
        ),
        max_tokens=320,
        temperature=0.45,
        timeout_seconds=12.0,
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
            return [str(x).strip() for x in items if str(x).strip()][:4]
    except Exception:
        pass
    return None


def generate_patient_rag_chat_answer(
    *,
    question: str,
    rag_context: str,
    has_patient_docs: bool,
    area: str = "",
    aqi: int | None = None,
) -> str | None:
    """Answer a user question using retrieved WHO + personal health document context."""
    logger.debug("generate_patient_rag_chat_answer  q=%s… area=%s aqi=%s", question[:60], area, aqi)
    
    doc_rule = (
        "Search and utilize the user's uploaded health documents (available in the context below) to answer the user's questions specifically and personally. Do not invent medicines, diagnoses, or lab values."
        if has_patient_docs
        else "No uploaded patient documents were found. Clearly state that no documents were found, and answer based on general WHO-based air-quality guidance."
    )
    
    system_prompt = (
        "You are VitalAir's doctor-aware health assistant for Lahore.\n"
        "Instructions:\n"
        "- Reference and prioritize the user's health profile parameters (age, sensitivity, conditions, commute) and the current AQI to customize your advice.\n"
        f"- {doc_rule}\n"
        "- Respond strictly in Roman Urdu (Urdu in Latin script) but use short English medical terms where appropriate (e.g. 'asthma flare-up', 'inhaler', 'bronchodilator', 'nebulizer', 'AQI exposure'). Keep the language natural, helpful, and empathetic.\n"
        "- Be concise: one direct answer plus 3 bullet points. Never diagnose; recommend a doctor/ER for severe symptoms."
    )
    
    return _chat(
        system=system_prompt,
        user=(
            f"User question: {question}\n"
            f"Area: {area or 'not provided'}\n"
            f"AQI: {aqi if aqi is not None else 'not provided'}\n\n"
            f"Retrieved context:\n{rag_context[:4500]}"
        ),
        max_tokens=420,
        temperature=0.35,
    )
