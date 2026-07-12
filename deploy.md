# LifeOS — Render Deployment Guide

## Database

You **do not** need to create a database on Render.
This project uses **Supabase** for auth and data storage.
Provision your Supabase project and grab the following values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Also make sure your Supabase tables are created (see `supabase/migrations/` if any).

## Deploy Backend (render.yaml)

1. Push this repo to GitHub (already done at `https://github.com/Sarojsin/hackme.git`).
2. In Render Dashboard, go to **New + → Blueprint**.
3. Connect repo `Sarojsin/hackme`.
4. Render will detect `render.yaml` and create the `lifeos-backend` web service.
5. Set secrets when prompted:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
6. Deploy. Verify at `https://lifeos-backend.onrender.com/health`.

## Deploy Frontend (React static)

Render Blueprints do **not** support static sites, so deploy the frontend manually:

1. In Render, go to **New + → Static Site**.
2. Connect repo `Sarojsin/hackme`.
3. Settings:
   - Name: `lifeos-frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
4. Add Environment Variables:
   - `VITE_FASTAPI_URL` = `https://lifeos-backend.onrender.com`
5. Deploy.

## Post-deploy

1. Update backend `CORS_ORIGINS` in `render.yaml` to your actual frontend URL: `https://lifeos-frontend.onrender.com`.
2. Redeploy backend via Render Dashboard.

<render-platform>
Render free tier notes:
- Services spin down after inactivity and cold-start on first request.
- Do not commit secrets to git; always set them in Render Dashboard.
</render-platform>
