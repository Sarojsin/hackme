import { useEffect, useRef, useCallback } from 'react';
import { subscribeToScheduledEvents } from '../lib/supabase';
import { useBrowserNotifications } from './useBrowserNotifications';
import type { ScheduledEvent, Task, WeatherData, AlarmInfo } from '../types';

/** Shape of `res.data` from the mock morning routine response */
interface MorningBriefingData {
  tasks: Task[];
  weather: WeatherData;
  alarm?: AlarmInfo;
}

interface UseAlarmMonitorOptions {
  userId: string;
  /** Called when an alarm fires so the parent can inject a morning briefing message */
  onAlarmFired: (briefing: MorningBriefingData) => void;
  /** Called to dismiss alarm UI state */
  onClearAlarm: () => void;
}

/**
 * Hook that listens for alarm events (via Supabase Realtime when the FastAPI
 * backend is connected, or via local simulation in mock mode) and triggers
 * browser notifications + proactive chat messages.
 */
export function useAlarmMonitor({
  userId,
  onAlarmFired,
  onClearAlarm: _onClearAlarm,
}: UseAlarmMonitorOptions) {
  const { notify, permission, requestPermission: requestNotifyPermission } = useBrowserNotifications();
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ─── React to alarm events from the Realtime subscription ──────────────
  const handleScheduledEvent = useCallback(
    (event: ScheduledEvent) => {
      if (event.status !== 'pending') return;

      const nowMs = Date.now();
      const triggerMs = new Date(event.trigger_time).getTime();
      const delay = Math.max(triggerMs - nowMs, 0);

      setTimeout(() => {
        if (event.action_type === 'alarm' || event.action_type === 'morning_routine') {
          // Show browser notification
          const label = event.payload?.label ?? 'Alarm';
          notify(`⏰ ${label}`, {
            body: 'Your LifeOS Agent is ready with your morning briefing!',
            tag: `alarm-${event.id}`,
            requireInteraction: true,
          });

          // Trigger the morning briefing in the chat
          onAlarmFired({
            tasks: [
              {
                id: crypto.randomUUID(),
                user_id: userIdRef.current,
                title: 'Buy groceries',
                due_date: new Date().toISOString().split('T')[0],
                completed: false,
              },
              {
                id: crypto.randomUUID(),
                user_id: userIdRef.current,
                title: 'Finish project report',
                due_date: new Date().toISOString().split('T')[0],
                completed: false,
              },
              {
                id: crypto.randomUUID(),
                user_id: userIdRef.current,
                title: 'Call dentist',
                due_date: new Date().toISOString().split('T')[0],
                completed: true,
              },
              {
                id: crypto.randomUUID(),
                user_id: userIdRef.current,
                title: 'Morning standup at 10am',
                due_date: new Date().toISOString().split('T')[0],
                completed: false,
              },
            ],
            weather: {
              temperature: 22,
              condition: 'partly_cloudy',
              high: 26,
              low: 18,
              humidity: 55,
              city: 'San Francisco',
            },
            alarm: {
              id: event.id,
              time: new Date(event.trigger_time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
              label: event.payload?.label ?? 'Morning Alarm',
              status: 'completed',
            },
          });
        }
      }, delay);
    },
    [notify, onAlarmFired]
  );

  // Subscribe to Realtime events (works when FastAPI backend is connected)
  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToScheduledEvents(userId, handleScheduledEvent);
    return () => {
      subscription.unsubscribe();
    };
  }, [userId, handleScheduledEvent]);

  // ─── Local alarm simulation (for mock/demo mode) ──────────────────────
  const alarmsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /** Schedule a local alarm simulation — called by useChat when an alarm is set */
  const scheduleLocalAlarm = useCallback(
    (alarm: { id: string; time: string; label?: string }) => {
      // Parse the time string into a delay
      const now = new Date();
      const [timeStr, period] = alarm.time.split(' ');
      let [hours, minutes] = timeStr.split(':').map(Number);

      if (period?.toLowerCase() === 'pm' && hours < 12) hours += 12;
      if (period?.toLowerCase() === 'am' && hours === 12) hours = 0;

      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);

      // If target is in the past, schedule for a short demo delay (8 seconds)
      let delay = target.getTime() - now.getTime();
      if (delay < 2000 || delay > 86400000) {
        // For demo: alarm fires in ~8 seconds
        delay = 8000 + Math.random() * 4000;
      }

      const timeoutId = setTimeout(() => {
        // Show notification
        notify(`⏰ ${alarm.label ?? 'Alarm'}`, {
          body: 'Your LifeOS Agent is ready with your morning briefing!',
          tag: `alarm-${alarm.id}`,
          requireInteraction: true,
        });

        // Trigger briefing
        onAlarmFired({
          tasks: [
            {
              id: crypto.randomUUID(),
              user_id: userIdRef.current,
              title: 'Buy groceries',
              due_date: new Date().toISOString().split('T')[0],
              completed: false,
            },
            {
              id: crypto.randomUUID(),
              user_id: userIdRef.current,
              title: 'Finish project report',
              due_date: new Date().toISOString().split('T')[0],
              completed: false,
            },
            {
              id: crypto.randomUUID(),
              user_id: userIdRef.current,
              title: 'Call dentist',
              due_date: new Date().toISOString().split('T')[0],
              completed: true,
            },
            {
              id: crypto.randomUUID(),
              user_id: userIdRef.current,
              title: 'Morning standup at 10am',
              due_date: new Date().toISOString().split('T')[0],
              completed: false,
            },
          ],
          weather: {
            temperature: 22,
            condition: 'partly_cloudy',
            high: 26,
            low: 18,
            humidity: 55,
            city: 'San Francisco',
          },
          alarm: {
            id: alarm.id,
            time: alarm.time,
            label: alarm.label ?? 'Morning Alarm',
            status: 'completed',
          },
        });

        alarmsRef.current.delete(alarm.id);
      }, delay);

      alarmsRef.current.set(alarm.id, timeoutId);
    },
    [notify, onAlarmFired]
  );

  /** Cancel a scheduled alarm by ID */
  const cancelLocalAlarm = useCallback((id: string) => {
    const timeout = alarmsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      alarmsRef.current.delete(id);
    }
  }, []);

  // Cleanup all pending alarms on unmount
  useEffect(() => {
    return () => {
      alarmsRef.current.forEach((timeout) => clearTimeout(timeout));
      alarmsRef.current.clear();
    };
  }, []);

  return {
    scheduleLocalAlarm,
    cancelLocalAlarm,
    notificationPermission: permission,
    requestPermission: requestNotifyPermission,
  };
}