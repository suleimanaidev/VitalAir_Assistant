import asyncio
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field, model_validator
from pymongo.errors import DuplicateKeyError, PyMongoError, ServerSelectionTimeoutError

from core.security import create_access_token, hash_password, verify_password
from config import get_settings
from db.connection import MongoUnavailableError
from db.repositories import (
    create_auth_user,
    create_password_reset_token,
    delete_reset_token,
    get_auth_user_by_email,
    get_email_for_reset_token,
    get_stored_password_hash,
    get_user_by_email,
    get_user_by_id,
    update_user_password,
    user_role_from_doc,
    get_user_and_collection_by_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])


def _raise_db_unavailable(exc: Exception) -> None:
    msg = str(exc).lower()
    if isinstance(exc, MongoUnavailableError) or "dns" in msg or "resolution" in msg:
        detail = (
            "Cannot reach MongoDB (network/DNS timeout). "
            "Check internet, VPN, or MongoDB Atlas IP whitelist."
        )
    else:
        detail = (
            "Database unreachable. Check internet connection and "
            "MongoDB Atlas Network Access (IP whitelist)."
        )
    raise HTTPException(status_code=503, detail=detail) from exc


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterBody":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    name: str
    role: str = "user"


class ForgotPasswordBody(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_url: str | None = None


class ResetPasswordBody(BaseModel):
    token: str = Field(min_length=10, max_length=256)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordBody":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


@router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterBody) -> AuthResponse:
    email = str(body.email).lower().strip()
    name = body.name.strip()

    try:
        user_doc, collection = await get_user_and_collection_by_email(email)
        if user_doc and _has_auth_credentials(user_doc):
            raise HTTPException(
                status_code=400,
                detail="You are already registered. Please sign in instead.",
            )

        password_hash = await asyncio.to_thread(hash_password, body.password)
        user_id, role = await create_auth_user(
            email,
            password_hash,
            name,
            existing_user=user_doc,
            collection=collection,
        )
        token = create_access_token(user_id, email, role)

        return AuthResponse(
            access_token=token,
            user_id=user_id,
            email=email,
            name=name,
            role=role,
        )
    except HTTPException:
        raise
    except DuplicateKeyError:
        raise HTTPException(
            status_code=400,
            detail="You are already registered. Please sign in instead.",
        ) from None
    except (ServerSelectionTimeoutError, PyMongoError, MongoUnavailableError) as exc:
        logger.exception("MongoDB error during registration for %s", email)
        _raise_db_unavailable(exc)
    except Exception as exc:
        logger.exception("Registration failed for %s", email)
        raise HTTPException(
            status_code=500,
            detail="Registration failed. Please try again later.",
        ) from exc


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginBody) -> AuthResponse:
    email = str(body.email).lower().strip()

    try:
        user = await get_auth_user_by_email(email)
        stored_hash = get_stored_password_hash(user) if user else None

        password_verified = await asyncio.to_thread(verify_password, body.password, stored_hash)
        if not user or not stored_hash or not password_verified:
            # Helpful hint if email exists but no password (onboarding-only profile)
            any_doc = await get_user_by_email(email)
            if any_doc and not stored_hash:
                raise HTTPException(
                    status_code=401,
                    detail="No password set for this email. Please register to set a password.",
                )
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if user.get("is_active") is False:
            raise HTTPException(status_code=403, detail="Account disabled")

        role = user_role_from_doc(user)
        token = create_access_token(str(user["_id"]), user.get("email", email), role)
        return AuthResponse(
            access_token=token,
            user_id=str(user["_id"]),
            email=user.get("email", email),
            name=user.get("name", "User"),
            role=role,
        )
    except HTTPException:
        raise
    except (ServerSelectionTimeoutError, PyMongoError, MongoUnavailableError) as exc:
        logger.exception("MongoDB error during login for %s", email)
        _raise_db_unavailable(exc)
    except Exception as exc:
        logger.exception("Login failed for %s", email)
        raise HTTPException(
            status_code=500,
            detail="Login failed. Please try again later.",
        ) from exc


@router.post("/auth/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordBody) -> ForgotPasswordResponse:
    email = str(body.email).lower().strip()
    settings = get_settings()
    frontend_url = settings.effective_frontend_url

    try:
        any_doc = await get_user_by_email(email)
        stored_hash = get_stored_password_hash(any_doc) if any_doc else None

        if any_doc and not stored_hash:
            return ForgotPasswordResponse(
                message=(
                    "Is email par profile hai lekin password set nahi. "
                    "Login page se Register tab use karke password set karein."
                ),
                reset_url=None,
            )

        token = await create_password_reset_token(email)
        reset_url = (
            f"{frontend_url}/reset-password?token={token}"
            if token
            else None
        )
        return ForgotPasswordResponse(
            message=(
                "Agar is email par account hai to neeche reset link use karein "
                "(link 60 minute ke liye valid hai)."
            ),
            reset_url=reset_url,
        )
    except (ServerSelectionTimeoutError, PyMongoError, MongoUnavailableError) as exc:
        logger.exception("MongoDB error during forgot-password for %s", email)
        _raise_db_unavailable(exc)
    except Exception as exc:
        logger.exception("Forgot password failed for %s", email)
        raise HTTPException(
            status_code=500,
            detail="Could not process password reset. Please try again later.",
        ) from exc


@router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordBody) -> dict[str, str]:
    try:
        email = await get_email_for_reset_token(body.token)
        if not email:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired reset link. Request a new one.",
            )

        password_hash = await asyncio.to_thread(hash_password, body.password)
        updated = await update_user_password(email, password_hash)
        if not updated:
            raise HTTPException(
                status_code=400,
                detail="Could not update password. Request a new reset link.",
            )

        await delete_reset_token(body.token)
        return {"message": "Password updated. You can sign in now."}
    except HTTPException:
        raise
    except (ServerSelectionTimeoutError, PyMongoError, MongoUnavailableError) as exc:
        logger.exception("MongoDB error during reset-password")
        _raise_db_unavailable(exc)
    except Exception as exc:
        logger.exception("Reset password failed")
        raise HTTPException(
            status_code=500,
            detail="Could not reset password. Please try again later.",
        ) from exc
