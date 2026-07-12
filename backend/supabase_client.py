"""
Supabase admin client for the LifeOS Agent backend.

Uses the service_role key (never exposed to the frontend) so the backend
can read/write all tables and verify auth tokens.

Environment variables (set these in your deployment):
  SUPABASE_URL                   — Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY      — Supabase service_role key (secret!)
"""
import asyncio
import os
from supabase import create_client, Client

_supabase: Client | None = None


def get_supabase() -> Client:
    """Get the singleton Supabase admin client.

    Uses the service_role key for full access to all tables.
    Falls back to a mock client if env vars are not set (dev mode).
    """
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        if not url or not key:
            # Dev mode — return a stub that outputs clear warnings
            import warnings
            warnings.warn(
                "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. "
                "The backend will use mock data instead of real Supabase."
            )
            return None  # Callers handle None gracefully

        _supabase = create_client(url, key)
    return _supabase


def get_supabase_sync() -> Client | None:
    """Synchronous accessor for the Supabase client (for use in sync contexts).

    Returns None if Supabase is not configured, letting callers degrade gracefully.
    """
    return get_supabase()


async def verify_token(access_token: str) -> dict | None:
    """Verify a Supabase JWT and return the user dict, or None if invalid."""
    sb = get_supabase()
    if sb is None:
        return None

    try:
        # sb.auth.get_user() is a sync HTTP call — run in thread to avoid
        # blocking the async event loop.
        user = await asyncio.to_thread(sb.auth.get_user, access_token)
        return user.user.model_dump() if hasattr(user, "user") and user.user else None
    except Exception as e:
        import logging
        logging.getLogger("lifeos-backend").warning("Token verification failed: %s", e)
        return None


async def get_user_id_from_token(access_token: str) -> str | None:
    """Extract the verified Supabase user ID from a JWT access token."""
    user = await verify_token(access_token)
    return user.get("id") if user else None