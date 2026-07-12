import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, PluginManifest } from '../types';
import { sendMessage, getPlugins, togglePlugin, createSchedules, executeScheduleAction, getDueSchedules } from '../api/fastapi';
import { ensureSignedIn, getSessionToken, subscribeToChatHistory } from '../lib/supabase';
import { useAlarmMonitor } from './useAlarmMonitor';

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  plugins: PluginManifest[];
  userId: string;
  token: string | null;
  send: (text: string) => Promise<void>;
  runDemo: () => Promise<void>;
  toggle: (name: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [token, setToken] = useState<string | null>(null);
  const initialised = useRef(false);

  /** Generate a human-friendly morning greeting from the data */
  function buildBriefingText(tasks: any[], weather: any): string {
    const pendingTasks = tasks.filter((t: any) => !t.completed);
    const completedCount = tasks.filter((t: any) => t.completed).length;

    const taskLine =
      pendingTasks.length > 0
        ? `📋 You have **${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''}** today` +
          (completedCount > 0 ? ` (${completedCount} already done ✅)` : '')
        : '📋 No pending tasks — you\'re all caught up!';

    const weatherLine = weather
      ? `🌤 It's **${weather.temperature}°** and **${weather.condition.replace(/_/g, ' ')}** in ${weather.city}, with a high of ${weather.high}° and low of ${weather.low}°.`
      : '';

    return (
      `🌅 **Good morning!** Here's your briefing for today:\n\n` +
      `${weatherLine}\n\n` +
      `${taskLine}\n\n` +
      `${pendingTasks.length === 0 ? 'Enjoy your day! ☕' : 'Let\'s get started! 💪'}`
    );
  }

  /** Lightweight celebration — triggers once via a custom event so
   *  any component can listen (App.tsx handles the actual canvas) */
  function triggerCelebration() {
    try {
      const event = new CustomEvent('lifeos-celebrate', { detail: { type: 'morning_routine' } });
      window.dispatchEvent(event);
    } catch {
      // Silently ignore if DOM isn't available
    }
  }

  // ─── Realtime subscription: pick up proactive messages from chat_history ──
  // This catches messages inserted by the Supabase cron / Edge Function while the
  // user's browser is open, so they appear without a page refresh.
  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToChatHistory(userId, (newMsg: any) => {
      if (!newMsg.metadata?.proactive) return;

      setMessages((prev) => {
        // Avoid duplicating a message that was already added locally
        if (prev.some((m) => m.id === newMsg.id)) return prev;

        // Map the database row to our ChatMessage type
        let data: any = undefined;
        try {
          const meta =
            typeof newMsg.metadata === 'string'
              ? JSON.parse(newMsg.metadata)
              : newMsg.metadata;
          data = meta?.data;
        } catch {
          // ignore parse errors
        }

        const chatMsg: ChatMessage = {
          id: newMsg.id ?? crypto.randomUUID(),
          user_id: newMsg.user_id,
          role: 'assistant',
          content: newMsg.content,
          metadata: newMsg.metadata,
          created_at: newMsg.created_at ?? new Date().toISOString(),
        };

        // If the proactive message includes structured data, also trigger
        // celebration once (but only for morning_routine events)
        if (
          data?.tasks ||
          newMsg.metadata?.event_type === 'morning_routine'
        ) {
          setTimeout(triggerCelebration, 100);
        }

        return [...prev, chatMsg];
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // ─── Alarm monitor (realtime + local simulation + notifications) ──────
  const handleAlarmFired = useCallback(
    (briefing: { tasks: any[]; weather: any; alarm?: any }) => {
      setMessages((prev) => {
        // 1. Update the existing alarm message status to 'completed'
        const updated = prev.map((msg) => {
          if (
            msg.metadata?.data?.alarm &&
            msg.metadata.data.alarm.id === briefing.alarm?.id
          ) {
            return {
              ...msg,
              metadata: {
                ...msg.metadata,
                data: {
                  ...msg.metadata.data,
                  alarm: { ...msg.metadata.data.alarm, status: 'completed' as const },
                },
              },
            };
          }
          return msg;
        });

        // 2. Build a human-readable briefing from the dynamic data
        const content = buildBriefingText(briefing.tasks, briefing.weather);

        // 3. Append a proactive morning briefing message
        const briefingMsg: ChatMessage = {
          id: crypto.randomUUID(),
          user_id: userId,
          role: 'assistant',
          content,
          metadata: {
            proactive: true,
            event_type: 'morning_routine',
            data: {
              tasks: briefing.tasks,
              weather: briefing.weather,
              alarm: briefing.alarm,
            },
          },
          created_at: new Date().toISOString(),
        };

        // 4. Fire celebration
        setTimeout(triggerCelebration, 100);

        return [...updated, briefingMsg];
      });
    },
    [userId]
  );

  const { scheduleLocalAlarm, requestPermission } = useAlarmMonitor({
    userId,
    onAlarmFired: handleAlarmFired,
    onClearAlarm: useCallback(() => {}, []),
  });

  const seenNotificationIds = useRef<Set<string>>(new Set());

  // ─── Schedule notification helper ──────────────────────
  const scheduleNotification = useCallback((schedule: any) => {
      if (!schedule?.trigger_time || !schedule?.id) return;
      if (seenNotificationIds.current.has(schedule.id)) return;
      seenNotificationIds.current.add(schedule.id);

      const now = new Date();
      const scheduleTime = new Date(schedule.trigger_time);
      const triggerMs = scheduleTime.getTime();

      if (!Number.isFinite(triggerMs)) {
        console.warn('[scheduleNotification] invalid trigger_time for schedule', schedule.id, schedule.trigger_time);
        return;
      }

      let delay = scheduleTime.getTime() - now.getTime();
      if (delay < 0) delay = 0;

      setTimeout(async () => {
      const actionEmojis: Record<string, string> = {
        alarm: '⏰', quote: '💡', music: '🎵', learning: '📚', gym: '💪', task: '📋', reminder: '🔔', weather: '🌤️'
      };
      const emoji = actionEmojis[schedule.action_type] || '🔔';
      const actionDesc = schedule.action_desc || schedule.action_type;

      let content = `${emoji} **Reminder:** It's time to ${actionDesc}!`;
      let metadataData: any = {
        schedule: { ...schedule, status: 'completed' },
      };

      try {
        const result = await executeScheduleAction(schedule.id, token || undefined);
        console.debug('[scheduleNotification] action result:', result);
        if (result) {
          if (result.action_type === 'quote' && result.items) {
            content = `${emoji} **Quotes for you:**\n\n${result.items.map((q: any) => `> *"${q.text}"* — **${q.author}**`).join('\n\n')}`;
          } else if ((result.action_type === 'learning' || result.action_type === 'music') && result.items) {
            const label = result.action_type === 'learning' ? 'Vocabulary' : 'Music';
            content = `${emoji} **${label}:**\n\n${result.items.map((item: any, i: number) => {
              if (result.action_type === 'learning') return `${i + 1}. **${item.english}** → ${item.nepali} (${item.category})`;
              return `${i + 1}. **${item.title}** — ${item.artist}`;
            }).join('\n')}`;
          } else if (result.action_type === 'alarm') {
            content = `${emoji} **Alarm:** ${result.label}\n\n${result.message}`;
          } else if (result.action_type === 'weather' && result.weather) {
            const w = result.weather;
            content = `${emoji} **Weather in ${w.city}:**\n\n` +
              `• **Temperature:** ${w.temperature}°C (${w.condition.replace('_', ' ')})\n` +
              `• **High:** ${w.high}° / **Low:** ${w.low}°\n` +
              `• **Humidity:** ${w.humidity}%`;
          } else if (result.action_type === 'gym') {
            if (result.items && result.items.length > 0) {
              content = `${emoji} **Gym Time!**\n\n${result.message}\n\nExercises:\n${result.items.map((ex: any, i: number) => `${i + 1}. ${ex.name || ex.exercise || 'Exercise'} — ${ex.sets ?? ''}`).join('\n')}`;
            } else {
              content = `${emoji} **Gym Time!**\n\n${result.message}`;
            }
          } else if (result.message) {
            content = `${emoji} **${result.action_type}:** ${result.message}`;
          }
          metadataData = { ...metadataData, action_result: result };
        }
      } catch (err) {
        console.error('[scheduleNotification] action failed:', err);
        // fallback to simple reminder
      }

      const reminderMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: userId,
        role: 'assistant',
        content,
        metadata: {
          proactive: true,
          event_type: 'reminder',
          data: metadataData,
        },
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, reminderMsg]);
    }, delay);
  }, [userId, token, executeScheduleAction]);

  // ─── Check for pending schedules on mount and periodically ──
  useEffect(() => {
    if (!userId) return;

    const checkSchedules = async () => {
      try {
        const due = await getDueSchedules(userId, token || undefined);
        const now = new Date();
        for (const s of due) {
          if (!s.trigger_time || s.status !== 'pending') continue;
          const scheduleTime = new Date(s.trigger_time);
          if (scheduleTime <= now) {
            scheduleNotification(s);
          } else {
            const delay = scheduleTime.getTime() - now.getTime();
            if (delay < 60000) {
              scheduleNotification(s);
            }
          }
        }
      } catch (e) {
        console.error('checkSchedules error:', e);
      }
    };

    checkSchedules();
    const interval = setInterval(checkSchedules, 30000);
    return () => clearInterval(interval);
  }, [userId, scheduleNotification]);

  // Boot: sign in anonymously & fetch plugins
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    (async () => {
      const uid = await ensureSignedIn();
      const accessToken = await getSessionToken();
      setUserId(uid);
      setToken(accessToken);

      try {
        const res = await getPlugins(uid, accessToken || undefined);
        setPlugins(res.plugins);
      } catch {
        // Fallback defaults
        setPlugins([
          { name: 'alarm', description: 'Set, list, and cancel alarms', enabled: true },
          { name: 'tasks', description: 'Manage your daily tasks and to-dos', enabled: true },
          { name: 'weather', description: 'Get weather forecasts for your location', enabled: true },
          { name: 'calendar', description: 'Create and list calendar events', enabled: true },
          { name: 'learning', description: 'Learn English-Nepali vocabulary, daily quotes, and music', enabled: true },
          { name: 'schedule', description: 'Schedule reminders and timed actions', enabled: true },
        ]);
      }

      // Welcome message
      setMessages([
        {
          id: crypto.randomUUID(),
          user_id: uid,
          role: 'assistant',
          content:
            "👋 Hey! I'm your **LifeOS Agent**.\n\n" +
            'Let\'s set up your day. Tell me your routine in one message, for example:\n\n' +
            '• **Wake me at 7am**\n' +
            '• **At 11:30 give me 2 quotes**\n' +
            '• **At 12pm learn 5 English-Nepali words**\n' +
            '• **At 2pm remind me to go to gym and buy groceries**\n' +
            '• **Add task: Finish project report**\n\n' +
            'Or just say **"What are my tasks today?"** to start.',
          created_at: new Date().toISOString(),
        },
      ]);
    })();
  }, []);

  /** Send a user message and get an assistant reply */
  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Request notification permission on user gesture (first send)
      requestPermission();

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: userId,
        role: 'user',
        content: text.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await sendMessage(text, userId, token || undefined);

        // Simulate a brief thinking delay for natural feel
        await new Promise((r) => setTimeout(r, 400));

        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          user_id: userId,
          role: 'assistant',
          content: res.reply,
          metadata: res.data
            ? {
                data: res.data,
                event_type: res.data.tasks
                  ? ('morning_routine' as const)
                  : res.data.alarm
                    ? ('alarm' as const)
                    : undefined,
              }
            : undefined,
          created_at: new Date().toISOString(),
        };

        const processSchedules = async () => {
          const schedules = (res.data?.schedules && res.data.schedules.length > 0)
            ? res.data.schedules
            : (res.data?.schedule ? [res.data.schedule] : []);

          if (schedules.length === 0) return;

          const seen = new Set<string>();
          const unique = schedules.filter((s: any) => {
            const key = `${s.trigger_time}|${s.action_type}|${s.action_desc}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

      try {
        const created = await createSchedules(userId, unique, token || undefined);
            const scheduleMap = new Map(created.map((c) => [`${c.trigger_time}|${c.action_type}|${c.action_desc}`, c]));
            const updatedData = {
              ...res.data,
              ...(res.data?.schedules ? { schedules: unique.map((s: any) => scheduleMap.get(`${s.trigger_time}|${s.action_type}|${s.action_desc}`) || s) } : {}),
              ...(res.data?.schedule ? { schedule: scheduleMap.get(`${unique[0].trigger_time}|${unique[0].action_type}|${unique[0].action_desc}`) || unique[0] } : {}),
            };
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.id === assistantMsg.id) {
                return prev.map((m) => (m.id === assistantMsg.id ? { ...m, metadata: { ...m.metadata, data: updatedData } } : m));
              }
              return prev;
            });
            created.forEach((s) => scheduleNotification(s));
          } catch {
            // Leave the assistant message with mock IDs
          }
        };

        setMessages((prev) => [...prev, assistantMsg]);
        void processSchedules();

        // ── If an alarm was set (mock mode), schedule local firing ──
        if (res.data?.alarm && res.data.alarm.status === 'pending') {
          scheduleLocalAlarm({
            id: res.data.alarm.id,
            time: res.data.alarm.time,
            label: res.data.alarm.label ?? 'Morning Alarm',
          });
        }
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          user_id: userId,
          role: 'assistant',
          content:
            err instanceof Error
              ? `Hmm, something went wrong — **${err.message}**. Could you try again?`
              : "Sorry, I couldn't process that. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, isLoading, scheduleLocalAlarm, requestPermission, createSchedules, scheduleNotification, token]
  );

  /** ─── Scheduled event guard ─────────────────────────── */
  const hasPendingDemo = useRef(false);

  /** Run the full end-to-end demo: alarm → notification → morning briefing */
  const runDemo = useCallback(async () => {
    if (isLoading || hasPendingDemo.current) return;
    hasPendingDemo.current = true;
    setIsLoading(true);

    // Request notification permission on user gesture
    requestPermission();

    // 1. User message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: userId,
      role: 'user',
      content: '▶️ Run demo',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    // Brief thinking pause
    await new Promise((r) => setTimeout(r, 600));

    // 2. Assistant confirms with alarm card (demo fires in ~10s)
    const alarmId = crypto.randomUUID();

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: userId,
      role: 'assistant',
      content:
        "🌅 **Morning Routine Demo**\n\n" +
        "I've queued an alarm to show you the full flow. In a few seconds you'll see:\n\n" +
        '1. ⏰ A **browser notification** (make sure notifications are allowed)\n' +
        '2. 📋 Your **morning briefing** with tasks and weather\n\n' +
        '*Sit tight — it\'s on its way!*',
      metadata: {
        event_type: 'alarm',
        data: {
          alarm: {
            id: alarmId,
            time: '7:00 AM',
            label: 'Morning Routine Demo',
            status: 'pending' as const,
          },
        },
      },
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);

    // 3. Schedule local alarm (time string triggers fallback ~8-12s)
    scheduleLocalAlarm({
      id: alarmId,
      time: '7:00 AM',
      label: 'Morning Routine Demo',
    });

    hasPendingDemo.current = false;
  }, [userId, isLoading, scheduleLocalAlarm, requestPermission]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        user_id: userId,
        role: 'assistant',
        content: 'How can I help you?',
        created_at: new Date().toISOString(),
      },
    ]);
  }, [userId]);

  /** Toggle a plugin on/off */
  const toggle = useCallback(
    async (name: string) => {
      let newEnabled: boolean | undefined;

      // Optimistic update — capture the new state before the async API call
      setPlugins((prev) => {
        const current = prev.find((p) => p.name === name);
        newEnabled = current ? !current.enabled : true;
        return prev.map((p) =>
          p.name === name ? { ...p, enabled: newEnabled! } : p
        );
      });

      try {
        await togglePlugin(name, userId, newEnabled!, token || undefined);
      } catch {
        // Revert on failure
        setPlugins((prev) => {
          const current = prev.find((p) => p.name === name);
          return prev.map((p) =>
            p.name === name ? { ...p, enabled: !current!.enabled } : p
          );
        });
      }
    },
    [userId, token]
  );

  return { messages, isLoading, plugins, userId, send, runDemo, toggle, clearMessages, token };
}