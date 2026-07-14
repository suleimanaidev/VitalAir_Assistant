import secrets
from datetime import date, datetime, timedelta
from typing import Any, Literal

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from config import get_settings
from db.connection import get_db_async
from models.agent_output import RouteOutput
from schemas.models import SymptomCheckinBody, SymptomCheckinResponse, UserProfile


def _password_field(doc: dict) -> str | None:
    return doc.get("hashed_password") or doc.get("password_hash")


def _has_auth_credentials(doc: dict) -> bool:
    return bool(_password_field(doc))


def is_admin_email(email: str | None) -> bool:
    if not email:
        return False
    return email.lower().strip() in get_settings().admin_email_list


def user_role_from_doc(doc: dict) -> str:
    if doc.get("role") == "admin":
        return "admin"
    if is_admin_email(doc.get("email")):
        return "admin"
    return "user"


def _user_admin_summary(doc: dict) -> dict:
    user_id = str(doc["_id"])
    return {
        "id": user_id,
        "name": doc.get("name") or "User",
        "email": doc.get("email"),
        "role": user_role_from_doc(doc),
        "is_active": doc.get("is_active", True) is not False,
        "age": doc.get("age"),
        "conditions": list(doc.get("conditions") or []),
        "city": doc.get("city") or "Lahore",
        "profile_completed": bool(doc.get("profile_completed") or doc.get("age") is not None),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }


async def get_user_and_collection_by_email(email: str) -> tuple[dict | None, str | None]:
    """Retrieve user document and which collection it belongs to ("users" or "accounts")."""
    db = await get_db_async()
    normalized = email.lower().strip()
    user = await db.users.find_one({"email": normalized})
    if user:
        return user, "users"
    account = await db.accounts.find_one({"email": normalized})
    if account:
        return account, "accounts"
    return None, None


