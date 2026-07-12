# LifeOS — Render Deployment Guide

## Database

You **do not** need to create a database on Render.
This project uses **Supabase** for auth and data storage.
Provision your Supabase project and grab the following values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Also make sure your Supabase tables are created (see `supabase/migrations/` if any).

## Deploy Backend

1. Push this repo to GitHub.
2. In Render, go to **New + → Web Service**.
3. Connect the repo `Sarojsin/hackme`.
4. Set:
   - Runtime: **Docker**
   - Dockerfile path: `backend/Dockerfile`
   - Plan: **Free** (or Starter)
5. Add Environment Variables:
   - `SUPABASE_URL` — your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
   - `OPENAI_API_KEY` — your Groq/OpenAI API key
   - (Optional) `OPENAI_BASE_URL`, `OPENAI_MODEL`, `CORS_ORIGINS`
   after the frontend URL is known.
6. Deploy. Verify at `https://<service-name>.onrender.com/health`.

## Deploy Frontend (React static)

1. In Render, go to **New + → Static Site**.
2. Connect the repo `Sarojsin/hackme`.
3. Set:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Add Environment Variables:
   - `VITE_FASTAPI_URL` — `https://<backend-service-name>.onrender.com`
5. Once deployed, update backend `CORS_ORIGINS` to include the static site URL.
6. Redeploy backend.

<render-platform>
Render free tier notes:
- Services spin down after inactivity and cold-start on first request.
- Static sites do not support server-side code.
- Do not commit secrets to git; always set them in Render Dashboard.
</render-platform>
