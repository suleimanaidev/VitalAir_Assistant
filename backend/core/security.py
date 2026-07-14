from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from config import get_settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash password with bcrypt (passlib is incompatible with bcrypt 4.1+)."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(rounds=4),
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(
            plain.encode("utf-8"),
            hashed.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False


def create_access_token(
    subject: str,
    email: str | None = None,
    role: str = "user",
) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload: dict = {
        "sub": subject,
        "exp": int(expire.timestamp()),
        "role": role if role in ("admin", "user") else "user",
    }
    if email:
        payload["email"] = email
    return jwt.encode(
        payload,
        settings.effective_jwt_secret,
        algorithm=settings.jwt_algorithm or ALGORITHM,
    )


def decode_token_payload(token: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.effective_jwt_secret,
            algorithms=[settings.jwt_algorithm or ALGORITHM],
        )
    except JWTError:
        return None


def decode_token(token: str) -> str | None:
    payload = decode_token_payload(token)
    if not payload:
        return None
    sub = payload.get("sub")
    return str(sub) if sub else None
