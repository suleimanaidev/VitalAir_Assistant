"""In-memory analyze jobs + SSE events."""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from crew.vitalair_crew import run_vitalair_crew
from db.repositories import get_user_document_chunks, save_query
from services.user_patient_rag import sync_user_patient_index_from_mongo
from schemas.models import AnalyzeRequest

AGENT_STEPS = [
    ("Air Quality Monitor", "Fetching Lahore air quality for your route…"),
    ("Digital Pulmonologist", "Checking your health profile against current AQI…"),
    ("Environmental Nutritionist", "Building smog-friendly nutrition tips…"),
    ("Smart Route Navigator", "Finding lower-exposure path across Lahore…"),
]


@dataclass
class JobState:
    events: list[dict[str, Any]] = field(default_factory=list)
    done: bool = False
    result: dict[str, Any] | None = None
    error: str | None = None


_jobs: dict[str, JobState] = {}


def create_job() -> str:
    job_id = str(uuid.uuid4())
    _jobs[job_id] = JobState()
    return job_id


def get_job(job_id: str) -> JobState | None:
    return _jobs.get(job_id)


def append_event(job_id: str, event: dict[str, Any]) -> None:
    job = _jobs.get(job_id)
    if job:
        job.events.append(event)


def _agent_log(agent: str, status: str, message: str) -> dict[str, Any]:
    return {
        "type": "agent_log",
        "payload": {
            "agent": agent,
            "status": status,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }


def make_agent_log(agent: str, status: str, message: str) -> dict[str, Any]:
    """Public helper for agent job SSE events."""
    return _agent_log(agent, status, message)


async def run_analyze_job(job_id: str, body: AnalyzeRequest) -> None:
    job = _jobs.get(job_id)
    if not job:
        return

    def publish_log(agent: str, status: str, message: str) -> None:
        append_event(job_id, _agent_log(agent, status, message))

    try:
        user_doc_chunks: list[str] = []
        if body.user_id:
            try:
                await sync_user_patient_index_from_mongo(body.user_id)
                user_doc_chunks = await get_user_document_chunks(body.user_id)
            except Exception:
                user_doc_chunks = []

        result = run_vitalair_crew(
            user_profile=body.profile.model_dump(),
            query=body.query.model_dump(),
            publish_log=publish_log,
            user_id=body.user_id,
            user_doc_chunks=user_doc_chunks,
        )

        try:
            query_id = await save_query(
                body.user_id,
                body.query.model_dump(),
                result.model_dump(),
                task_id=job_id,
                status="complete",
            )
            result.query_id = query_id
        except Exception:
            pass

        payload = result.model_dump()
        job.result = payload
        append_event(job_id, {"type": "result", "payload": payload})
    except Exception as exc:
        job.error = str(exc)
        append_event(
            job_id,
            {"type": "error", "payload": {"message": str(exc)}},
        )
    finally:
        job.done = True
