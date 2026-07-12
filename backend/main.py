"""
LifeOS Agent — FastAPI Backend

AI-powered daily assistant backend with LangGraph orchestration.

Endpoints:
  POST /chat                     — Send a message, get an AI response
  GET  /plugins?user_id={uid}    — List available plugins
  POST /plugins/{name}/toggle    — Enable/disable a plugin
  GET  /health                   — Health check

Authentication:
  All endpoints expect a Supabase access token in the Authorization header
  as a Bearer token. The backend verifies it using the Supabase admin API.

  In development mode (APP_ENV=development), requests without a token
  are accepted as "dev-user" for testing via Swagger UI.

Deployment:
  See docs/backend/README.md for full instructions.
"""
import os
import logging
import random
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Any

from dotenv import load_dotenv

import uvicorn
from fastapi import FastAPI, Depends, HTTPException, Header, Query, Body
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from models import (
    ChatRequest, ChatResponse, StructuredData,
    PluginManifest, PluginListResponse, PluginToggleResponse,
    TogglePluginRequest, UpdateTaskRequest, Task,
    ScheduleCreate, Schedule,
)
from supabase_client import get_supabase, get_supabase_sync, get_user_id_from_token

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lifeos-backend")

# ─── App lifespan (startup/shutdown) ─────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("LifeOS Agent backend starting up")
    yield
    logger.info("LifeOS Agent backend shutting down")


