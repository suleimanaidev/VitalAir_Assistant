"""Async agent jobs with SSE progress — health, nutrition, route."""

from __future__ import annotations

import asyncio
from typing import Any

from db.repositories import get_today_symptom_checkin, get_user_document_chunks
from schemas.models import AgentAreaBody, AgentRouteBody
from services.agent_runners import run_health_agent, run_nutrition_agent, run_route_agent
from services.analyze_jobs import append_event, create_job, get_job, make_agent_log
from services.user_patient_rag import sync_user_patient_index_from_mongo

__all__ = ["create_job", "get_job", "run_health_agent_job", "run_nutrition_agent_job", "run_route_agent_job"]


async def _prepare_user_rag(user_id: str | None) -> list[str]:
    if not user_id:
        return []
    try:
        await sync_user_patient_index_from_mongo(user_id)
        return await get_user_document_chunks(user_id)
    except Exception:
        return []


def _publish(job_id: str, agent: str, status: str, message: str) -> None:
    append_event(job_id, make_agent_log(agent, status, message))


def _finish(job_id: str, kind: str, result: dict[str, Any]) -> None:
    append_event(
        job_id,
        {"type": "agent_result", "payload": {"kind": kind, "result": result}},
    )


async def run_health_agent_job(job_id: str, body: AgentAreaBody) -> None:
    job = get_job(job_id)
    if not job:
        return

    agent = "Digital Pulmonologist"
    try:
        _publish(job_id, agent, "thinking", f"Starting analysis for {body.area.strip()}…")
        user_doc_chunks = await _prepare_user_rag(body.user_id)
        today = (
            await get_today_symptom_checkin(body.user_id) if body.user_id else None
        )

        def publish_log(name: str, status: str, message: str) -> None:
            _publish(job_id, name, status, message)

        result = await asyncio.to_thread(
            run_health_agent,
            body.profile,
            body.area.strip(),
            user_id=body.user_id,
            user_doc_chunks=user_doc_chunks,
            aqi=body.aqi,
            destination=body.destination,
            symptom_summary=today.summary if today else None,
            symptom_score=today.score if today else None,
            publish_log=publish_log,
        )
        payload = result.model_dump()
        job.result = payload
        _finish(job_id, "health", payload)
        _publish(job_id, agent, "done", "Personalized health advice ready.")
    except Exception as exc:
        job.error = str(exc)
        append_event(job_id, {"type": "error", "payload": {"message": str(exc)}})
        _publish(job_id, agent, "error", str(exc))
    finally:
        job.done = True


async def run_nutrition_agent_job(job_id: str, body: AgentAreaBody) -> None:
    job = get_job(job_id)
    if not job:
        return

    agent = "Environmental Nutritionist"
    try:
        _publish(job_id, agent, "thinking", f"Building food guide for {body.area.strip()}…")
        user_doc_chunks = await _prepare_user_rag(body.user_id)

        def publish_log(name: str, status: str, message: str) -> None:
            _publish(job_id, name, status, message)

        result = await asyncio.to_thread(
            run_nutrition_agent,
            body.profile,
            body.area.strip(),
            user_id=body.user_id,
            user_doc_chunks=user_doc_chunks,
            aqi=body.aqi,
            publish_log=publish_log,
        )
        payload = result.model_dump()
        job.result = payload
        _finish(job_id, "nutrition", payload)
        _publish(job_id, agent, "done", "Anti-pollution nutrition guide ready.")
    except Exception as exc:
        job.error = str(exc)
        append_event(job_id, {"type": "error", "payload": {"message": str(exc)}})
        _publish(job_id, agent, "error", str(exc))
    finally:
        job.done = True


async def run_route_agent_job(job_id: str, body: AgentRouteBody) -> None:
    job = get_job(job_id)
    if not job:
        return

    agent = "Smart Route Navigator"
    src = body.query.source.strip()
    dest = body.query.destination.strip()
    try:
        _publish(job_id, agent, "thinking", f"Finding safer routes: {src} → {dest}…")

        def publish_log(name: str, status: str, message: str) -> None:
            _publish(job_id, name, status, message)

        result = await asyncio.to_thread(
            run_route_agent,
            body.profile,
            body.query,
            aqi=body.aqi,
            publish_log=publish_log,
        )
        payload = result.model_dump()
        job.result = payload
        _finish(job_id, "route", payload)
        _publish(job_id, agent, "done", "Route analysis complete.")
    except Exception as exc:
        job.error = str(exc)
        append_event(job_id, {"type": "error", "payload": {"message": str(exc)}})
        _publish(job_id, agent, "error", str(exc))
    finally:
        job.done = True
