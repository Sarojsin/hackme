# LifeOS Agent — Development Workflow

> How we build, test, and deploy the LifeOS Agent, based on the current codebase.

## What This App Is

LifeOS Agent is a **chat-based personal assistant** with a plugin architecture. A user talks to an AI agent through a chat UI; the agent classifies what the user wants, runs the right plugin(s), and replies with natural language plus optional structured cards (tasks, weather, alarms, calendar events, learning content, schedules). The user can also enable/disable plugins on demand.

Everything is designed to work **without any backend or API keys** — the frontend ships a full mock-mode engine that simulates every plugin client-side. When a FastAPI backend and Supabase are connected, the same UI calls real endpoints and data is persisted.

---

## Current Codebase Map

```
D:\hackme/
├── index.html                     # HTML entry, mounts <div id="root">
├── package.json                   # React 18, Vite 7, TypeScript, Tailwind 4, Lucide icons
├── vite.config.ts                 # Vite + React + Tailwind + vite-plugin-svgr
├── tsconfig.json
├── docker-compose.yml             # Frontend + Backend + Supabase
├── README.md                      # Project overview
├── run.md                         # Run guide (modes, env vars, troubleshooting)
├── setup.md                       # Setup from scratch
├── SLIDE_DECK.md / VIDEO_SCRIPT.md
├── prd/overview.md                # Product requirements
├── workflow.md                    # ← this file
│
├── src/
│   ├── main.tsx                   # React entry: StrictMode → App
│   ├── App.tsx                    # Root layout: header, plugin bar, messages, input, sidebars
│   ├── index.css                  # Tailwind 4 @theme tokens, glassmorphism, animations
│   ├── vite-env.d.ts
│   │
│   ├── types/index.ts             # All TypeScript types (ChatMessage, Task, WeatherData, etc.)
│   ├── lib/
│   │   ├── supabase.ts            # Supabase client + anonymous auth + Realtime subscriptions
│   │   └── database.types.ts      # Generated Supabase table types (chat_history, scheduled_events, tasks, user_plugins)
│   │
│   ├── api/fastapi.ts             # API client layer — every endpoint has a Mock/fallback path
│   │
│   ├── hooks/
│   │   ├── useChat.ts             # Central state hook: messages, plugins, send, runDemo, toggle, schedules
│   │   ├── useAlarmMonitor.ts     # Realtime alarm listener + local alarm simulation + browser notifications
│   │   └── useBrowserNotifications.ts  # Notification API wrapper
│   │
│   └── components/
│       ├── ChatHeader.tsx          # Title, Routine button, Plugins button, Clear button
│       ├── PluginStatusBar.tsx     # Horizontal pill bar showing enabled/disabled plugins
│       ├── ChatMessages.tsx        # Scrollable message list, auto-scroll, TypingIndicator
│       ├── ChatMessage.tsx         # Single message bubble, markdown bold rendering, structured data cards
│       ├── ChatInput.tsx           # Auto-resize textarea, Send button, "Run Demo" button
│       ├── TypingIndicator.tsx     # Animated "thinking..." indicator
│       ├── PluginManagerSidebar.tsx # Right sidebar: list plugins with on/off toggles
│       ├── RoutineScreen.tsx       # Right sidebar: Tasks tab + Schedules tab with CRUD
│       ├── TaskCard.tsx            # Rich card: pending/collapsed completed task list
│       ├── WeatherCard.tsx         # Rich card: temp, condition icon, high/low, humidity, city
│       ├── AlarmCard.tsx           # Rich card: bell icon, time, pending/completed badge
│       ├── CalendarEventCard.tsx   # Rich card: title, date/time, location, description
│       ├── LearningCard.tsx        # Rich card: Vocabulary list, Quote card, Music track list
│       └── ScheduleCard.tsx        # Rich card: single or list of scheduled reminders
│
├── backend/
│   ├── main.py                    # FastAPI app — /chat, /plugins, /tasks, /schedules, /health
│   ├── models.py                  # Pydantic request/response models
│   ├── langgraph_agent.py         # Agent orchestrator — intent classification, plugin execution, reply generation
│   ├── learning_agent.py          # Learning sub-agent — vocabulary, quotes, music (rule-based + AI)
│   ├── supabase_client.py         # Supabase service-role client + token verification
│   ├── run_smoke_test.py          # Quick smoke test for calendar plugin
│   ├── tests/test_agent.py        # Pytest integration tests (13 test cases)
│   └── requirements.txt           # fastapi, uvicorn, supabase, pydantic, python-dotenv, etc.
│
└── supabase/
    └── functions/
        └── process-scheduled-events/
            └── index.ts            # Edge Function: finds due scheduled_events, inserts proactive chat messages, marks complete
```

