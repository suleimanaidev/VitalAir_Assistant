"""Celery analysis task with Redis pub/sub SSE (plan §2.9)."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from celery_app import celery
from crew.vitalair_crew import run_vitalair_crew
from db.repositories import get_user_document_chunks, save_query
from services.redis_client import publish_task_event
from services.user_patient_rag import sync_user_patient_index_from_mongo


def _publish_log(task_id: str, agent: str, status: str, message: str) -> None:
    publish_task_event(
        task_id,
        {
            "type": "agent_log",
            "payload": {
                "agent": agent,
                "status": status,
                "message": message,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        },
    )


def _save_query_sync(
    user_id: str | None,
    query: dict,
    result: dict,
    task_id: str,
) -> str | None:
    try:
        return asyncio.run(
            save_query(
                user_id,
                query,
                result,
                task_id=task_id,
                status="complete",
            )
        )
    except Exception:
        return None


@celery.task(bind=True, name="crew.tasks.run_analysis_task")
def run_analysis_task(
    self,
    user_profile: dict,
    query: dict,
    user_id: str | None = None,
) -> dict:
    task_id = self.request.id

    def publish_log(agent: str, status: str, message: str) -> None:
        _publish_log(task_id, agent, status, message)

    try:
        user_doc_chunks: list[str] = []
        if user_id:
            try:
                asyncio.run(sync_user_patient_index_from_mongo(user_id))
                user_doc_chunks = asyncio.run(get_user_document_chunks(user_id))
            except Exception:
                user_doc_chunks = []

        result = run_vitalair_crew(
            user_profile=user_profile,
            query=query,
            publish_log=publish_log,
            user_id=user_id,
            user_doc_chunks=user_doc_chunks,
        )

        payload = result.model_dump()
        query_id = _save_query_sync(user_id, query, payload, task_id)
        if query_id:
            payload["query_id"] = query_id

        publish_task_event(task_id, {"type": "result", "payload": payload})
        return payload

    except Exception as exc:
        publish_task_event(
            task_id,
            {
                "type": "error",
                "payload": {"message": str(exc)},
            },
        )
        raise
