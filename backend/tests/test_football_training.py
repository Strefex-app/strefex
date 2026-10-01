"""Tests for football training mini program API."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_football_sessions_public(client: AsyncClient):
    r = await client.get("/api/v1/football/sessions")
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_football_wechat_login_and_booking_flow(client: AsyncClient):
    login = await client.post(
        "/api/v1/football/auth/wechat-login",
        json={"code": "test-code-123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sessions = await client.get("/api/v1/football/sessions", headers=headers)
    session_id = sessions.json()["items"][0]["id"]

    booking = await client.post(
        "/api/v1/football/bookings",
        headers=headers,
        json={"session_id": session_id, "notes": "test"},
    )
    assert booking.status_code == 200
    booking_id = booking.json()["id"]

    wechat = await client.post(
        "/api/v1/football/payments/wechat",
        headers=headers,
        json={"booking_id": booking_id},
    )
    assert wechat.status_code == 200
    assert wechat.json().get("mock") is True

    confirm = await client.post(
        "/api/v1/football/payments/mock-confirm",
        headers=headers,
        json={"booking_id": booking_id, "provider": "wechat"},
    )
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "confirmed"
