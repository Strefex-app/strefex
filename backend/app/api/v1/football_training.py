"""
Football training mini program API — sessions, bookings, WeChat/Alipay payments.

Mounted at /api/v1/football for the PitchBook WeChat mini program.
"""
from __future__ import annotations

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from datetime import datetime, timedelta, timezone

import jwt

from app.config import get_settings
from app.schemas.football_training import (
    AlipayOrderOut,
    BookingListResponse,
    BookingOut,
    CreateBookingRequest,
    MockPaymentConfirmRequest,
    PaymentRequest,
    ScheduleResponse,
    SessionListResponse,
    TrainingSessionOut,
    WeChatLoginRequest,
    WeChatLoginResponse,
    WeChatPayOrderOut,
)
from app.services.alipay_pay import create_alipay_order
from app.services.football_training_store import store
from app.services.wechat_auth import exchange_code_for_openid
from app.services.wechat_pay import create_wechat_pay_order

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

MP_TOKEN_AUD = "football-miniprogram"


def _create_mp_token(user_id: str, openid: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {
        "sub": user_id,
        "openid": openid,
        "aud": MP_TOKEN_AUD,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _get_current_mp_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:].strip()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    if payload.get("aud") != MP_TOKEN_AUD:
        raise HTTPException(status_code=401, detail="Invalid token audience")
    user_id = payload.get("sub")
    if not user_id or user_id not in store.users:
        raise HTTPException(status_code=401, detail="User not found")
    return store.users[user_id]


@router.post("/auth/wechat-login", response_model=WeChatLoginResponse)
async def wechat_login(body: WeChatLoginRequest):
    openid, _ = exchange_code_for_openid(body.code)
    user = store.get_or_create_user(openid)
    token = _create_mp_token(user["id"], openid)
    return WeChatLoginResponse(access_token=token, user=user)


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    date: str | None = Query(default=None, alias="date"),
    category: str | None = None,
    level: str | None = None,
    limit: int | None = Query(default=None, le=100),
):
    items = store.list_sessions(session_date=date, category=category, level=level, limit=limit)
    return SessionListResponse(items=items, total=len(items))


@router.get("/sessions/{session_id}", response_model=TrainingSessionOut)
async def get_session(session_id: str):
    session = store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/schedule", response_model=ScheduleResponse)
async def get_schedule(
    start_date: str = Query(...),
    end_date: str = Query(...),
):
    counts = store.schedule_counts(start_date, end_date)
    return ScheduleResponse(counts_by_date=counts)


@router.post("/bookings", response_model=BookingOut)
async def create_booking(
    body: CreateBookingRequest,
    user: dict = Depends(_get_current_mp_user),
):
    booking = store.create_booking(user["id"], body.session_id, body.notes)
    if not booking:
        raise HTTPException(status_code=400, detail="Session unavailable or fully booked")
    return booking


@router.get("/bookings", response_model=BookingListResponse)
async def list_bookings(user: dict = Depends(_get_current_mp_user)):
    return BookingListResponse(items=store.list_bookings(user["id"]))


@router.get("/bookings/{booking_id}", response_model=BookingOut)
async def get_booking(booking_id: str, user: dict = Depends(_get_current_mp_user)):
    booking = store.get_booking(booking_id)
    if not booking or booking["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
async def cancel_booking(booking_id: str, user: dict = Depends(_get_current_mp_user)):
    booking = store.cancel_booking(booking_id, user["id"])
    if not booking:
        raise HTTPException(status_code=400, detail="Cannot cancel booking")
    return booking


@router.post("/payments/wechat", response_model=WeChatPayOrderOut)
async def pay_with_wechat(
    body: PaymentRequest,
    user: dict = Depends(_get_current_mp_user),
):
    booking = store.get_booking(body.booking_id)
    if not booking or booking["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Booking is not awaiting payment")

    return create_wechat_pay_order(
        booking_id=booking["id"],
        amount_cents=booking["amount_cents"],
        description=booking["session_title"],
        openid=user["openid"],
    )


@router.post("/payments/alipay", response_model=AlipayOrderOut)
async def pay_with_alipay(
    body: PaymentRequest,
    user: dict = Depends(_get_current_mp_user),
):
    booking = store.get_booking(body.booking_id)
    if not booking or booking["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Booking is not awaiting payment")

    return create_alipay_order(
        booking_id=booking["id"],
        amount_cents=booking["amount_cents"],
        subject=booking["session_title"],
    )


@router.post("/payments/mock-confirm", response_model=BookingOut)
async def mock_confirm_payment(
    body: MockPaymentConfirmRequest,
    user: dict = Depends(_get_current_mp_user),
):
    """Dev-only: simulate successful payment when WeChat/Alipay credentials are not set."""
    if not settings.debug:
        raise HTTPException(status_code=403, detail="Mock payments disabled in production")

    booking = store.get_booking(body.booking_id)
    if not booking or booking["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Booking not found")

    confirmed = store.confirm_payment(body.booking_id, body.provider)
    if not confirmed:
        raise HTTPException(status_code=400, detail="Payment could not be confirmed")
    return confirmed