---

## Data Model (Supabase)

The app uses four main tables in Supabase PostgreSQL (managed by Supabase Auth for users):

| Table | Purpose |
|-------|---------|
| `users` | Managed by Supabase Auth (anonymous + email sign-in) |
| `user_plugins` | Per-user plugin enable/disable state (`plugin_name`, `enabled`) |
| `tasks` | User to-do items (`title`, `due_date`, `completed`, `user_id`) |
| `scheduled_events` | Alarms and timed reminders (`trigger_time`, `action_type`, `payload`, `status`) |
| `chat_history` | Conversation persistence (`role`, `content`, `metadata`, `user_id`) |
| `calendar_events` | Calendar events (`title`, `start_time`, `end_time`, `location`, `all_day`) |

Table types are generated in `src/lib/database.types.ts` and used throughout the frontend.

---

## Frontend Deep Dive

### Entry and Layout

`src/main.tsx` mounts `<App />` inside `<StrictMode>` onto `#root`.

`src/App.tsx` is the shell. It pulls everything from `useChat()`:
- `messages`, `isLoading`, `plugins`, `userId`, `send`, `runDemo`, `toggle`, `clearMessages`
- Renders `ChatHeader`, `PluginStatusBar`, `ChatMessages`, `ChatInput` in a `max-w-2xl` centered column
- Sidebars: `PluginManagerSidebar` (right, toggles) and `RoutineScreen` (right, tasks + schedules)
- A `lifeos-celebrate` custom event drives a 40-particle confetti overlay for morning routine celebrations

### Design System (`src/index.css`)

Tailwind CSS 4 with `@theme` custom tokens:
- `primary` / `on-primary` — indigo/purple
- `accent` — warm gold
- `background` — deep navy (`oklch(0.14 0.028 264)`)
- `foreground` — near-white
- `muted`, `border`, `destructive` — semantic neutrals

Custom utilities:
- `.glass-surface` / `.glass-surface-strong` — frosted glass effect with `backdrop-filter: blur`
- `.bg-ambient-glow` — layered radial gradient background
- Animations: `fade-in`, `slide-in-left`, `slide-in-right`, `pulse-glow`, `confetti-fall`
- `prefers-reduced-motion` — disables confetti and normalizes animation durations to 0.01ms

### TypeScript Types (`src/types/index.ts`)

Core types:
- `ChatMessage` — `id`, `user_id`, `role` (`user` | `assistant` | `system`), `content`, `metadata?`, `created_at`
- `ChatMetadata` — `proactive?`, `event_type?`, `data?` (`StructuredData`)
- `StructuredData` — union of `tasks`, `weather`, `alarm`, `events`, `learning`, `schedule/schedules`
- `Task`, `WeatherData`, `AlarmInfo`, `CalendarEvent`, `ScheduleInfo`, `LearningData` (vocabulary, quote, music)
- `PluginManifest` — `name`, `description`, `enabled`
- API response types: `ChatResponse`, `PluginListResponse`, `PluginToggleResponse`

### API Layer (`src/api/fastapi.ts`)

Every API function checks `IS_MOCK_MODE` (derived from `import.meta.env.VITE_FASTAPI_URL`). If the backend URL is empty, it returns deterministic mock data. Otherwise it calls the real endpoint.

Key functions:
- `sendMessage(message, userId, token?)` → `POST /chat`
- `getPlugins(userId, token?)` → `GET /plugins`
- `togglePlugin(name, userId, enabled, token?)` → `POST /plugins/{name}/toggle`
- `getTasks / createTask / updateTask / deleteTask`
- `getSchedules / createSchedules / getDueSchedules / updateScheduleStatus / executeScheduleAction`

`apiFetch` wraps `fetch` with a 10s `AbortSignal.timeout`, auto-retry (1 retry, 2s backoff), and skips retries on 4xx.

### `useChat` Hook (`src/hooks/useChat.ts`)

This is the central state container.

