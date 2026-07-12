# LifeOS Agent — Slide Deck

Theme: Dark background, white text, accent color: indigo/purple + gold
Font: Inter or SF Pro Display, 24pt minimum for readability
Include one screenshot per feature slide.

---

## Slide 1: Title

**LifeOS Agent**
Your Personal AI Life Assistant

[Subtitle]
AMD Developer Hackathon: ACT II — Unicorn Track

[Footer]
Team: [Your Name / Team Name]
Date: July 2026

---

## Slide 2: The Problem

**Heading:** Fragmented daily life management

**Bullets:**
- Alarms, tasks, weather, calendar, and learning scattered across 5+ apps
- No unified view of daily priorities
- Switching apps breaks workflow and wastes time
- No proactive assistant that remembers your routine

**Visual:** Simple illustration or screenshot of multiple app icons

---

## Slide 3: The Solution

**Heading:** One chat. All your life.

**Screenshot:** LifeOS Agent chat UI running in browser

**Bullets:**
- Natural language chat interface
- 6 swappable plugins: Alarm, Tasks, Weather, Calendar, Learning, Schedule
- Persistent conversation memory
- Per-user plugin customization
- Proactive morning briefings

---

## Slide 4: Key Features

**Heading:** What LifeOS can do

**Two-column layout:**

| Left column | Right column |
|------------|-------------|
| Alarm & Morning Briefing | Task Management |
| Weather Forecast | Calendar Events |
| English-Nepali Learning | Daily Quotes & Music |
| Scheduled Reminders | Plugin Toggles |
| Conversation Memory | Mock Mode (no backend) |

**Footer:** "All features accessible through a single chat interface"

---

## Slide 5: Tech Stack

**Heading:** Built for the cloud, designed for scale

**Visual:** Tech logos arranged in layers

**Bullets:**
- **Frontend:** React 18, Vite 7, TypeScript, Tailwind CSS 4
- **Backend:** FastAPI, Python 3.12, Uvicorn
- **Database:** Supabase (PostgreSQL + Auth + Realtime)
- **AI:** Groq Cloud (LangGraph orchestration, rule-based fallback)
- **Mobile:** Expo / React Native
- **Deployment:** Docker, Docker Compose, Nginx

---

## Slide 6: Architecture & Data Flow

**Heading:** How it works

**Diagram (text-based):**

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
     ┌──────────▼──────────┐   ┌─────────▼──────────┐
     │  Chat UI (React)    │   │  Mobile App        │
     │  Vite + TypeScript  │   │  Expo / React Nat  │
     └──────────┬──────────┘   └─────────┬──────────┘
                │                        │
                └────────────┬───────────┘
                             │ HTTP / WS
                    ┌────────▼────────┐
                    │  FastAPI Backend │
                    │  Python 3.12     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼─────┐ ┌─────▼──────────┐
     │ LangGraph     │ │ Plugins  │ │ Supabase       │
     │ Orchestrator  │ │ 1-6      │ │ Auth + DB      │
     └───────────────┘ └──────────┘ │ Realtime       │
                                     │ Edge Functions │
                                     └────────────────┘
```

**Three operating modes:**

| Mode | Backend | AI | Use case |
|------|---------|----|----------|
| Mock | Off | Off | UI dev, demos, no setup |
| Rule-based | On | Off | No API key needed, instant |
| AI Live | On | Groq/OpenAI | Full LangGraph + LLM |

---

## Slide 7: Plugin System

**Heading:** Modular by design

**Diagram:**

```
User Message
     │
     ▼
Intent Classifier (rule-based or LLM)
     │
     ├─► Alarm Plugin       ─► scheduled_events table
     ├─► Tasks Plugin       ─► tasks table
     ├─► Weather Plugin     ─► chat_history metadata cache
     ├─► Calendar Plugin    ─► calendar_events table
     ├─► Learning Plugin    ─► demo data / LLM
     ├─► Schedule Plugin    ─► scheduled_events table
     │
     ▼
Reply + Structured Data Cards
```

**Bullets:**
- Each plugin has a manifest (`name`, `description`, `enabled`)
- User plugin state stored in `user_plugins` table
- Toggle any plugin on/off via sidebar
- Adding a new plugin: backend intent + execution + frontend card

---

## Slide 8: Proactive Morning Routine Flow

**Heading:** From alarm to briefing — fully automated

**Flow diagram:**

```
User: "Wake me at 7am"
  │
  ▼
