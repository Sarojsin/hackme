"""
LangGraph-based agent orchestrator for the LifeOS Agent.

The agent classifies user intent, executes the relevant plugin(s),
and generates a human-friendly response with optional structured data.

Supports three modes:
  1. Full mode — Supabase client provided, reads/writes real data
  2. AI mode — LangGraph + OpenAI for smarter classification (when OPENAI_API_KEY set)
  3. Rule-based fallback — keyword matching, no external dependencies
"""
import json
import logging
import os
import re
import uuid
from datetime import datetime, date, timedelta
from typing import Optional, Any

from typing_extensions import TypedDict

logger = logging.getLogger("lifeos-agent")

# In-memory task store for demo mode when Supabase is not configured
_DEMO_TASK_STORE: dict[str, list[dict]] = {}


# ─── Agent State ─────────────────────────────────────────

class AgentState(TypedDict):
    user_id: str
    message: str
    intent: str
    tasks: Optional[list[dict]]
    weather: Optional[dict]
    alarm: Optional[dict]
    events: Optional[list[dict]]
    schedule: Optional[dict]
    _event_action: Optional[str]
    reply: str
    _supabase: Any  # Supabase client injected at runtime


# ─── Supabase helpers ────────────────────────────────────

def _fetch_tasks(sb, user_id: str) -> list[dict]:
    """Fetch the user's most recent tasks from Supabase."""
    try:
        resp = (
            sb.table("tasks")
            .select("id, title, due_date, completed, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return resp.data if resp.data else []
    except Exception as e:
        logger.warning("Failed to fetch tasks for user %s: %s", user_id, e)
        return []


def _fetch_weather(sb, user_id: str) -> dict | None:
    """Fetch the most recent weather data for the user.

    In production this would call OpenWeatherMap / WeatherAPI.
    Here we pull from chat_history metadata as a lightweight cache.
    """
    try:
        resp = (
            sb.table("chat_history")
            .select("metadata")
            .eq("user_id", user_id)
            .eq("role", "assistant")
            .not_.is_("metadata", "null")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            meta = resp.data[0].get("metadata", {})
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except json.JSONDecodeError:
                    meta = {}
            data = meta.get("data") or meta
            if isinstance(data, dict) and "weather" in data:
                return data["weather"]
    except Exception as e:
        logger.warning("Failed to fetch weather for user %s: %s", user_id, e)
    return None


def _save_chat_message(
    sb, user_id: str, role: str, content: str, metadata: dict | None = None
) -> None:
    """Persist a chat message to Supabase."""
    try:
        sb.table("chat_history").insert(
            {
                "user_id": user_id,
                "role": role,
                "content": content,
                "metadata": metadata or {},
            }
        ).execute()
    except Exception as e:
        logger.warning("Failed to save chat message: %s", e)


def _save_scheduled_event(
    sb,
    user_id: str,
    trigger_time: str,
    action_type: str,
    payload: dict | None = None,
) -> None:
    """Persist a scheduled event (alarm, reminder) to Supabase."""
    try:
        sb.table("scheduled_events").insert(
            {
                "user_id": user_id,
                "trigger_time": trigger_time,
                "action_type": action_type,
                "payload": payload or {},
                "status": "pending",
            }
        ).execute()
    except Exception as e:
        logger.warning("Failed to save scheduled event: %s", e)


def _get_user_plugin_state(sb, user_id: str) -> dict[str, bool]:
    """Fetch which plugins are enabled for this user."""
    try:
        resp = (
            sb.table("user_plugins")
            .select("plugin_name, enabled")
            .eq("user_id", user_id)
            .execute()
        )
        if resp.data:
            return {row["plugin_name"]: row["enabled"] for row in resp.data}
    except Exception:
        pass
    return {}  # No overrides — caller decides defaults


# ─── Calendar helpers ────────────────────────────────────

def _fetch_events(sb, user_id: str, days_ahead: int = 7) -> list[dict]:
    """Fetch the user's upcoming calendar events from Supabase."""
    try:
        now = datetime.utcnow().isoformat() + "Z"
        cutoff = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat() + "Z"
        resp = (
            sb.table("calendar_events")
            .select("id, title, description, start_time, end_time, location, all_day")
            .eq("user_id", user_id)
            .gte("start_time", now)
            .lte("start_time", cutoff)
            .order("start_time")
            .limit(20)
            .execute()
        )
        return resp.data if resp.data else []
    except Exception as e:
        logger.warning("Failed to fetch events for user %s: %s", user_id, e)
        return []


def _create_event(
    sb, user_id: str, title: str, start_time: str,
    description: str | None = None, end_time: str | None = None,
    location: str | None = None, all_day: bool = False,
) -> dict | None:
    """Create a new calendar event in Supabase. Returns the created event or None."""
    try:
        payload = {
            "user_id": user_id,
            "title": title,
            "start_time": start_time,
            "description": description or "",
            "all_day": all_day,
        }
        if end_time:
            payload["end_time"] = end_time
        if location:
            payload["location"] = location

        resp = sb.table("calendar_events").insert(payload).execute()
        if resp.data:
            return resp.data[0]
    except Exception as e:
        logger.warning("Failed to create event for user %s: %s", user_id, e)
    return None


def _create_task_in_supabase(sb, user_id: str, title: str, due_date: str | None = None) -> dict | None:
    """Create a task in Supabase. Returns the created task or None."""
    try:
        payload = {
            "user_id": user_id,
            "title": title,
            "due_date": due_date or date.today().isoformat(),
            "completed": False,
        }
        resp = sb.table("tasks").insert(payload).execute()
        if resp.data:
            return resp.data[0]
    except Exception as e:
        logger.warning("Failed to create task for user %s: %s", user_id, e)
    return None


# ─── Time parsing helpers ────────────────────────────────

def _parse_time_to_iso(time_str: str | None) -> str:
    """Convert a human-friendly time string to an ISO datetime.

    Examples:
      '7:00 AM'  -> '2025-01-15T07:00:00' (today or tomorrow, local time)
      '06:30'    -> today at 06:30 local time
      None       -> 30 seconds from now (demo fallback)
    """
    if not time_str:
        return (datetime.now() + timedelta(seconds=30)).isoformat()

    time_str = time_str.strip()

    match = re.match(
        r"(\d{1,2}):(\d{2})\s*(am|pm)?", time_str, re.IGNORECASE
    )
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2))
        meridian = match.group(3)

        if meridian:
            meridian = meridian.lower()
            if meridian == "pm" and hour < 12:
                hour += 12
            elif meridian == "am" and hour == 12:
                hour = 0

        now = datetime.now()
        event_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
        if event_time <= now:
            event_time += timedelta(days=1)

        return event_time.isoformat()

    return (datetime.now() + timedelta(seconds=30)).isoformat()


# ─── Task helpers ─────────────────────────────────────────

def _get_demo_tasks(user_id: str) -> list[dict]:
    """Get tasks from the in-memory demo store."""
    return _DEMO_TASK_STORE.get(user_id, [])


def _create_demo_task(user_id: str, title: str, due_date: str | None = None) -> dict:
    """Create a task in the in-memory demo store."""
    task = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "due_date": due_date or date.today().isoformat(),
        "completed": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    _DEMO_TASK_STORE.setdefault(user_id, []).append(task)
    return task


def _parse_task_title(message: str) -> str | None:
    """Try to extract a task title from the user's message."""
    lower = message.lower()

    # Match patterns like:
    # "add task: Buy groceries"
    # "add task Buy groceries"
    # "remind me to buy groceries"
    # "need to finish report"
    # "have to call mom"
    patterns = [
        r"(?:add|create|new)\s+task[:\s]+(.+)",
        r"(?:add|create|new)\s+todo[:\s]+(.+)",
        r"remind me to\s+(.+?)(?:\s+at\s|\s+for\s|\s+on\s|$)",
        r"need to\s+(.+?)(?:\s+at\s|\s+for\s|\s+on\s|$)",
        r"have to\s+(.+?)(?:\s+at\s|\s+for\s|\s+on\s|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, lower)
        if match:
            title = match.group(1).strip()
            if title and len(title) > 1:
                return title.capitalize()

    return None


def _parse_schedule(message: str) -> dict | None:
    """Parse a scheduled reminder from natural language.

    Examples:
      "remind me at 11:30 to get quotes" -> {time: "11:30", action: "quote", action_desc: "get quotes"}
      "at 2pm go to gym" -> {time: "2:00 PM", action: "gym", action_desc: "go to gym"}
      "wake me at 7am" -> {time: "7:00 AM", action: "alarm", action_desc: "wake me"}
    """
    lower = message.lower()

    # Time patterns
    time_patterns = [
        r"at\s+(\d{1,2}[:\.]\d{2}\s*(?:am|pm)?)",
        r"(\d{1,2}[:\.]\d{2}\s*(?:am|pm)?)",
        r"at\s+(\d{1,2}\s*(?:am|pm)?)",
        r"(\d{1,2}\s*(?:am|pm)?)",
    ]

    time_str = None
    for pattern in time_patterns:
        match = re.search(pattern, lower)
        if match:
            time_str = match.group(1).strip()
            # Normalize dot separator to colon
            if time_str and '.' in time_str and ':' not in time_str:
                time_str = time_str.replace('.', ':')
            break

    if not time_str:
        return None

    # Detect action type
    action = "reminder"
    if any(kw in lower for kw in ["weather", "forecast", "temperature", "rain", "sunny", "cloudy"]):
        action = "weather"
    elif any(kw in lower for kw in ["quote", "quotes", "motivation", "inspiration"]):
        action = "quote"
    elif any(kw in lower for kw in ["music", "song", "play music"]):
        action = "music"
    elif any(kw in lower for kw in ["learn", "vocabulary", "vocab", "word", "nepali", "english"]):
        action = "learning"
    elif any(kw in lower for kw in ["wake", "alarm", "wake up"]):
        action = "alarm"
    elif any(kw in lower for kw in ["gym", "exercise", "workout"]):
        action = "gym"
    elif any(kw in lower for kw in ["task", "todo", "to-do"]):
        action = "task"

    # Extract the action description - look for text after the time or after action keywords
    action_desc = None

    # Try to find text after "to " or "for "
    action_match = re.search(r"(?:to\s+|for\s+)(.+?)(?:\s+at\s|\s+for\s|\s+on\s|$)", lower)
    if action_match:
        action_desc = action_match.group(1).strip()
    else:
        # Try to find text after time
        action_match = re.search(r"(?:\d{1,2}:\d{2}\s*(?:am|pm)?)\s+(.+)", lower)
        if action_match:
            action_desc = action_match.group(1).strip()
            # Remove common prefixes
            action_desc = re.sub(r"^(remind me to\s+|remind me\s+|at\s+\d{1,2}:\d{2}\s*(?:am|pm)?\s*)", "", action_desc).strip()

    # Use action as fallback if no description found
    if not action_desc:
        action_desc = action

    # Extract count from message (e.g. "2 quotes", "5 words", "3 exercises")
    payload = {}
    count_match = re.search(r"(\d+)\s+(?:quote|quotes|vocab|words?|tasks?|exercises?)", lower)
    if count_match:
        payload["count"] = int(count_match.group(1))

    # Extract city for weather schedules (e.g. "kathmandu, nepal")
    if action == "weather":
        city_match = re.search(r"weather(?:\s+(?:of|in|for))?\s+([a-zA-Z\s,]+?)(?:\s+at\s|\s+for\s|\s+on\s|$)", lower)
        if city_match:
            payload["city"] = city_match.group(1).strip().title()
        else:
            payload["city"] = "Kathmandu, Nepal"

    return {
        "trigger_time": time_str,
        "action_type": action,
        "action_desc": action_desc,
        "payload": payload,
    }


# ─── Intent classification ───────────────────────────────

def classify_intent(state: AgentState) -> dict:
    """Classify the user's intent using rule-based keyword matching.

    Returns a dict with keys to update in the agent state.
    """
    raw = state["message"]
    message = raw.lower().strip()

    # ── Schedule / reminder intent ──
    schedule_keywords = [
        "remind me", "reminder", "schedule", "at\\s+\\d", "\\d{1,2}:\\d{2}",
        "wake me", "wake up", "alarm",
    ]
    if any(re.search(kw, message) for kw in schedule_keywords):
        schedule_data = _parse_schedule(raw)
        if schedule_data:
            return {
                "intent": "schedule",
                "schedule": schedule_data,
            }

    # ── Alarm / wake-up intent ──
    alarm_keywords = [
        "alarm",
        "wake",
        "wake up",
        "set.*alarm",
        "morning routine",
        "wake me",
    ]
    if any(re.search(kw, message) for kw in alarm_keywords):
        time_match = re.search(r"(\d{1,2}:\d{2}\s*(am|pm)?)", raw, re.IGNORECASE)
        time_str = time_match.group(1) if time_match else None

        # Extract label
        label = None
        for keyword in ["morning routine", "wake up", "reminder"]:
            if keyword in message:
                label = keyword.title()
                break

        return {
            "intent": "alarm",
            "alarm": {
                "time": time_str or None,
                "label": label or "Alarm",
            },
        }

    # ── Tasks / to-do intent ──
    tasks_keywords = [
        "task", "todo", "to-do", "to do", "schedule",
        "what.*do", "my tasks", "what's on", "add task", "add.*task",
        "remind me to", "need to", "have to",
    ]
    if any(re.search(kw, message) for kw in tasks_keywords):
        return {"intent": "tasks"}

    # ── Weather intent ──
    weather_keywords = [
        "weather", "forecast", "temperature", "rain",
        "sunny", "cloudy", "cold", "hot",
    ]
    if any(re.search(kw, message) for kw in weather_keywords):
        return {"intent": "weather"}

    # ── Calendar / events intent ──
    event_keywords = [
        "event", "calendar", "schedule.*meeting", "add.*event",
        "appointment", "meeting", "what.*upcoming", "my events",
        "create.*event", "new.*event", "list.*events", "my calendar",
        "add.*calendar",
    ]
    if any(re.search(kw, message) for kw in event_keywords):
        # Parse event title and time from the message
        title_match = re.search(
            r"(?:event|meeting|appointment)\s+(?:called|for|about|titled?)?\s*\"([^\"]+)\"",
            raw, re.IGNORECASE
        )
        if not title_match:
            title_match = re.search(
                r"(?:create|add|schedule|new)\s+(?:an?\s+)?(?:event|meeting|appointment)\s+(?:called|for|about|titled?)?\s*(.+?)(?:\s+at\s|\s+for\s|\s+on\s|$)",
                raw, re.IGNORECASE
            )
        title = title_match.group(1).strip() if title_match else None

        time_match = re.search(r"(\d{1,2}:\d{2}\s*(am|pm)?)", raw, re.IGNORECASE)
        time_str = time_match.group(1) if time_match else None

        # Check for "list" / "what's" / "show" — list events
        is_list_request = any(
            re.search(kw, message) for kw in [
                "list", "what.*upcoming", "my events", "my calendar",
                "show.*event", "what.*on", "upcoming",
            ]
        )

        return {
            "intent": "calendar",
            "events": {
                "action": "list" if is_list_request or not title else "create",
                "title": title,
                "time": time_str,
            },
        }

    # ── Learning / vocabulary / quotes / music intent ──
    learning_keywords = [
        "learn", "vocabulary", "vocab", "teach me", "dictionary",
        "quote", "quotes", "inspiration", "motivation",
        "music", "song", "play music", "recommend music",
        "food", "animal", "animals", "greeting", "greetings",
        "body", "numbers", "color", "colors", "family", "travel",
        "शब्द", "शब्दावली", "उद्धरण", "प्रेरणा", "संगीत", "गीत",
        "खाना", "जनावर", "नमस्ते", "परिवार", "रंग",
    ]
    if any(re.search(kw, message) for kw in learning_keywords):
        return {"intent": "learning"}

    # ── Greeting ──
    greeting_keywords = [
        r"^(hello|hi|hey|yo)",
        "good morning",
        "good evening",
        "what's up",
        "^hey ",
    ]
    if any(re.search(kw, message) for kw in greeting_keywords):
        return {"intent": "greeting"}

    # ── Schedule / reminder intent ──
    schedule_keywords = [
        "remind me", "reminder", "schedule", "at\\s+\\d", "\\d{1,2}:\\d{2}",
        "wake me", "wake up", "alarm",
    ]
    if any(re.search(kw, message) for kw in schedule_keywords):
        schedule_data = _parse_schedule(raw)
        if schedule_data:
            return {
                "intent": "schedule",
                "schedule": schedule_data,
            }

    # ── Default ──
    return {"intent": "general"}


# ─── Learning agent helpers ───────────────────────────────

def _execute_learning_plugin(state: AgentState) -> dict:
    """Run the learning agent and return updates for the agent state."""
    try:
        from learning_agent import handle_learning_message

        result = handle_learning_message(state["message"], user_id=state.get("user_id"))
        updates: dict = {}
        if result.get("reply"):
            updates["reply"] = result["reply"]
        if result.get("data"):
            updates["learning"] = result["data"]
        # Keep top-level intent as 'learning'; do not override it here.
        return updates
    except Exception as e:
        logger.exception("Learning plugin error")
        return {
            "reply": "I'd love to help you learn, but something went wrong. Could you try again?",
        }


def _get_llm():
    """Initialize and return the LLM client for OpenAI-compatible APIs.

    Returns None if no API key is configured.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None

    try:
        from langchain_openai import ChatOpenAI

        base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0,
        )
    except Exception as e:
        logger.warning("Failed to initialize LLM: %s", e)
        return None

    try:
        from langchain_nvidia_ai_endpoints import ChatNVIDIA

        model = os.environ.get("OPENAI_MODEL", "meta/llama-3.1-405b-instruct")

        return ChatNVIDIA(
            model=model,
            api_key=api_key,
            temperature=0,
        )
    except Exception as e:
        logger.warning("Failed to initialize LLM: %s", e)
        return None


def classify_intent_ai(state: AgentState) -> dict:
    """Classify the user's intent using an LLM (NVIDIA NIM or OpenAI).

    Falls back to rule-based classification if the LLM is unavailable
    or returns an unexpected format.
    """
    llm = _get_llm()
    if llm is None:
        return classify_intent(state)

    raw = state["message"]
    lower = raw.lower()
    prompt = (
        "Classify the user's message into one of these intents: "
        "alarm, tasks, weather, calendar, schedule, learning, greeting, general.\n"
        "Also extract any relevant structured data.\n\n"
        "User message: {message}\n\n"
        "Context: messages with times like 'at 11:30', 'remind me at 2pm', 'wake me at 7am' should usually be 'schedule'.\n"
        "Context: single-word inputs like food, animals, greetings, body, numbers, colors, family, travel, quote, music, vocab should usually be treated as 'learning'.\n"
        "Context: when schedule is combined with other actions like 'remind me to go to gym and 5 exercises', keep the action_type as 'gym' or 'quote' or 'learning' etc based on the main request.\n\n"
        "Respond with JSON only in this exact format:\n"
        "{{\"intent\": \"<intent>\", \"data\": {{}}}}\n\n"
        "For alarm: include {{\"alarm\": {{\"trigger_time\": \"<time or null>\", \"label\": \"<label>\"}}}} in data.\n"
        "For calendar: include {{\"events\": {{\"action\": \"<create or list>\", \"title\": \"<title or null>\", \"trigger_time\": \"<time or null>\"}}}} in data.\n"
        "For learning: include {{\"learning\": {{\"type\": \"<vocabulary|quote|music>\", \"count\": <number or null>}}}} in data.\n"
        "For schedule: include {{\"schedule\": {{\"trigger_time\": \"<time>\", \"action_type\": \"<alarm|quote|music|learning|gym|task|reminder>\", \"action_desc\": \"<human description>\", \"payload\": {{\"count\": <number or null>}}}}}} in data. If the message contains multiple times, return only the first one as the schedule object. ALWAYS extract count and include it in payload when the message mentions a number plus one of: quotes, vocab, words, exercises, tasks.\n"
        "For tasks/weather/greeting/general: data can be empty {{}}.\n"
    ).format(message=raw)

    try:
        response = llm.invoke(prompt)
        content = response.content.strip()

        # Try to extract JSON from the response
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        parsed = json.loads(content)
        intent = parsed.get("intent", "general")
        data = parsed.get("data", {})

        # Normalize intent
        valid_intents = {"alarm", "tasks", "weather", "calendar", "schedule", "learning", "greeting", "general"}
        if intent not in valid_intents:
            return classify_intent(state)

        result = {"intent": intent}
        if intent == "alarm" and "alarm" in data:
            result["alarm"] = data["alarm"]
        elif intent == "calendar" and "events" in data:
            result["events"] = data["events"]
        elif intent == "learning" and "learning" in data:
            result["learning"] = data["learning"]
        elif intent == "schedule" and "schedule" in data:
            schedule_value = data["schedule"]
            if isinstance(schedule_value, list) and schedule_value:
                result["schedule"] = schedule_value[0]
            elif isinstance(schedule_value, dict):
                result["schedule"] = schedule_value

            if isinstance(result.get("schedule"), dict):
                sched = result["schedule"]
                if "time" in sched and "trigger_time" not in sched:
                    sched["trigger_time"] = sched.pop("time")
                if "action" in sched and "action_type" not in sched:
                    sched["action_type"] = sched.pop("action")

                # If no count in payload, fall back to rule-based extraction from message
                payload = sched.get("payload")
                if not isinstance(payload, dict) or payload.get("count") is None:
                    count_match = re.search(
                        r"(\d+)\s+(?:quote|quotes|vocab|words?|tasks?|exercises?)",
                        lower,
                    )
                    if count_match:
                        sched["payload"] = {**(payload or {}), "count": int(count_match.group(1))}

        return result

    except Exception as e:
        logger.warning("AI intent classification failed: %s", e)
        return classify_intent(state)


# ─── Plugin execution ────────────────────────────────────

def execute_plugins(state: AgentState) -> dict:
    """Execute the relevant plugins based on classified intent."""
    sb = state.get("_supabase")
    intent = state["intent"]
    user_id = state["user_id"]
    updates: dict = {}

    # Fetch user's enabled plugin state
    default_plugins = {
        "alarm": True, "tasks": True, "weather": True, "calendar": True, "learning": True, "schedule": True
    }
    user_plugins = _get_user_plugin_state(sb, user_id) if sb else default_plugins
    alarm_enabled = user_plugins.get("alarm", True)
    tasks_enabled = user_plugins.get("tasks", True)
    weather_enabled = user_plugins.get("weather", True)
    calendar_enabled = user_plugins.get("calendar", True)
    learning_enabled = user_plugins.get("learning", True)
    schedule_enabled = user_plugins.get("schedule", True)

    # ── Learning plugin ──
    if intent == "learning" and learning_enabled:
        updates.update(_execute_learning_plugin(state))

    # ── Schedule plugin ──
    if intent == "schedule" and schedule_enabled:
        schedule_data = state.get("schedule", {})
        schedules_to_save = []

        if isinstance(schedule_data, list):
            schedules_to_save = schedule_data
        elif isinstance(schedule_data, dict):
            schedules_to_save = [schedule_data]
        else:
            schedules_to_save = [{"trigger_time": None, "action_type": "reminder", "action_desc": "reminder"}]

        saved_schedules = []
        for sched in schedules_to_save:
            time_str = sched.get("trigger_time") if isinstance(sched, dict) else None
            action = sched.get("action_type", "reminder") if isinstance(sched, dict) else "reminder"
            action_desc = sched.get("action_desc") or action if isinstance(sched, dict) else action
            payload = sched.get("payload", {}) if isinstance(sched, dict) else {}

            iso_time = _parse_time_to_iso(time_str)
            schedule_id = str(uuid.uuid4())

            saved = {
                "id": schedule_id,
                "trigger_time": iso_time,
                "action_type": action,
                "action_desc": action_desc,
                "payload": payload,
                "status": "pending",
            }
            saved_schedules.append(saved)

            # Persist to scheduled_events if Supabase is available
            if sb:
                _save_scheduled_event(
                    sb,
                    user_id=user_id,
                    trigger_time=iso_time,
                    action_type=action,
                    payload={
                        "schedule_id": schedule_id,
                        "action_desc": action_desc,
                        **(payload or {}),
                    },
                )

        # Return the first schedule for immediate reply, but store all in data
        updates["schedule"] = saved_schedules[0] if saved_schedules else None
        updates["schedules"] = saved_schedules if len(saved_schedules) > 1 else None

    # ── Alarm plugin ──
    if intent == "alarm" and alarm_enabled:
        alarm_data = state.get("alarm", {})
        time_str = alarm_data.get("time")
        label = alarm_data.get("label") or "Alarm"
        alarm_id = str(uuid.uuid4())
        iso_time = _parse_time_to_iso(time_str)

        updates["alarm"] = {
            "id": alarm_id,
            "time": time_str or iso_time,
            "label": label,
            "status": "pending",
        }

        # Persist to scheduled_events if Supabase is available
        if sb:
            _save_scheduled_event(
                sb,
                user_id=user_id,
                trigger_time=iso_time,
                action_type="alarm",
                payload={"label": label, "alarm_id": alarm_id},
            )

    # ── Tasks plugin ──
    if intent == "tasks" and tasks_enabled:
        # Check if user is trying to add a task
        task_title = _parse_task_title(state["message"])

        if task_title:
            # User is adding a task
            if sb:
                created = _create_task_in_supabase(sb, user_id, task_title)
                updates["tasks"] = [created] if created else []
            else:
                created = _create_demo_task(user_id, task_title)
                updates["tasks"] = [created]
            updates["_task_action"] = "created"
        else:
            # User is listing tasks
            if sb:
                tasks = _fetch_tasks(sb, user_id)
                updates["tasks"] = tasks
            else:
                updates["tasks"] = _get_demo_tasks(user_id)
            updates["_task_action"] = "listed"

    # ── Weather plugin ──
    if intent == "weather" and weather_enabled:
        weather = None
        if sb:
            weather = _fetch_weather(sb, user_id)

        updates["weather"] = weather or {
            "temperature": 22,
            "condition": "partly_cloudy",
            "high": 26,
            "low": 18,
            "humidity": 55,
            "city": "San Francisco",
        }

    # ── Calendar / Events plugin ──
    if intent == "calendar" and calendar_enabled:
        event_data = state.get("events", {})
        action = event_data.get("action", "list")
        title = event_data.get("title")
        time_str = event_data.get("time")

        if action == "create" and title:
            iso_start = _parse_time_to_iso(time_str)
            # Default 1-hour duration
            iso_end = (
                datetime.utcnow().isoformat() + "Z"
                if not time_str
                else (iso_start if not iso_start.endswith("Z") else
                      (datetime.fromisoformat(iso_start.replace("Z", "+00:00")) + timedelta(hours=1)).isoformat() + "Z")
            )

            if sb:
                created = _create_event(sb, user_id, title, iso_start, location=None)
                updates["events"] = [created] if created else []
            else:
                # Demo fallback
                updates["events"] = [{
                    "id": str(uuid.uuid4()),
                    "title": title,
                    "start_time": iso_start,
                    "description": "",
                    "all_day": False,
                }]
            updates["_event_action"] = "created"
        else:
            # List events
            if sb:
                events = _fetch_events(sb, user_id)
                updates["events"] = events
            else:
                updates["events"] = []
            updates["_event_action"] = "listed"

    return updates


# ─── Response generation ─────────────────────────────────

def generate_reply(state: AgentState) -> dict:
    """Generate a human-friendly reply and optional structured data."""
    intent = state["intent"]
    data: dict = {}

    if intent == "alarm":
        alarm = state.get("alarm", {})
        time_display = alarm.get("time", "the morning")
        label = alarm.get("label", "Alarm")

        # If no explicit time was given, the alarm fires in ~30 seconds (demo)
        if alarm.get("time") is None:
            reply = (
                f"⏰ **{label}** queued! I'll trigger it in a few seconds "
                f"to show you the full flow."
            )
        else:
            reply = (
                f"✅ **{label}** set for **{time_display}**! I'll wake you up "
                f"with a morning briefing including your tasks and today's weather."
            )

        data["alarm"] = alarm
        return {"reply": reply, "data": data}

    if intent == "tasks":
        tasks = state.get("tasks", [])
        data["tasks"] = tasks
        pending = [t for t in tasks if not t.get("completed")]
        completed_count = sum(1 for t in tasks if t.get("completed"))
        action = state.get("_task_action", "listed")

        if action == "created" and tasks:
            title = tasks[0].get("title", "Task")
            reply = f"✅ Task added: **{title}**"
            if len(tasks) > 1:
                reply += f"\n\nYou now have **{len(tasks)} tasks** today ({len(pending)} remaining)."
        elif not tasks:
            reply = (
                "📝 What is your todo list for today?\n\n"
                "Tell me what you need to do, for example:\n"
                "• \"Add task: Buy groceries\"\n"
                "• \"Remind me to finish the report\"\n"
                "• \"Need to call the dentist\""
            )
        elif pending:
            reply = (
                f"Here are your tasks for today:\n\n"
                + "\n".join(
                    f"{'✅' if t.get('completed') else '⬜'} **{t['title']}**"
                    + (f" — due {t.get('due_date', '')}" if t.get("due_date") else "")
                    for t in tasks
                )
                + f"\n\n**{len(pending)} remaining**"
                + (f", {completed_count} done" if completed_count else "")
            )
        else:
            reply = "You're all caught up! 🎉 No pending tasks."

        return {"reply": reply, "data": data}

    if intent == "weather":
        weather = state.get("weather", {})
        data["weather"] = weather
        cond = weather.get("condition", "clear").replace("_", " ")
        temp = weather.get("temperature", "?")
        high = weather.get("high", "?")
        low = weather.get("low", "?")
        city = weather.get("city", "your city")
        humidity = weather.get("humidity", "?")

        reply = (
            f"🌤 Here's your weather today in **{city}**:\n\n"
            f"• **Temperature:** {temp}°C ({cond})\n"
            f"• **High:** {high}° / **Low:** {low}°\n"
            f"• **Humidity:** {humidity}%"
        )
        return {"reply": reply, "data": data}

    if intent == "calendar":
        events = state.get("events", [])
        action = state.get("_event_action", "listed")
        data["events"] = events

        if action == "created":
            ev = events[0] if events else {}
            title = ev.get("title", "Event")
            start = ev.get("start_time", "")
            reply = (
                f"📅 **{title}** added to your calendar"
                + (f" for **{start}**!" if start else "!")
            )
        elif not events:
            reply = "You don't have any upcoming events. Want me to add one?"
        else:
            lines = []
            for ev in events:
                t = ev.get("title", "Untitled")
                s = ev.get("start_time", "")
                if s:
                    try:
                        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
                        s = dt.strftime("%a %b %d at %I:%M %p")
                    except ValueError:
                        pass
                loc = ev.get("location", "")
                desc = ev.get("description", "")
                line = f"• **{t}**"
                if s:
                    line += f" — {s}"
                if loc:
                    line += f" 📍 {loc}"
                lines.append(line)
            reply = (
                f"Here are your upcoming events:\n\n" + "\n".join(lines)
                + "\n\nWant me to add a new one?"
            )

        return {"reply": reply, "data": data}

    if intent == "greeting":
        return {
            "reply": (
                "Hey there! I'm your **LifeOS Agent**. Here's what I can do:\n\n"
                "⏰ **Alarms** — \"Set an alarm for 7am\"\n"
                "📋 **Tasks** — \"What are my tasks today?\"\n"
                "🌤 **Weather** — \"What's the weather?\"\n"
                "📅 **Calendar** — \"Add a meeting called 'Design Review' at 3pm\" or \"What's on my calendar?\"\n"
                "📚 **Learning** — \"Teach me Nepali vocabulary\", \"Give me a quote\", \"Play some music\"\n"
                "⏱️ **Schedule** — \"Remind me at 11:30 to get quotes\"\n\n"
                "What would you like to do?"
            ),
        }

    if intent == "learning":
        learning_data = state.get("learning")
        data["learning"] = learning_data
        reply = state.get("reply")
        if not reply:
            reply = (
                "📚 I'm here to help you learn! Try asking for vocabulary, quotes, or music."
            )
        return {"reply": reply, "data": data}

    if intent == "schedule":
        schedule = state.get("schedule", {})
        schedules_raw = state.get("schedules")
        schedules = schedules_raw if isinstance(schedules_raw, list) else ([schedule] if schedule else [])
        data["schedule"] = schedule
        if schedules:
            data["schedules"] = schedules

        if len(schedules) > 1:
            lines = []
            for s in schedules:
                emoji = {
                    "alarm": "⏰", "quote": "💡", "music": "🎵", "learning": "📚",
                    "gym": "💪", "task": "📋", "reminder": "🔔"
                }.get(s.get("action_type", "reminder"), "🔔")
                lines.append(f"{emoji} **{s.get('trigger_time', '')}** — {s.get('action_desc') or s.get('action_type', 'reminder')}")
            reply = "Got it! I've scheduled all of these:\n\n" + "\n".join(lines)
        else:
            time_display = schedule.get("trigger_time", "the requested time")
            action = schedule.get("action_type", "reminder")
            action_desc = schedule.get("action_desc") or action

            action_emoji = {
                "alarm": "⏰",
                "quote": "💡",
                "music": "🎵",
                "learning": "📚",
                "gym": "💪",
                "task": "📋",
            }.get(action, "🔔")

            reply = (
                f"{action_emoji} Got it! I'll remind you at **{time_display}** to {action_desc}."
            )
        return {"reply": reply, "data": data}

    # General / fallback
    return {
        "reply": (
            "I'm here to help! Try saying:\n\n"
            "⏰ **\"Set an alarm for 7am\"**\n"
            "📋 **\"What's on my to-do list?\"**\n"
            "🌤 **\"What's the forecast?\"**\n"
            "📅 **\"Add a meeting called 'Design Review' at 3pm\"**\n"
            "⏱️ **\"Remind me at 11:30 to get quotes\"**"
        ),
    }


# ─── Orchestrator ────────────────────────────────────────

def run_agent(
    message: str, user_id: str, supabase_client=None
) -> dict:
    """
    Run the full agent pipeline.

    Returns:
        dict with 'reply' (str) and optionally 'data' (dict with alarm/tasks/weather).
    """
    state: AgentState = {
        "user_id": user_id,
        "message": message,
        "intent": "",
        "tasks": None,
        "weather": None,
        "alarm": None,
        "events": None,
        "schedule": None,
        "_event_action": None,
        "reply": "",
        "_supabase": supabase_client,
    }

    # 1. Classify user intent
    state.update(classify_intent_ai(state))
    intent = state["intent"]
    logger.info("Agent classified intent=%s for user=%s", intent, user_id)

    # 2. Execute the relevant plugins
    state.update(execute_plugins(state))

    # 3. Generate the reply
    result = generate_reply(state)

    # 4. Optionally persist to chat_history (non-critical; best-effort)
    if supabase_client:
        try:
            _save_chat_message(
                supabase_client, user_id, "user", message
            )
            _save_chat_message(
                supabase_client,
                user_id,
                "assistant",
                result["reply"],
                metadata={"data": result.get("data")},
            )
        except Exception:
            logger.exception("Failed to persist chat history")

    return result


# ─── Standalone test ─────────────────────────────────────

if __name__ == "__main__":
    # Quick smoke test
    logging.basicConfig(level=logging.INFO)

    test_cases = [
        "Set an alarm for 7:00 AM",
        "Wake me up at 6:30",
        "What are my tasks today?",
        "Show my to-do list",
        "What's the weather?",
        "Is it raining today?",
        "Add a meeting called 'Design Review' at 3pm",
        "What's on my calendar?",
        "List my upcoming events",
        "Create an appointment called Dentist at 2:30 PM",
        "Hello!",
        "Hi there",
        "What can you do?",
    ]

    print("=" * 60)
    print("LifeOS Agent — Smoke Test")
    print("=" * 60)

    for msg in test_cases:
        result = run_agent(msg, "test-user")
        print(f"\n💬 User:  {msg}")
        print(f"🤖 Agent: {result['reply'][:120]}...")
        if result.get("data"):
            print(f"📦 Data:  {list(result['data'].keys())}")