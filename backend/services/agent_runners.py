"""Per-agent runners — health, nutrition, route (shared by /api/agents/*)."""

from __future__ import annotations

from collections.abc import Callable

from config import get_settings
from models.agent_output import GeoJSONFeature, RouteOutput, VitalAirResult
from schemas.models import (
    AgentHealthResponse,
    AgentNutritionResponse,
    AgentRouteResponse,
    AnalyzeProfile,
    RouteOption,
    RouteQuery,
    SafeRoute,
    SeasonIntelligence,
)
from services.advice_format import format_diet_plan, format_health_advice
from services.agent_explainability import build_health_explainability
from services.lahore_context import (
    build_context_summary,
    get_analysis_context,
    strip_wrong_season_phrases,
)
from services.openai_advice import generate_diet_plan, generate_health_advice
from services.personal_exposure_score import compute_personal_exposure_score
from services.rag_service import (
    build_diet_rag_query,
    build_health_rag_extra_queries,
    build_health_rag_query,
    count_rag_chunks,
    retrieve_diet_context,
    retrieve_health_context,
)
from services.seasonal_intelligence import build_personalized_season_intelligence
from tools.area_mapping import resolve_area
from tools.maps_core import build_three_route_options, fetch_geojson_routes_sync, fetch_routes_sync
from tools.iqair_core import fetch_aqi_for_api
from tools.waqi_core import aqi_label, fetch_aqi_for_area

PublishLog = Callable[[str, str, str], None]
HEALTH_AGENT = "Digital Pulmonologist"
NUTRITION_AGENT = "Environmental Nutritionist"
ROUTE_AGENT = "Smart Route Navigator"


def _emit(publish_log: PublishLog | None, agent: str, status: str, message: str) -> None:
    if publish_log:
        publish_log(agent, status, message)


def fetch_area_aqi(area: str) -> int:
    """Live WAQI for a Lahore area; falls back to city reading."""
    if resolve_area(area):
        try:
            data = fetch_aqi_for_area(area)
            if data and data.get("aqi"):
                return int(data["aqi"])
        except Exception:
            pass
    try:
        return int(fetch_aqi_for_api("Lahore")["aqi"])
    except Exception:
        return 120


def _symptom_health_prefix(symptom_summary: str | None, symptom_score: int | None) -> str:
    if not symptom_summary or symptom_score is None or symptom_score <= 0:
        return ""
    if symptom_score >= 5:
        return (
            "Aaj symptoms zyada hain — outdoor exertion avoid karein, rescue medicine/inhaler "
            "paas rakhein, aur symptoms worse hon to doctor se rabta karein."
        )
    return (
        "Aaj halkay symptoms note hue — AQI high ho to mask use karein aur outdoor time short rakhein."
    )


