### Adding a new plugin

1. Add a function in `langgraph_agent.py` (e.g., `_execute_music_plugin`)
2. Add the intent to `classify_intent()` keywords
3. Wire it in `execute_plugins()` and `generate_reply()`
4. Add it to the default plugin list in `main.py`
5. Add the plugin toggle in `main.py` (optional)

### Enabling AI-powered classification

By default the agent uses **rule-based keyword matching**. To use LangGraph + OpenAI:

1. Set `OPENAI_API_KEY` in your environment
2. Keep `USE_LANGGRAPH=true` (default)
3. The agent will now use LLM-powered intent classification

## Persistence

The backend uses the **Supabase service role** to:

- Read/write `chat_history` — conversation persistence
- Read `tasks` — fetch user to-dos
- Write `scheduled_events` — persist alarms for the Edge Function cron
- Read/write `user_plugins` — per-user plugin toggles

All operations are best-effort — if Supabase is unavailable, the agent falls back to mock data so the demo never breaks.