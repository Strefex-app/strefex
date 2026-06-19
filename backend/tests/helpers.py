"""Shared helpers for integration tests."""
import uuid

from httpx import AsyncClient


async def register_company_user(
    client: AsyncClient,
    *,
    company_name: str | None = None,
    email: str | None = None,
    password: str = "StrongPass1",
    full_name: str = "Test User",
) -> dict:
    """Register a user with a new company; returns login JSON (token, user, tenant)."""
    uid = uuid.uuid4().hex[:8]
    payload = {
        "full_name": full_name,
        "email": email or f"user-{uid}@example.com",
        "password": password,
        "company_name": company_name or f"Company {uid}",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200, response.text
    return response.json()


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
