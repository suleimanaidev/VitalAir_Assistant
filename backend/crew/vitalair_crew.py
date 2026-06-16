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
from services.rag_service import retrieve_health_context
from services.seasonal_intelligence import build_personalized_season_intelligence
from agents.llm_config import crewai_is_available
from services.user_patient_rag import reset_active_user_id, set_active_user_id
from tools.maps_core import fetch_geojson_routes_sync

PublishLog = Callable[[str, str, str], None]

AGENT_STEPS: list[tuple[str, str]] = [
    ("Air Quality Monitor", "Fetching real-time AQI data for Lahore…"),
    ("Digital Pulmonologist", "Analyzing health conditions against current AQI…"),
    ("Environmental Nutritionist", "Looking up anti-pollution diet research…"),
    ("Smart Route Navigator", "Computing cleanest and fastest routes…"),
]


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
    try:
        if get_settings().use_mock_agents:
            result = run_mock_analysis(
                payload,
                user_doc_chunks=user_doc_chunks,
                publish_log=publish_log,
            )
        elif crewai_is_available():
            try:
                from crew.vitalair_crew_live import run_live_crew

                result = run_live_crew(payload)
            except Exception:
                result = run_mock_analysis(
                    payload,
                    user_doc_chunks=user_doc_chunks,
                    publish_log=publish_log,
                )
        else:
            result = run_mock_analysis(
                payload,
                user_doc_chunks=user_doc_chunks,
                publish_log=publish_log,
            )
    finally:
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
    conditions = ", ".join(payload.profile.conditions) or "no listed conditions"
    rag_health = retrieve_health_context(
        f"AQI {result.aqi} Lahore health advice {conditions}",
        user_id=payload.user_id,
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

