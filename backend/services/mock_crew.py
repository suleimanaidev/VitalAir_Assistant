"""Deterministic mock when CrewAI / Gemini is unavailable (uses RAG knowledge base)."""

import time
from collections.abc import Callable

from config import get_settings
from models.agent_output import GeoJSONFeature, RouteOutput, VitalAirResult
from schemas.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    RouteOption,
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
from services.seasonal_intelligence import build_personalized_season_intelligence
from services.rag_service import retrieve_diet_context, retrieve_health_context
from tools.area_mapping import resolve_area
from tools.iqair_core import fetch_aqi_for_api
from tools.maps_core import build_three_route_options, fetch_geojson_routes_sync, fetch_routes_sync

PublishLog = Callable[[str, str, str], None]

AGENT_STEPS: list[tuple[str, str]] = [
    ("Air Quality Monitor", "Fetching Lahore air quality for your route…"),
    ("Digital Pulmonologist", "Checking your health profile against current AQI…"),
    ("Environmental Nutritionist", "Building smog-friendly nutrition tips…"),
    ("Smart Route Navigator", "Finding 3 low-AQI paths across Lahore…"),
]

AGENT_STEP_DELAY = 0.7
from tools.waqi_core import fetch_aqi_for_area


def _route_aqi(source: str, destination: str) -> int:
    """Live WAQI for route endpoints; fallback to city feed with small offset."""
    readings: list[int] = []
    for name in (source, destination):
        mapped = resolve_area(name)
        if not mapped:
            continue
        try:
            data = fetch_aqi_for_area(name)
            if data and data.get("aqi"):
                readings.append(int(data["aqi"]))
        except Exception:
            pass

    if readings:
        return max(readings)

    base = int(fetch_aqi_for_api("Lahore")["aqi"])
    key = f"{source.lower()}|{destination.lower()}"
    spread = sum(ord(c) for c in key) % 25
    return max(50, min(300, base + spread - 12))


def _to_analyze_response(
    payload: AnalyzeRequest,
    result: VitalAirResult,
    route_meta: dict | None = None,
    *,
    ctx: dict | None = None,
    rag_health: str = "",
    agent_mode: str = "mock_crew",
) -> AnalyzeResponse:
    geo = result.safe_route
    route_meta = route_meta or {}
    ctx = ctx or get_analysis_context()
    route_options_raw = route_meta.get("route_options") or build_three_route_options(
        payload.query.source, payload.query.destination
    )
    route_options = [RouteOption(**opt) for opt in route_options_raw]
    best = route_options[0] if route_options else None

    route_distance = best.distance if best else route_meta.get("distance")
    safe = SafeRoute(
        summary=f"{payload.query.source} → {payload.query.destination}",
        distance=route_distance,
        duration=best.duration if best else route_meta.get("duration"),
        exposure=best.exposure if best else route_meta.get("exposure"),
        waypoints=best.waypoints if best else route_meta.get("waypoints", []),
        reasoning=best.recommendation if best else geo.recommendation,
        cleanest=geo.cleanest.model_dump(),
        fastest=geo.fastest.model_dump(),
        recommendation=best.recommendation if best else geo.recommendation,
        aqi_checkpoints=geo.aqi_checkpoints,
        route_options=route_options,
    )
    pes = compute_personal_exposure_score(
        aqi=result.aqi,
        distance=route_distance,
        commute_mode=getattr(payload.profile, "commute_mode", "car"),
        conditions=payload.profile.conditions,
        sensitivity=getattr(payload.profile, "sensitivity", "medium"),
    )
    season_intel_dict = build_personalized_season_intelligence(
        ctx.get("season", "winter_smog"),
        aqi=result.aqi,
        temp_c=float(ctx.get("temperature_c") or 0),
        conditions=list(payload.profile.conditions or []),
        age=int(payload.profile.age or 25),
        sensitivity=getattr(payload.profile, "sensitivity", "medium"),
        commute_mode=getattr(payload.profile, "commute_mode", "car"),
    )
    explainability = build_health_explainability(
        profile=payload.profile,
        aqi=result.aqi,
        pes=pes,
        rag_context=rag_health,
        health_advice=result.health_advice,
        agent_mode=agent_mode,
    )
    return AnalyzeResponse(
        aqi_at_time=result.aqi,
        health_advice=result.health_advice,
        diet_plan=result.diet_plan,
        safe_route=safe,
        personal_exposure_score=pes,
        health_explainability=explainability,
        season_intelligence=SeasonIntelligence(**season_intel_dict),
        raw=route_meta.get("raw", "mock_crew") if route_meta else "mock_crew",
        season=ctx.get("season"),
        season_label=ctx.get("season_label"),
        temperature_c=ctx.get("temperature_c"),
        humidity=ctx.get("humidity"),
        heatwave=ctx.get("heatwave", False),
        context_summary=build_context_summary(
            aqi=result.aqi,
            source=payload.query.source,
            destination=payload.query.destination,
            ctx=ctx,
        ),
    )


def _log_step(
    publish_log: PublishLog | None,
    agent: str,
    message: str,
    work: Callable[[], None],
) -> None:
    if publish_log:
        publish_log(agent, "thinking", message)
        time.sleep(AGENT_STEP_DELAY)
    work()
    if publish_log:
        publish_log(agent, "done", "Completed")
        time.sleep(0.3)


