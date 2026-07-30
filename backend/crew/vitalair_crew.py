import asyncio
import json
import re
from collections.abc import Callable

from config import get_settings
from models.agent_output import GeoJSONFeature, RouteOutput, VitalAirResult, parse_crew_output
from schemas.models import (
    AnalyzeProfile,
    AnalyzeRequest,
    AnalyzeResponse,
    RouteQuery,
    SafeRoute,
    SeasonIntelligence,
)
from services.lahore_context import (
    build_context_summary,
    get_analysis_context,
    strip_wrong_season_phrases,
)
from services.agent_explainability import build_health_explainability
from services.mock_crew import run_mock_analysis
from services.personal_exposure_score import compute_personal_exposure_score
from services.rag_service import (
    build_health_rag_extra_queries,
    build_health_rag_query,
    retrieve_health_context,
)
from services.seasonal_intelligence import build_personalized_season_intelligence
from agents.llm_config import crewai_is_available
from services.user_patient_rag import (
    reset_active_keyword_chunks,
    reset_active_user_id,
    set_active_keyword_chunks,
    set_active_user_id,
)
from tools.maps_core import fetch_geojson_routes_sync

PublishLog = Callable[[str, str, str], None]

AGENT_STEPS: list[tuple[str, str]] = [
    ("Air Quality Monitor", "Fetching real-time AQI data for Lahore…"),
    ("Digital Pulmonologist", "Analyzing health conditions against current AQI…"),
    ("Environmental Nutritionist", "Looking up anti-pollution diet research…"),
    ("Smart Route Navigator", "Computing cleanest and fastest routes…"),
]


import time
import logging

logger = logging.getLogger(__name__)


async def run_parallel_agents_pipeline_async(
    payload: AnalyzeRequest,
    publish_log: PublishLog | None = None,
    user_doc_chunks: list[str] | None = None,
) -> AnalyzeResponse:
    from services.agent_runners import (
        fetch_area_aqi,
        run_health_agent_async,
        run_nutrition_agent_async,
        run_route_agent_async,
    )

    t_pipeline_start = time.perf_counter()
    logger.info("=== [VITALAIR PIPELINE] STARTING PARALLEL AGENT RUN ===")

    # 1. Direct WAQI API fetch for AQI (no LLM reasoning step)
    t_aqi0 = time.perf_counter()
    if publish_log:
        publish_log("Air Quality Monitor", "thinking", f"Fetching real-time AQI for {payload.query.source}…")
    aqi_val = fetch_area_aqi(payload.query.source)
    t_aqi1 = time.perf_counter()
    aqi_ms = (t_aqi1 - t_aqi0) * 1000
    logger.info(f"[TIMING] [AQI API FETCH] Completed in {aqi_ms:.2f}ms (AQI={aqi_val})")
    if publish_log:
        publish_log("Air Quality Monitor", "done", f"AQI: {aqi_val}")

    # 2. Run Health Agent, Nutritionist Agent, and Route Agent CONCURRENTLY via asyncio.gather()
    async def task_health():
        t0 = time.perf_counter()
        logger.info(f"[TIMING] [START] Health Agent (Digital Pulmonologist) at t={t0 - t_pipeline_start:.3f}s")
        res = await run_health_agent_async(
            payload.profile,
            payload.query.source,
            user_id=payload.user_id,
            user_doc_chunks=user_doc_chunks,
            aqi=aqi_val,
            destination=payload.query.destination,
            publish_log=publish_log,
        )
        t1 = time.perf_counter()
        dur = (t1 - t0) * 1000
        logger.info(f"[TIMING] [END] Health Agent at t={t1 - t_pipeline_start:.3f}s (duration: {dur:.2f}ms)")
        return res

    async def task_nutrition():
        t0 = time.perf_counter()
        logger.info(f"[TIMING] [START] Nutritionist Agent (Environmental Nutritionist) at t={t0 - t_pipeline_start:.3f}s")
        res = await run_nutrition_agent_async(
            payload.profile,
            payload.query.source,
            user_id=payload.user_id,
            user_doc_chunks=user_doc_chunks,
            aqi=aqi_val,
            publish_log=publish_log,
        )
        t1 = time.perf_counter()
        dur = (t1 - t0) * 1000
        logger.info(f"[TIMING] [END] Nutritionist Agent at t={t1 - t_pipeline_start:.3f}s (duration: {dur:.2f}ms)")
        return res

    async def task_route():
        t0 = time.perf_counter()
        logger.info(f"[TIMING] [START] Route Agent (Smart Route Navigator) at t={t0 - t_pipeline_start:.3f}s")
        res = await run_route_agent_async(
            payload.profile,
            payload.query,
            aqi=aqi_val,
            publish_log=publish_log,
        )
        t1 = time.perf_counter()
        dur = (t1 - t0) * 1000
        logger.info(f"[TIMING] [END] Route Agent at t={t1 - t_pipeline_start:.3f}s (duration: {dur:.2f}ms)")
        return res

    health_res, nutrition_res, route_res = await asyncio.gather(
        task_health(),
        task_nutrition(),
        task_route(),
    )

    t_pipeline_end = time.perf_counter()
    total_ms = (t_pipeline_end - t_pipeline_start) * 1000
    logger.info(f"=== [VITALAIR PIPELINE] FINISHED ALL AGENTS IN {total_ms:.2f}ms ===")

    return AnalyzeResponse(
        aqi_at_time=aqi_val,
        health_advice=health_res.health_advice,
        diet_plan=nutrition_res.diet_plan,
        safe_route=route_res.safe_route,
        personal_exposure_score=route_res.personal_exposure_score,
        health_explainability=health_res.health_explainability,
        season_intelligence=route_res.season_intelligence,
        season=route_res.season_intelligence.id,
        season_label=route_res.season_intelligence.name,
        temperature_c=health_res.temperature_c,
        humidity=None,
        heatwave=False,
        context_summary=route_res.context_summary,
    )


