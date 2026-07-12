# LifeOS Agent — Setup Guide

> How to set up the LifeOS Agent project from scratch.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend (React / Vite) |
| npm | 9+ | Package management |
| Python | 3.10+ | Backend (FastAPI) |
| Supabase | — | Auth, database, realtime |

---

## 1. Frontend Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
# Leave empty for standalone demo mode (mock responses)
VITE_FASTAPI_URL=
```

> **Note:** With `VITE_FASTAPI_URL` empty, the frontend runs in **mock mode** — no backend needed for basic testing.

## 2. Backend Setup (optional)

Only needed if you want to run the full LangGraph agent locally.

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `backend/.env` with:
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NVIDIA_API_KEY=          # Leave empty for rule-based mode
USE_LANGGRAPH=true
APP_ENV=development
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
```

## 3. Supabase Configuration

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

## 4. Edge Function Deployment

The `process-scheduled-events` Edge Function handles fired alarms.

```bash
supabase functions deploy process-scheduled-events --no-verify-jwt
```

## 5. Verify Setup

```bash
# Frontend
npm run dev    # → http://localhost:5173

# Backend (if configured)
cd backend && uvicorn main:app --reload --port 8000
```

Open `http://localhost:5173` — you should see the chat interface in mock mode.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Supabase URL not configured` | Check `VITE_SUPABASE_URL` in `.env` |
| Blank preview / 404 | Ensure `index.html` has `<div id="root">` |
| `npm install` fails | Try `node --version` (needs 18+) |
| Edge Function `500` | Check Supabase secrets are set |