"""Admin-only API — users, documents, system health, RAG maintenance."""

from __future__ import annotations

import asyncio

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from config import get_settings
from db.connection import ping_db
from db.repositories import (
    admin_stats,
    get_user_admin_detail,
    list_documents_admin,
    list_queries,
    list_users_admin,
    update_user_admin,
)
from middleware.jwt_auth import AuthContext, require_admin
from services.rag_service import ensure_rag_index

router = APIRouter(tags=["admin"], prefix="/admin")


class AdminUserPatch(BaseModel):
    role: Literal["admin", "user"] | None = None
    is_active: bool | None = None


@router.get("/stats")
async def get_admin_stats(_admin: AuthContext = Depends(require_admin)):
    return {"status": "success", **(await admin_stats())}


@router.get("/users")
async def get_admin_users(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=120),
    _admin: AuthContext = Depends(require_admin),
):
    skip = (page - 1) * limit
    items, total = await list_users_admin(skip=skip, limit=limit, search=search)
    return {
        "status": "success",
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/users/{user_id}")
async def get_admin_user_detail(
    user_id: str,
    _admin: AuthContext = Depends(require_admin),
):
    detail = await get_user_admin_detail(user_id)
    if not detail:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "user": detail}


@router.patch("/users/{user_id}")
async def patch_admin_user(
    user_id: str,
    body: AdminUserPatch,
    admin: AuthContext = Depends(require_admin),
):
    if user_id == admin.user_id and body.role == "user":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
    if user_id == admin.user_id and body.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    try:
        updated = await update_user_admin(
            user_id,
            role=body.role,
            is_active=body.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not updated:
        raise HTTPException(status_code=404, detail="User not found")

    detail = await get_user_admin_detail(user_id)
    return {"status": "success", "user": detail}


@router.get("/users/{user_id}/history")
async def get_admin_user_history(
    user_id: str,
    limit: int = Query(default=30, ge=1, le=100),
    _admin: AuthContext = Depends(require_admin),
):
    items = await list_queries(user_id=user_id, limit=limit)
    return {"status": "success", "items": items}


@router.get("/documents")
async def get_admin_documents(
    limit: int = Query(default=50, ge=1, le=200),
    _admin: AuthContext = Depends(require_admin),
):
    items = await list_documents_admin(limit=limit)
    return {"status": "success", "items": items}


@router.get("/system")
async def get_admin_system(_admin: AuthContext = Depends(require_admin)):
    from agents.llm_config import active_llm_provider

    settings = get_settings()
    try:
        mongo_ok = await asyncio.wait_for(ping_db(), timeout=6.0)
    except asyncio.TimeoutError:
        mongo_ok = False

    rag_ok = False
    try:
        rag_ok = await asyncio.to_thread(ensure_rag_index)
    except Exception:
        rag_ok = False

    return {
        "status": "success",
        "mongodb": mongo_ok,
        "rag_index": rag_ok,
        "crew_mode": "mock" if settings.use_mock_agents else "live",
        "llm_provider": active_llm_provider(),
        "has_openai": settings.has_openai,
        "has_waqi": bool(settings.effective_waqi_key),
        "admin_emails_configured": len(settings.admin_email_list),
    }


@router.post("/rag/reingest")
async def post_admin_rag_reingest(_admin: AuthContext = Depends(require_admin)):
    try:
        ok = await asyncio.to_thread(ensure_rag_index)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG re-ingest failed: {exc}") from exc

    return {
        "status": "success",
        "rag_index": ok,
        "message": "RAG knowledge base refreshed" if ok else "RAG ingest returned false",
    }
