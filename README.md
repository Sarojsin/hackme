# LifeOS Agent

AI-powered personal life assistant with plugins for alarms, tasks, weather, calendar, and learning.

## Features

- **Natural language chat** — interact with your assistant via text
- **Alarm plugin** — set, list, and cancel alarms with morning briefings
- **Tasks plugin** — manage daily to-dos
- **Weather plugin** — get weather forecasts
- **Calendar plugin** — create and view calendar events
- **Learning plugin** — English-Nepali vocabulary, daily quotes, and music
- **Per-user plugin toggles** — customize which plugins are active
- **Conversation memory** — chat history persisted in Supabase
- **Three operating modes** — Mock (no backend), Rule-based (keyword matching), AI-driven (Groq/LangGraph)
- **Mobile app** — Expo React Native app with push notifications

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 7, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.12, Uvicorn |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| AI | LangGraph + Groq (optional, falls back to rule-based) |
| Mobile | Expo / React Native |

## Prerequisites

- Node.js 18+
- Python 3.10+
- npm 9+
- Supabase project

## Quick Start

### Option 1: Mock Mode (Frontend Only)

No backend or API keys required.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

### Option 2: Full Stack

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt

# Set backend URL in root .env:
# VITE_FASTAPI_URL=http://localhost:8000

# Start backend
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
npm install
npm run dev
```

### Option 3: Docker Compose

```bash
docker-compose up --build
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:8000`
API docs: `http://localhost:8000/docs`

## Environment Variables

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional — AI mode (Groq free tier)
OPENAI_API_KEY=gsk_your_groq_key
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_MODEL=llama-3.3-70b-versatile

APP_ENV=development
CORS_ORIGINS=http://localhost:5173
PORT=8000
LOG_LEVEL=INFO
```

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_FASTAPI_URL=http://localhost:8000
```

### Mobile (`mobile/.env`)

```env
EXPO_PUBLIC_FASTAPI_URL=http://localhost:8000
```

## Project Structure

```
.
├── src/                    # React frontend
├── backend/
│   ├── main.py             # FastAPI entrypoint
│   ├── langgraph_agent.py  # LangGraph orchestration
│   ├── models.py           # Pydantic models
│   ├── supabase_client.py  # Supabase client
│   ├── requirements.txt
│   └── Dockerfile
├── mobile/                 # Expo React Native app
├── supabase/
│   └── migrations/         # Database migrations
├── package.json
├── vite.config.ts
└── docker-compose.yml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Send a message, get AI response |
| GET | `/plugins?user_id={uid}` | List available plugins |
| POST | `/plugins/{name}/toggle` | Enable/disable a plugin |
| GET | `/health` | Health check |

## Supabase Configuration

1. Create a Supabase project
2. Enable Anonymous Sign-Ins in Auth settings
3. Apply migrations from `supabase/migrations/`
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in backend `.env`

Key tables: `users`, `user_plugins`, `scheduled_events`, `chat_history`, `tasks`, `calendar_events`

## Running Tests

```bash
cd backend
python run_smoke_test.py
pytest backend/tests/ -v
```

## Build for Production

```bash
npm run build   # outputs to dist/
```

## License

MIT