async def create_auth_user(
    email: str,
    password_hash: str,
    name: str,
    existing_user: dict | None = None,
    collection: str | None = None,
) -> tuple[str, str]:
    """
    Register auth user in users collection.
    If a profile-only user exists (no password), upgrade it with credentials.
    Returns a tuple of (user_id, role).
    """
    db = await get_db_async()
    normalized_email = email.lower().strip()

    # Reuse pre-fetched document to avoid redundant db queries
    if existing_user is None or collection is None:
        existing_user, collection = await get_user_and_collection_by_email(normalized_email)

    if existing_user:
        if _has_auth_credentials(existing_user):
            raise DuplicateKeyError("email already registered")
        
        role = user_role_from_doc(existing_user)
        
        if collection == "users":
            await db.users.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        "name": name,
                        "hashed_password": password_hash,
                        "password_hash": password_hash,
                        "city": existing_user.get("city", "Lahore"),
                    }
                },
            )
        else:
            await db.accounts.update_one(
                {"_id": existing_user["_id"]},
                {
                    "$set": {
                        "name": name,
                        "hashed_password": password_hash,
                        "password_hash": password_hash,
                    }
                },
            )
        return str(existing_user["_id"]), role

    role = "admin" if is_admin_email(normalized_email) else "user"
    doc = {
        "name": name,
        "email": normalized_email,
        "hashed_password": password_hash,
        "password_hash": password_hash,
        "age": None,
        "conditions": [],
        "city": "Lahore",
        "role": role,
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    return str(result.inserted_id), role


async def ensure_user_email_index() -> None:
    """Unique email index — safe to call on startup."""
    db = await get_db_async()
    await db.users.create_index("email", unique=True, sparse=True)
    try:
        await db.users.create_index("role")
    except Exception:
        pass
    try:
        await db.accounts.create_index("email", unique=True, sparse=True)
    except Exception:
        pass
    try:
        await db.user_documents.create_index("user_id")
    except Exception:
        pass
    try:
        await db.symptom_checkins.create_index(
            [("user_id", 1), ("date", 1)],
            unique=True,
        )
    except Exception:
        pass


def _symptom_score(body: SymptomCheckinBody) -> int:
    if body.skipped:
        return 0
    return min(
        12,
        body.cough
        + body.breathlessness
        + body.chest_tightness
        + body.headache
        + body.sleep_quality,
    )


def _symptom_risk_level(score: int) -> Literal["none", "mild", "high"]:
    if score >= 5:
        return "high"
    if score >= 2:
        return "mild"
    return "none"


def _symptom_summary(body: SymptomCheckinBody, score: int) -> str:
    if body.skipped:
        return "Skipped for today."
    if score == 0:
        return "Feeling okay today."

    labels = [
        ("cough", body.cough),
        ("breathlessness", body.breathlessness),
        ("chest tightness", body.chest_tightness),
        ("headache", body.headache),
        ("poor sleep", body.sleep_quality),
    ]
    active = [name for name, value in labels if value > 0]
    if not active:
        return "Feeling okay today."
    return f"Today's symptoms: {', '.join(active[:3])}."


def _symptom_response(doc: dict) -> SymptomCheckinResponse:
    symptoms = SymptomCheckinBody(**(doc.get("symptoms") or {}))
    score = int(doc.get("score") or 0)
    return SymptomCheckinResponse(
        user_id=str(doc["user_id"]),
        date=str(doc["date"]),
        symptoms=symptoms,
        score=score,
        risk_level=_symptom_risk_level(score),
        summary=doc.get("summary") or _symptom_summary(symptoms, score),
        created_at=doc.get("created_at"),
        updated_at=doc.get("updated_at"),
    )


async def save_symptom_checkin(
    user_id: str,
    body: SymptomCheckinBody,
    *,
    checkin_date: str | None = None,
) -> SymptomCheckinResponse | None:
    if not ObjectId.is_valid(user_id):
        return None

    db = await get_db_async()
    today = checkin_date or date.today().isoformat()
    score = _symptom_score(body)
    now = datetime.utcnow()
    payload = {
        "user_id": ObjectId(user_id),
        "date": today,
        "symptoms": body.model_dump(),
        "score": score,
        "risk_level": _symptom_risk_level(score),
        "summary": _symptom_summary(body, score),
        "updated_at": now,
    }
    await db.symptom_checkins.update_one(
        {"user_id": ObjectId(user_id), "date": today},
        {"$set": payload, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    doc = await db.symptom_checkins.find_one(
        {"user_id": ObjectId(user_id), "date": today}
    )
    return _symptom_response(doc) if doc else None


async def get_today_symptom_checkin(
    user_id: str,
) -> SymptomCheckinResponse | None:
    if not ObjectId.is_valid(user_id):
        return None
    db = await get_db_async()
    doc = await db.symptom_checkins.find_one(
        {"user_id": ObjectId(user_id), "date": date.today().isoformat()}
    )
    return _symptom_response(doc) if doc else None


async def get_user_by_email(email: str) -> dict | None:
    db = await get_db_async()
    normalized = email.lower().strip()
    user = await db.users.find_one({"email": normalized})
    if user:
        return user
    return await db.accounts.find_one({"email": normalized})


async def get_auth_user_by_email(email: str) -> dict | None:
    """User document that can log in (must have a password hash)."""
    doc = await get_user_by_email(email)
    if doc and _has_auth_credentials(doc):
        return doc
    return None


async def get_user_by_id(user_id: str) -> dict | None:
    if not ObjectId.is_valid(user_id):
        return None
    db = await get_db_async()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        return user
    return await db.accounts.find_one({"_id": ObjectId(user_id)})


async def ensure_user_for_token(user_id: str, email: str | None = None) -> dict:
    """
    Return the MongoDB user for a JWT subject, creating a shell profile if missing.
    Also resolves by email when the session id does not match a stored document.
    """
    doc = await get_user_by_id(user_id)
    if doc:
        return doc

    if email:
        doc = await get_user_by_email(email)
        if doc:
            return doc

    if not ObjectId.is_valid(user_id):
        raise ValueError("Invalid user id")

    db = await get_db_async()
    new_doc = {
        "_id": ObjectId(user_id),
        "name": "User",
        "email": (email or "").lower().strip() or None,
        "age": None,
        "conditions": [],
        "city": "Lahore",
        "sensitivity": "medium",
        "commute_mode": "car",
        "outdoor_time": "30_60",
        "profile_completed": False,
        "created_at": datetime.utcnow(),
    }
    try:
        await db.users.insert_one(new_doc)
    except DuplicateKeyError:
        pass
    doc = await get_user_by_id(user_id)
    if doc:
        return doc
    raise ValueError("Could not create user profile record")


def profile_from_user_doc(doc: dict) -> UserProfile:
    """Build API profile from a MongoDB user document."""
    return UserProfile(
        name=(doc.get("name") or "User").strip() or "User",
        age=int(doc["age"]) if doc.get("age") is not None else 25,
        conditions=list(doc.get("conditions") or []),
        city=doc.get("city") or "Lahore",
        sensitivity=doc.get("sensitivity") or "medium",
        commute_mode=doc.get("commute_mode") or "car",
        outdoor_time=doc.get("outdoor_time") or "30_60",
    )


def is_profile_complete(doc: dict) -> bool:
    if doc.get("profile_completed"):
        return True
    return doc.get("age") is not None


async def update_user_profile(user_id: str, profile: UserProfile) -> bool:
    if not ObjectId.is_valid(user_id):
        return False
    db = await get_db_async()
    payload = {
        "name": profile.name,
        "age": profile.age,
        "conditions": profile.conditions,
        "city": profile.city,
        "sensitivity": profile.sensitivity,
        "commute_mode": profile.commute_mode,
        "outdoor_time": profile.outdoor_time,
        "profile_completed": True,
    }
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": payload},
    )
    if result.matched_count:
        return True
    result = await db.accounts.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": payload},
    )
    return result.matched_count > 0


async def list_queries_full(
    user_id: str | None = None,
    *,
    limit: int = 200,
    days: int = 30,
) -> list[dict]:
    """Full query documents for exposure trends (Innovation 7)."""
    db = await get_db_async()
    query: dict = {"source": {"$exists": True}}
    if user_id and ObjectId.is_valid(user_id):
        query["user_id"] = ObjectId(user_id)
    since = datetime.utcnow() - timedelta(days=days)
    query["timestamp"] = {"$gte": since}

    cursor = db.queries.find(query).sort("timestamp", -1).limit(limit)
    items: list[dict] = []
    async for doc in cursor:
        row = {
            "id": str(doc["_id"]),
            "source": doc.get("source"),
            "destination": doc.get("destination"),
            "aqi_at_time": doc.get("aqi_at_time"),
            "pes_score": doc.get("pes_score"),
            "pes_level": doc.get("pes_level"),
            "aqi_category": doc.get("aqi_category"),
            "chose_safest_route": doc.get("chose_safest_route", True),
            "mask_recommended": doc.get("mask_recommended"),
            "mask_worn": doc.get("mask_worn"),
            "advisory_compliant": doc.get("advisory_compliant"),
            "safe_route": doc.get("safe_route"),
            "timestamp": doc.get("timestamp"),
        }
        items.append(row)
    return items


async def list_queries(user_id: str | None = None, limit: int = 30) -> list[dict]:
    db = await get_db_async()
    query: dict = {"source": {"$exists": True}}
    if user_id and ObjectId.is_valid(user_id):
        query["user_id"] = ObjectId(user_id)
    cursor = db.queries.find(query).sort("timestamp", -1).limit(limit)
    items = []
    async for doc in cursor:
        items.append(
            {
                "id": str(doc["_id"]),
                "source": doc.get("source"),
                "destination": doc.get("destination"),
                "aqi_at_time": doc.get("aqi_at_time"),
                "pes_score": doc.get("pes_score"),
                "pes_level": doc.get("pes_level"),
                "health_advice": doc.get("health_advice"),
                "status": doc.get("status", "complete"),
                "task_id": doc.get("task_id"),
                "timestamp": doc.get("timestamp").isoformat()
                if doc.get("timestamp")
                else None,
            }
        )
    return items


async def create_user(profile: UserProfile) -> str:
    db = await get_db_async()
    doc = {
        "name": profile.name,
        "age": profile.age,
        "conditions": profile.conditions,
        "city": profile.city,
        "sensitivity": profile.sensitivity,
        "commute_mode": profile.commute_mode,
        "outdoor_time": profile.outdoor_time,
        "profile_completed": True,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(doc)
    return str(result.inserted_id)


def _normalize_safe_route(result: dict[str, Any]) -> dict[str, Any] | None:
    safe = result.get("safe_route")
    if not safe:
        return None
    if isinstance(safe, RouteOutput):
        return safe.model_dump()
    if isinstance(safe, dict) and safe.get("cleanest"):
        return dict(safe)
    waypoints = safe.get("waypoints") or []
    coords = [[74.34 + i * 0.02, 31.52 + i * 0.01] for i in range(max(len(waypoints), 2))]
    feature = {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": coords},
        "properties": {"summary": safe.get("summary", "")},
    }
    return {
        "cleanest": feature,
        "fastest": feature,
        "recommendation": safe.get("reasoning") or safe.get("summary", ""),
        "aqi_checkpoints": [],
    }


def _exposure_fields_from_result(result: dict[str, Any]) -> dict[str, Any]:
    from services.exposure_trends import aqi_category

    aqi = int(result.get("aqi_at_time") or result.get("aqi") or 0)
    pes_raw = result.get("personal_exposure_score") or {}
    pes_score = pes_raw.get("score") if isinstance(pes_raw, dict) else None
    pes_level = pes_raw.get("level") if isinstance(pes_raw, dict) else None

    safe = result.get("safe_route") or {}
    if hasattr(safe, "model_dump"):
        safe = safe.model_dump()
    route_options = safe.get("route_options") or []
    chose_safest = True
    mask_recommended = (pes_score is not None and pes_score >= 60) or aqi >= 150

    return {
        "pes_score": pes_score,
        "pes_level": pes_level,
        "aqi_category": aqi_category(aqi),
        "chose_safest_route": chose_safest,
        "route_rank_chosen": 1 if route_options else 1,
        "mask_recommended": mask_recommended,
        "advisory_compliant": chose_safest,
        "personal_exposure_score": pes_raw if isinstance(pes_raw, dict) else None,
    }


async def save_query(
    user_id: str | None,
    payload: dict[str, Any],
    result: dict[str, Any],
    *,
    task_id: str | None = None,
    status: str = "complete",
) -> str:
    db = await get_db_async()
    exposure = _exposure_fields_from_result(result)
    safe_route = _normalize_safe_route(result)

    doc = {
        "user_id": ObjectId(user_id) if user_id and ObjectId.is_valid(user_id) else None,
        "task_id": task_id,
        "source": payload.get("source"),
        "destination": payload.get("destination"),
        "aqi_at_time": result.get("aqi_at_time") or result.get("aqi"),
        "health_advice": result.get("health_advice"),
        "diet_plan": result.get("diet_plan"),
        "safe_route": safe_route,
        "status": status,
        "timestamp": datetime.utcnow(),
        **exposure,
    }
    inserted = await db.queries.insert_one(doc)
    return str(inserted.inserted_id)


def get_stored_password_hash(user: dict) -> str | None:
    return _password_field(user)


async def create_password_reset_token(
    email: str, *, expires_minutes: int = 60
) -> str | None:
    user = await get_auth_user_by_email(email)
    if not user:
        return None

    db = await get_db_async()
    normalized = email.lower().strip()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=expires_minutes)

    await db.password_resets.delete_many({"email": normalized})
    await db.password_resets.insert_one(
        {
            "email": normalized,
            "token": token,
            "expires_at": expires_at,
            "created_at": datetime.utcnow(),
        }
    )
    return token


async def get_email_for_reset_token(token: str) -> str | None:
    if not token.strip():
        return None

    db = await get_db_async()
    doc = await db.password_resets.find_one({"token": token.strip()})
    if not doc:
        return None

    expires_at = doc.get("expires_at")
    if expires_at and expires_at < datetime.utcnow():
        await db.password_resets.delete_one({"_id": doc["_id"]})
        return None

    return doc.get("email")


async def delete_reset_token(token: str) -> None:
    db = await get_db_async()
    await db.password_resets.delete_one({"token": token.strip()})


async def update_user_password(email: str, password_hash: str) -> bool:
    db = await get_db_async()
    normalized = email.lower().strip()
    payload = {"hashed_password": password_hash, "password_hash": password_hash}

    result = await db.users.update_one({"email": normalized}, {"$set": payload})
    if result.matched_count:
        return True

    result = await db.accounts.update_one({"email": normalized}, {"$set": payload})
    return result.matched_count > 0


MAX_USER_DOCUMENT_BYTES = 512_000
MAX_USER_DOCUMENTS = 10


async def count_user_documents(user_id: str) -> int:
    if not ObjectId.is_valid(user_id):
        return 0
    db = await get_db_async()
    return await db.user_documents.count_documents({"user_id": ObjectId(user_id)})


async def save_user_document(
    user_id: str,
    *,
    filename: str,
    content_type: str,
    text_content: str,
    size_bytes: int,
    extraction_method: str = "text",
) -> str:
    if not ObjectId.is_valid(user_id):
        raise ValueError("Invalid user id")
    db = await get_db_async()
    uid = ObjectId(user_id)
    count = await db.user_documents.count_documents({"user_id": uid})
    if count >= MAX_USER_DOCUMENTS:
        raise ValueError(f"Maximum {MAX_USER_DOCUMENTS} documents allowed")

    doc = {
        "user_id": uid,
        "filename": filename[:200],
        "content_type": content_type[:120],
        "text_content": text_content[:50_000],
        "size_bytes": size_bytes,
        "extraction_method": extraction_method[:40],
        "created_at": datetime.utcnow(),
    }
    result = await db.user_documents.insert_one(doc)
    return str(result.inserted_id)


async def list_user_documents(user_id: str) -> list[dict]:
    if not ObjectId.is_valid(user_id):
        return []
    db = await get_db_async()
    cursor = db.user_documents.find({"user_id": ObjectId(user_id)}).sort(
        "created_at", -1
    )
    items = []
    async for doc in cursor:
        items.append(
            {
                "id": str(doc["_id"]),
                "filename": doc.get("filename", "document"),
                "content_type": doc.get("content_type", "text/plain"),
                "size_bytes": doc.get("size_bytes", 0),
                "preview": (doc.get("text_content") or "")[:200],
                "extraction_method": doc.get("extraction_method", "text"),
                "created_at": doc.get("created_at").isoformat()
                if doc.get("created_at")
                else None,
            }
        )
    return items


async def delete_user_document(user_id: str, document_id: str) -> bool:
    if not ObjectId.is_valid(user_id) or not ObjectId.is_valid(document_id):
        return False
    db = await get_db_async()
    result = await db.user_documents.delete_one(
        {"_id": ObjectId(document_id), "user_id": ObjectId(user_id)}
    )
    return result.deleted_count > 0


async def get_user_document_chunks(user_id: str | None) -> list[str]:
    """Text chunks from a patient's uploaded health documents for RAG."""
    if not user_id or not ObjectId.is_valid(user_id):
        return []
    db = await get_db_async()
    cursor = db.user_documents.find({"user_id": ObjectId(user_id)}).sort(
        "created_at", -1
    )
    chunks: list[str] = []
    async for doc in cursor:
        text = (doc.get("text_content") or "").strip()
        if not text:
            continue
        for part in _split_document_text(text):
            chunks.append(part)
    return chunks


def _split_document_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    from rag.chunking import split_text

    return split_text(text, chunk_size=chunk_size, chunk_overlap=overlap)


async def promote_admin_emails() -> int:
    """Set role=admin for emails listed in ADMIN_EMAILS env."""
    emails = get_settings().admin_email_list
    if not emails:
        return 0
    db = await get_db_async()
    updated = 0
    for email in emails:
        for collection in ("users", "accounts"):
            result = await db[collection].update_many(
                {"email": email},
                {"$set": {"role": "admin", "is_active": True}},
            )
            updated += result.modified_count
    return updated


async def admin_stats() -> dict:
    db = await get_db_async()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    users_count = await db.users.count_documents({})
    accounts_count = await db.accounts.count_documents({})
    queries_total = await db.queries.count_documents({})
    queries_today = await db.queries.count_documents(
        {"timestamp": {"$gte": today_start}}
    )
    documents_total = await db.user_documents.count_documents({})
    symptom_today = await db.symptom_checkins.count_documents(
        {"date": today_start.date().isoformat()}
    )
    admin_count = await db.users.count_documents({"role": "admin"})

    return {
        "users_total": users_count + accounts_count,
        "queries_total": queries_total,
        "queries_today": queries_today,
        "documents_total": documents_total,
        "symptom_checkins_today": symptom_today,
        "admin_users": admin_count,
    }


async def list_users_admin(
    *,
    skip: int = 0,
    limit: int = 25,
    search: str | None = None,
) -> tuple[list[dict], int]:
    db = await get_db_async()
    query: dict = {}
    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"email": {"$regex": term, "$options": "i"}},
        ]

    total = await db.users.count_documents(query)
    cursor = (
        db.users.find(query)
        .sort("created_at", -1)
        .skip(max(0, skip))
        .limit(min(limit, 100))
    )

    items: list[dict] = []
    async for doc in cursor:
        row = _user_admin_summary(doc)
        row["documents_count"] = await count_user_documents(row["id"])
        row["queries_count"] = await db.queries.count_documents(
            {"user_id": ObjectId(row["id"])}
        )
        items.append(row)

    return items, total


