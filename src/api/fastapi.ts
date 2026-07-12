import type {
  ChatResponse,
  PluginListResponse,
  PluginToggleResponse,
  Task,
  ScheduleInfo,
} from '../types';

// ─── Configuration ──────────────────────────────────────
const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL as string | undefined;
const IS_MOCK_MODE = !FASTAPI_URL;

// ─── Mock data for standalone demo mode ──────────────────
const MOCK_PLUGINS: PluginListResponse = {
  plugins: [
    { name: 'alarm', description: 'Set, list, and cancel alarms', enabled: true },
    { name: 'tasks', description: 'Manage your daily tasks and to-dos', enabled: true },
    { name: 'weather', description: 'Get weather forecasts for your location', enabled: true },
    { name: 'calendar', description: 'Create and list calendar events', enabled: true },
    { name: 'learning', description: 'Learn English-Nepali vocabulary, daily quotes, and music', enabled: true },
    { name: 'schedule', description: 'Schedule reminders and timed actions', enabled: true },
  ],
};

// ─── Generic fetch wrapper with auto-retry ──────────────
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
          ...options.headers,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(60_000), // 60s timeout (Render cold start)
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new ApiError(
          `FastAPI returned ${response.status}: ${errorBody}`,
          response.status
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) {
        // Don't retry 4xx client errors — they won't succeed on retry
        if (err.status >= 400 && err.status < 500) throw err;
      }

      // Last attempt — throw
      if (attempt === retries) {
        if (err instanceof ApiError) throw err;
        if (err instanceof DOMException && err.name === 'TimeoutError') {
          throw new ApiError('Request timed out after 10s', 408);
        }
        throw new ApiError(
          `Failed to reach FastAPI backend at ${url}: ${(err as Error).message}`,
          0
        );
      }

      // Wait 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  throw new ApiError('Unreachable', 0);
}

