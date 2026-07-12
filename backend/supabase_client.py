# No database — all operations use in-memory storage.
# This avoids dependency on Supabase or any external database.

def get_supabase():
    """Always returns None — all callers handle this gracefully with in-memory fallbacks."""
    return None


get_supabase_sync = get_supabase


async def verify_token(_access_token: str) -> dict | None:
    return None

async def get_user_id_from_token(_access_token: str) -> str | None:
    return None