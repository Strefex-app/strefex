"""In-memory store and seed data for football training mini program (dev/demo)."""
from __future__ import annotations

import uuid
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from typing import Any


def _uid() -> str:
    return str(uuid.uuid4())


def _seed_sessions() -> list[dict[str, Any]]:
    today = date.today()
    base = [
        {
            "title": "Ball Mastery & First Touch",
            "description": "Improve close control, receiving under pressure, and quick turns. Suitable for all outfield players.",
            "category": "skills",
            "level": "Beginner",
            "coach_name": "Coach Li Wei",
            "venue_name": "Greenfield Sports Center",
            "venue_address": "88 Stadium Road, Pudong, Shanghai",
            "start_time": "09:00",
            "end_time": "10:30",
            "duration_minutes": 90,
            "price_cents": 12800,
            "capacity": 16,
            "equipment": "Boots, shin guards, water bottle",
        },
        {
            "title": "High-Intensity Interval Training",
            "description": "Football-specific fitness: sprints, agility ladders, and recovery drills to boost match endurance.",
            "category": "fitness",
            "level": "Intermediate",
            "coach_name": "Coach Sarah Chen",
            "venue_name": "Victory Arena",
            "venue_address": "12 Athletic Blvd, Minhang, Shanghai",
            "start_time": "18:00",
            "end_time": "19:00",
            "duration_minutes": 60,
            "price_cents": 9800,
            "capacity": 20,
            "equipment": "Training kit, towel",
        },
        {
            "title": "Positional Play & Pressing",
            "description": "Tactical session on build-up patterns, pressing triggers, and defensive shape in a 4-3-3.",
            "category": "tactics",
            "level": "Advanced",
            "coach_name": "Coach Marco Silva",
            "venue_name": "Elite Football Park",
            "venue_address": "5 Champions Way, Xuhui, Shanghai",
            "start_time": "19:30",
            "end_time": "21:00",
            "duration_minutes": 90,
            "price_cents": 16800,
            "capacity": 14,
            "equipment": "Boots, bib (provided), notebook optional",
        },
        {
            "title": "Youth Development (U12–U15)",
            "description": "Fun, structured training for young players: dribbling games, small-sided matches, and fair play.",
            "category": "youth",
            "level": "Beginner",
            "coach_name": "Coach Emma Wang",
            "venue_name": "Junior Kickers Field",
            "venue_address": "33 Youth Lane, Changning, Shanghai",
            "start_time": "15:00",
            "end_time": "16:30",
            "duration_minutes": 90,
            "price_cents": 8800,
            "capacity": 18,
            "equipment": "Boots, shin guards, parent consent on file",
        },
        {
            "title": "Finishing & Movement in the Box",
            "description": "Strikers and attacking mids: timing runs, volleys, headers, and composure in front of goal.",
            "category": "skills",
            "level": "Intermediate",
            "coach_name": "Coach Li Wei",
            "venue_name": "Greenfield Sports Center",
            "venue_address": "88 Stadium Road, Pudong, Shanghai",
            "start_time": "10:00",
            "end_time": "11:30",
            "duration_minutes": 90,
            "price_cents": 13800,
            "capacity": 12,
            "equipment": "Boots, shin guards",
        },
        {
            "title": "Goalkeeper Specialist Session",
            "description": "Shot stopping, distribution, and 1v1 situations with dedicated GK coaching.",
            "category": "skills",
            "level": "Advanced",
            "coach_name": "Coach Marco Silva",
            "venue_name": "Elite Football Park",
            "venue_address": "5 Champions Way, Xuhui, Shanghai",
            "start_time": "08:00",
            "end_time": "09:30",
            "duration_minutes": 90,
            "price_cents": 15800,
            "capacity": 8,
            "equipment": "GK gloves, long sleeves recommended",
        },
    ]

    sessions: list[dict[str, Any]] = []
    for day_offset in range(14):
        session_date = today + timedelta(days=day_offset)
        for i, template in enumerate(base):
            if (day_offset + i) % 3 == 0:
                continue
            row = deepcopy(template)
            row["id"] = _uid()
            row["date"] = session_date.isoformat()
            booked = (day_offset + i) % 5
            row["spots_left"] = max(0, row["capacity"] - booked)
            sessions.append(row)
    return sessions


