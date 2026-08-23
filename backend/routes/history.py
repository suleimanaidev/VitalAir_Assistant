from typing import Any
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from db.repositories import (
    get_db_async,
    list_queries,
    list_queries_full,
    save_query,
)
from middleware.jwt_auth import get_optional_user_id, verify_token
from services.exposure_trends import build_exposure_trends

router = APIRouter(tags=["history"])


class SaveHistoryRecordRequest(BaseModel):
    source: str = "Lahore"
    destination: str | None = None
    aqi_at_time: int | None = None
    pes_score: int | None = None
    pes_level: str | None = None
    health_advice: str | None = None
    diet_plan: list[str] | None = None
    safe_route: dict[str, Any] | None = None
    status: str = "complete"
    user_id: str | None = None


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


@router.post("/history")
async def save_history_record(
    body: SaveHistoryRecordRequest,
    token_user: str | None = Depends(get_optional_user_id),
):
    effective_user = body.user_id or token_user
    try:
        query_id = await save_query(
            user_id=effective_user,
            payload={
                "source": body.source,
                "destination": body.destination,
                "aqi": body.aqi_at_time,
            },
            result={
                "aqi": body.aqi_at_time,
                "aqi_at_time": body.aqi_at_time,
                "health_advice": body.health_advice,
                "diet_plan": body.diet_plan or [],
                "pes_score": body.pes_score,
                "pes_level": body.pes_level,
                "personal_exposure_score": (
                    {"score": body.pes_score, "level": body.pes_level}
                    if body.pes_score is not None
                    else None
                ),
                "safe_route": body.safe_route or {},
            },
            status=body.status,
        )
        return {
            "status": "success",
            "id": query_id,
            "message": "Record saved to health history",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save history record: {exc}",
        ) from exc


@router.delete("/history/{record_id}")
async def delete_history_record(
    record_id: str,
    token_user: str | None = Depends(get_optional_user_id),
):
    try:
        db = await get_db_async()
        filter_query: dict[str, Any] = {}
        if ObjectId.is_valid(record_id):
            filter_query["_id"] = ObjectId(record_id)
        else:
            filter_query["_id"] = record_id

        if token_user:
            if ObjectId.is_valid(token_user):
                filter_query["$or"] = [
                    {"user_id": ObjectId(token_user)},
                    {"user_id": token_user},
                ]
            else:
                filter_query["user_id"] = token_user

        res = await db.queries.delete_one(filter_query)
        if res.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Record not found or already deleted",
            )
        return {"status": "success", "message": "Record deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete record: {exc}",
        ) from exc


@router.delete("/history")
async def clear_history(
    token_user: str | None = Depends(get_optional_user_id),
    user_id: str | None = Query(default=None),
):
    effective_user = user_id or token_user
    if not effective_user:
        raise HTTPException(
            status_code=401, detail="Sign in required to clear history"
        )
    try:
        db = await get_db_async()
        filter_query: dict[str, Any] = {}
        if ObjectId.is_valid(effective_user):
            filter_query["$or"] = [
                {"user_id": ObjectId(effective_user)},
                {"user_id": effective_user},
            ]
        else:
            filter_query["user_id"] = effective_user

        res = await db.queries.delete_many(filter_query)
        return {
            "status": "success",
            "deleted_count": res.deleted_count,
            "message": "Health history cleared",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not clear history: {exc}",
        ) from exc


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