async def get_user_admin_detail(user_id: str) -> dict | None:
    doc = await get_user_by_id(user_id)
    if not doc:
        return None
    db = await get_db_async()
    uid = ObjectId(user_id)
    detail = _user_admin_summary(doc)
    detail["documents_count"] = await count_user_documents(user_id)
    detail["queries_count"] = await db.queries.count_documents({"user_id": uid})
    detail["documents"] = await list_user_documents(user_id)
    detail["recent_queries"] = await list_queries(user_id=user_id, limit=10)
    symptom = await db.symptom_checkins.find_one(
        {"user_id": uid, "date": date.today().isoformat()}
    )
    detail["today_symptoms"] = symptom.get("symptoms") if symptom else None
    return detail


async def update_user_admin(
    user_id: str,
    *,
    role: str | None = None,
    is_active: bool | None = None,
) -> bool:
    if not ObjectId.is_valid(user_id):
        return False
    db = await get_db_async()
    payload: dict = {}
    if role is not None:
        if role not in ("admin", "user"):
            raise ValueError("Invalid role")
        payload["role"] = role
    if is_active is not None:
        payload["is_active"] = is_active
    if not payload:
        return False

    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": payload})
    if result.matched_count:
        return True
    result = await db.accounts.update_one({"_id": ObjectId(user_id)}, {"$set": payload})
    return result.matched_count > 0


async def list_documents_admin(*, limit: int = 50) -> list[dict]:
    db = await get_db_async()
    cursor = db.user_documents.find({}).sort("created_at", -1).limit(min(limit, 200))
    items: list[dict] = []
    async for doc in cursor:
        user_id = str(doc.get("user_id", ""))
        user_doc = await get_user_by_id(user_id) if user_id else None
        items.append(
            {
                "id": str(doc["_id"]),
                "user_id": user_id,
                "user_name": (user_doc or {}).get("name", "Unknown"),
                "user_email": (user_doc or {}).get("email"),
                "filename": doc.get("filename", "document"),
                "content_type": doc.get("content_type", "text/plain"),
                "size_bytes": doc.get("size_bytes", 0),
                "extraction_method": doc.get("extraction_method", "text"),
                "created_at": doc.get("created_at").isoformat()
                if doc.get("created_at")
                else None,
            }
        )
    return items
