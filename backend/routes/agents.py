"""Per-agent API — run health, nutrition, or route agents independently."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.repositories import (
    get_today_symptom_checkin,
    get_user_by_id,
    get_user_document_chunks,
    profile_from_user_doc,
)
from middleware.jwt_auth import get_optional_user_id
from schemas.models import (
    AgentAreaBody,
    AgentHealthResponse,
    AgentNutritionResponse,
    AgentRouteBody,
    AgentRouteResponse,
)
from services.agent_jobs import (
    create_job,
    run_health_agent_job,
    run_nutrition_agent_job,
    run_route_agent_job,
)
from services.agent_runners import run_health_agent, run_nutrition_agent, run_route_agent
from services.openai_advice import generate_patient_rag_chat_answer
from services.rag_service import retrieve_health_context
from services.user_patient_rag import (
    reset_active_keyword_chunks,
    reset_active_user_id,
    set_active_keyword_chunks,
    set_active_user_id,
    sync_user_patient_index_from_mongo,
)

router = APIRouter(tags=["agents"])


class AgentTaskResponse(BaseModel):
    task_id: str
    status: str = "queued"


class ChatTurn(BaseModel):
    role: str
    text: str


class PatientRagChatRequest(BaseModel):
    question: str
    area: str | None = None
    aqi: int | None = None
    history: list[ChatTurn] | None = None


class PatientRagChatResponse(BaseModel):
    answer: str
    sources_used: int
    has_patient_docs: bool
    mode: str


async def _prepare_user_rag(user_id: str | None) -> list[str]:
    if not user_id:
        return []
    try:
        await sync_user_patient_index_from_mongo(user_id)
        return await get_user_document_chunks(user_id)
    except Exception:
        return []


def _fallback_rag_chat_answer(
    question: str,
    context: str,
    *,
    has_patient_docs: bool,
) -> str:
    snippets = [p.strip() for p in context.split("\n\n") if len(p.strip()) > 40][:3]
    if not snippets:
        return (
            "Is waqt aap ke sawal ka specific context available nahi hai.\n\n"
            "General WHO-based guidance:\n"
            "• AQI zyada ho to outdoor waqt kam karein aur N95 mask lagayein.\n"
            "• Ghar mein windows band rakhein aur air purifier chalayein.\n"
            "• Agar saans ki takleef, chest tightness, ya lagatar cough ho to foran doctor se milein.\n\n"
            "Apne area ka AQI check karein aur usi ke mutabiq precautions lein."
        )
    intro = (
        "Aap ke uploaded health documents aur WHO context ke mutabiq:"
        if has_patient_docs
        else "WHO air-quality health guidance ke mutabiq:"
    )
    bullets = "\n".join(f"• {snippet[:280]}" for snippet in snippets)
    return (
        f"{intro}\n{bullets}\n\n"
        "Agar symptoms severe hon (saans mein mushkil, chest pain) to "
        "doctor/ER se foran rabta karein."
    )


@router.post("/agents/rag-chat", response_model=PatientRagChatResponse)
async def patient_rag_chat(
    body: PatientRagChatRequest,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> PatientRagChatResponse:
    if not user_id_from_token:
        raise HTTPException(status_code=401, detail="Sign in to use patient RAG chat")

    question = body.question.strip()
    if len(question) < 3:
        raise HTTPException(status_code=400, detail="Please ask a longer question")

    user_doc_chunks = await _prepare_user_rag(user_id_from_token)
    profile_summary = ""
    user_doc = await get_user_by_id(user_id_from_token)
    
    # Resolve area and AQI dynamically if not provided
    area = (body.area or "").strip()
    if not area:
        if user_doc:
            area = user_doc.get("city") or "Lahore"
        else:
            area = "Lahore"
            
    aqi_val = body.aqi
    if aqi_val is None:
        try:
            from services.agent_runners import fetch_area_aqi
            aqi_val = fetch_area_aqi(area)
        except Exception:
            aqi_val = 120

    if user_doc:
        profile = profile_from_user_doc(user_doc)
        conditions = ", ".join(profile.conditions) or "none"
        profile_summary = (
            f"{profile.name}, age {profile.age}, conditions: {conditions}, "
            f"sensitivity {profile.sensitivity}, commute {profile.commute_mode}, "
            f"outdoor {profile.outdoor_time}"
        )

    context = await asyncio.to_thread(
        retrieve_health_context,
        question,
        5,
        user_id=user_id_from_token,
        user_doc_chunks=user_doc_chunks,
        extra_queries=[area or "Lahore air quality patient health"],
    )
    if profile_summary:
        context = f"Health profile: {profile_summary}\n\n{context}"

    has_patient_docs = bool(user_doc_chunks)
    sources_used = len([p for p in context.split("\n\n") if len(p.strip()) > 40])

    answer = await asyncio.to_thread(
        generate_patient_rag_chat_answer,
        question=question,
        rag_context=context,
        has_patient_docs=has_patient_docs,
        area=area,
        aqi=aqi_val,
    )
    mode = "openai_rag" if answer else "context_fallback"
    if not answer:
        answer = _fallback_rag_chat_answer(
            question,
            context,
            has_patient_docs=has_patient_docs,
        )

    return PatientRagChatResponse(
        answer=answer,
        sources_used=sources_used,
        has_patient_docs=has_patient_docs,
        mode=mode,
    )


@router.post("/agents/health/async", response_model=AgentTaskResponse)
async def agent_health_async(
    body: AgentAreaBody,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AgentTaskResponse:
    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token
    job_id = create_job()
    asyncio.create_task(run_health_agent_job(job_id, body))
    return AgentTaskResponse(task_id=job_id)


@router.post("/agents/nutrition/async", response_model=AgentTaskResponse)
async def agent_nutrition_async(
    body: AgentAreaBody,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AgentTaskResponse:
    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token
    job_id = create_job()
    asyncio.create_task(run_nutrition_agent_job(job_id, body))
    return AgentTaskResponse(task_id=job_id)


@router.post("/agents/route/async", response_model=AgentTaskResponse)
async def agent_route_async(
    body: AgentRouteBody,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AgentTaskResponse:
    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token
    job_id = create_job()
    asyncio.create_task(run_route_agent_job(job_id, body))
    return AgentTaskResponse(task_id=job_id)


@router.post("/agents/health", response_model=AgentHealthResponse)
async def agent_health(
    body: AgentAreaBody,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AgentHealthResponse:
    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token

    user_doc_chunks = await _prepare_user_rag(body.user_id)
    today_symptoms = (
        await get_today_symptom_checkin(body.user_id) if body.user_id else None
    )
    uid_token = set_active_user_id(body.user_id)
    kw_token = set_active_keyword_chunks(user_doc_chunks or None)
    try:
        return await asyncio.to_thread(
            run_health_agent,
            body.profile,
            body.area.strip(),
            user_id=body.user_id,
            user_doc_chunks=user_doc_chunks,
            aqi=body.aqi,
            destination=body.destination,
            symptom_summary=today_symptoms.summary if today_symptoms else None,
            symptom_score=today_symptoms.score if today_symptoms else None,
        )
    finally:
        reset_active_keyword_chunks(kw_token)
        reset_active_user_id(uid_token)


@router.post("/agents/nutrition", response_model=AgentNutritionResponse)
async def agent_nutrition(
    body: AgentAreaBody,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AgentNutritionResponse:
    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token

    user_doc_chunks = await _prepare_user_rag(body.user_id)

    return await asyncio.to_thread(
        run_nutrition_agent,
        body.profile,
        body.area.strip(),
        user_id=body.user_id,
        user_doc_chunks=user_doc_chunks,
        aqi=body.aqi,
    )


@router.post("/agents/route", response_model=AgentRouteResponse)
async def agent_route(
    body: AgentRouteBody,
    user_id_from_token: str | None = Depends(get_optional_user_id),
) -> AgentRouteResponse:
    body.profile.city = "Lahore"
    if user_id_from_token and not body.user_id:
        body.user_id = user_id_from_token

    return await asyncio.to_thread(
        run_route_agent,
        body.profile,
        body.query,
        aqi=body.aqi,
    )
