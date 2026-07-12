Let me break it down clearly from what's already in the project.

### AI / API Tokens Used

**1. Supabase (required)**

| Token | Where | Purpose |
|--------|-------|---------|
| VITE_SUPABASE_URL | Frontend .env | Connects the UI to your Supabase project |
| VITE_SUPABASE_ANON_KEY | Frontend .env | Public anon key for client-side Supabase access |
| SUPABASE_SERVICE_ROLE_KEY | Backend .env | Server-side key that bypasses RLS (keep secret!) |

These handle auth, database, realtime subscriptions, and Edge Functions.

**2. OpenAI (optional)**

| Token | Where | Purpose |
|--------|-------|---------|
| OPENAI_API_KEY | Backend .env | Powers AI-driven intent classification via LangGraph |

If you don't set it, the agent falls back to rule-based keyword matching — no AI costs, works offline.

**3. No other APIs**

The weather data is demo/mock data — it doesn't call a real weather API. Same for alarm scheduling and calendar events — they store to Supabase but don't use external services.

### How It Performs — Three Modes

| Mode | What's needed | How it works |
|------|---------------|--------------|
| Mock (default) | Nothing — just `npm install && npm run dev` | Your browser generates all responses client-side with demo data. No backend, no API keys. |
| Rule-based | Backend running + Supabase keys | The FastAPI backend uses regex keyword matching to classify intents (e.g., "alarm" → alarm plugin). No AI cost. Fast and predictable. |
| AI-driven | Backend + OPENAI_API_KEY | LangGraph uses OpenAI's GPT to classify intent more intelligently — handles ambiguous phrasing better. |

**What this looks like in practice:**

```bash
# You say: "Wake me up at 7am"
# Rule-based mode → regex matches "wake" + "7am" → alarm plugin ✅
# AI mode → LLM understands intent → alarm plugin ✅

# You say: "Make sure I'm up before the sun tomorrow"
# Rule-based mode → no keywords match → generic response ❌
# AI mode → understands the intent → alarm plugin ✅
```

For most demo/development purposes, Mock mode is all you need. The full AI mode is only worth setting up if you want to test natural language flexibility.

Regarding the "System LLM key not configured" error you saw — that's a platform-level message, not something missing from your project code. Want me to dig into that next?