**Initialization (runs once):**
1. Calls `ensureSignedIn()` — tries Supabase anonymous auth, falls back to `'local-dev-user'`
2. Calls `getPlugins(uid)` — populates plugin list; falls back to 6 hardcoded defaults if it fails
3. Sets a welcome `assistant` message

**`send(text)` — the core flow:**
1. Appends user `ChatMessage` to state
2. Calls `sendMessage(text, userId)` (mock or real)
3. 400ms artificial delay for natural feel
4. Builds assistant `ChatMessage` from `res.reply` + `res.data` metadata
5. If `res.data` contains schedules, calls `createSchedules` and wires real IDs back into the message metadata
6. If `res.data.alarm.status === 'pending'`, calls `scheduleLocalAlarm(...)`
7. On error: appends an error `assistant` message

**Realtime proactive messages:**
- Subscribes to `chat_history` INSERT events via Supabase Realtime
- Filters for `metadata.proactive === true` — these are messages the Edge Function inserts when an alarm fires server-side
- Appends them to the message list automatically (no refresh needed)
- Triggers confetti for `morning_routine` events

**Alarm monitoring:**
- Wires `useAlarmMonitor` with `handleAlarmFired` callback
- On alarm fire: updates the original alarm message status to `'completed'`, appends a `morning_routine` briefing message, fires confetti

**Demo mode (`runDemo`):**
- Queues a fake user message, then an assistant message with an `alarm` card (status `pending`)
- Calls `scheduleLocalAlarm` — the alarm fires in ~8–12 seconds and triggers the full morning briefing flow

**Schedule notifications:**
- `checkSchedules()` polls `GET /schedules/due` every 30s
- For each new due schedule within the next 60s, calls `scheduleNotification(s)`
- `scheduleNotification` sets a `setTimeout` that, when triggered, calls `executeScheduleAction` to fetch dynamic content (quotes, vocab, gym exercises, etc.) and appends a proactive reminder message

**Plugin toggle (`toggle(name)`):**
- Optimistic update — flips the plugin's `enabled` state immediately
- Calls `togglePlugin` API; reverts on failure

### `useAlarmMonitor` Hook (`src/hooks/useAlarmMonitor.ts`)

Two alarm sources:

1. **Realtime (live backend):** Subscribes to `scheduled_events` INSERT/UPDATE via Supabase. When a new pending event arrives, calculates delay from `trigger_time`, sets a `setTimeout`, shows a browser notification, and calls `onAlarmFired` with a hardcoded demo briefing (4 tasks, weather, alarm object).

2. **Local simulation (mock/demo):** `scheduleLocalAlarm({id, time, label})` parses the time string. If the target time is in the past or more than 24h away, it fires in 8–12 seconds. Shows a browser notification and calls `onAlarmFired` with the same demo briefing.

Browser notifications use `useBrowserNotifications` which wraps the Notification API, requests permission on mount if `default`, and gracefully degrades if unsupported.

### Key Components

**`ChatMessage.tsx`** — renders a single message bubble. For assistant messages: glass surface, `Bot` avatar, markdown bold parsing. For user: primary color, `User` avatar, right-aligned. Proactive messages show a pulsing "PROACTIVE" badge. Structured data cards are conditionally rendered below the bubble (tasks → `TaskCard`, weather → `WeatherCard`, etc.).

**`ChatMessages.tsx`** — scrollable list with `useRef`-driven auto-scroll (`scrollIntoView({ behavior: 'smooth' })`). Shows `TypingIndicator` while `isLoading` is true.

**`ChatInput.tsx`** — auto-resizing textarea (max 120px), Enter to send (Shift+Enter for newline), "Run Demo" button above the input, primary-colored send button.

**`PluginManagerSidebar.tsx`** — slides in from the right (`translate-x` transition). Scrim overlay. Each plugin row shows an icon, name, description, and On/Off status. Calls `onToggle(name)` on click.

**`RoutineScreen.tsx`** — wider sidebar (`sm:w-96`, full width on mobile). Two tabs: **Tasks** and **Schedules**.
- Tasks tab: list with checkbox, edit (inline input), delete, and a bottom "Add task" input
- Schedules tab: list with Done button, executed results display (quotes, vocab, music, gym exercises, alarm messages)
- Both tabs poll their respective APIs on mount and when the tab is selected

**Card components** (`TaskCard`, `WeatherCard`, `AlarmCard`, `CalendarEventCard`, `LearningCard`, `ScheduleCard`) — each is a self-contained styled block that accepts structured data and renders a rich visual representation.