def run_health_agent(
    profile: AnalyzeProfile,
    area: str,
    *,
    user_id: str | None = None,
    user_doc_chunks: list[str] | None = None,
    aqi: int | None = None,
    destination: str | None = None,
    symptom_summary: str | None = None,
    symptom_score: int | None = None,
    publish_log: PublishLog | None = None,
) -> AgentHealthResponse:
    ctx = get_analysis_context()
    season_id = ctx["season"]
    temp_c = float(ctx.get("temperature_c") or 0)
    _emit(publish_log, HEALTH_AGENT, "thinking", f"Checking live AQI for {area}…")
    aqi_val = aqi if aqi is not None else fetch_area_aqi(area)

    sensitivity = getattr(profile, "sensitivity", "medium")
    commute = getattr(profile, "commute_mode", "car")
    outdoor = getattr(profile, "outdoor_time", "30_60")
    conditions = list(profile.conditions or [])
    conditions_str = ", ".join(conditions) or "no listed conditions"

    rag_query = build_health_rag_query(
        aqi=aqi_val,
        area=area,
        conditions=conditions,
        age=profile.age,
        sensitivity=sensitivity,
        commute_mode=commute,
        outdoor_time=outdoor,
        season_id=season_id,
        temp_c=temp_c,
        destination=destination,
    )
    if symptom_summary and symptom_score is not None:
        rag_query = (
            f"{rag_query}\nToday's symptom check-in: {symptom_summary} "
            f"(score {symptom_score}/12)."
        )
    extra = build_health_rag_extra_queries(conditions, aqi_val)

    _emit(
        publish_log,
        HEALTH_AGENT,
        "thinking",
        "Searching WHO & health knowledge (RAG)…",
    )
    rag_health = retrieve_health_context(
        rag_query,
        k=5,
        user_id=user_id,
        user_doc_chunks=user_doc_chunks,
        extra_queries=extra,
    )
    has_patient_docs = bool(user_doc_chunks) or "--- Your health documents ---" in rag_health

    _emit(
        publish_log,
        HEALTH_AGENT,
        "thinking",
        "Personalizing advice for your health profile…",
    )
    health = format_health_advice(
        rag_health,
        aqi_val,
        conditions_str,
        season_id=season_id,
        temp_c=temp_c,
        source=area,
        destination=destination or area,
        age=profile.age,
        sensitivity=sensitivity,
        commute_mode=commute,
        outdoor_time=outdoor,
        profile_name=profile.name,
        user_id=user_id,
    )
    health = strip_wrong_season_phrases(health, season_id)
    symptom_prefix = _symptom_health_prefix(symptom_summary, symptom_score)
    if symptom_prefix:
        health = f"{health}\n• {symptom_prefix}"
    agent_mode = "rag_rules"

    settings = get_settings()
    if settings.has_openai:
        _emit(publish_log, HEALTH_AGENT, "thinking", "Enhancing advice with AI…")
        profile_summary = (
            f"{profile.name}, age {profile.age}, "
            f"sensitivity {sensitivity}, commute {commute}, outdoor {outdoor}"
        )
        if symptom_summary and symptom_score is not None:
            profile_summary = (
                f"{profile_summary}. Today's symptom check-in: {symptom_summary} "
                f"(score {symptom_score}/12)"
            )
        ai_health = generate_health_advice(
            aqi=aqi_val,
            conditions=conditions_str,
            rag_context=rag_health,
            profile_summary=profile_summary,
            season_id=season_id,
            season_label=ctx.get("season_label", "Lahore"),
            temp_c=temp_c,
            source=area,
            destination=destination or area,
            has_patient_docs=has_patient_docs,
        )
        if ai_health:
            health = strip_wrong_season_phrases(ai_health, season_id)
            if symptom_prefix and symptom_prefix.lower() not in health.lower():
                health = f"{health}\n• {symptom_prefix}"
            agent_mode = "openai_rag"

    pes = compute_personal_exposure_score(
        aqi=aqi_val,
        distance=None,
        commute_mode=commute,
        conditions=conditions,
        sensitivity=sensitivity,
    )
    explainability = build_health_explainability(
        profile=profile,
        aqi=aqi_val,
        pes=pes,
        rag_context=rag_health,
        health_advice=health,
        agent_mode=agent_mode,
    )

    return AgentHealthResponse(
        area=area,
        aqi=aqi_val,
        aqi_label=aqi_label(aqi_val),
        health_advice=health,
        health_explainability=explainability,
        rag_sources_used=count_rag_chunks(rag_health),
        has_patient_docs=has_patient_docs,
        agent_mode=agent_mode,
        season=season_id,
        season_label=ctx.get("season_label"),
        temperature_c=temp_c,
    )


def run_nutrition_agent(
    profile: AnalyzeProfile,
    area: str,
    *,
    user_id: str | None = None,
    user_doc_chunks: list[str] | None = None,
    aqi: int | None = None,
    publish_log: PublishLog | None = None,
) -> AgentNutritionResponse:
    ctx = get_analysis_context()
    season_id = ctx["season"]
    temp_c = float(ctx.get("temperature_c") or 0)
    _emit(publish_log, NUTRITION_AGENT, "thinking", f"Reading AQI context for {area}…")
    aqi_val = aqi if aqi is not None else fetch_area_aqi(area)
    conditions = list(profile.conditions or [])
    sensitivity = getattr(profile, "sensitivity", "medium")
    commute = getattr(profile, "commute_mode", "car")

    rag_query = build_diet_rag_query(
        aqi=aqi_val,
        area=area,
        season_id=season_id,
        temp_c=temp_c,
        conditions=conditions,
    )
    _emit(
        publish_log,
        NUTRITION_AGENT,
        "thinking",
        "Searching anti-pollution nutrition knowledge (RAG)…",
    )
    from services.user_patient_rag import retrieve_patient_health_context

    patient_context = ""
    if user_id or user_doc_chunks:
        patient_context = retrieve_patient_health_context(
            user_id,
            f"nutrition diet anti pollution {', '.join(conditions) or 'general'}",
            k=3,
            keyword_chunks=user_doc_chunks,
        )
    has_patient_docs = bool(user_doc_chunks) or bool(patient_context)

    rag_diet = retrieve_diet_context(
        rag_query,
        k=5,
        extra_queries=[f"vitamin C ginger turmeric Lahore smog season {season_id}"],
    )
    if patient_context:
        rag_diet = f"{rag_diet}\n\n--- Your health documents ---\n{patient_context}"

    _emit(
        publish_log,
        NUTRITION_AGENT,
        "thinking",
        "Matching food tips to your health profile and documents…",
    )

    diet = format_diet_plan(
        rag_diet,
        season_id=season_id,
        aqi=aqi_val,
        conditions=", ".join(conditions),
        age=profile.age,
        sensitivity=sensitivity,
        source=area,
        destination=area,
        user_id=user_id,
    )
    agent_mode = "rag_rules"

    settings = get_settings()
    if settings.has_openai:
        _emit(publish_log, NUTRITION_AGENT, "thinking", "Building personalized food guide…")
        profile_summary = (
            f"{profile.name}, age {profile.age}, conditions {', '.join(conditions) or 'none'}, "
            f"sensitivity {sensitivity}, commute {commute}"
        )
        ai_diet = generate_diet_plan(
            aqi=aqi_val,
            rag_context=rag_diet,
            season_id=season_id,
            season_label=ctx.get("season_label", "Lahore"),
            conditions=", ".join(conditions),
            age=profile.age,
            sensitivity=sensitivity,
            commute_mode=commute,
            source=area,
            destination=area,
            has_patient_docs=has_patient_docs,
            profile_summary=profile_summary,
        )
        if ai_diet:
            diet = ai_diet
            agent_mode = "openai_rag"

    return AgentNutritionResponse(
        area=area,
        aqi=aqi_val,
        diet_plan=diet,
        rag_sources_used=count_rag_chunks(rag_diet),
        agent_mode=agent_mode,
        season=season_id,
        season_label=ctx.get("season_label"),
        has_patient_docs=has_patient_docs,
    )


