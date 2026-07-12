import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});

export async function getSessionToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// ─── Anonymous sign-in (auto-auth for demo) ─────────────
export async function ensureSignedIn(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    return session.user.id;
  }

  // Sign in anonymously for the demo experience
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn('Anonymous sign-in failed, using fallback:', error.message);
    return 'dev-user';
  }

  return data.user!.id;
}

// ─── Realtime helpers ───────────────────────────────────
export function subscribeToScheduledEvents(
  userId: string,
  onEvent: (event: any) => void
) {
  return supabase
    .channel(`scheduled-events-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'scheduled_events',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onEvent(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scheduled_events',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onEvent(payload.new)
    )
    .subscribe();
}

export function subscribeToChatHistory(
  userId: string,
  onMessage: (message: any) => void
) {
  return supabase
    .channel(`chat-history-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_history',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
}