---

## Backend Deep Dive

### FastAPI App (`backend/main.py`)

**Authentication:**
- All protected endpoints use `get_authenticated_user_id(authorization: Header)` dependency
- Extracts Bearer token → calls `get_user_id_from_token` (verifies via Supabase admin client)
- In `APP_ENV=development`, requests without a token are accepted as `"dev-user"` (so Swagger UI works)

**Plugin registry:**
`AVAILABLE_PLUGINS` is the source of truth — a list of 6 dicts (`alarm`, `tasks`, `weather`, `calendar`, `learning`, `schedule`). The `/plugins` endpoint reads the user's `user_plugins` rows from Supabase and merges with this list.

**Demo/mock fallback:**
If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is not set, `get_supabase()` returns `None`. Every endpoint then falls back to in-memory stores (`_DEMO_TASK_STORE`, `_DEMO_SCHEDULE_STORE`, `_DEMO_PLUGIN_STORE`) with 24h auto-purge. This means the backend works without Supabase for local testing.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `POST /chat` | Send a message → agent response | Accepts `ChatRequest`, runs `run_agent()`, returns `ChatResponse` |
| `GET /plugins` | List plugins + enabled state | Reads `user_plugins` table |
| `POST /plugins/{name}/toggle` | Enable/disable plugin | Upserts `user_plugins` row |
| `GET /tasks` | List user tasks | `SELECT * FROM tasks WHERE user_id = ...` |
| `POST /tasks` | Create task | Inserts into `tasks` |
| `PATCH /tasks/{id}` | Update task | Updates title/completed/due_date |
| `DELETE /tasks/{id}` | Delete task | Deletes by id + user_id |
| `POST /schedules` | Create schedule(s) | Inserts into `scheduled_events` |
| `GET /schedules` | List schedules | Ordered by trigger_time |
| `GET /schedules/due` | List pending schedules that have passed | Filters `status='pending' AND trigger_time <= now()` |
| `PATCH /schedules/{id}` | Update schedule | Status/action_desc/payload |
| `POST /schedules/{id}/action` | Execute inline action | Returns action-specific payload (quotes, vocab, music, weather, gym, alarm) |
| `GET /health` | Health check | Returns `{ status, service, database, mode }` |

### Agent Orchestrator (`backend/langgraph_agent.py`)

The agent is a **3-stage pipeline** implemented as plain functions (not a compiled LangGraph graph), but the structure mirrors LangGraph nodes:

**Stage 1 — Intent Classification:**
- `classify_intent(state)` — rule-based keyword/regex matching. Checks in priority order: schedule, alarm, tasks, weather, calendar, learning, greeting, schedule (again), general.
- `classify_intent_ai(state)` — if `OPENAI_API_KEY` is set, sends a structured prompt to an OpenAI-compatible LLM (Groq, OpenAI, NVIDIA NIM) and parses the JSON response. Falls back to `classify_intent` on failure.

Intents: `alarm`, `tasks`, `weather`, `calendar`, `schedule`, `learning`, `greeting`, `general`.

**Stage 2 — Plugin Execution (`execute_plugins(state)`):**
- Fetches the user's plugin state from `user_plugins` table (or defaults to all enabled)
- Dispatches to the right plugin based on intent:
  - **Learning**: delegates to `learning_agent.handle_learning_message()`
  - **Schedule**: parses `state["schedule"]`, converts times to ISO, persists each to `scheduled_events`
  - **Alarm**: generates UUID, parses time, persists to `scheduled_events` as `action_type="alarm"`
  - **Tasks**: if message looks like "add task: X" → creates task; otherwise lists tasks
  - **Weather**: fetches cached weather from chat_history metadata or returns default SF weather
  - **Calendar**: creates event (with title + time) or lists upcoming events (next 7 days)

**Stage 3 — Reply Generation (`generate_reply(state)`):**
- Formats a human-readable markdown string for each intent
- Attaches structured data (`data` dict) so the frontend can render rich cards
- Special case: `schedule` with multiple entries renders a bulleted list of all scheduled actions

**`run_agent(message, user_id, supabase_client)`** — orchestrates the three stages and optionally persists the user/assistant messages to `chat_history`.

### Learning Agent (`backend/learning_agent.py`)