// ─── Custom error class ─────────────────────────────────
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Chat ───────────────────────────────────────────────
export async function sendMessage(
  message: string,
  userId: string,
  token?: string
): Promise<ChatResponse> {
  if (IS_MOCK_MODE) {
    return getMockChatResponse(message, userId);
  }

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

// ─── Plugins ────────────────────────────────────────────
export async function getPlugins(
  userId: string,
  token?: string
): Promise<PluginListResponse> {
  if (IS_MOCK_MODE) {
    return MOCK_PLUGINS;
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<PluginListResponse>(
    `/plugins?user_id=${encodeURIComponent(userId)}`,
    { headers }
  );
}

export async function togglePlugin(
  pluginName: string,
  userId: string,
  enabled: boolean,
  token?: string
): Promise<PluginToggleResponse> {
  if (IS_MOCK_MODE) {
    return { name: pluginName, enabled };
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<PluginToggleResponse>(`/plugins/${pluginName}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, enabled }),
    headers,
  });
}

// ─── Tasks ────────────────────────────────────────────────
export async function getTasks(userId: string, token?: string): Promise<Task[]> {
  if (IS_MOCK_MODE) {
    return [];
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<Task[]>(`/tasks?user_id=${encodeURIComponent(userId)}`, { headers });
}

export async function createTask(
  userId: string,
  title: string,
  token?: string,
  due_date?: string,
): Promise<Task> {
  if (IS_MOCK_MODE) {
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      title,
      due_date: due_date || new Date().toISOString().split('T')[0],
      completed: false,
      created_at: new Date().toISOString(),
    };
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title, due_date }),
    headers,
  });
}

export async function updateTask(
  taskId: string,
  userId: string,
  updates: { title?: string; completed?: boolean; due_date?: string },
  token?: string,
): Promise<Task> {
  if (IS_MOCK_MODE) {
    return {
      id: taskId,
      user_id: userId,
      title: updates.title || 'Updated Task',
      due_date: updates.due_date,
      completed: updates.completed || false,
      created_at: new Date().toISOString(),
    };
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<Task>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers,
  });
}

export async function deleteTask(taskId: string, _userId: string, token?: string): Promise<{ ok: boolean }> {
  if (IS_MOCK_MODE) {
    return { ok: true };
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<{ ok: boolean }>(`/tasks/${taskId}`, {
    method: 'DELETE',
    headers,
  });
}

// ─── Schedules ────────────────────────────────────────────
export async function createSchedules(
  _userId: string,
  items: ScheduleInfo[],
  token?: string,
): Promise<ScheduleInfo[]> {
  if (IS_MOCK_MODE) {
    return items.map((s) => ({
      ...s,
      id: s.id || crypto.randomUUID(),
      status: 'pending',
    }));
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const results: ScheduleInfo[] = [];
  for (const item of items) {
    const res = await apiFetch<ScheduleInfo>('/schedules', {
      method: 'POST',
      body: JSON.stringify({
        trigger_time: item.trigger_time,
        action_type: item.action_type,
        action_desc: item.action_desc,
        payload: item.payload || {},
      }),
      headers,
    });
    results.push(res);
  }
  return results;
}

export async function getSchedules(userId: string, token?: string): Promise<ScheduleInfo[]> {
  if (IS_MOCK_MODE) {
    return [];
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<ScheduleInfo[]>(`/schedules?user_id=${encodeURIComponent(userId)}`, { headers });
}

export async function getDueSchedules(userId: string, token?: string): Promise<ScheduleInfo[]> {
  if (IS_MOCK_MODE) {
    return [];
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<ScheduleInfo[]>(`/schedules/due?user_id=${encodeURIComponent(userId)}`, { headers });
}

export async function updateScheduleStatus(
  scheduleId: string,
  status: 'completed' | 'cancelled',
  token?: string,
): Promise<ScheduleInfo> {
  if (IS_MOCK_MODE) {
    return { id: scheduleId, trigger_time: '', action_type: 'reminder', status };
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<ScheduleInfo>(`/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers,
  });
}

export interface ScheduleActionResponse {
  action_type: string;
  items?: any[];
  message?: string;
  label?: string;
  weather?: any;
}

export async function executeScheduleAction(
  scheduleId: string,
  token?: string,
): Promise<ScheduleActionResponse> {
  if (IS_MOCK_MODE) {
    return { action_type: 'reminder', message: 'Scheduled action' };
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<ScheduleActionResponse>(`/schedules/${scheduleId}/action`, {
    method: 'POST',
    headers,
  });
}

export async function executeWeatherNow(
  city: string,
  token?: string,
): Promise<any> {
  if (IS_MOCK_MODE) {
    return {
      temperature: 24,
      condition: 'partly_cloudy',
      high: 30,
      low: 20,
      humidity: 65,
      city,
    };
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return apiFetch<any>('/weather/now', {
    method: 'POST',
    body: JSON.stringify({ city }),
    headers,
  });
}

// ─── Mock responses (standalone demo mode) ──────────────
function getMockChatResponse(message: string, currentUserId?: string): ChatResponse {
  const userId = currentUserId ?? 'mock-user';
  const lower = message.toLowerCase();

  // Simulate alarm setting
  if (lower.includes('alarm') || lower.includes('wake') || lower.includes('wake up')) {
    const timeMatch = message.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!timeMatch) {
      return {
        reply: "I'd like to help! What time would you like the alarm set? (e.g., **7:00 AM** or **06:30**)",
      };
    }
    return {
      reply: `✅ Alarm set for **${timeMatch[0]}**! I'll wake you up with a morning briefing including your tasks and today's weather.`,
      data: {
        alarm: { id: crypto.randomUUID(), time: timeMatch[0], label: 'morning routine', status: 'pending' },
      },
    };
  }

  // Simulate weather query
  if (lower.includes('weather')) {
    return {
      reply: 'Here\'s your weather for today:',
      data: {
        weather: {
          temperature: 22,
          condition: 'partly_cloudy',
          high: 26,
          low: 18,
          humidity: 55,
          city: 'San Francisco',
        },
      },
    };
  }

  // Simulate tasks query
  if (lower.includes('task') || lower.includes('todo') || lower.includes('schedule')) {
    // Check if user is trying to add a task
    const taskMatch = message.match(/(?:add|create|new)\s+task[:\s]+(.+)/i) ||
                      message.match(/remind me to\s+(.+?)(?:\s+at\s|\s+for\s|\s+on\s|$)/i) ||
                      message.match(/need to\s+(.+?)(?:\s+at\s|\s+for\s|\s+on\s|$)/i);

    if (taskMatch) {
      const title = taskMatch[1].trim();
      return {
        reply: `✅ Task added: **${title}**`,
        data: {
          tasks: [
            {
              id: crypto.randomUUID(),
              user_id: userId,
              title,
              due_date: new Date().toISOString().split('T')[0],
              completed: false,
            },
          ],
        },
      };
    }

    return {
      reply: `📝 What is your todo list for today?

Tell me what you need to do, for example:
• "Add task: Buy groceries"
• "Remind me to finish the report"
• "Need to call the dentist"`,
      data: { tasks: [] },
    };
  }

  // Simulate calendar event creation
  if (lower.includes('calendar') || lower.includes('event') || lower.includes('meeting') || lower.includes('appointment')) {
    const timeMatch = message.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    const titleMatch = message.match(/(?:called|named|titled|for)\s+["""]?([^""""\d,]+?)(?:\s+(?:at|on|tomorrow|today))?(?:\s+\d)/i)
      || message.match(/(?:add|create|schedule|set up)\s+(?:an?\s+)?(?:event|meeting|appointment)\s+["""]?([^""""\d,]+?)(?:\s+(?:at|on|tomorrow|today))?(?:\s+\d)/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled Event';
    if (!timeMatch) {
      return {
        reply: `Sure! What time would you like the event **"${title}"**? (e.g., **3:00 PM** or **14:30**)`,
      };
    }
    return {
      reply: `✅ Calendar event created!\n\n📅 **${title}** at **${timeMatch[0]}**\n\nI've added it to your calendar. Use the calendar plugin to view all your events.`,
      data: {
        events: [
          {
            id: crypto.randomUUID(),
            title,
            start_time: timeMatch[0],
            description: 'Created via LifeOS chat',
            all_day: false,
          },
        ],
      },
    };
  }

  // Simulate schedule/reminder — supports compound routines
  if (
    lower.includes('remind') ||
    lower.includes('schedule') ||
    lower.includes('wake') ||
    lower.includes('alarm') ||
    (lower.includes('at ') && /\d/.test(message)) ||
    lower.includes('routine')
  ) {
    const timeRegex = /(\d{1,2})\s*:?\s*(\d{2})?\s*(am|pm)?/gi;
    const times = [...message.matchAll(timeRegex)];
    const actionKeywords: Record<string, string> = {
      alarm: 'alarm', wake: 'alarm', 'wake up': 'alarm',
      quote: 'quote', quotes: 'quote', inspiration: 'quote', motivation: 'quote',
      learn: 'learning', vocab: 'learning', vocabulary: 'learning', 'english-nepali': 'learning',
      gym: 'gym', exercise: 'gym', workout: 'gym',
      task: 'task', todo: 'task',
      reminder: 'reminder',
    };

    const parseTime = (match: RegExpMatchArray): string => {
      const hour = parseInt(match[1], 10);
      const minute = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3]?.toLowerCase();
      let h = hour;
      if (meridiem === 'pm' && h !== 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(minute)}`;
    };

    const actionEmojis: Record<string, string> = {
      alarm: '⏰', quote: '💡', music: '🎵', learning: '📚', gym: '💪', task: '📋', reminder: '🔔',
    };

    const scheduleEntries = times.map((m) => {
      const mIndex = times.indexOf(m);
      const nextTime = times[mIndex + 1];
      const chunkStart = message.toLowerCase().indexOf(m[0]);
      const chunkEnd = nextTime ? message.toLowerCase().indexOf(nextTime[0]) : message.length;
      const chunk = message.slice(chunkStart, chunkEnd);
      const lowerChunk = chunk.toLowerCase();

      let action_type = 'reminder';
      let action_desc = chunk.trim();
      const payload: Record<string, any> = {};

      for (const [key, val] of Object.entries(actionKeywords)) {
        if (lowerChunk.includes(key)) {
          action_type = val;
          break;
        }
      }

      const countMatch = chunk.match(/(\d+)\s+(?:quote|quotes|vocab|words?|tasks?)/i);
      if (countMatch) {
        payload.count = parseInt(countMatch[1], 10);
        action_desc = `${countMatch[1]} ${action_type}(s)`;
      } else if (action_type === 'alarm') {
        action_desc = 'Wake up';
      } else if (action_type === 'gym') {
        action_desc = 'Go to gym';
      } else if (action_type === 'task') {
        action_desc = action_desc.replace(/^task\s*:?\s*/i, '').trim() || 'Task';
      }

      return {
        id: crypto.randomUUID(),
        trigger_time: parseTime(m),
        action_type: action_type as ScheduleInfo['action_type'],
        action_desc,
        payload,
        status: 'pending' as const,
      };
    });

    if (scheduleEntries.length > 0) {
      const reply = scheduleEntries
        .map((s) => `${actionEmojis[s.action_type] || '🔔'} Scheduled: **${s.action_desc}** at **${new Date(s.trigger_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**`)
        .join('\n');
      return {
        reply,
        data: { schedules: scheduleEntries },
      };
    }
  }

  // Simulate learning queries
  if (lower.includes('learn') || lower.includes('vocabulary') || lower.includes('vocab') || lower.includes('teach me') || lower.includes('word') || lower.includes('phrase') || lower.includes('शब्द') || lower.includes('शब्दावली') || lower.includes('food') || lower.includes('animal') || lower.includes('greeting') || lower.includes('body') || lower.includes('number') || lower.includes('color') || lower.includes('family') || lower.includes('travel')) {
    const words = [
      { english: 'Apple', nepali: 'स्याउ (Sya-u)', pronunciation: 'Sya-u', category: 'food' },
      { english: 'Water', nepali: 'पानी (Pa-nee)', pronunciation: 'Pa-nee', category: 'food' },
      { english: 'Friend', nepali: 'साथी (Sa-thee)', pronunciation: 'Sa-thee', category: 'people' },
      { english: 'Sun', nepali: 'सूरज (Soo-raz)', pronunciation: 'Soo-raz', category: 'nature' },
      { english: 'Thank you', nepali: 'धन्यबाद (Dhan-ya-baad)', pronunciation: 'Dhan-ya-baad', category: 'phrases' },
    ];
    const reply = '📚 **Today\'s English → Nepali vocabulary:**\n\n' + words.map((w, i) => `${i+1}. **${w.english}** → ${w.nepali} (${w.pronunciation}) — *${w.category}*`).join('\n') + '\n\nTry using these words today! Want me to quiz you?';
    return { reply, data: { learning: { vocabulary: words, language: 'english-nepali' } } };
  }

  if (lower.includes('quote') || lower.includes('quotes') || lower.includes('inspiration') || lower.includes('motivation') || lower.includes('उद्धरण') || lower.includes('प्रेरणा')) {
    const quote = { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', language: 'english' };
    const reply = `💡 **Daily Quote:**\n\n> *"${quote.text}"*\n\n— **${quote.author}**`;
    return { reply, data: { learning: { quote } } };
  }

  if (lower.includes('music') || lower.includes('song') || lower.includes('play music') || lower.includes('संगीत') || lower.includes('गीत')) {
    const songs = [
      { title: 'Resham Firiri', artist: 'Nepali Folk', genre: 'folk', mood: 'uplifting', duration: '4:32' },
      { title: 'Kaligandaki', artist: 'Narayan Gopal', genre: 'classical', mood: 'peaceful', duration: '5:15' },
      { title: 'Paanch ko Bato', artist: '1974 AD', genre: 'rock', mood: 'energetic', duration: '4:08' },
      { title: 'Maya', artist: 'Sabin Rai', genre: 'pop', mood: 'romantic', duration: '3:45' },
    ];
    const reply = '🎵 **Here are some great tracks for today:**\n\n' + songs.map((s, i) => `${i+1}. **${s.title}** — ${s.artist} (${s.genre}, ${s.mood})`).join('\n') + '\n\nWant more? Tell me your mood (peaceful, energetic, romantic) and I\'ll pick better!';
    return { reply, data: { learning: { music: songs, action: 'recommend' } } };
  }

  // Default
  return {
    reply: `Hello! I'm your LifeOS Agent. Here's what I can help you with:\n\n⏰ **Alarms** — "Set an alarm for 7am"\n📋 **Tasks** — "What are my tasks today?"\n🌤 **Weather** — "What's the weather?"\n📅 **Calendar** — "Add a meeting at 3pm"\n📚 **Learning** — "Teach me Nepali vocabulary", "Give me a quote", "Play some music"\n⏱️ **Schedule** — "Remind me at 11:30 to get quotes"\n\nWhat would you like to do?`,
  };
}
