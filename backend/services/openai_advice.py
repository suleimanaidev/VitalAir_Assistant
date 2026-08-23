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
    if not settings.has_live_llm:
        logger.debug("No live LLM key configured — skipping _async_chat")
        return None

    if settings.has_gemini and (not settings.has_openai or settings.llm_provider == "gemini"):
        try:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.gemini_api_key.strip()}"
            payload = {
                "system_instruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
            }
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and parts[0].get("text"):
                            return parts[0].get("text").strip()
        except Exception as exc:
            logger.warning("Gemini REST API call failed: %s — trying OpenAI if available", exc)

    if not settings.has_openai:
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
    now = lahore_now()
    hour = now.hour
    today_str = now.strftime("%d %B %Y")
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
            "You are a Senior Digital Pulmonologist and Environmental Health Specialist for VitalAir Lahore.\n"
            "YOUR EXCLUSIVE ROLE & DIVERGENCE:\n"
            "- Focus ONLY on respiratory health, medical safety, N95/KN95 mask guidance, indoor HEPA air filtration, exposure timing, and airway recovery.\n"
            "- DO NOT provide meal plans, food recipes, or diet menus (leave food advice strictly to the Nutritionist Agent).\n"
            "RULES & GROUNDING:\n"
            "- Cross-reference current AQI and weather with the user's specific health conditions (e.g., Asthma, Heart Disease).\n"
            "- Give exactly 4 bullet points (• prefix), no more. Each bullet one clear, actionable medical step tailored to age, conditions, sensitivity, and commute.\n"
            "LANGUAGE & STRUCTURE:\n"
            "- Write the ENTIRE response in clear, professional ENGLISH.\n"
            "- Start with a 1-line English summary explicitly stating the user's specific health conditions by name (e.g., 'Given your Asthma and Heart Disease, in this air quality...').\n"
            "- DO NOT write generic phrases like 'Given your current symptoms and health conditions'.\n"
            "- Followed by exactly 4 actionable medical safety bullet points (• prefix).\n"
            "- Be cautious and professional — never diagnose; recommend medical care when symptoms are severe.\n"
            f"{season_rule} {time_rule} {doc_rule}"
        ),
        user=(
            f"Today's date: {today_str}\n"
            f"Season: {season_label} ({season_id})\n"
            f"Local time: {hour:02d}:00 PKT\n"
            f"Temperature: {temp_c}°C\n"
            f"Route: {source} → {destination}\n"
            f"AQI: {aqi}\nProfile: {profile_summary}\nConditions: {conditions}\n\n"
            f"Retrieved patient & WHO context:\n{rag_context[:4000]}"
        ),
    )


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
    now = lahore_now()
    hour = now.hour
    today_str = now.strftime("%d %B %Y")
    season_rule = (
        "Do NOT mention smog season or smog episodes — current season is hot summer/monsoon, focus on heat and hydration."
        if no_smog
        else "Smog season guidance is appropriate (N95, indoor, HEPA)."
    )
    doc_rule = (
        "Patient uploaded health documents are included below. Cite medical restrictions ONLY from those documents."
        if has_patient_docs
        else "No patient documents uploaded."
    )
    return _chat(
        system=(
            "You are a Senior Digital Pulmonologist and Environmental Health Specialist for VitalAir Lahore.\n"
            "YOUR EXCLUSIVE ROLE & DIVERGENCE:\n"
            "- Focus ONLY on respiratory health, medical safety, N95/KN95 mask guidance, indoor HEPA air filtration, exposure timing, and airway recovery.\n"
            "- DO NOT provide meal plans, food recipes, or diet menus (leave food advice strictly to the Nutritionist Agent).\n"
            "RULES & GROUNDING:\n"
            "- Cross-reference current AQI and weather with the user's specific health conditions (e.g., Asthma, Heart Disease).\n"
            "- Give exactly 4 bullet points (• prefix), no more. Each bullet one clear, actionable medical step tailored to age, conditions, sensitivity, and commute.\n"
            "LANGUAGE & STRUCTURE:\n"
            "- Write the ENTIRE response in clear, professional ENGLISH.\n"
            "- Start with a 1-line English summary explicitly stating the user's specific health conditions by name (e.g., 'Given your Asthma and Heart Disease, in this air quality...').\n"
            "- DO NOT write generic phrases like 'Given your current symptoms and health conditions'.\n"
            "- Followed by exactly 4 actionable medical safety bullet points (• prefix).\n"
            "- Be cautious and professional — never diagnose; recommend medical care when symptoms are severe.\n"
            f"{season_rule} {doc_rule}"
        ),
        user=(
            f"Today's date: {today_str}\n"
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

    now = lahore_now()
    hour = now.hour
    if 5 <= hour < 12:
        meal_name = "Breakfast"
    elif 12 <= hour < 17:
        meal_name = "Lunch"
    elif 17 <= hour < 21:
        meal_name = "Evening Snack"
    else:
        meal_name = "Dinner"

    raw = await _async_chat(
        system=(
            "You are a Punjab/Lahore Environmental Nutritionist Advisor for VitalAir.\n"
            "YOUR EXCLUSIVE ROLE & DIVERGENCE:\n"
            "- Focus ONLY on food, diet, meal schedules (Breakfast, Lunch, Evening Snack, Dinner), hydration, and anti-pollution nutrition.\n"
            "- DO NOT provide medical diagnostic advice, mask instructions, or route planning (leave medical safety strictly to the Health Agent).\n"
            "RULES & PDF GROUNDING:\n"
            "- If uploaded health documents / PDFs contain food guidelines, dietary restrictions, or doctor-recommended diets, STRICTLY ground your advice on those PDF documents first.\n"
            "LANGUAGE & FORMAT:\n"
            "- Return ONLY a JSON array of exactly 4 strings in clear, natural ENGLISH.\n"
            "- All titles, meal recommendations, and food descriptions MUST be in 100% English. Do NOT output Roman Urdu or Urdu text.\n"
            f"- IMPORTANT CURRENT TIME RULE: Local time is {hour:02d}:00 PKT.\n"
            f"- Focus 100% on recommending foods, drinks, and meals for CURRENT MEAL: '{meal_name}'!\n"
            f"- Each of the 4 strings MUST start with '[{meal_name} • Season] ...'.\n"
            "- CRITICAL SEASON RULE: Pay strict attention to the current season focus!\n"
            "  If summer_heatwave/monsoon: suggest ONLY cooling summer foods & hydration (e.g., Watermelon, Mint Lemonade, Cucumber, Coconut Water, Sattu Drink, Yogurt Lassi).\n"
            "  NEVER suggest warming winter items like Kinnow, Malta, Gajar juice, or Turmeric Milk during summer/monsoon.\n"
            "- CRITICAL HEALTH CONDITION RULE: Tailor each tip to the user's specific health conditions (e.g., Asthma, Diabetes, Heart Disease).\n"
            "- Use accessible home foods.\n"
            "- Do NOT repeat the same food in multiple tips.\n"
            f"{doc_rule}"
        ),
        user=(
            f"Today's date: {now.strftime('%d %B %Y')}\n"
            f"Current time: {hour:02d}:00 PKT ({meal_name})\n"
            f"Health profile: {profile_summary or 'not provided'}\n"
            f"Season: {season_label} ({season_id}) — focus on {season_focus}.\n"
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
        "summer_heatwave": "cooling, hydrating summer foods (watermelon, lassi, sattu, cucumber, coconut water, falsa, lemon water). STRICTLY FORBIDDEN IN SUMMER: Do NOT suggest winter fruits like Kinnow or Malta, and do NOT suggest warming drinks like Turmeric Milk.",
        "pre_monsoon_heat": "cooling drinks and light summer meals for rising heat. STRICTLY FORBIDDEN IN SUMMER: Do NOT suggest Kinnow, Malta, or Turmeric Milk.",
        "monsoon": "hydration, light meals, hygiene, jamun; avoid street food. STRICTLY FORBIDDEN: Do NOT suggest Kinnow, Malta, or Turmeric Milk.",
        "winter_smog": "vitamin C (kinnow, malta), anti-inflammatory and warming foods for smog (turmeric milk, ginger, saag, soup).",
        "post_monsoon": "immunity-building seasonal fruits and light meals.",
        "spring": "fresh seasonal fruits (guava, ber) and balanced light meals.",
    }.get(season_id, "season-appropriate Punjab home foods")

    doc_rule = (
        "Patient uploaded health documents are included. Ground diet strictly on recommendations/restrictions in those documents."
        if has_patient_docs
        else "No patient documents — use profile conditions and general anti-pollution diet guidance."
    )

    raw = _chat(
        system=(
            "You are a Punjab/Lahore Environmental Nutritionist Advisor for VitalAir.\n"
            "YOUR EXCLUSIVE ROLE & DIVERGENCE:\n"
            "- Focus ONLY on food, diet, meal schedules (Breakfast, Lunch, Evening Snack, Dinner), hydration, and anti-pollution nutrition.\n"
            "- DO NOT provide medical diagnostic advice, mask instructions, or route planning (leave medical safety strictly to the Health Agent).\n"
            "RULES & PDF GROUNDING:\n"
            "- If uploaded health documents / PDFs contain food guidelines, dietary restrictions, or doctor-recommended diets, STRICTLY ground your advice on those PDF documents first.\n"
            "LANGUAGE & FORMAT:\n"
            "- Return ONLY a JSON array of exactly 4 strings in clear, natural ENGLISH.\n"
            "- All titles, food items, and descriptions MUST be in 100% English. Do NOT output Roman Urdu or Urdu text.\n"
            "CRITICAL SEASON RULE: Pay strict attention to the current season focus! "
            "If season is summer_heatwave, monsoon, or pre_monsoon_heat, suggest ONLY summer-appropriate cooling foods (e.g., Watermelon, Lassi, Sattu Drink, Cucumber, Lemon water, Falsa, Jamun). "
            "NEVER suggest winter items like Kinnow, Malta, Carrot juice, or Turmeric Milk during summer/monsoon. "
            "CRITICAL HEALTH CONDITION RULE: You MUST tailor each tip to the user's specific health conditions "
            "(e.g., if user has Asthma, Diabetes, or Heart Disease, name the condition or its dietary requirement explicitly). "
            "If the user has asthma, recommend anti-inflammatory foods. "
            "If diabetic, avoid sugary items and mention sugar-safe alternatives. "
            "If heart disease, recommend low-sodium heart-healthy options. "
            "Use only common foods. Avoid random exotic items. "
            "Do NOT repeat the same food in multiple tips. "
            "Keep each tip under 90 characters. "
            f"{doc_rule}"
        ),
        user=(
            f"Today's date: {lahore_now().strftime('%d %B %Y')}\n"
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
    history: list[dict] | None = None,
    is_first_message: bool = False,
) -> str | None:
    """Answer a user question using retrieved WHO + personal health document context."""
    logger.debug(
        "generate_patient_rag_chat_answer q=%s… area=%s aqi=%s name=%s season=%s is_first=%s",
        question[:60],
        area,
        aqi,
        user_name,
        season_id,
        is_first_message,
    )

    doc_rule = (
        "Patient health documents are present in context below. Use them for specific personal advice. Do not invent prescriptions."
        if has_patient_docs
        else "No patient health documents uploaded. Provide guidance using their profile parameters and WHO recommendations."
    )

    season_focus = {
        "summer_heatwave": "cooling, hydrating summer items (watermelon, lassi, sattu, cucumber, lemon water, coconut water). FORBIDDEN IN SUMMER: Do NOT suggest winter items like Kinnow, Malta, Carrot juice, or Turmeric Milk.",
        "pre_monsoon_heat": "cooling drinks and light summer meals for rising heat.",
        "monsoon": "clean water, light meals, hygiene, jamun; avoid street food.",
        "winter_smog": "vitamin C (kinnow, malta), anti-inflammatory and warming items for smog (turmeric milk, ginger, saag, soup).",
        "post_monsoon": "immunity-building seasonal fruits and light meals.",
        "spring": "fresh seasonal fruits (guava, ber) and light meals.",
    }.get(season_id, "season-appropriate home advice")

    now = lahore_now()
    hour = now.hour
    today_str = now.strftime("%d %B %Y")
    if 5 <= hour < 12:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Morning). Tailor suggestions for morning schedule and early precautions."
    elif 12 <= hour < 17:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Afternoon Peak Heat/Sun). Tailor suggestions for peak afternoon rest and hydration."
    elif 17 <= hour < 22:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Evening). Tailor suggestions for evening window and light meals."
    else:
        time_focus = f"Current local time is {hour:02d}:00 PKT (Night). Tailor suggestions for night-time rest and indoor air protection."

    q_clean = question.strip().lower()
    GREETING_WORDS = {"hi", "hello", "hey", "hlo", "assalam", "assalam-o-alaikum", "salam", "start", "good morning", "good evening", "good afternoon"}
    is_standalone_greeting = q_clean in GREETING_WORDS or (len(q_clean.split()) <= 2 and any(w in q_clean for w in ("hi", "hello", "hey", "salam", "assalam")))
    has_prior_history = bool(history and len(history) > 1)

    # Only show the full welcome introduction on a genuine initial greeting when there is no prior chat history
    should_intro = (is_first_message or not has_prior_history) and is_standalone_greeting

    if should_intro:
        greeting_instruction = (
            "INITIAL GREETING ONLY:\n"
            f"- Greet warmly by first name ({user_name or 'Friend'}).\n"
            "- Mention their recorded health conditions briefly and introduce yourself once as VitalAir Assistant.\n"
            "- Ask how you can assist them with air quality, health, or nutrition today.\n"
        )
    else:
        greeting_instruction = (
            "DIRECT ANSWER REQUIRED (CRITICAL RULE — ZERO REPETITIVE INTRODUCTIONS):\n"
            "- DO NOT repeat your introduction ('I am VitalAir Assistant...').\n"
            "- DO NOT repeat 'According to your medical profile...' or list their health conditions as an intro.\n"
            "- DO NOT say 'How can I assist you today?'.\n"
            "- Answer the user's specific question immediately and concisely.\n"
            "- Provide a clear, direct 3 to 4 bullet-point response using clean markdown ('- **Heading:** Details').\n"
        )

    system_prompt = (
        "You are VitalAir Assistant, a doctor-aware AI health and air quality assistant for Lahore.\n"
        f"TODAY'S DATE: {today_str}\n"
        "STRICT MANDATORY BEHAVIOR & RULES:\n"
        "1. LANGUAGE: Clear, professional, natural ENGLISH for all responses.\n"
        "2. PDF & DOCUMENT GROUNDING (CRITICAL):\n"
        "   - Whenever uploaded health documents / PDFs are present in context, ALWAYS prioritize and strictly ground food, diet, medications, and health advice on the details mentioned in those documents.\n"
        "   - DO NOT invent, assume, or extrapolate prescriptions or restrictions that are NOT in the PDF or user profile. Zero Hallucination!\n"
        f"3. CONVERSATION FLOW:\n{greeting_instruction}\n"
        "4. INHALER & MEDICATION SAFETY:\n"
        "   - Do NOT recommend any inhaler or specific prescription drug UNLESS explicitly written in the user's uploaded PDF documents or health conditions.\n"
        f"5. SEASON & WEATHER: Current season is {season_label} ({season_id}). Focus: {season_focus}\n"
        f"6. TIME OF DAY SCHEDULE: {time_focus}\n"
        "7. GRATITUDE: If user says thank you / thanks, respond warmly in 1 short sentence.\n"
        "8. FORMATTING: Always use standard clean markdown dash bullets '- **Heading:** Details'. Never use literal dot unicode '•'.\n"
        f"9. DOCUMENTS CONTEXT: {doc_rule}"
    )

    history_str = ""
    if history and len(history) > 1:
        recent_turns = history[-4:]
        history_str = "Recent chat history:\n" + "\n".join(
            f"- {t.get('role', 'user').title()}: {t.get('text', '')}" for t in recent_turns
        ) + "\n\n"

    return _chat(
        system=system_prompt,
        user=(
            f"Today's date: {today_str}\n"
            f"{history_str}"
            f"User Question: {question}\n"
            f"User Name: {user_name or 'Friend'}\n"
            f"User Health Profile: {profile_summary or 'Not provided'}\n"
            f"Area: {area or 'Lahore'}\n"
            f"AQI: {aqi if aqi is not None else 'not provided'}\n"
            f"Season: {season_label} ({season_id}), Temp: {temp_c}°C\n\n"
            f"Retrieved context:\n{rag_context[:1800]}"
        ),
        max_tokens=260,
        temperature=0.35,
    )

