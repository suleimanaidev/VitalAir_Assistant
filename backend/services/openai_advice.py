"""Direct OpenAI health/diet advice when CrewAI is not installed."""

from __future__ import annotations

import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

from config import get_settings
from services.seasonal_intelligence import lahore_now
from tools.lahore_season import is_smog_season


import asyncio
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

from config import get_settings
from services.seasonal_intelligence import lahore_now
from tools.lahore_season import is_smog_season

_OPENAI_SEMAPHORE = asyncio.Semaphore(5)


async def _async_chat(
    system: str,
    user: str,
    max_tokens: int = 600,
    temperature: float = 0.4,
    timeout_seconds: float = 12.0,
) -> str | None:
    settings = get_settings()
    if not settings.has_openai:
        logger.debug("OpenAI key not configured — skipping _async_chat")
        return None
    logger.debug("_async_chat → model=%s timeout=%.1fs", get_settings().openai_model or "gpt-4o-mini", timeout_seconds)
    
    from openai import AsyncOpenAI, RateLimitError, APITimeoutError, APIConnectionError, APIError

    client = AsyncOpenAI(
        api_key=settings.openai_api_key.strip(),
        timeout=timeout_seconds,
        max_retries=0,
    )
    model = settings.openai_model.strip() or "gpt-4o-mini"
    
    delays = [1.0, 2.0, 4.0]
    for attempt, delay in enumerate([0.0] + delays):
        if delay > 0:
            logger.warning("OpenAI rate limit / retry hit (attempt %d/%d), backing off %.1fs...", attempt, len(delays), delay)
            await asyncio.sleep(delay)
        
        try:
            async with _OPENAI_SEMAPHORE:
                response = await client.chat.completions.create(
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
        except (RateLimitError, APITimeoutError, APIConnectionError) as exc:
            logger.warning("OpenAI transient error on attempt %d: %s", attempt + 1, exc)
            if attempt == len(delays):
                logger.error("OpenAI retries exhausted due to rate limit/timeout: %s", exc)
                return "high demand, try again shortly"
        except APIError as exc:
            logger.error("OpenAI API error: %s", exc)
            return None
        except Exception as exc:
            logger.exception("Unexpected error during OpenAI chat: %s", exc)
            return None

    return None


def _chat(
    system: str,
    user: str,
    max_tokens: int = 600,
    temperature: float = 0.4,
    timeout_seconds: float = 12.0,
) -> str | None:
    """Sync wrapper for _async_chat."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    
    if loop and loop.is_running():
        # If in event loop, execute in thread pool safely
        return asyncio.run_coroutine_threadsafe(
            _async_chat(system, user, max_tokens, temperature, timeout_seconds),
            loop,
        ).result()
    else:
        return asyncio.run(_async_chat(system, user, max_tokens, temperature, timeout_seconds))


async def generate_health_advice_async(
    *,
    aqi: int,
    conditions: str,
    rag_context: str,
    profile_summary: str,
    season_id: str = "summer_heatwave",
    season_label: str = "Lahore",
    temp_c: float = 0.0,
    source: str = "",
    destination: str = "",
    has_patient_docs: bool = False,
) -> str | None:
    logger.debug("generate_health_advice_async aqi=%d season=%s src=%s dst=%s", aqi, season_id, source, destination)
    no_smog = not is_smog_season(season_id)
    hour = lahore_now().hour
    season_rule = (
        "Do NOT mention smog season or smog episodes — current season is hot summer/monsoon, focus on heat and hydration."
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
    return await _async_chat(
        system=(
            "You are a professional digital pulmonologist for VitalAir Lahore. "
            "Based on the patient's uploaded documents (if any), health profile, "
            "and current air quality, provide structured, highly accurate health advice. "
            "Give exactly 4 bullet points (• prefix), no more. Each bullet one clear, "
            "actionable step tailored to age, conditions, sensitivity, and commute. "
            "Start with one English summary line, then one Roman Urdu summary line, then bullets. "
            "CRITICAL SUMMARY RULE: In the Roman Urdu summary line (2nd line), you MUST explicitly state the user's specific health conditions by name (e.g., 'Kyunke aap ko Asthma aur Heart Disease hai, isliye is mausam mein...'). "
            "DO NOT write generic phrases like 'Given your current symptoms and health conditions' or 'Aap ki halat aur sehat ke madde nazar'. "
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
def generate_health_advice(
    *,
    aqi: int,
    conditions: str,
    rag_context: str,
    profile_summary: str,
    season_id: str = "summer_heatwave",
    season_label: str = "Lahore",
    temp_c: float = 0.0,
    source: str = "",
    destination: str = "",
    has_patient_docs: bool = False,
) -> str | None:
    no_smog = not is_smog_season(season_id)
    hour = lahore_now().hour
    season_rule = (
        "Do NOT mention smog season or smog episodes — current season is hot summer/monsoon, focus on heat and hydration."
        if no_smog
        else "Smog season guidance is appropriate (N95, indoor, HEPA)."
    )
    doc_rule = (
        "Patient uploaded health documents are included below."
        if has_patient_docs
        else "No patient documents uploaded."
    )
    return _chat(
        system=(
            "You are a professional digital pulmonologist for VitalAir Lahore. "
            "Based on the patient's uploaded documents (if any), health profile, "
            "and current air quality, provide structured, highly accurate health advice. "
            "Give exactly 4 bullet points (• prefix), no more. Each bullet one clear, "
            "actionable step tailored to age, conditions, sensitivity, and commute. "
            "Start with one English summary line, then one Roman Urdu summary line, then bullets. "
            "CRITICAL SUMMARY RULE: In the Roman Urdu summary line (2nd line), you MUST explicitly state the user's specific health conditions by name (e.g., 'Kyunke aap ko Asthma aur Heart Disease hai, isliye is mausam mein...'). "
            "DO NOT write generic phrases like 'Given your current symptoms and health conditions' or 'Aap ki halat aur sehat ke madde nazar'. "
            "Be cautious and professional — never diagnose; recommend medical care when symptoms are severe. "
            f"{season_rule} {doc_rule}"
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


async def generate_diet_plan_async(
    *,
    aqi: int,
    rag_context: str,
    season_id: str = "summer_heatwave",
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
    logger.debug("generate_diet_plan_async aqi=%d season=%s src=%s", aqi, season_id, source)
    season_focus = {
        "summer_heatwave": "cooling, hydrating summer foods (watermelon/tarbuz, lassi, sattu, cucumber/kheera, coconut water, falsa, lemon water). STRICTLY FORBIDDEN IN SUMMER: Do NOT suggest winter fruits like Kinnow or Malta, and do NOT suggest warming drinks like Haldi Doodh.",
        "pre_monsoon_heat": "cooling drinks and light summer meals for rising heat. STRICTLY FORBIDDEN IN SUMMER: Do NOT suggest Kinnow, Malta, or Haldi Doodh.",
        "monsoon": "hydration, light meals, hygiene, jamun; avoid street food. STRICTLY FORBIDDEN: Do NOT suggest Kinnow, Malta, or Haldi Doodh.",
        "winter_smog": "vitamin C (kinnow, malta), anti-inflammatory and warming foods for smog (haldi doodh, ginger, saag, soup).",
        "post_monsoon": "immunity-building seasonal fruits and light meals.",
        "spring": "fresh seasonal fruits (amrood, ber) and balanced light meals.",
    }.get(season_id, "season-appropriate Punjab home foods")

    doc_rule = (
        "Patient uploaded health documents are included. Tailor food advice to "
        "medications/conditions mentioned there. Do not invent prescriptions."
        if has_patient_docs
        else "No patient documents — use profile conditions and general anti-pollution diet guidance."
    )

    raw = await _async_chat(
        system=(
            "You are a Lahore/Punjab nutrition advisor. Return ONLY a JSON array of exactly 4 "
            "strings in natural, conversational ROMAN URDU (like how Pakistanis chat on WhatsApp, avoid overly formal or literal translations). "
            "Each string must be ONE clear actionable tip: "
            "food/drink + kab + kyun (for this user's conditions and AQI). "
            "CRITICAL MAUSAM (SEASON) RULE: Pay strict attention to the current season focus! "
            "If season is summer_heatwave, monsoon, or pre_monsoon_heat, suggest ONLY summer-appropriate cooling foods (e.g. Tarbuz, Lassi, Sattu, Kheera, Nimbu Pani, Falsa, Jamun). "
            "NEVER suggest winter items like Kinnow, Malta, Gajar juice, or Haldi Doodh during summer/monsoon. "
            "CRITICAL HEALTH CONDITION RULE: You MUST tailor each tip to the user's specific health conditions "
            "(e.g. if user has Asthma, Diabetes, or Heart Disease, name the condition or its dietary requirement explicitly). "
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


@lru_cache(maxsize=128)
def generate_diet_plan(
    *,
    aqi: int,
    rag_context: str,
    season_id: str = "summer_heatwave",
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
    season_focus = {
        "summer_heatwave": "cooling, hydrating summer foods (watermelon/tarbuz, lassi, sattu, cucumber/kheera, coconut water, falsa, lemon water). STRICTLY FORBIDDEN IN SUMMER: Do NOT suggest winter fruits like Kinnow or Malta, and do NOT suggest warming drinks like Haldi Doodh.",
        "pre_monsoon_heat": "cooling drinks and light summer meals for rising heat. STRICTLY FORBIDDEN IN SUMMER: Do NOT suggest Kinnow, Malta, or Haldi Doodh.",
        "monsoon": "hydration, light meals, hygiene, jamun; avoid street food. STRICTLY FORBIDDEN: Do NOT suggest Kinnow, Malta, or Haldi Doodh.",
        "winter_smog": "vitamin C (kinnow, malta), anti-inflammatory and warming foods for smog (haldi doodh, ginger, saag, soup).",
        "post_monsoon": "immunity-building seasonal fruits and light meals.",
        "spring": "fresh seasonal fruits (amrood, ber) and balanced light meals.",
    }.get(season_id, "season-appropriate Punjab home foods")

    doc_rule = (
        "Patient uploaded health documents are included. Tailor food advice to medications/conditions."
        if has_patient_docs
        else "No patient documents — use profile conditions and general anti-pollution diet guidance."
    )

    raw = _chat(
        system=(
            "You are a Lahore/Punjab nutrition advisor. Return ONLY a JSON array of exactly 4 "
            "strings in natural, conversational ROMAN URDU. "
            "CRITICAL MAUSAM (SEASON) RULE: Pay strict attention to the current season focus! "
            "If season is summer_heatwave, monsoon, or pre_monsoon_heat, suggest ONLY summer-appropriate cooling foods (e.g. Tarbuz, Lassi, Sattu, Kheera, Nimbu Pani, Falsa, Jamun). "
            "NEVER suggest winter items like Kinnow, Malta, Gajar juice, or Haldi Doodh during summer/monsoon. "
            "CRITICAL HEALTH CONDITION RULE: You MUST tailor each tip to the user's specific health conditions "
            "(e.g. if user has Asthma, Diabetes, or Heart Disease, name the condition or its dietary requirement explicitly). "
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
    user_name: str = "",
    season_id: str = "summer_heatwave",
    season_label: str = "Lahore",
    temp_c: float = 0.0,
    profile_summary: str = "",
) -> str | None:
    """Answer a user question using retrieved WHO + personal health document context."""
    logger.debug(
        "generate_patient_rag_chat_answer q=%s… area=%s aqi=%s name=%s season=%s",
        question[:60],
        area,
        aqi,
        user_name,
        season_id,
    )

    doc_rule = (
        "Patient health documents are present in context below. Use them for specific personal advice. Do not invent prescriptions."
        if has_patient_docs
        else "No patient health documents uploaded. Provide guidance using their profile parameters and WHO recommendations."
    )

    season_focus = {
        "summer_heatwave": "cooling, hydrating summer items (tarbuz/watermelon, lassi, sattu, kheera, nimbu pani, coconut water). FORBIDDEN IN SUMMER: Do NOT suggest winter items like Kinnow, Malta, Gajar juice, or Haldi Doodh.",
        "pre_monsoon_heat": "cooling drinks and light summer meals for rising heat.",
        "monsoon": "clean water, light meals, hygiene, jamun; avoid street food.",
        "winter_smog": "vitamin C (kinnow, malta), anti-inflammatory and warming items for smog (haldi doodh, ginger, saag, soup).",
        "post_monsoon": "immunity-building seasonal fruits and light meals.",
        "spring": "fresh seasonal fruits (amrood, ber) and light meals.",
    }.get(season_id, "season-appropriate home advice")

    name_rule = (
        f"The user's name is '{user_name}'. Greet them warmly by first name (e.g. 'Assalam-o-Alaikum {user_name}!' or '{user_name}, ...'). "
        "NEVER write 'Mujhe aapka naam nahi pata' or 'I don't know your name'. You already know their identity!"
        if user_name
        else "If name is available in context, use it. Never say 'Mujhe aapka naam nahi pata'."
    )

    hour = lahore_now().hour
    if 5 <= hour < 12:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Morning). Tailor suggestions for morning schedule, breakfast nutrition, and early commute precautions before heat/smog builds up."
    elif 12 <= hour < 17:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Afternoon Peak Heat/Sun). Tailor suggestions for peak afternoon rest, hydration, staying indoors, and avoiding peak sun/smog."
    elif 17 <= hour < 22:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Evening). Tailor suggestions for evening travel window, light evening meals, and evening walk precautions."
    else:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Night). Tailor suggestions for night-time rest, indoor air filtration, window closure, and airway recovery."

    system_prompt = (
        "You are VitalAir Assistant, a doctor-aware AI health and air quality assistant for Lahore.\n"
        "STRICT MANDATORY RULES FOR ALL RESPONSES:\n"
        "1. DYNAMIC & DIVERSE RESPONSES: NEVER copy-paste identical hardcoded sentences. Generate natural, fluid, conversational responses in warm Roman Urdu tailored to the exact situation.\n"
        "2. STRICT INHALER RULE: Do NOT recommend, suggest, or mention an inhaler or rescue inhaler UNLESS 'rescue inhaler' or 'inhaler' is explicitly listed in the user's conditions or uploaded health documents. If the user does not have an inhaler ticked/listed, NEVER suggest using or carrying an inhaler!\n"
        f"3. GREET BY NAME & SELF INTRODUCTION: Every greeting response MUST state the user's name '{user_name or ''}' and introduce yourself as VitalAir Assistant.\n"
        "4. CASUAL GREETINGS / SMALL TALK (e.g. 'hello', 'hi', 'how are you?', 'kaise ho', 'assalam-o-alaikum'):\n"
        f"   - Greet warmly by name '{user_name or ''}' and self-introduce as VitalAir Assistant.\n"
        "   - Give EXACTLY TWO bullet points (• prefix) stating how you assist:\n"
        "     • Aap ki health profile, AQI, aur mausam ke mutabiq personal health guidance dena.\n"
        "     • Lahore mein safar ke liye kam-pollution wale safe routes recommend karna.\n"
        "   - Ask how you can help today. DO NOT dump unasked health tips or diet advice when user only said hello!\n"
        "5. GRATITUDE & THANKS (e.g. 'thank you', 'thanks', 'shukriya', 'jazakallah'):\n"
        f"   - Respond with a warm, polite closing: 'Khush rahein {user_name or ''}! Aap ka bohat shukriya. Agar aap ko kisi aur cheez mein madad zaroori ho to zaroor bataayein. Apni sehat ka khayal rakhein! 💚'\n"
        "   - DO NOT repeat greeting introductions or dump unasked health tips.\n"
        "6. SPECIFIC QUESTIONS (e.g. food, asthma, AQI, symptoms):\n"
        f"   - Greet warmly by name '{user_name or ''}', then answer ONLY and STRICTLY what the user asked in 3 to 4 concise bullet points (• prefix).\n"
        f"7. SEASON & MAUSAM: Current season is {season_label} ({season_id}). Focus: {season_focus}\n"
        f"8. TIME OF DAY SCHEDULE: {time_focus}\n"
        "9. LANGUAGE: Natural, friendly Roman Urdu. Mention user's specific health conditions (Asthma, Heart Disease, etc.) when answering health queries.\n"
        f"10. DOCUMENTS: {doc_rule}"
    )

    return _chat(
        system=system_prompt,
        user=(
            f"User Question: {question}\n"
            f"User Name: {user_name or 'Friend'}\n"
            f"User Health Profile: {profile_summary or 'Not provided'}\n"
            f"Area: {area or 'Lahore'}\n"
            f"AQI: {aqi if aqi is not None else 'not provided'}\n"
            f"Season: {season_label} ({season_id}), Temp: {temp_c}°C\n\n"
            f"Retrieved context:\n{rag_context[:4500]}"
        ),
        max_tokens=350,
        temperature=0.35,
    )

