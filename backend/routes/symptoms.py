"""Daily symptom check-in API."""

from fastapi import APIRouter, Depends, HTTPException

from db.repositories import (
    get_today_symptom_checkin,
    save_symptom_checkin,
)
from middleware.jwt_auth import AuthContext, get_auth_context
from schemas.models import SymptomCheckinBody, SymptomCheckinResponse

router = APIRouter(tags=["symptoms"])


@router.get("/symptoms/today", response_model=SymptomCheckinResponse | None)
async def get_today_symptoms(
    auth: AuthContext = Depends(get_auth_context),
) -> SymptomCheckinResponse | None:
    return await get_today_symptom_checkin(auth.user_id)


@router.post("/symptoms/checkin", response_model=SymptomCheckinResponse)
async def save_today_symptoms(
    body: SymptomCheckinBody,
    auth: AuthContext = Depends(get_auth_context),
) -> SymptomCheckinResponse:
    result = await save_symptom_checkin(auth.user_id, body)
    if not result:
        raise HTTPException(status_code=400, detail="Could not save symptom check-in")
    return result