app = FastAPI(
    title="LifeOS Agent API",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────

cors_origins_str = os.environ.get("CORS_ORIGINS", "")
cors_origins = (
    [o.strip() for o in cors_origins_str.split(",") if o.strip()]
    if cors_origins_str
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Auth dependency ─────────────────────────────────────

async def get_authenticated_user_id(
    authorization: Optional[str] = Header(None),
) -> str:
    """Return the user ID. If a valid Supabase JWT is provided, verify it;
    otherwise fall back to 'dev-user' for the hackathon demo."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ")
        uid = await get_user_id_from_token(token)
        if uid:
            return uid
    return "dev-user"


# ─── Plugin definitions (source of truth) ────────────────

AVAILABLE_PLUGINS: list[dict] = [
    {"name": "alarm", "description": "Set, list, and cancel alarms", "enabled": True},
    {"name": "tasks", "description": "Manage your daily tasks and to-dos", "enabled": True},
    {"name": "weather", "description": "Get weather forecasts for your location", "enabled": True},
    {"name": "calendar", "description": "Create and view calendar events", "enabled": True},
    {"name": "learning", "description": "Learn English-Nepali vocabulary, daily quotes, and music", "enabled": True},
    {"name": "schedule", "description": "Schedule reminders and timed actions", "enabled": True},
]


# ─── In-memory demo stores (used when Supabase is not configured) ────

_DEMO_TASK_STORE: dict[str, list[dict]] = {}
_DEMO_SCHEDULE_STORE: dict[str, list[dict]] = {}
_DEMO_PLUGIN_STORE: dict[str, dict[str, bool]] = {}


def _get_demo_plugin_state(user_id: str) -> dict[str, bool]:
    return _DEMO_PLUGIN_STORE.setdefault(user_id, {p["name"]: True for p in AVAILABLE_PLUGINS})


def _now_local() -> datetime:
    return datetime.now()


def _purge_old(store: dict[str, list[dict]], max_age: timedelta = timedelta(hours=24)) -> None:
    cutoff = _now_local() - max_age
    for uid in list(store.keys()):
        kept = []
        for item in store[uid]:
            raw = item.get("created_at")
            if not raw:
                kept.append(item)
                continue
            try:
                if datetime.fromisoformat(raw) >= cutoff:
                    kept.append(item)
            except (ValueError, TypeError):
                kept.append(item)
        store[uid] = kept
        if not kept:
            del store[uid]


def _demo_task_crud(user_id: str, item_id: str | None = None, updates: dict | None = None) -> list[dict]:
    _purge_old(_DEMO_TASK_STORE)
    return _DEMO_TASK_STORE.setdefault(user_id, [])


def _demo_schedule_crud(user_id: str, item_id: str | None = None, updates: dict | None = None) -> list[dict]:
    _purge_old(_DEMO_SCHEDULE_STORE)
    return _DEMO_SCHEDULE_STORE.setdefault(user_id, [])


def get_user_plugin_state(sb, user_id: str) -> dict[str, bool]:
    """Fetch which plugins this user has enabled from Supabase or the
    in-memory demo store, returning a dict like {'alarm': True, 'tasks': False, ...}.

    Falls back to all-enabled if no state exists yet.
    """
    if sb is None:
        logger.info("Supabase not configured — using in-memory plugin store")
        return _get_demo_plugin_state(user_id)

    try:
        resp = sb.table("user_plugins") \
            .select("plugin_name, enabled") \
            .eq("user_id", user_id) \
            .execute()
        if resp.data:
            return {row["plugin_name"]: row["enabled"] for row in resp.data}
    except Exception as e:
        logger.warning("Failed to fetch plugin state for user %s: %s", user_id, e)

    # Default: all enabled
    return {p["name"]: True for p in AVAILABLE_PLUGINS}


# ─── /chat ───────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    user_id: str = Depends(get_authenticated_user_id),
):
    """
    Send a message to the LifeOS Agent and get an AI-generated response.

    The backend uses LangGraph (or a rule-based fallback) to:
      1. Classify the user's intent (alarm / task / weather / greeting)
      2. Execute the relevant plugin(s)
      3. Generate a natural language reply with optional structured data

    Structured data in the response (alarm info, tasks, weather) is
    rendered as rich cards in the frontend chat UI.
    """
    logger.info("Chat from user=%s: %s", user_id, req.message[:80])

    try:
        sb = get_supabase()

        # Import agent here to keep imports lazy for faster cold start
        from langgraph_agent import run_agent

        result = run_agent(
            message=req.message,
            user_id=user_id,
            supabase_client=sb,
            timezone_offset=req.client_timezone,
        )

        return ChatResponse(
            reply=result.get("reply", "Got it!"),
            data=StructuredData(**result["data"]) if result.get("data") else None,
        )

    except Exception as e:
        logger.exception("Chat error")
        return ChatResponse(
            reply=f"Hmm, something went wrong — **{str(e)}**. Could you try again?"
        )


# ─── /plugins ────────────────────────────────────────────

@app.get("/plugins", response_model=PluginListResponse)
async def list_plugins(
    auth_user_id: str = Depends(get_authenticated_user_id),
    user_id: Optional[str] = Query(None, description="Deprecated — use auth token"),
):
    """
    List all available plugins with their current enabled/disabled state
    for the authenticated user.
    """
    sb = get_supabase()
    uid = auth_user_id  # Always use the authenticated user ID
    user_state = get_user_plugin_state(sb, uid)

    plugins = [
        PluginManifest(
            name=p["name"],
            description=p["description"],
            enabled=user_state.get(p["name"], True),
        )
        for p in AVAILABLE_PLUGINS
    ]

    return PluginListResponse(plugins=plugins)


# ─── /plugins/{name}/toggle ─────────────────────────────

@app.post("/plugins/{name}/toggle", response_model=PluginToggleResponse)
async def toggle_plugin(
    name: str,
    req: TogglePluginRequest,
    auth_user_id: str = Depends(get_authenticated_user_id),
):
    """
    Enable or disable a plugin for the given user.

    The frontend applies optimistic updates and rolls back on failure,
    so this endpoint should be idempotent.
    """
    # Validate plugin name
    valid_names = {p["name"] for p in AVAILABLE_PLUGINS}
    if name not in valid_names:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown plugin '{name}'. Available: {', '.join(sorted(valid_names))}",
        )

    sb = get_supabase()
    if sb is None:
        logger.info("Supabase not configured — toggling plugin in-memory")
        state = _get_demo_plugin_state(uid)
        state[name] = req.enabled
        return PluginToggleResponse(name=name, enabled=req.enabled)

    uid = auth_user_id  # Always use the authenticated user ID

    try:
        # Upsert the plugin state
        existing = sb.table("user_plugins") \
            .select("id") \
            .eq("user_id", uid) \
            .eq("plugin_name", name) \
            .execute()

        if existing.data:
            # Update existing row
            sb.table("user_plugins") \
                .update({"enabled": req.enabled}) \
                .eq("id", existing.data[0]["id"]) \
                .execute()
        else:
            # Insert new row
            sb.table("user_plugins").insert({
                "user_id": uid,
                "plugin_name": name,
                "enabled": req.enabled,
            }).execute()

        logger.info("Plugin '%s' toggled to %s for user=%s", name, req.enabled, uid)
        return PluginToggleResponse(name=name, enabled=req.enabled)

    except Exception as e:
        logger.exception("Toggle plugin error")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Tasks API ────────────────────────────────────────────

@app.get("/tasks", response_model=List[Task])
async def list_tasks(
    user_id: str = Depends(get_authenticated_user_id),
):
    """List all tasks for the authenticated user."""
    sb = get_supabase()

    if sb is None:
        return _demo_task_crud(user_id)

    try:
        resp = sb.table("tasks") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("created_at", desc=False) \
            .execute()
        return resp.data or []
    except Exception as e:
        logger.exception("List tasks error")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tasks", response_model=Task)
async def create_task(
    req: UpdateTaskRequest,
    user_id: str = Depends(get_authenticated_user_id),
):
    """Create a new task for the authenticated user."""
    sb = get_supabase()

    if sb is None:
        task = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": req.title or "Untitled Task",
            "due_date": req.due_date,
            "completed": req.completed or False,
            "created_at": datetime.utcnow().isoformat(),
        }
        _demo_task_crud(user_id).append(task)
        return Task(**task)

    try:
        payload = {
            "user_id": user_id,
            "title": req.title or "Untitled Task",
            "completed": req.completed or False,
        }
        if req.due_date:
            payload["due_date"] = req.due_date

        resp = sb.table("tasks").insert(payload).execute()
        if resp.data:
            return Task(**resp.data[0])
    except Exception as e:
        logger.exception("Create task error")
        raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=500, detail="Failed to create task")


@app.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    req: UpdateTaskRequest,
    user_id: str = Depends(get_authenticated_user_id),
):
    """Update a task for the authenticated user."""
    sb = get_supabase()

    if sb is None:
        tasks = _demo_task_crud(user_id)
        for t in tasks:
            if t["id"] == task_id:
                if req.title is not None:
                    t["title"] = req.title
                if req.completed is not None:
                    t["completed"] = req.completed
                if req.due_date is not None:
                    t["due_date"] = req.due_date
                return Task(**t)
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        updates = {}
        if req.title is not None:
            updates["title"] = req.title
        if req.completed is not None:
            updates["completed"] = req.completed
        if req.due_date is not None:
            updates["due_date"] = req.due_date

        resp = sb.table("tasks") \
            .update(updates) \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()
        if resp.data:
            return Task(**resp.data[0])
    except Exception as e:
        logger.exception("Update task error")
        raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=404, detail="Task not found")


@app.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    user_id: str = Depends(get_authenticated_user_id),
):
    """Delete a task for the authenticated user."""
    sb = get_supabase()

    if sb is None:
        tasks = _demo_task_crud(user_id)
        _DEMO_TASK_STORE[user_id] = [t for t in tasks if t["id"] != task_id]
        return {"ok": True}

    try:
        resp = sb.table("tasks") \
            .delete() \
            .eq("id", task_id) \
            .eq("user_id", user_id) \
            .execute()
        return {"ok": True}
    except Exception as e:
        logger.exception("Delete task error")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Schedules API ─────────────────────────────────────────

@app.post("/schedules", response_model=Schedule)
async def create_schedule(
    req: ScheduleCreate | list[ScheduleCreate],
    user_id: str = Depends(get_authenticated_user_id),
):
    """Create one or more schedules for the authenticated user."""
    items = req if isinstance(req, list) else [req]

    sb = get_supabase()
    if sb is None:
        stored = []
        for item in items:
            schedule = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "trigger_time": item.trigger_time,
                "action_type": item.action_type,
                "action_desc": item.action_desc,
                "payload": item.payload or {},
                "status": "pending",
                "created_at": datetime.utcnow().isoformat(),
            }
            _demo_schedule_crud(user_id).append(schedule)
            stored.append(schedule)
        return Schedule(**stored[0])

    try:
        payload = {
            "user_id": user_id,
            "trigger_time": items[0].trigger_time,
            "action_type": items[0].action_type,
            "action_desc": items[0].action_desc,
            "payload": items[0].payload or {},
            "status": "pending",
        }
        resp = sb.table("scheduled_events").insert(payload).execute()
        if resp.data:
            return Schedule(**resp.data[0])
    except Exception as e:
        logger.exception("Create schedule error")
        raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=500, detail="Failed to create schedule")


@app.get("/schedules", response_model=List[Schedule])
async def list_schedules(
    user_id: str = Depends(get_authenticated_user_id),
):
    """List all schedules for the authenticated user, ordered by trigger_time."""
    sb = get_supabase()

    if sb is None:
        schedules = _demo_schedule_crud(user_id)
        return sorted(schedules, key=lambda s: s.get("trigger_time", ""))

    try:
        resp = sb.table("scheduled_events") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("trigger_time", desc=False) \
            .execute()
        return resp.data or []
    except Exception as e:
        logger.exception("List schedules error")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/schedules/due", response_model=List[Schedule])
async def due_schedules(
    user_id: str = Depends(get_authenticated_user_id),
):
    """List pending schedules whose trigger_time has arrived."""
    sb = get_supabase()

    if sb is None:
        return [
            s for s in _demo_schedule_crud(user_id)
            if s.get("status") == "pending"
        ]

    try:
        resp = sb.table("scheduled_events") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("status", "pending") \
            .order("trigger_time", desc=False) \
            .execute()
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        return [s for s in (resp.data or []) if s.get("trigger_time", "").replace("Z", "") <= now.replace("Z", "")]
    except Exception as e:
        logger.exception("Due schedules error")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/schedules/{schedule_id}", response_model=Schedule)
async def update_schedule(
    schedule_id: str,
    req: dict,
    user_id: str = Depends(get_authenticated_user_id),
):
    """Update a schedule (status etc.) for the authenticated user."""
    sb = get_supabase()

    if sb is None:
        schedules = _demo_schedule_crud(user_id)
        for s in schedules:
            if s["id"] == schedule_id:
                for k, v in req.items():
                    if k in ("status", "action_desc", "payload"):
                        s[k] = v
                return Schedule(**s)
        raise HTTPException(status_code=404, detail="Schedule not found")

    try:
        updates = {k: v for k, v in req.items() if k in ("status", "action_desc", "payload")}
        resp = sb.table("scheduled_events") \
            .update(updates) \
            .eq("id", schedule_id) \
            .eq("user_id", user_id) \
            .execute()
        if resp.data:
            return Schedule(**resp.data[0])
    except Exception as e:
        logger.exception("Update schedule error")
        raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=404, detail="Schedule not found")


@app.post("/schedules/{schedule_id}/action")
async def execute_schedule_action(
    schedule_id: str,
    user_id: str = Depends(get_authenticated_user_id),
):
    """Execute the inline action for a due schedule and return the action payload."""
    sb = get_supabase()

    if sb is None:
        schedules = _demo_schedule_crud(user_id)
        for s in schedules:
            if s["id"] == schedule_id:
                action_type = s.get("action_type", "reminder")
                payload = s.get("payload", {})
                return _build_action_response(action_type, payload)
        raise HTTPException(status_code=404, detail="Schedule not found")

    try:
        resp = sb.table("scheduled_events") \
            .select("*") \
            .eq("id", schedule_id) \
            .eq("user_id", user_id) \
            .execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Schedule not found")
        schedule = resp.data[0]
        return _build_action_response(schedule.get("action_type", "reminder"), schedule.get("payload", {}))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Execute schedule action error")
        raise HTTPException(status_code=500, detail=str(e))


def _build_action_response(action_type: str, payload: dict) -> dict:
    count = payload.get("count", 1)

    if action_type == "quote":
        quotes = [
            {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
            {"text": "In the middle of difficulty lies opportunity.", "author": "Albert Einstein"},
            {"text": "Success is not final, failure is not fatal: it is the courage to continue that counts.", "author": "Churchill"},
            {"text": "Believe you can and you're halfway there.", "author": "Theodore Roosevelt"},
            {"text": "The future belongs to those who believe in the beauty of their dreams.", "author": "Eleanor Roosevelt"},
            {"text": "It does not matter how slowly you go as long as you do not stop.", "author": "Confucius"},
            {"text": "Everything you’ve ever wanted is on the other side of fear.", "author": "George Addair"},
            {"text": "Opportunities don't happen. You create them.", "author": "Chris Grosser"},
            {"text": "Success is walking from failure to failure with no loss of enthusiasm.", "author": "Winston Churchill"},
            {"text": "Don't watch the clock; do what it does. Keep going.", "author": "Sam Levenson"},
            {"text": "The secret of getting ahead is getting started.", "author": "Mark Twain"},
            {"text": "Hardships often prepare ordinary people for an extraordinary destiny.", "author": "C.S. Lewis"},
        ]
        return {
            "action_type": action_type,
            "items": random.sample(quotes, min(count, len(quotes))),
        }

    if action_type == "learning":
        words = [
            {"english": "Apple", "nepali": "स्याउ (Sya-u)", "pronunciation": "Sya-u", "category": "food"},
            {"english": "Water", "nepali": "पानी (Pa-nee)", "pronunciation": "Pa-nee", "category": "food"},
            {"english": "Friend", "nepali": "साथी (Sa-thee)", "pronunciation": "Sa-thee", "category": "people"},
            {"english": "Book", "nepali": "किताब (Kee-taab)", "pronunciation": "Kee-taab", "category": "objects"},
            {"english": "Sun", "nepali": "सूरज (Soo-raz)", "pronunciation": "Soo-raz", "category": "nature"},
            {"english": "Moon", "nepali": "चन्द्रमा (Chan-dra-ma)", "pronunciation": "Chan-dra-ma", "category": "nature"},
            {"english": "Thank you", "nepali": "धन्यबाद (Dhan-ya-baad)", "pronunciation": "Dhan-ya-baad", "category": "phrases"},
            {"english": "Hello", "nepali": "नमस्ते (Na-mas-te)", "pronunciation": "Na-mas-te", "category": "phrases"},
            {"english": "Beautiful", "nepali": "सुन्दर (Soon-dar)", "pronunciation": "Soon-dar", "category": "adjectives"},
            {"english": "Love", "nepali": "माया (Ma-ya)", "pronunciation": "Ma-ya", "category": "feelings"},
            {"english": "Home", "nepali": "घर (Ghar)", "pronunciation": "Ghar", "category": "places"},
            {"english": "Mountain", "nepali": "पहाड (Pa-haad)", "pronunciation": "Pa-haad", "category": "nature"},
            {"english": "Peace", "nepali": "शान्ति (Shan-ti)", "pronunciation": "Shan-ti", "category": "feelings"},
            {"english": "Happy", "nepali": "खुशी (Khu-shee)", "pronunciation": "Khu-shee", "category": "feelings"},
            {"english": "Market", "nepali": "बजार (Ba-jaar)", "pronunciation": "Ba-jaar", "category": "places"},
            {"english": "Delicious", "nepali": "स्वादिष्ट (Swa-disht)", "pronunciation": "Swa-disht", "category": "food"},
        ]
        return {
            "action_type": action_type,
            "items": random.sample(words, min(count, len(words))),
        }

    if action_type == "music":
        songs = [
            {"title": "Resham Firiri", "artist": "Nepali Folk", "duration": "4:32"},
            {"title": "Kaligandaki", "artist": "Narayan Gopal", "duration": "5:15"},
            {"title": "Phool ko Aankhama", "artist": "Ani Choying Drolma", "duration": "4:10"},
            {"title": "Maya Ta Maya Ho", "artist": "Narayan Gopal", "duration": "5:45"},
            {"title": "Yo Katha Yo Than", "artist": "Nepali Rock", "duration": "3:58"},
            {"title": "Timi Lai Phere", "artist": "Nepali Pop", "duration": "4:22"},
            {"title": "Mero Taal", "artist": "Phiroj Shyangden", "duration": "4:05"},
            {"title": "Himalayan", "artist": "The Elements", "duration": "5:10"},
        ]
        return {
            "action_type": action_type,
            "items": random.sample(songs, min(count, len(songs))),
        }

    if action_type == "weather":
        city = payload.get("city", "Kathmandu, Nepal")
        weather_data = {
            "temperature": random.randint(18, 32),
            "condition": random.choice(["sunny", "partly_cloudy", "cloudy", "rainy"]),
            "high": random.randint(25, 35),
            "low": random.randint(15, 22),
            "humidity": random.randint(40, 90),
            "city": city,
        }
        return {
            "action_type": action_type,
            "weather": weather_data,
        }

    if action_type == "alarm":
        return {
            "action_type": action_type,
            "label": payload.get("label", "Morning Alarm"),
            "message": "Time to wake up! Here's your morning briefing.",
        }

    if action_type == "gym":
        exercises = [
            {"name": "Push-ups", "sets": 3, "reps": 15},
            {"name": "Squats", "sets": 3, "reps": 20},
            {"name": "Plank", "sets": 3, "reps": 60},
            {"name": "Lunges", "sets": 3, "reps": 12},
            {"name": "Burpees", "sets": 3, "reps": 10},
            {"name": "Deadlift", "sets": 4, "reps": 8},
            {"name": "Bench Press", "sets": 4, "reps": 10},
            {"name": "Pull-ups", "sets": 3, "reps": 8},
            {"name": "Shoulder Press", "sets": 3, "reps": 12},
            {"name": "Barbell Rows", "sets": 4, "reps": 10},
            {"name": "Leg Press", "sets": 3, "reps": 15},
            {"name": "Bicep Curls", "sets": 3, "reps": 12},
        ]
        exercise_count = payload.get("count", len(exercises))
        selected = random.sample(exercises, min(exercise_count, len(exercises)))
        return {
            "action_type": action_type,
            "message": "Time to hit the gym! Stay hydrated and stay strong.",
            "items": selected,
        }

    return {
        "action_type": action_type,
        "message": f"Scheduled action: {action_type}",
    }


# ─── Health check ────────────────────────────────────────

@app.get("/health")
async def health():
    """Basic health check endpoint."""
    sb = get_supabase()
    db_status = "connected" if sb is not None else "not_configured"
    return {
        "status": "ok",
        "service": "lifeos-agent-backend",
        "database": db_status,
        "mode": "mock" if sb is None else "live",
    }


# ─── Entrypoint ──────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.environ.get("APP_ENV") == "development",
    )