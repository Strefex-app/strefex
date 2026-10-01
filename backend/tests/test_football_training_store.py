"""Unit tests for football training in-memory store (no database)."""
from app.services.football_training_store import FootballTrainingStore


def test_store_list_and_book_session():
    store = FootballTrainingStore()
    sessions = store.list_sessions(limit=1)
    assert len(sessions) == 1
    session_id = sessions[0]["id"]

    user = store.get_or_create_user("openid_test_1")
    booking = store.create_booking(user["id"], session_id, notes="hello")
    assert booking is not None
    assert booking["status"] == "pending_payment"

    confirmed = store.confirm_payment(booking["id"], "wechat")
    assert confirmed is not None
    assert confirmed["status"] == "confirmed"

    user_bookings = store.list_bookings(user["id"])
    assert len(user_bookings) == 1


def test_schedule_counts():
    store = FootballTrainingStore()
    sessions = store.list_sessions()
    if not sessions:
        return
    start = sessions[0]["date"]
    end = sessions[-1]["date"]
    counts = store.schedule_counts(start, end)
    assert sum(counts.values()) >= 1