def run_route_agent(
    profile: AnalyzeProfile,
    query: RouteQuery,
    *,
    aqi: int | None = None,
    publish_log: PublishLog | None = None,
) -> AgentRouteResponse:
    ctx = get_analysis_context()
    src = query.source.strip()
    dest = query.destination.strip()
    _emit(publish_log, ROUTE_AGENT, "thinking", f"Resolving route: {src} → {dest}…")
    aqi_val = aqi if aqi is not None else max(
        fetch_area_aqi(query.source),
        fetch_area_aqi(query.destination),
    )

    _emit(publish_log, ROUTE_AGENT, "thinking", "Fetching routes from OSRM…")
    route = fetch_routes_sync(query.source, query.destination)
    geo = route.get("geojson") or fetch_geojson_routes_sync(
        query.source, query.destination
    )
    route_options_raw = route.get("route_options") or build_three_route_options(
        query.source, query.destination
    )
    route_options = [RouteOption(**opt) for opt in route_options_raw]
    best = route_options[0] if route_options else None

    _emit(publish_log, ROUTE_AGENT, "thinking", "Computing personal exposure score…")
    safe = SafeRoute(
        summary=f"{query.source} → {query.destination}",
        distance=best.distance if best else route.get("distance"),
        duration=best.duration if best else route.get("duration"),
        exposure=best.exposure if best else route.get("exposure"),
        waypoints=best.waypoints if best else route.get("waypoints", []),
        reasoning=best.recommendation if best else geo.get("recommendation"),
        cleanest=geo.get("cleanest"),
        fastest=geo.get("fastest"),
        recommendation=best.recommendation if best else geo.get("recommendation"),
        aqi_checkpoints=geo.get("aqi_checkpoints", []),
        route_options=route_options,
    )

    pes = compute_personal_exposure_score(
        aqi=aqi_val,
        distance=best.distance if best else route.get("distance"),
        commute_mode=getattr(profile, "commute_mode", "car"),
        conditions=list(profile.conditions or []),
        sensitivity=getattr(profile, "sensitivity", "medium"),
    )

    season_intel_dict = build_personalized_season_intelligence(
        ctx.get("season", "winter_smog"),
        aqi=aqi_val,
        temp_c=float(ctx.get("temperature_c") or 0),
        conditions=list(profile.conditions or []),
        age=int(profile.age or 25),
        sensitivity=getattr(profile, "sensitivity", "medium"),
        commute_mode=getattr(profile, "commute_mode", "car"),
    )

    return AgentRouteResponse(
        aqi=aqi_val,
        aqi_label=aqi_label(aqi_val),
        safe_route=safe,
        personal_exposure_score=pes,
        season_intelligence=SeasonIntelligence(**season_intel_dict),
        context_summary=build_context_summary(
            aqi=aqi_val,
            source=query.source,
            destination=query.destination,
            ctx=ctx,
        ),
        route_source=route.get("source", "osrm"),
    )
