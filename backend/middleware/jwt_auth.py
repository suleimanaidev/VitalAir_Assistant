"""JWT verification dependency (plan §2.8)."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.security import decode_token, decode_token_payload

bearer_scheme = HTTPBearer(auto_error=False)
required_bearer = HTTPBearer()


def create_access_token(data: dict) -> str:
    """Re-export for plan-compatible auth routes."""
    from core.security import create_access_token as _create

    return _create(
        data.get("sub", ""),
        data.get("email"),
        data.get("role", "user"),
    )


async def get_optional_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str | None:
    if not credentials:
        return None
    return decode_token(credentials.credentials)


async def get_required_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(required_bearer),
) -> str:
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user_id


class AuthContext:
    """JWT subject + email + role for profile lookups."""

    def __init__(self, user_id: str, email: str | None = None, role: str = "user"):
        self.user_id = user_id
        self.email = email
        self.role = role


async def get_auth_context(
    credentials: HTTPAuthorizationCredentials = Depends(required_bearer),
) -> AuthContext:
    payload = decode_token_payload(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    email = payload.get("email")
    role = str(payload.get("role") or "user")
    return AuthContext(
        user_id=str(payload["sub"]),
        email=str(email).lower().strip() if email else None,
        role=role,
    )


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Depends(required_bearer),
) -> AuthContext:
    from db.repositories import get_user_by_id, user_role_from_doc

    payload = decode_token_payload(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = str(payload["sub"])
    doc = await get_user_by_id(user_id)
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    if doc.get("is_active") is False:
        raise HTTPException(status_code=403, detail="Account disabled")

    role = user_role_from_doc(doc)
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    email = payload.get("email")
    return AuthContext(
        user_id=user_id,
        email=str(email).lower().strip() if email else doc.get("email"),
        role=role,
    )


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(required_bearer),
) -> dict:
    payload = decode_token_payload(credentials.credentials)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload
