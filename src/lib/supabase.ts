// Supabase-free mode — all data flows through the backend API only.

export async function getSessionToken(): Promise<string | null> {
  return null;
}

export async function ensureSignedIn(): Promise<string> {
  return 'dev-user';
}

export function subscribeToScheduledEvents(
  _userId: string,
  _onEvent: (event: any) => void
) {
  return { unsubscribe: () => {} };
}

export function subscribeToChatHistory(
  _userId: string,
  _onMessage: (message: any) => void
) {
  return { unsubscribe: () => {} };
}
