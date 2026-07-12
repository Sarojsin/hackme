# LifeOS Agent — Product Requirements Document

## Description

LifeOS Agent is a modular, AI‑powered daily assistant that works through a chat interface. A central Orchestrator Agent (built with LangGraph + FastAPI) understands natural language, remembers user preferences, and delegates work to swappable plugin modules. Users install only the modules they want, similar to VS Code extensions. The MVP demonstrates three plugins — Alarm, Tasks, and Weather — to power a proactive morning routine.

The system follows a **hybrid architecture**: the frontend (React + Vite) and data layer (Supabase) are built on the Native.Builder platform, while the AI orchestrator (Python FastAPI + LangGraph) runs as a separately deployed service.

## Goals

- Demonstrate a working **plugin architecture** where plugins are independently swappable modules with a standard interface
- Deliver a **proactive morning routine** flow: user sets an alarm → alarm fires → agent automatically delivers tasks + weather briefing
- Provide a clean **chat interface** where the user can converse naturally with the agent
- Show **real-time push notifications** for alarms and reminders via browser
- Keep the architecture extendable — adding a new plugin should require minimal code

## User Stories

- As a user, I want to set an alarm by typing "Wake me up at 7am" so that the agent handles it without me opening a separate app
- As a user, I want to ask "What's my schedule today?" and see my tasks so I can plan my day
- As a user, I want to ask "What's the weather?" and get a concise forecast for my location
- As a user, I want to enable/disable plugins so I control what the agent can do
- As a user, I want the agent to proactively deliver my morning briefing (tasks + weather) after my alarm rings

## User Flows

### Flow 1: Setting an Alarm (Happy Path)
1. User types: "Set an alarm for 7am"
2. Frontend sends message to FastAPI `/chat` endpoint
3. LangGraph orchestrator parses intent → calls `AlarmPlugin.set_alarm(7:00)`
4. Alarm plugin writes event to Supabase `scheduled_events` table
5. Orchestrator returns: "Alarm set for 7:00 AM"
6. Frontend displays the response

### Flow 2: Morning Routine (Proactive)
1. Supabase Cron (runs every 30s) finds `scheduled_events` with `trigger_time <= now()` and `status = 'pending'`
2. Cron triggers a Realtime event → frontend shows browser notification ("⏰ Wake up!")
3. Cron calls FastAPI `/morning-routine` endpoint with the event context
4. Orchestrator processes follow-up actions: `get_weather()` + `list_today_tasks()`
5. Returns structured briefing → pushed to frontend via Realtime
6. User sees: "Good morning! ☀️ Today's high is 22°C. You have 3 tasks: Buy groceries, Finish report, Call dentist"

### Flow 3: Enabling/Disabling Plugins
1. User opens Plugin Manager panel in the UI
2. Sees list of installed plugins (Alarm, Tasks, Weather) with toggle switches
3. Disabling a plugin removes its tools from the orchestrator's available function list
4. New messages no longer trigger that plugin's capabilities

### Flow 4: Error — Invalid Time Format
1. User types: "Set alarm for whenever"
2. OpenAI intent parser cannot extract a valid time parameter
3. Orchestrator returns a clarification request: "What time would you like the alarm set? (e.g., 7:00 AM)"
4. User responds: "8:30 AM"
5. Orchestrator proceeds to set the alarm

## Design & UX

The frontend is a single-page chat application with two main areas:

**Chat Panel (primary)**
- Message bubbles (user left-aligned, agent right-aligned)
- Text input at the bottom with a send button
- Messages support markdown for structured responses (bullet lists, bold, etc.)
- Agent responses from proactive events are visually tagged with a "⏰ Proactive" badge

**Plugin Manager Sidebar (collapsible)**
- Toggle switches for each installed plugin
- Shows plugin name, short description, and enabled/disabled state
- Changes take effect immediately on the next message

**Notifications**
- Browser Notification API permission requested on first visit
- Alarms trigger a system notification with sound (standard browser notification)
- Notification body includes the alarm label or morning briefing summary

