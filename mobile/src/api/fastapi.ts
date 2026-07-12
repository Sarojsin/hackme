import type { ChatResponse, PluginListResponse, PluginToggleResponse } from '../types';

const FASTAPI_URL = process.env.EXPO_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1
): Promise<T> {
  const url = `${FASTAPI_URL}${endpoint}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new ApiError(`FastAPI returned ${response.status}: ${errorBody}`, response.status);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        throw err;
      }
      if (attempt === retries) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(`Failed to reach FastAPI backend at ${url}`, 0);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new ApiError('Unreachable', 0);
}

export async function sendMessage(
  message: string,
  userId: string,
  token?: string
): Promise<ChatResponse> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, user_id: userId }),
    headers,
  });
}

export async function getPlugins(
  userId: string,
  token?: string
): Promise<PluginListResponse> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<PluginListResponse>(`/plugins?user_id=${encodeURIComponent(userId)}`, {
    headers,
  });
}

export async function togglePlugin(
  name: string,
  enabled: boolean,
  userId: string,
  token?: string
): Promise<PluginToggleResponse> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<PluginToggleResponse>(`/plugins/${encodeURIComponent(name)}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, enabled }),
    headers,
  });
}
