"""Email verification token issue and validation."""
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.user import User

logger = logging.getLogger(__name__)


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)


def verification_link(token: str) -> str:
    settings = get_settings()
    base = settings.frontend_url.rstrip("/")
    return f"{base}/verify-email?token={token}"


def is_email_verified(user: User) -> bool:
    return user.email_verified_at is not None


def is_verification_token_expired(user: User) -> bool:
    settings = get_settings()
    if not user.email_verification_sent_at:
        return False
    expires_at = user.email_verification_sent_at + timedelta(hours=settings.email_verification_expire_hours)
    return datetime.now(timezone.utc) > expires_at


async def issue_verification_token(session: AsyncSession, user: User) -> str:
    """Create a new verification token; returns plain token for email/logging."""
    settings = get_settings()
    plain = generate_verification_token()
    now = datetime.now(timezone.utc)
    user.email_verification_token_hash = hash_verification_token(plain)
    user.email_verified_at = None
    user.email_verification_sent_at = now
    await session.flush()
    if settings.debug:
        logger.info("[EmailVerify] Dev link for %s: %s", user.email, verification_link(plain))
    return plain


async def verify_email_token(session: AsyncSession, plain_token: str) -> User | None:
    if not plain_token or not plain_token.strip():
        return None
    token_hash = hash_verification_token(plain_token.strip())
    result = await session.execute(
        select(User).where(User.email_verification_token_hash == token_hash)
    )
    user = result.scalar_one_or_none()
    if not user:
        return None
    if is_verification_token_expired(user):
        user.email_verification_token_hash = None
        user.email_verification_sent_at = None
        await session.flush()
        return None
    user.email_verified_at = datetime.now(timezone.utc)
    user.email_verification_token_hash = None
    user.email_verification_sent_at = None
    await session.flush()
    await session.refresh(user, ["company", "role"])
    return user