def run_mock_analysis(
    payload: AnalyzeRequest,
    *,
    user_doc_chunks: list[str] | None = None,
    publish_log: PublishLog | None = None,
) -> AnalyzeResponse:
    ctx = get_analysis_context()
    season_id = ctx["season"]
    temp_c = float(ctx.get("temperature_c") or 0)
    conditions = ", ".join(payload.profile.conditions) or "no listed conditions"
    sensitivity = getattr(payload.profile, "sensitivity", "medium")
    commute = getattr(payload.profile, "commute_mode", "car")
    outdoor = getattr(payload.profile, "outdoor_time", "30_60")

    state: dict = {
        "aqi": 0,
        "health": "",
        "rag_health": "",
        "diet": [],
        "route": {},
        "geo": {},
        "raw_mode": "mock_crew",
    }

    def step_aqi() -> None:
        state["aqi"] = _route_aqi(payload.query.source, payload.query.destination)

    _log_step(publish_log, AGENT_STEPS[0][0], AGENT_STEPS[0][1], step_aqi)
    aqi = state["aqi"]

    def step_health() -> None:
        rag_health = retrieve_health_context(
            f"AQI {aqi} Lahore {season_id} health advice {conditions} "
            f"age {payload.profile.age} sensitivity {sensitivity} commute {commute} outdoor {outdoor} "
            f"temperature {temp_c}C route {payload.query.source} to {payload.query.destination}",
            user_id=payload.user_id,
            user_doc_chunks=user_doc_chunks,
        )
        state["rag_health"] = rag_health
        health = format_health_advice(
            rag_health,
            aqi,
            conditions,
            season_id=season_id,
            temp_c=temp_c,
            source=payload.query.source,
            destination=payload.query.destination,
            age=payload.profile.age,
            sensitivity=sensitivity,
            commute_mode=commute,
            outdoor_time=outdoor,
            profile_name=payload.profile.name,
            user_id=payload.user_id,
        )
        health = strip_wrong_season_phrases(health, season_id)
        settings = get_settings()
        if settings.has_openai:
            profile_summary = (
                f"{payload.profile.name}, age {payload.profile.age}, "
                f"sensitivity {sensitivity}, commute {commute}, outdoor {outdoor}"
            )
            ai_health = generate_health_advice(
                aqi=aqi,
                conditions=conditions,
                rag_context=rag_health,
                profile_summary=profile_summary,
                season_id=season_id,
                season_label=ctx.get("season_label", "Lahore"),
                temp_c=temp_c,
                source=payload.query.source,
                destination=payload.query.destination,
                has_patient_docs=bool(user_doc_chunks)
                or "--- Your health documents ---" in rag_health,
            )
            if ai_health:
                health = strip_wrong_season_phrases(ai_health, season_id)
                state["raw_mode"] = "openai"
        state["health"] = health

    _log_step(publish_log, AGENT_STEPS[1][0], AGENT_STEPS[1][1], step_health)

    def step_diet() -> None:
        rag_diet = retrieve_diet_context(
            f"anti pollution diet nutrition AQI {aqi} Lahore {season_id} temperature {temp_c}C"
        )
        diet = format_diet_plan(
            rag_diet,
            season_id=season_id,
            aqi=aqi,
            conditions=conditions,
            age=payload.profile.age,
            sensitivity=sensitivity,
            source=payload.query.source,
            destination=payload.query.destination,
            user_id=payload.user_id,
        )
        settings = get_settings()
        if settings.has_openai:
            ai_diet = generate_diet_plan(
                aqi=aqi,
                rag_context=rag_diet,
                season_id=season_id,
                season_label=ctx.get("season_label", "Lahore"),
                conditions=conditions,
                age=payload.profile.age,
                sensitivity=sensitivity,
                commute_mode=commute,
                source=payload.query.source,
                destination=payload.query.destination,
            )
            if ai_diet:
                diet = ai_diet
        state["diet"] = diet

    _log_step(publish_log, AGENT_STEPS[2][0], AGENT_STEPS[2][1], step_diet)

    def step_route() -> None:
        route = fetch_routes_sync(payload.query.source, payload.query.destination)
        geo = route.get("geojson") or fetch_geojson_routes_sync(
            payload.query.source, payload.query.destination
        )
        state["route"] = route
        state["geo"] = geo

    _log_step(publish_log, AGENT_STEPS[3][0], AGENT_STEPS[3][1], step_route)

    geo = state["geo"]
    vital = VitalAirResult(
        aqi=aqi,
        health_advice=state["health"],
        diet_plan=state["diet"],
        safe_route=RouteOutput(
            cleanest=GeoJSONFeature(**geo["cleanest"]),
            fastest=GeoJSONFeature(**geo["fastest"]),
            recommendation=geo["recommendation"],
            aqi_checkpoints=geo.get("aqi_checkpoints", []),
        ),
    )
    route_with_raw = {**state["route"], "raw": state["raw_mode"]}
    return _to_analyze_response(
        payload,
        vital,
        route_with_raw,
        ctx=ctx,
        rag_health=state.get("rag_health", ""),
        agent_mode=state.get("raw_mode", "mock_crew"),
    )