A separate sub-agent for the `learning` plugin:
- Rule-based classification: `vocabulary`, `quote`, `music`, `learning_general`
- AI enhancement: if `OPENAI_API_KEY` is set, sends an LLM prompt and parses the JSON response
- Demo data: 15 English-Nepali vocabulary words, 10 daily quotes (English + Nepali), 10 Nepali music tracks
- Returns `{ reply, data, intent }`

### Supabase Client (`backend/supabase_client.py`)

Singleton `create_client(url, service_role_key)`. Returns `None` if env vars are missing. Provides:
- `get_supabase()` / `get_supabase_sync()` — lazy singleton accessor
- `verify_token(access_token)` — calls `sb.auth.get_user()` in a thread (non-blocking)
- `get_user_id_from_token(access_token)` — extracts user ID from verified token

### Supabase Edge Function (`supabase/functions/process-scheduled-events/index.ts`)

Runs on a Supabase Cron schedule (every ~30s):
1. Queries `scheduled_events` where `status = 'pending' AND trigger_time <= now()` (LIMIT 20)
2. For each due event:
   - Builds a proactive chat message based on `action_type` (`alarm`, `morning_routine`, or generic `reminder`)
   - Inserts the message into `chat_history` with `metadata = { proactive: true, event_type: action_type, event_id: id }`
   - Marks the event `status = 'completed'`
3. This triggers a Supabase Realtime INSERT event on `chat_history`, which the frontend's `useChat` hook picks up and appends to the message list automatically

---

## How Data Flows (End-to-End)

### Chat message (mock mode)

```
User types "Set an alarm for 7am"
  → ChatInput.onSend → useChat.send()
    → append user message to state
    → sendMessage() in api/fastapi.ts (IS_MOCK_MODE=true)
      → getMockChatResponse() parses "7am" → returns reply + alarm data
    → append assistant message + alarm card
    → scheduleLocalAlarm() → setTimeout(~8s) → browser notification + morning briefing message
```

### Chat message (live backend)

```
User types "Set an alarm for 7am"
  → useChat.send()
    → append user message
    → sendMessage() → POST /chat with { message, user_id }
      → main.py /chat endpoint → run_agent()
        → classify_intent_ai() → intent="alarm"
        → execute_plugins() → _parse_time_to_iso(), _save_scheduled_event() to Supabase
        → generate_reply() → "Alarm set for 7:00 AM!" + alarm structured data
      → returns ChatResponse
    → append assistant message + alarm card
    → scheduleLocalAlarm() (client-side timer as fallback)
```

### Alarm fires (server-side)

```
Supabase Cron (every 30s) → process-scheduled-events Edge Function
  → finds due scheduled_events row
  → INSERT INTO chat_history (proactive message)
  → UPDATE scheduled_events SET status='completed'
  → Supabase Realtime broadcasts INSERT on chat_history
    → useChat Realtime subscription catches it
      → appends proactive message to chat
      → triggers confetti
```

### Alarm fires (client-side mock)

```
scheduleLocalAlarm({ time: "7:00 AM" }) → setTimeout(8-12s)
  → browser Notification("⏰ Morning Alarm", ...)
  → onAlarmFired(briefing) → updates alarm card status + appends morning briefing message + confetti
```

---

## Three Operating Modes

The app is designed to work at three levels of connectivity:

| Mode | `VITE_FASTAPI_URL` | Backend running | Supabase configured | Behaviour |
|------|-------------------|-----------------|---------------------|-----------|
| **Mock** | empty (default) | No | No | All responses generated client-side in `fastapi.ts`. No persistence. |
| **Rule-based Live** | `http://localhost:8000` | Yes | Yes (or demo stores) | FastAPI keyword matching + Supabase reads/writes. No LLM cost. |
| **AI Live** | `http://localhost:8000` | Yes | Yes | LangGraph + Groq/OpenAI/NVIDIA LLM for intent classification. Full AI responses. |

**How the frontend detects mode:** `IS_MOCK_MODE = !FASTAPI_URL`. Every API function in `fastapi.ts` branches on this flag.

