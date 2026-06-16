from fastapi import APIRouter, Depends, HTTPException

from db.repositories import (
    create_user,
    ensure_user_for_token,
    get_user_by_id,
    is_profile_complete,
    profile_from_user_doc,
    update_user_profile,
)
from middleware.jwt_auth import AuthContext, get_auth_context
from schemas.models import ProfileResponse, UserProfile

router = APIRouter(tags=["profile"])


def _profile_response(user_id: str, doc: dict) -> ProfileResponse:
    profile = profile_from_user_doc(doc)
    return ProfileResponse(
        user_id=user_id,
        profile=profile,
        profile_complete=is_profile_complete(doc),
    )


async def _load_user(auth: AuthContext) -> dict:
    try:
        return await ensure_user_for_token(auth.user_id, auth.email)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="User not found") from exc


@router.get("/profile/me", response_model=ProfileResponse)
async def get_my_profile(auth: AuthContext = Depends(get_auth_context)) -> ProfileResponse:
    doc = await _load_user(auth)
    return _profile_response(str(doc["_id"]), doc)


@router.put("/profile/me", response_model=ProfileResponse)
async def update_my_profile(
    body: UserProfile,
    auth: AuthContext = Depends(get_auth_context),
) -> ProfileResponse:
    doc = await _load_user(auth)
    user_id = str(doc["_id"])
    updated = await update_user_profile(user_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    doc = await get_user_by_id(user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return _profile_response(user_id, doc)


@router.post("/profile", response_model=ProfileResponse)
async def create_profile(body: UserProfile) -> ProfileResponse:
    """Legacy: create a profile-only user (no auth). Prefer PUT /profile/me when logged in."""
    try:
        user_id = await create_user(body)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not save profile (is MongoDB running?): {exc}",
        ) from exc

    doc = await get_user_by_id(user_id)
    if not doc:
        raise HTTPException(status_code=500, detail="Profile saved but user not found")
    return _profile_response(user_id, doc)
