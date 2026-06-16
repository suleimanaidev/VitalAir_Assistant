"""Redis-backed SSE stream + in-memory fallback (plan §2.10)."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from middleware.jwt_auth import get_optional_user_id
from services.analyze_jobs import get_job
from services.redis_client import get_redis_client, redis_ping

router = APIRouter(tags=["stream"])

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


async def _memory_stream(task_id: str):
    sent = 0
    while True:
        job = get_job(task_id)
        if not job:
            break
        while sent < len(job.events):
            yield f"data: {json.dumps(job.events[sent])}\n\n"
            sent += 1
        if job.done:
            break
        await asyncio.sleep(0.4)
    yield 'data: {"type":"end"}\n\n'


async def _redis_stream(task_id: str):
    yield f"data: {json.dumps({'type': 'connected', 'task_id': task_id})}\n\n"

    client = get_redis_client()
    pubsub = client.pubsub()
    pubsub.subscribe(f"task:{task_id}")

    try:
        deadline = asyncio.get_event_loop().time() + 180
        while asyncio.get_event_loop().time() < deadline:
            message = await asyncio.to_thread(pubsub.get_message, timeout=1.0)
            if not message or message.get("type") != "message":
                await asyncio.sleep(0.05)
                continue

            raw = message["data"]
            if isinstance(raw, bytes):
                raw = raw.decode()

            yield f"data: {raw}\n\n"

            try:
                parsed = json.loads(raw)
                if parsed.get("type") in ("result", "error"):
                    break
            except json.JSONDecodeError:
                pass
    finally:
        pubsub.unsubscribe(f"task:{task_id}")
        pubsub.close()

    yield 'data: {"type":"end"}\n\n'


@router.get("/stream/{task_id}")
async def stream_task(
    task_id: str,
    _user: str | None = Depends(get_optional_user_id),
) -> StreamingResponse:
    """
    Server-Sent Events endpoint.
    Reads Redis pub/sub for Celery tasks, or in-memory job events as fallback.
    """
    if get_job(task_id):
        return StreamingResponse(
            _memory_stream(task_id),
            media_type="text/event-stream",
            headers=SSE_HEADERS,
        )

    if not redis_ping():
        raise HTTPException(
            status_code=503,
            detail="Task not found and Redis unavailable for streaming",
        )

    return StreamingResponse(
        _redis_stream(task_id),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
