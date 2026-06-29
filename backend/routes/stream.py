"""In-memory SSE stream for analyze jobs."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from middleware.jwt_auth import get_optional_user_id
from services.analyze_jobs import get_job

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
        await asyncio.sleep(0.15)
    yield 'data: {"type":"end"}\n\n'


@router.get("/stream/{task_id}")
async def stream_task(
    task_id: str,
    _user: str | None = Depends(get_optional_user_id),
) -> StreamingResponse:
    """Server-Sent Events endpoint for in-memory analyze jobs."""
    if not get_job(task_id):
        raise HTTPException(status_code=404, detail="Task not found")

    return StreamingResponse(
        _memory_stream(task_id),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
