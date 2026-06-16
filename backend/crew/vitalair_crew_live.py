import asyncio

from crewai import Crew, Process, Task  # type: ignore[import-untyped]

from agents.health_agent import health_agent
from db.repositories import count_user_documents
from agents.monitor_agent import monitor_agent
from agents.nutritionist_agent import nutritionist_agent
from agents.route_agent import route_agent
from crew.vitalair_crew import _parse_crew_result
from schemas.models import AnalyzeRequest, AnalyzeResponse
from services.lahore_context import get_analysis_context
from services.seasonal_intelligence import (
    agent_directives,
    build_personalized_season_intelligence,
    get_season_profile,
    lahore_now,
)


def run_live_crew(payload: AnalyzeRequest) -> AnalyzeResponse:
    profile = payload.profile
    q = payload.query
    ctx = get_analysis_context()
    season_id = ctx.get("season", "winter_smog")
    season = get_season_profile(season_id)
    season_label = ctx.get("season_label", season.label_en)
    temp = ctx.get("temperature_c", 0)
    personalized = build_personalized_season_intelligence(
        season_id,
        aqi=100,
        temp_c=float(temp or 0),
        conditions=list(profile.conditions or []),
        age=int(profile.age or 25),
        sensitivity=getattr(profile, "sensitivity", "medium"),
        commute_mode=getattr(profile, "commute_mode", "car"),
    )
    directives = {
        "health": personalized["health_agent_focus"],
        "nutrition": personalized["nutrition_agent_focus"],
        "route": personalized["route_agent_focus"],
    }
    hour = lahore_now().hour

    season_rules = (
        f"Lahore Seasonal Intelligence — {season.name} ({season.months}). "
        f"Local time {hour:02d}:00 PKT. Primary hazard: {season.primary_hazard}. "
        f"Health focus: {directives['health']}"
    )

    task1 = Task(
        description=f"Get current AQI for {q.source} area in {profile.city}, Pakistan. Return JSON with aqi, label, pm25.",
        agent=monitor_agent,
        expected_output="JSON with AQI value and pollution breakdown",
    )

    has_patient_docs = False
    if payload.user_id:
        try:
            has_patient_docs = asyncio.run(count_user_documents(payload.user_id)) > 0
        except Exception:
            has_patient_docs = False
    patient_hint = (
        " The patient has uploaded personal health documents — search the "
        "'Patient Health Records' tool for prescriptions, lab values, and restrictions, "
        "then merge with WHO guidance."
        if has_patient_docs
        else ""
    )

    task2 = Task(
        description=(
            f"User age {profile.age} with conditions: {profile.conditions or ['none']}. "
            f"Current Lahore context: season={season_label}, temp={temp}°C, route {q.source}→{q.destination}. "
            f"{season_rules} NEVER say 'smog season' unless it is winter smog season. "
            "Using AQI from previous task, search WHO Knowledge Base"
            + (" and Patient Health Records" if has_patient_docs else "")
            + f" then give 4–5 bullet personalized health advice.{patient_hint}"
        ),
        agent=health_agent,
        expected_output="Personalized health recommendations in plain text",
        context=[task1],
    )

    task3 = Task(
        description=(
            f"Season: {season.name}. Pollution: {season.primary_hazard}. "
            f"Nutrition directive: {directives['nutrition']}. "
            f"Based on AQI and {temp}°C, suggest 4-6 protective foods/drinks. "
            "Return a JSON array of strings."
        ),
        agent=nutritionist_agent,
        expected_output='JSON array like ["Nimbu pani", "Tarbuz"]',
        context=[task1],
    )

    task4 = Task(
        description=(
            f"Find safest route from {q.source} to {q.destination} in Lahore. "
            f"Route directive: {directives['route']}. "
            f"Avoid areas: {', '.join(season.avoid_areas)}. "
            f"Preferred travel window: {personalized['preferred_travel_window']}. "
            "Use Get GeoJSON Routes tool. Return JSON with keys: "
            "aqi, health_advice, diet_plan, safe_route (cleanest, fastest, recommendation, aqi_checkpoints)."
        ),
        agent=route_agent,
        expected_output="JSON with GeoJSON routes and recommendation",
        context=[task1],
    )

    crew = Crew(
        agents=[monitor_agent, health_agent, nutritionist_agent, route_agent],
        tasks=[task1, task2, task3, task4],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    return _parse_crew_result(str(result), payload)
