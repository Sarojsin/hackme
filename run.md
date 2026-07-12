# LifeOS Agent — Run Guide

> How to start and run the LifeOS Agent.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend (React / Vite) |
| npm | 9+ | Package management |
| Python | 3.10+ | Backend (FastAPI) |
| Supabase | — | Auth, database, realtime |
| Groq | — | AI-powered responses (free tier) |

## Quick Start (Frontend Only — Mock Mode)

The fastest way to see the app running:

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

This starts Vite at `http://localhost:5173`. The app runs in **mock mode** — all agent responses are generated client-side with demo data. No backend, no API keys needed.

## Full Stack (Frontend + FastAPI Backend)

### Terminal 1 — Backend

```bash
cd backend

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Start server
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend

```bash
# Set the backend URL
$env:VITE_FASTAPI_URL="http://localhost:8000"   # PowerShell
# Or:
export VITE_FASTAPI_URL=http://localhost:8000    # Bash

npm run dev
```

## Environment Variables

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Groq AI (free tier) — required for AI mode
OPENAI_API_KEY=gsk_your_groq_key_here
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile

# Or leave OPENAI_API_KEY empty for rule-based mode (no AI)
USE_LANGGRAPH=true
APP_ENV=development
CORS_ORIGINS=http://localhost:5173
PORT=8000
LOG_LEVEL=INFO
```

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FASTAPI_URL=http://localhost:8000   # Leave empty for mock mode
```

### Mobile (`mobile/.env`)

```env
EXPO_PUBLIC_FASTAPI_URL=http://localhost:8000
```

For physical devices, use your computer's LAN IP instead of `localhost`.

## Backend Setup (First Time)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running Tests

### Backend Smoke Test

```bash
cd backend
source venv/bin/activate   # or venv\Scripts\activate
python run_smoke_test.py
```

### Backend Unit Tests

```bash
cd backend
source venv/bin/activate
pytest backend/tests/ -v
```

## Preview in NativelyAI

The project is configured to run with `npm run dev` in the NativelyAI preview panel.

### Mode Detection

| `VITE_FASTAPI_URL` | Mode | Behaviour |
|---|---|---|
| Empty (default) | **Mock** | All responses generated client-side. No backend needed. |
| Set to URL | **Live** | Chat messages sent to FastAPI backend. Requires running backend. |

## Mobile App (Expo)

The project includes an Expo mobile app for iOS/Android with device notifications and calendar integration.

### Running the Mobile App

```bash
cd mobile
npm install
npm start
```

Then:
- Scan the QR code with Expo Go app
- Or press `a` for Android emulator
- Or press `i` for iOS simulator

### Mobile App Backend URL

Set the backend URL in `mobile/.env`:

```env
EXPO_PUBLIC_FASTAPI_URL=http://localhost:8000
```

For physical devices, use your computer's LAN IP instead of `localhost`.

## Deploying (Build)

```bash
npm run build   # → outputs to dist/
```

This creates a production build. Deploy the `dist/` folder to any static host.

---

## Architecture Overview

```
User ↔ Chat UI (React/Vite) ─┬─ VITE_FASTAPI_URL set → FastAPI + LangGraph → Supabase
                               └─ VITE_FASTAPI_URL empty → Mock responses (client-side)

User ↔ Mobile App (Expo) ────→ FastAPI + LangGraph → Supabase

Plugins: alarm, tasks, weather, calendar, learning
Auth:    Anonymous (Supabase)
DB:      PostgreSQL (Supabase)
AI:      Groq Cloud (free tier) or rule-based fallback
```

### Plugin System

| Plugin | What it does | Demo data / Flow |
|--------|-------------|------------------|
| Alarm | Set alarms and morning briefings | 30-second demo alarm + weather/task briefing |
| Tasks | Interactive todo list | Asks for todo list first, then stores and shows tasks |
| Weather | Current forecast | San Francisco defaults |
| Calendar | Create/list events | Create with natural language |
| Learning | English-Nepali vocab, quotes, music | AI-generated or daily curated content |

Toggle plugins via the sidebar — changes persist per user in Supabase.

### Task Flow

1. User: "What are my tasks today?"
2. Agent: "📝 What is your todo list for today?" with examples
3. User: "Add task: Buy groceries"
4. Agent: "✅ Task added: Buy groceries"
5. User: "What are my tasks today?"
6. Agent: Shows real task list

### AI Modes

| Mode | Configuration | Behaviour |
|------|--------------|-----------|
| **Groq AI** | `OPENAI_API_KEY` set + `OPENAI_BASE_URL=https://api.groq.com/openai/v1` | LLM-powered intent classification and responses |
| **Rule-based** | `OPENAI_API_KEY` empty | Keyword matching, no external API calls |
| **Mock** | `VITE_FASTAPI_URL` empty | Client-side demo responses only |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Supabase URL not configured` | Check `VITE_SUPABASE_URL` in `.env` |
| Blank preview / 404 | Ensure `index.html` has `<div id="root">` |
| `npm install` fails | Try `node --version` (needs 18+) |
| Edge Function `500` | Check Supabase secrets are set |
| Metro cache error in mobile | Run `npx expo start --clear` |
| Groq 429 errors | Free tier limit: 30 req/min, 14,400 req/day |
| Backend 422 on chat | Hard refresh frontend; ensure `VITE_FASTAPI_URL` is set correctly |

## Supabase Configuration

### Database Migrations

Migrations are in `supabase/migrations/`. Apply them to your Supabase project:

```sql
-- Apply via Supabase SQL Editor or CLI
supabase migration up
```

Key tables:

| Table | Purpose |
|-------|---------|
| `users` | Managed by Supabase Auth |
| `user_plugins` | Per-user plugin enable/disable |
| `scheduled_events` | Alarms and timed reminders |
| `chat_history` | Conversation persistence |
| `tasks` | User to-do items |
| `calendar_events` | Calendar events |

### Auth Setup

The app uses **Supabase Anonymous Auth** (implicit flow). Configure in Supabase Dashboard:

- **Settings → Auth → General:** Enable Anonymous Sign-Ins
- **Settings → Auth → URL Configuration:** Add redirect URLs for your preview domains

## Edge Function Deployment

The `process-scheduled-events` Edge Function handles fired alarms.

```bash
supabase functions deploy process-scheduled-events --no-verify-jwt
```

## Verify Setup

```bash
# Frontend
npm run dev    # → http://localhost:5173

# Backend
cd backend && uvicorn main:app --reload --port 8000

# Mobile
cd mobile && npm start
```

Open `http://localhost:5173` — you should see the chat interface.
