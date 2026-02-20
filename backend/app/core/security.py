"""JWT creation/validation and password hashing."""
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str | Any,
    tenant_id: str,
    role: str,
    expires_delta: timedelta | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.jwt_access_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "sub": str(subject),
        "tenant_id": str(tenant_id),
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        to_encode.update(extra)
    return jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict[str, Any] | None:
    """
    Decode and validate JWT; return payload or None if invalid/expired.
    Validates signature, exp, and algorithm.
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except jwt.PyJWTError:
        return None


def validate_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate JWT; return payload.
    Raises jwt.PyJWTError if invalid or expired (caller can map to 401).
    """
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