## Acceptance Criteria

1. User can set an alarm via natural language and see a confirmation
2. When an alarm triggers, a browser notification appears
3. After alarm triggers, the morning briefing (weather + tasks) is delivered automatically
4. User can ask "What's the weather?" and receive a forecast
5. User can ask "What are my tasks?" and receive a list of today's tasks
6. User can add a new task via chat ("Add buy milk to my tasks")
7. User can toggle a plugin on/off, and the orchestrator stops using its tools
8. All chat history is persisted and visible on page reload
9. Multiple users can use the system independently (auth-scoped data)

## Out of Scope (MVP)

- Voice interface / speech-to-text
- Mobile native notifications (browser notifications only for MVP)
- Third-party calendar integration (Google Calendar, etc.) — use DB-backed tasks
- Learning plugin, Medicine plugin, News plugin — deferred
- User preferences/profile management (hardcoded defaults for MVP)
- Plugin marketplace / remote plugin loading
- Fine-tuned local LLM — uses OpenAI API only

## Open Questions

1. **Weather location**: How should we handle location? Options: (a) Ask user on first weather query, (b) Use browser Geolocation API, (c) Hardcode a default city for demo
2. **LLM key management**: Who provides the OpenAI API key? Should the FastAPI backend be configured with a shared key, or should individual users bring their own?
3. **Cron → FastAPI callback**: Should the Supabase Cron job call the FastAPI endpoint directly, or push a Realtime event that the frontend then relays to FastAPI?

## Implementation Notes

### Tech Stack

| Layer | Technology | Deployment |
|---|---|---|
| Frontend | React (Vite) + TypeScript | Native.Builder platform |
| UI Library | Tailwind CSS | Bundled with Vite |
| Database | PostgreSQL (Supabase) | Supabase managed |
| Auth | Supabase Auth (email/password or anonymous) | Supabase managed |
| Realtime | Supabase Realtime | Supabase managed |
| Cron/Scheduling | Supabase Cron (pg_cron) | Supabase managed |
| Orchestrator | Python FastAPI + LangGraph | Deployed separately (Railway/Render) |
| LLM | OpenAI GPT-4o-mini | Called from FastAPI |
| Plugin Runtime | Python modules in FastAPI | Part of FastAPI deployment |

### Supabase Schema (MVP)

**users** — managed by Supabase Auth

**user_plugins**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK to auth.users |
| plugin_name | text | e.g. 'alarm', 'tasks', 'weather' |
| enabled | boolean | Default true |

**scheduled_events**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK to auth.users |
| trigger_time | timestamptz | When the event fires |
| action_type | text | 'alarm', 'morning_routine' |
| payload | jsonb | {label, follow_up_actions, ...} |
| status | text | 'pending', 'completed', 'cancelled' |

**chat_history**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK |
| role | text | 'user' or 'assistant' |
| content | text | Message body |
| created_at | timestamptz | Auto |

**tasks**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK |
| title | text | Task description |
| due_date | date | Optional |
| completed | boolean | Default false |

### API Surface (FastAPI)

| Endpoint | Method | Purpose |
|---|---|---|
| `/chat` | POST | Send a message, receive agent response |
| `/morning-routine` | POST | Called by Supabase cron when alarm fires |
| `/plugins` | GET | List available plugins and their status |
| `/plugins/{name}/toggle` | POST | Enable/disable a plugin |

### Plugin Interface (Python)

```python
class BasePlugin(ABC):
    """Each plugin inherits from this base class."""
    
    @abstractmethod
    def get_manifest(self) -> dict:
        """Returns name, description, and tool definitions."""
        pass
    
    @abstractmethod
    async def handle_tool(self, tool_name: str, params: dict, user_id: str) -> dict:
        """Executes a tool call and returns results."""
        pass
```

Each plugin is a Python module in `/plugins/` with its own `manifest.yaml` and handler class.