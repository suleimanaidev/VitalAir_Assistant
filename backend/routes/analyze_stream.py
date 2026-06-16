from fastapi import APIRouter, Depends
from pydantic import BaseModel

from middleware.jwt_auth import get_optional_user_id
from routes.analyze import analyze_route
from schemas.models import AnalyzeRequest

router = APIRouter(tags=["analyze-stream"])


class JobCreated(BaseModel):
    job_id: str
    task_id: str
    city: str = "Lahore"


@router.post("/analyze/jobs", response_model=JobCreated)
async def start_analyze_job(
    body: AnalyzeRequest,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> JobCreated:
    """Legacy alias — prefer POST /api/analyze."""
    result = await analyze_route(body, user_id_from_token)
    return JobCreated(job_id=result.task_id, task_id=result.task_id)


@router.get("/analyze/stream/{job_id}")
async def stream_analyze_job_legacy(job_id: str):
    """Legacy alias — prefer GET /api/stream/{task_id}."""
    from routes.stream import stream_task

    return await stream_task(job_id)