class FootballTrainingStore:
    """Thread-safe enough for demo; replace with PostgreSQL in production."""

    def __init__(self) -> None:
        self.sessions: list[dict[str, Any]] = _seed_sessions()
        self.users: dict[str, dict[str, Any]] = {}
        self.bookings: dict[str, dict[str, Any]] = {}
        self.openid_to_user: dict[str, str] = {}

    def list_sessions(
        self,
        *,
        session_date: str | None = None,
        category: str | None = None,
        level: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        items = self.sessions
        if session_date:
            items = [s for s in items if s["date"] == session_date]
        if category:
            items = [s for s in items if s["category"] == category]
        if level:
            items = [s for s in items if s["level"] == level]
        items = sorted(items, key=lambda s: (s["date"], s["start_time"]))
        if limit:
            items = items[:limit]
        return deepcopy(items)

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        for s in self.sessions:
            if s["id"] == session_id:
                return deepcopy(s)
        return None

    def schedule_counts(self, start_date: str, end_date: str) -> dict[str, int]:
        counts: dict[str, int] = {}
        for s in self.sessions:
            if start_date <= s["date"] <= end_date:
                counts[s["date"]] = counts.get(s["date"], 0) + 1
        return counts

    def get_or_create_user(self, openid: str, nickname: str | None = None) -> dict[str, Any]:
        if openid in self.openid_to_user:
            return deepcopy(self.users[self.openid_to_user[openid]])
        user_id = _uid()
        user = {
            "id": user_id,
            "openid": openid,
            "nickname": nickname or f"Player {user_id[:6]}",
            "avatar_url": None,
        }
        self.users[user_id] = user
        self.openid_to_user[openid] = user_id
        return deepcopy(user)

    def create_booking(
        self,
        user_id: str,
        session_id: str,
        notes: str = "",
    ) -> dict[str, Any] | None:
        session = None
        for s in self.sessions:
            if s["id"] == session_id:
                session = s
                break
        if not session or session["spots_left"] <= 0:
            return None

        session["spots_left"] -= 1
        booking_id = _uid()
        now = datetime.now(timezone.utc).isoformat()
        booking = {
            "id": booking_id,
            "user_id": user_id,
            "session_id": session_id,
            "session_title": session["title"],
            "session_date": session["date"],
            "session_time": session["start_time"],
            "venue_name": session["venue_name"],
            "amount_cents": session["price_cents"],
            "status": "pending_payment",
            "payment_provider": None,
            "notes": notes,
            "created_at": now,
        }
        self.bookings[booking_id] = booking
        return deepcopy(booking)

    def list_bookings(self, user_id: str) -> list[dict[str, Any]]:
        items = [b for b in self.bookings.values() if b["user_id"] == user_id]
        items.sort(key=lambda b: b["created_at"], reverse=True)
        return deepcopy(items)

    def get_booking(self, booking_id: str) -> dict[str, Any] | None:
        b = self.bookings.get(booking_id)
        return deepcopy(b) if b else None

    def cancel_booking(self, booking_id: str, user_id: str) -> dict[str, Any] | None:
        booking = self.bookings.get(booking_id)
        if not booking or booking["user_id"] != user_id:
            return None
        if booking["status"] not in ("pending_payment", "confirmed"):
            return None

        if booking["status"] == "confirmed":
            for s in self.sessions:
                if s["id"] == booking["session_id"]:
                    s["spots_left"] = min(s["capacity"], s["spots_left"] + 1)
                    break

        booking["status"] = "cancelled"
        return deepcopy(booking)

    def confirm_payment(
        self,
        booking_id: str,
        provider: str,
    ) -> dict[str, Any] | None:
        booking = self.bookings.get(booking_id)
        if not booking or booking["status"] != "pending_payment":
            return None
        booking["status"] = "confirmed"
        booking["payment_provider"] = provider
        return deepcopy(booking)


store = FootballTrainingStore()