**How the backend detects mode:**
- `get_supabase()` returns `None` if `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are missing → in-memory demo stores
- `_get_llm()` returns `None` if `OPENAI_API_KEY` is missing → rule-based classification

---

## How to Add a New Plugin

### 1. Backend — register the plugin

In `backend/main.py`, add to `AVAILABLE_PLUGINS`:
```python
{"name": "notes", "description": "Take and manage notes", "enabled": True}
```

In `backend/langgraph_agent.py`:
- Add keywords to `classify_intent()` for intent detection
- Add a branch in `execute_plugins()` for the new intent (fetch/create/update Supabase records)
- Add a branch in `generate_reply()` to format the reply and structured data

### 2. Frontend — add the API functions

In `src/api/fastapi.ts`, add CRUD functions for the new plugin (with mock-mode fallbacks).

### 3. Frontend — add the UI card

Create `src/components/NotesCard.tsx` that accepts the structured data shape.

In `src/components/ChatMessage.tsx`, add a conditional render:
```tsx
{message.metadata.data.notes && <NotesCard notes={message.metadata.data.notes} />}
```

### 4. Frontend — wire the sidebar toggle

If the plugin needs a sidebar tab, extend `RoutineScreen.tsx` or create a new sidebar. The `PluginManagerSidebar` automatically picks up any plugin in the `plugins` array.

---

## Database Migrations

Migrations live in `supabase/migrations/`. Apply them with:
```bash
supabase migration up
```

Current tables (as reflected in `src/lib/database.types.ts`):
- `chat_history` — `id`, `user_id`, `role`, `content`, `metadata` (jsonb), `created_at`
- `scheduled_events` — `id`, `user_id`, `trigger_time`, `action_type`, `payload` (jsonb), `status`, `created_at`, `updated_at`
- `tasks` — `id`, `user_id`, `title`, `due_date`, `completed`, `created_at`, `updated_at`
- `user_plugins` — `id`, `user_id`, `plugin_name`, `enabled`, `created_at`, `updated_at`

---

## Development Workflow

### 1. Frontend-only development (mock mode)

No backend needed. The fastest path to a working UI:

```bash
npm install
npm run dev     # → http://localhost:5173
```

All agent responses are generated by `getMockChatResponse()` in `src/api/fastapi.ts`. You can edit the mock responses directly to iterate on UI behavior.

### 2. Backend development

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

In a second terminal:
```bash
$env:VITE_FASTAPI_URL="http://localhost:8000"   # PowerShell
npm run dev
```

### 3. Testing

```bash
# Backend smoke test (no Supabase needed)
cd backend && python run_smoke_test.py

# Backend unit tests (pytest)
cd backend && pytest backend/tests/ -v

# Frontend — manual in browser
npm run dev
```

### 4. Docker Compose

```bash
docker-compose up --build
```

Starts frontend (5173), backend (8000), and Supabase together.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Mock mode first** | Frontend development doesn't depend on backend. Any contributor can work on the UI without setting up Python or Supabase. |
| **Rule-based agent default** | No API key needed. The `classify_intent()` regex engine handles the full MVP flow. AI is opt-in. |
| **Supabase for everything** | Single service for auth, database, realtime subscriptions, and edge functions. No extra infrastructure. |
| **Optimistic UI toggles** | Plugin toggles update immediately and roll back on failure, so the UI feels instant. |
| **Client-side alarm simulation** | In mock mode, alarms fire in 8–12 seconds so the demo flow is visible without any server-side cron. |
| **Proactive messages via Realtime** | The Edge Function inserts chat messages directly; the frontend picks them up via `postgres_changes` — no polling needed for alarms. |
| **Structured data in metadata** | Agent replies carry both text (`reply`) and structured cards (`data`). The frontend renders both, giving a rich experience without extra API calls. |

---

## Release Checklist

- [ ] `npm run build` — frontend compiles without errors
- [ ] `pytest backend/tests/ -v` — all 13+ tests pass
- [ ] `python backend/run_smoke_test.py` — smoke test passes
- [ ] All 6 plugin toggles work in the sidebar (on + off)
- [ ] Alarm fires → browser notification + morning briefing card + confetti
- [ ] Schedule a compound routine (e.g., "At 11am give me 2 quotes and at 12pm learn 5 words") → multiple cards
- [ ] Tasks CRUD in RoutineScreen (add, complete, edit, delete)
- [ ] Schedules poll for due items and execute actions (quotes, vocab, gym)
- [ ] `.env.example` is current for frontend and backend
- [ ] `package.json` dependencies are up to date
- [ ] Edge Function `process-scheduled-events` is deployed and cron is active
- [ ] Supabase migrations applied to production project
- [ ] Anonymous auth enabled in Supabase Dashboard
- [ ] `VITE_FASTAPI_URL` is unset for mock-mode deploys, set for live deploys
