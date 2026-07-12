# LifeOS Agent — Video Script

Total length: ~3 minutes
Tone: confident, clear, product-focused
Use OBS / Game Bar to capture screen at 1080p or higher.

---

## [0:00–0:20] HOOK

**VISUAL:** LifeOS Agent logo on black background, then cut to live app running in browser.

**AUDIO:**
"Meet LifeOS Agent — your personal AI assistant that lives in the cloud and manages your day through simple conversation."

---

## [0:20–0:50] THE PROBLEM

**VISUAL:** Show fragmented apps — alarm clock, notes app, weather widget, calendar app, flashcard app. Use browser tabs or Alt+Tab.

**AUDIO:**
"We all juggle alarms, to-do lists, weather, calendar events, and learning goals across a dozen different apps. LifeOS Agent brings them all together in one chat interface."

---

## [0:50–1:30] THE DEMO

**VISUAL:** Show the LifeOS Agent chat UI. Type and send messages.

1. Type: "What are my tasks today?"
   → Agent responds asking for todo list, then shows tasks.
2. Type: "Set an alarm for 7am"
   → Agent confirms alarm with structured card.
3. Type: "What's the weather?"
   → Agent shows weather card.
4. Type: "Give me a quote"
   → Agent responds with a quote from learning plugin.

**AUDIO:**
"Users just chat naturally. The agent understands what they mean, runs the right plugin, and returns results as rich cards. Everything syncs to Supabase, so conversation history persists across sessions."

---

## [1:30–1:55] TECH STACK

**VISUAL:** Split screen or overlay showing logos: React, Vite, TypeScript, Tailwind, FastAPI, Python, Supabase, LangGraph, Expo.

**AUDIO:**
"The frontend is React with Vite and Tailwind. The backend is FastAPI with LangGraph orchestration. Supabase handles auth, database, and realtime. The AI layer uses Groq Cloud for intelligent intent classification, with a rule-based fallback so the app works offline without any API keys. There's also an Expo mobile app for iOS and Android."

---

## [1:55–2:20] WHAT MAKES IT UNIQUE

**VISUAL:** Show plugin sidebar toggle in the app. Show the mobile app. Show the three-mode architecture diagram from README.

**AUDIO:**
"What sets LifeOS apart is the plugin architecture with per-user customization, the three-mode flexibility — mock, rule-based, or full AI — and the cross-platform design with a web app and mobile companion. It's built to work everywhere, even without an internet connection."

---

## [2:20–2:40] AMD CLOUD READY

**VISUAL:** Show the Docker Compose file and backend Dockerfile.

**AUDIO:**
"For deployment, the entire stack is containerized with Docker Compose. The backend runs on any cloud infrastructure and can connect to Groq Cloud for AI mode or operate fully offline in rule-based mode."

---

## [2:40–3:00] CALL TO ACTION

**VISUAL:** LifeOS Agent chat UI again, then GitHub repo URL on screen.

**AUDIO:**
"LifeOS Agent is open source and ready to extend. Check the GitHub repo to run it locally or deploy your own instance. Thanks for watching."

---

## Recording Tips

- Use 16:9 resolution (1920x1080 minimum)
- Record at 30fps
- Mute notifications before recording
- Enlarge browser font to 125% for readability
- Show at least one plugin being toggled on/off in sidebar