def run_vitalair_crew(
    user_profile: dict,
    query: dict,
    publish_log: PublishLog | None = None,
    user_id: str | None = None,
    user_doc_chunks: list[str] | None = None,
) -> AnalyzeResponse:
    payload = AnalyzeRequest(
        profile=AnalyzeProfile.model_validate(user_profile),
        query=RouteQuery.model_validate(query),
        user_id=user_id,
    )

    ctx_token = set_active_user_id(user_id)
    kw_token = set_active_keyword_chunks(user_doc_chunks)
    try:
        if get_settings().use_mock_agents:
            result = run_mock_analysis(
                payload,
                user_doc_chunks=user_doc_chunks,
                publish_log=publish_log,
            )
        else:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                result = asyncio.run_coroutine_threadsafe(
                    run_parallel_agents_pipeline_async(
                        payload, publish_log=publish_log, user_doc_chunks=user_doc_chunks
                    ),
                    loop,
                ).result()
            else:
                result = asyncio.run(
                    run_parallel_agents_pipeline_async(
                        payload, publish_log=publish_log, user_doc_chunks=user_doc_chunks
                    )
                )
    finally:
        reset_active_keyword_chunks(kw_token)
        reset_active_user_id(ctx_token)

    return result


def vital_result_to_response(
    result: VitalAirResult,
    payload: AnalyzeRequest,
    raw: str | None = None,
    ctx: dict | None = None,
) -> AnalyzeResponse:
    ctx = ctx or get_analysis_context()
    health = strip_wrong_season_phrases(result.health_advice, ctx.get("season", ""))
    geo = result.safe_route
    safe = SafeRoute(
        summary=f"{payload.query.source} → {payload.query.destination}",
        exposure="Moderate",
        waypoints=[
            payload.query.source,
            payload.query.destination,
        ],
        reasoning=geo.recommendation,
        cleanest=geo.cleanest.model_dump(),
        fastest=geo.fastest.model_dump(),
        recommendation=geo.recommendation,
        aqi_checkpoints=geo.aqi_checkpoints,
    )
    pes = compute_personal_exposure_score(
        aqi=result.aqi,
        distance=safe.distance,
        commute_mode=getattr(payload.profile, "commute_mode", "car"),
        conditions=payload.profile.conditions,
        sensitivity=getattr(payload.profile, "sensitivity", "medium"),
    )
    conditions_list = list(payload.profile.conditions or [])
    conditions = ", ".join(conditions_list) or "no listed conditions"
    rag_query = build_health_rag_query(
        aqi=result.aqi,
        area=payload.query.source,
        conditions=conditions_list,
        age=payload.profile.age,
        sensitivity=getattr(payload.profile, "sensitivity", "medium"),
        commute_mode=getattr(payload.profile, "commute_mode", "car"),
        outdoor_time=getattr(payload.profile, "outdoor_time", "30_60"),
        season_id=ctx.get("season", "winter_smog"),
        temp_c=float(ctx.get("temperature_c") or 0),
        destination=payload.query.destination,
    )
    rag_health = retrieve_health_context(
        rag_query,
        k=5,
        user_id=payload.user_id,
        extra_queries=build_health_rag_extra_queries(conditions_list, result.aqi),
    )
    explainability = build_health_explainability(
        profile=payload.profile,
        aqi=result.aqi,
        pes=pes,
        rag_context=rag_health,
        health_advice=health,
        agent_mode="LLM + RAG",
    )
    season_intel = build_personalized_season_intelligence(
        ctx.get("season", "winter_smog"),
        aqi=result.aqi,
        temp_c=float(ctx.get("temperature_c") or 0),
        conditions=list(payload.profile.conditions or []),
        age=int(payload.profile.age or 25),
        sensitivity=getattr(payload.profile, "sensitivity", "medium"),
        commute_mode=getattr(payload.profile, "commute_mode", "car"),
    )
    return AnalyzeResponse(
        aqi_at_time=result.aqi,
        health_advice=health,
        diet_plan=result.diet_plan,
        safe_route=safe,
        personal_exposure_score=pes,
        health_explainability=explainability,
        season_intelligence=SeasonIntelligence(**season_intel),
        raw=raw,
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


def _parse_crew_result(raw: str, payload: AnalyzeRequest) -> AnalyzeResponse:
    ctx = get_analysis_context()
    aqi = 187
    aqi_match = re.search(r'"aqi"\s*:\s*(\d+)', raw) or re.search(
        r"AQI[:\s]+(\d+)", raw, re.I
    )
    if aqi_match:
        aqi = int(aqi_match.group(1))

    diet: list[str] = []
    try:
        arr_match = re.search(r"\[[\s\S]*?\]", raw)
        if arr_match:
            parsed = json.loads(arr_match.group(0))
            if isinstance(parsed, list):
                diet = [str(x) for x in parsed[:5]]
    except json.JSONDecodeError:
        pass
    if len(diet) < 3:
        diet = [
            "Ginger tea",
            "Vitamin C foods",
            "Green tea",
            "Turmeric milk",
            "Leafy greens",
        ]

    geo = fetch_geojson_routes_sync(payload.query.source, payload.query.destination)
    try:
        parsed = parse_crew_output(raw)
        parsed.aqi = aqi
        if len(parsed.diet_plan) < 3:
            parsed.diet_plan = diet
        return vital_result_to_response(parsed, payload, raw=raw, ctx=ctx)
    except Exception:
        vital = VitalAirResult(
            aqi=aqi,
            health_advice=raw[:800] if raw else "Limit outdoor activity and wear N95 mask.",
            diet_plan=diet,
            safe_route=RouteOutput(
                cleanest=GeoJSONFeature(**geo["cleanest"]),
                fastest=GeoJSONFeature(**geo["fastest"]),
                recommendation=geo["recommendation"],
                aqi_checkpoints=geo.get("aqi_checkpoints", []),
            ),
        )
        return vital_result_to_response(vital, payload, raw=raw, ctx=ctx)

