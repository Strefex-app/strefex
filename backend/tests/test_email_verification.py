"""Email verification flow."""
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.email_verification import (
    generate_verification_token,
    hash_verification_token,
    issue_verification_token,
)
from tests.helpers import register_company_user


@pytest.mark.asyncio
async def test_register_marks_email_unverified(client: AsyncClient):
    reg = await register_company_user(client, company_name=f"Unverified {uuid.uuid4().hex[:6]}")
    assert reg["user"]["email_verified"] is False


@pytest.mark.asyncio
async def test_verify_email_marks_user_verified(client: AsyncClient, db_session: AsyncSession):
    reg = await register_company_user(client, company_name=f"Verify {uuid.uuid4().hex[:6]}")
    user_id = uuid.UUID(reg["user"]["id"])

    from app.repositories.user import user_repository

    user = await user_repository.get_by_id(db_session, user_id, uuid.UUID(reg["tenant"]["id"]))
    plain = await issue_verification_token(db_session, user)

    resp = await client.post("/api/v1/auth/verify-email", json={"token": plain})
    assert resp.status_code == 200
    assert resp.json()["email_verified"] is True


@pytest.mark.asyncio
async def test_verify_email_rejects_invalid_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/verify-email", json={"token": "not-a-valid-token"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_resend_verification_generic_success(client: AsyncClient):
    reg = await register_company_user(client, company_name=f"Resend {uuid.uuid4().hex[:6]}")
    resp = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": reg["user"]["email"]},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_blocked_when_verification_required(
    client: AsyncClient,
    monkeypatch,
):
    monkeypatch.setenv("REQUIRE_EMAIL_VERIFICATION", "true")
    from app.config import get_settings

    get_settings.cache_clear()

    reg = await register_company_user(client, company_name=f"ReqVerify {uuid.uuid4().hex[:6]}")
    client.cookies.clear()

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": reg["user"]["email"], "password": "StrongPass1"},
    )
    assert login.status_code == 403
    assert "verify your email" in login.json()["detail"].lower()

    get_settings.cache_clear()


def test_hash_verification_token_stable():
    assert hash_verification_token("abc") == hash_verification_token("abc")
    assert len(generate_verification_token()) >= 32