Agent: ✅ Alarm set for 7:00 AM!
  │
  ├─► Save to scheduled_events
  ├─► Show AlarmCard (pending)
  └─► Start client-side timer (~8s demo)
        │
        ▼ (alarm fires)
  Browser Notification: ⏰ Morning Alarm
        │
        ▼
  Agent: 🌅 Good morning! Here's your briefing:
    • 🌤 22°C, partly cloudy in San Francisco
    • 📋 3 tasks remaining, 1 done
    • 💡 Daily quote
        │
        ▼
  Confetti celebration + proactive badge
```

**Bullets:**
- Server-side: Supabase Cron + Edge Function → Realtime → frontend
- Client-side: `setTimeout` simulation for mock/demo mode
- Browser Notifications API for desktop alerts
- Confetti animation on morning routine trigger

---

## Slide 9: Demo

**Heading:** See it in action

**Screenshots (3–4):**
1. Chat view with alarm card + weather card
2. Task list in Routine sidebar
3. Schedule compound routine (quotes + vocab + gym)
4. Mobile app on phone

**Bullets:**
- Set alarms: "Wake me at 7am"
- Manage tasks: "Add task: Buy groceries"
- Check weather: "What's the weather?"
- Schedule routines: "At 11am give me 2 quotes, at 12pm learn 5 words"
- Learn: "Teach me Nepali vocabulary"

---

## Slide 10: Roadmap — Future Features

**Heading:** What's next

**Near-term (1–2 months):**

| Feature | Description |
|---------|-------------|
| Voice Input/Output | Whisper STT + TTS for hands-free interaction |
| More Plugins | Notes, Habits, Finance tracker, Medicine reminders |
| Smart Suggestions | AI-powered daily recommendations based on patterns |
| Calendar Sync | Google Calendar / Outlook two-way sync |
| Location-aware Weather | Browser Geolocation API for accurate forecasts |
| Dark/Light Theme | Full theme system with user preference |
| Mobile Push Notifications | Expo push notifications for alarms on iOS/Android |

**Medium-term (3–6 months):**

| Feature | Description |
|---------|-------------|
| Local LLM | AMD ROCm + Llama for offline, private inference |
| Plugin Marketplace | Community-driven plugin registry and loader |
| Multi-user Households | Shared calendars, family task lists |
| Email Integration | Read and summarize emails via IMAP |
| RAG Memory | Long-term user preference memory with vector search |
| Workspace Integrations | Slack, Discord, WhatsApp bot interfaces |

**Long-term (6+ months):**

| Feature | Description |
|---------|-------------|
| Fine-tuned Router | Custom model for intent classification |
| Agent-to-Agent | LifeOS communicates with other AI agents |
| Wearable Sync | Smart watch alarms and health data |
| Smart Home | IoT integration (lights, thermostat, locks) |

---

## Slide 11: Thank You

**Heading:** Thank You

**Large text:**
LifeOS Agent — Open Source

**Links:**
- GitHub: github.com/[your-username]/lifeos-agent
- Demo: [your-app-url]

**Footer text:**
Built for AMD Developer Hackathon: ACT II
Powered by Groq Cloud + AMD Developer Cloud

---

## Speaker Notes

- Slide 1: Introduce yourself and the project name.
- Slide 2: Emphasize the pain point of app switching.
- Slide 3: Emphasize the simplicity of "just chat."
- Slide 4: Highlight that plugins are per-user and toggleable.
- Slide 5: Mention that the stack is all open source and cloud-native.
- Slide 6: Explain the three modes — mock for development, rule-based for zero-cost, AI for best experience.
- Slide 7: Show how adding a plugin touches all three layers (backend intent, plugin, frontend card).
- Slide 8: Walk through the full alarm → notification → briefing flow. Mention both server-side (Realtime) and client-side (setTimeout) paths.
- Slide 9: Plan to show live demo during presentation if possible, else use screenshots.
- Slide 10: Show vision beyond the hackathon — this is a product platform, not a one-off project.
- Slide 11: Invite judges to explore the live demo and repository.

---

## Export Notes

- Export from Google Slides or PowerPoint at 16:9 ratio.
- File size should be under 10 MB.
- Use Inter font for all text.
- Dark background: `#0f0f1a` or similar.
- Primary accent: `#6366f1` (indigo).
- Secondary accent: `#f59e0b` (amber/gold).
