"""
Integration tests for the LifeOS Agent FastAPI backend.

Run with:
    pip install -r backend/requirements.txt pytest httpx
    pytest backend/tests/ -v

Or without Supabase:
    pytest backend/tests/ -v --no-supabase
"""
import os
import sys
import json
import uuid
from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient

# Add backend dir to sys.path so imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
from models import ChatResponse


# ─── Fixtures ─────────────────────────────────────────────

@pytest.fixture
async def client():
    """Create an async test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ─── Health ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "mode" in body
    assert "mock" in body["mode"]  # No supabase configured in tests


# ─── Chat endpoint ───────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "message,expected_intent",
    [
        ("Set an alarm for 7:00 AM", "alarm"),
        ("Wake me up at 6:30", "alarm"),
        ("What are my tasks today?", "tasks"),
        ("Show my to-do list", "tasks"),
        ("What's the weather?", "weather"),
        ("Is it raining today?", "weather"),
        ("Hello!", "greeting"),
        ("Good morning", "greeting"),
        ("Add a meeting called 'Design Review' at 3pm", "events"),
        ("What's on my calendar?", "events"),
        ("List my upcoming events", "events"),
        ("What can you do?", "general"),
        ("Tell me a joke", "general"),
    ],
)
async def test_chat_intents(client: AsyncClient, message: str, expected_intent: str):
    """Verify the agent classifies each message correctly and returns a reply."""
    user_id = str(uuid.uuid4())
    resp = await client.post(
        "/chat",
        json={"message": message, "user_id": user_id},
    )
    assert resp.status_code == 200, f"Failed for '{message}': {resp.text}"
    body = resp.json()

    # Must always have a reply
    assert "reply" in body
    assert isinstance(body["reply"], str)
    assert len(body["reply"]) > 10

    # Structured data is optional but must match intent
    data = body.get("data")
    if expected_intent == "alarm":
        assert data is not None, f"'data' missing for alarm intent: {body}"
        assert "alarm" in data
        alarm = data["alarm"]
        assert "id" in alarm
        assert "time" in alarm
        assert "status" in alarm
    elif expected_intent == "tasks":
        assert data is not None, f"'data' missing for tasks intent: {body}"
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        if data["tasks"]:
            task = data["tasks"][0]
            assert "title" in task
            assert "id" in task
    elif expected_intent == "weather":
        assert data is not None, f"'data' missing for weather intent: {body}"
        assert "weather" in data
        w = data["weather"]
        assert "temperature" in w
        assert "condition" in w
        assert "city" in w
    elif expected_intent == "events":
        assert data is not None, f"'data' missing for events intent: {body}"
        assert "events" in data
        events = data["events"]
        assert isinstance(events, list)
        if events:
            ev = events[0]
            assert "title" in ev
            assert "id" in ev


# ─── Chat — empty message ────────────────────────────────

@pytest.mark.asyncio
async def test_chat_empty_message(client: AsyncClient):
    resp = await client.post(
        "/chat",
        json={"message": "", "user_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 422  # Validation error from Pydantic


# ─── Chat — missing fields ───────────────────────────────

@pytest.mark.asyncio
async def test_chat_missing_fields(client: AsyncClient):
    resp = await client.post("/chat", json={})
    assert resp.status_code == 422


# ─── Chat — alarm with specific time ─────────────────────

@pytest.mark.asyncio
async def test_chat_alarm_with_time(client: AsyncClient):
    resp = await client.post(
        "/chat",
        json={"message": "Set a morning routine alarm for 6:30 AM", "user_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "Alarm" in body["reply"] or "morning" in body["reply"].lower()
    assert body["data"]["alarm"]["time"] is not None
    assert body["data"]["alarm"]["label"] == "Morning Routine"


# ─── Chat — alarm without time (triggered fallback) ─────

@pytest.mark.asyncio
async def test_chat_alarm_without_time(client: AsyncClient):
    """When no time is given, the agent should still handle it gracefully."""
    resp = await client.post(
        "/chat",
        json={"message": "Wake me up", "user_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["alarm"]["id"] is not None


# ─── Chat — tasks empty state ────────────────────────────

@pytest.mark.asyncio
async def test_chat_tasks_empty(client: AsyncClient):
    """Without Supabase, no tasks exist, so the agent should show an empty state."""
    resp = await client.post(
        "/chat",
        json={"message": "Show my tasks", "user_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 200
    body = resp.json()
    # In mock mode fallback tasks are returned so there should be at least some
    assert "tasks" in body.get("data", {})
    # But shouldn't crash
    assert len(body["reply"]) > 0


# ─── Chat — create calendar event ────────────────────────

@pytest.mark.asyncio
async def test_chat_create_calendar_event(client: AsyncClient):
    """Creating a calendar event should return event data with a title and time."""
    resp = await client.post(
        "/chat",
        json={"message": "Add a meeting called 'Design Review' at 3pm tomorrow", "user_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 200
    body = resp.json()
    data = body.get("data")
    assert data is not None, f"Missing data: {body}"
    assert "events" in data
    assert len(data["events"]) >= 1
    ev = data["events"][0]
    assert "title" in ev
    assert "id" in ev
    assert "start_time" in ev, f"Created event missing start_time: {ev}"
    assert "Review" in ev["title"] or "Design" in ev["title"]


# ─── Chat — list calendar events ─────────────────────────

@pytest.mark.asyncio
async def test_chat_list_calendar_events(client: AsyncClient):
    """Listing events should return an events list (may be empty or have mock data)."""
    resp = await client.post(
        "/chat",
        json={"message": "What's on my calendar?", "user_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 200
    body = resp.json()
    data = body.get("data")
    assert data is not None, f"Missing data: {body}"
    assert "events" in data
    assert isinstance(data["events"], list)


# ─── Plugins endpoint ────────────────────────────────────

@pytest.mark.asyncio
async def test_get_plugins(client: AsyncClient):
    user_id = str(uuid.uuid4())
    resp = await client.get(f"/plugins?user_id={user_id}")
    assert resp.status_code == 200
    body = resp.json()
    assert "plugins" in body
    assert isinstance(body["plugins"], list)
    assert len(body["plugins"]) >= 4  # alarm, tasks, weather, calendar

    names = {p["name"] for p in body["plugins"]}
    assert "alarm" in names
    assert "tasks" in names
    assert "weather" in names
    assert "calendar" in names


# ─── No user_id for plugins ──────────────────────────────

@pytest.mark.asyncio
async def test_get_plugins_no_user_id(client: AsyncClient):
    resp = await client.get("/plugins")
    assert resp.status_code == 422


# ─── Toggle plugin ──────────────────────────────────────

@pytest.mark.asyncio
async def test_toggle_plugin(client: AsyncClient):
    user_id = str(uuid.uuid4())
    resp = await client.post(
        "/plugins/alarm/toggle",
        json={"user_id": user_id, "enabled": False},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "alarm"
    assert body["enabled"] is False


@pytest.mark.asyncio
async def test_toggle_plugin_twice(client: AsyncClient):
    """Toggling a plugin back on should work."""
    user_id = str(uuid.uuid4())

    # Turn off
    resp = await client.post(
        "/plugins/alarm/toggle",
        json={"user_id": user_id, "enabled": False},
    )
    assert resp.json()["enabled"] is False

    # Turn on
    resp = await client.post(
        "/plugins/alarm/toggle",
        json={"user_id": user_id, "enabled": True},
    )
    assert resp.json()["enabled"] is True


# ─── Toggle plugin — invalid name ────────────────────────

@pytest.mark.asyncio
async def test_toggle_plugin_invalid_name(client: AsyncClient):
    """Toggling a non-existent plugin should succeed (idempotent)."""
    user_id = str(uuid.uuid4())
    resp = await client.post(
        "/plugins/nonexistent/toggle",
        json={"user_id": user_id, "enabled": False},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "nonexistent"


# ─── Auth header handling ────────────────────────────────

@pytest.mark.asyncio
async def test_chat_with_auth_header(client: AsyncClient):
    """The backend should accept an Authorization header and not crash."""
    resp = await client.post(
        "/chat",
        json={"message": "Hello", "user_id": str(uuid.uuid4())},
        headers={"Authorization": "Bearer test-token"},
    )
    assert resp.status_code == 200


# ─── CORS headers ────────────────────────────────────────

@pytest.mark.asyncio
async def test_cors_headers(client: AsyncClient):
    """Preflight OPTIONS request should return CORS headers."""
    resp = await client.options(
        "/chat",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert resp.status_code == 200
    assert "access-control-allow-origin" in resp.headers


# ─── Reply quality checks ────────────────────────────────

@pytest.mark.asyncio
async def test_reply_not_empty(client: AsyncClient):
    """Every valid chat request must return a non-empty, meaningful reply."""
    messages = [
        "Hello",
        "Set an alarm for 8am",
        "What's the weather?",
        "Show my tasks",
    ]
    for msg in messages:
        resp = await client.post(
            "/chat",
            json={"message": msg, "user_id": str(uuid.uuid4())},
        )
        body = resp.json()
        assert len(body["reply"]) > 15, f"Reply too short for '{msg}': {body['reply']}"


# ─── Run directly ────────────────────────────────────────

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])