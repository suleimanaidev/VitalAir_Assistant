from fastapi import APIRouter, Depends, HTTPException, Query

from db.repositories import list_queries, list_queries_full
from middleware.jwt_auth import get_optional_user_id, verify_token
from services.exposure_trends import build_exposure_trends

router = APIRouter(tags=["history"])


@router.get("/history")
async def get_history(
    user_id: str | None = Query(default=None),
    limit: int = Query(default=30, ge=1, le=100),
    token_user: str | None = Depends(get_optional_user_id),
):
    effective_user = user_id or token_user
    try:
        items = await list_queries(user_id=effective_user, limit=limit)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not load history: {exc}",
        ) from exc
    return {"city": "Lahore", "items": items}


@router.get("/history/me")
async def get_my_history(
    limit: int = Query(default=30, ge=1, le=100),
    payload: dict = Depends(verify_token),
):
    try:
        items = await list_queries(user_id=payload["sub"], limit=limit)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not load history: {exc}",
        ) from exc
    return {"city": "Lahore", "items": items}


@router.get("/history/trends")
async def get_exposure_trends(
    days: int = Query(default=30, ge=7, le=90),
    user_id: str | None = Query(default=None),
    token_user: str | None = Depends(get_optional_user_id),
):
    effective_user = user_id or token_user
    if not effective_user:
        raise HTTPException(status_code=401, detail="Sign in to view exposure trends")
    try:
        records = await list_queries_full(
            user_id=effective_user, limit=200, days=days
        )
        trends = build_exposure_trends(records, days=days)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not load exposure trends: {exc}",
        ) from exc
    return {"city": "Lahore", "status": "success", **trends}
