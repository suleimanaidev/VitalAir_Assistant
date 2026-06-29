import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from middleware.jwt_auth import get_optional_user_id
from schemas.models import AnalyzeRequest, AnalyzeResponse
from services.analyze_jobs import create_job, run_analyze_job

router = APIRouter(tags=["analyze"])


class AnalyzeTaskResponse(BaseModel):
    task_id: str
    status: str = "queued"
    city: str = "Lahore"


@router.post("/analyze", response_model=AnalyzeTaskResponse)
async def analyze_route(
    body: AnalyzeRequest,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AnalyzeTaskResponse:
    """
    Enqueues analysis and returns task_id immediately.
    Subscribe to GET /api/stream/{task_id} for live SSE updates.
    """
    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token

    job_id = create_job()
    asyncio.create_task(run_analyze_job(job_id, body))
    return AnalyzeTaskResponse(task_id=job_id)


@router.post("/analyze/sync", response_model=AnalyzeResponse)
async def analyze_route_sync(
    body: AnalyzeRequest,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AnalyzeResponse:
    """Synchronous analyze fallback (no SSE)."""
    from crew.vitalair_crew import run_vitalair_crew
    from db.repositories import get_user_document_chunks, save_query
    from services.user_patient_rag import sync_user_patient_index_from_mongo

    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token

    user_doc_chunks: list[str] = []
    if body.user_id:
        try:
            await sync_user_patient_index_from_mongo(body.user_id)
            user_doc_chunks = await get_user_document_chunks(body.user_id)
        except Exception:
            user_doc_chunks = []

    try:
        result = run_vitalair_crew(
            user_profile=body.profile.model_dump(),
            query=body.query.model_dump(),
            user_id=body.user_id,
            user_doc_chunks=user_doc_chunks,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Crew analysis failed: {exc}") from exc

    try:
        query_id = await save_query(
            body.user_id,
            body.query.model_dump(),
            result.model_dump(),
        )
        result.query_id = query_id
    except Exception:
        pass

    return result
