"""Pydantic schemas for football training mini program API."""
from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field


class WeChatLoginRequest(BaseModel):
    code: str = Field(..., min_length=1, description="wx.login() code")


class MiniProgramUserOut(BaseModel):
    id: str
    openid: str
    nickname: str | None = None
    avatar_url: str | None = None


class WeChatLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: MiniProgramUserOut


class TrainingSessionOut(BaseModel):
    id: str
    title: str
    description: str
    category: Literal["skills", "fitness", "tactics", "youth"]
    level: Literal["Beginner", "Intermediate", "Advanced"]
    coach_name: str
    venue_name: str
    venue_address: str
    date: date
    start_time: str
    end_time: str
    duration_minutes: int
    price_cents: int
    capacity: int
    spots_left: int
    equipment: str | None = None


class SessionListResponse(BaseModel):
    items: list[TrainingSessionOut]
    total: int


class ScheduleResponse(BaseModel):
    counts_by_date: dict[str, int]


class CreateBookingRequest(BaseModel):
    session_id: str
    notes: str = ""


class BookingOut(BaseModel):
    id: str
    session_id: str
    session_title: str
    session_date: str
    session_time: str
    venue_name: str
    amount_cents: int
    status: Literal["pending_payment", "confirmed", "cancelled", "completed", "refunded"]
    payment_provider: str | None = None
    notes: str = ""
    created_at: str


class BookingListResponse(BaseModel):
    items: list[BookingOut]


class PaymentRequest(BaseModel):
    booking_id: str


class WeChatPayOrderOut(BaseModel):
    timeStamp: str | None = None
    nonceStr: str | None = None
    package: str | None = None
    signType: str = "RSA"
    paySign: str | None = None
    mock: bool = False


class AlipayOrderOut(BaseModel):
    order_string: str | None = None
    pay_url: str | None = None
    mock: bool = False


class MockPaymentConfirmRequest(BaseModel):
    booking_id: str
    provider: Literal["wechat", "alipay"]
