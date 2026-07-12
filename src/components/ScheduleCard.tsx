import type { ScheduleInfo } from '../types';

interface Props {
  schedules: ScheduleInfo[];
}

const actionEmojis: Record<string, string> = {
  alarm: '⏰',
  quote: '💡',
  music: '🎵',
  learning: '📚',
  gym: '💪',
  task: '📋',
  reminder: '🔔',
};

export default function ScheduleCard({ schedules }: Props) {
  if (!schedules || schedules.length === 0) return null;

  if (schedules.length === 1) {
    const schedule = schedules[0];
    const emoji = actionEmojis[schedule.action_type] || '🔔';

    return (
      <div className="mt-2 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div>
            <p className="text-sm font-medium text-slate-200">
              {schedule.action_desc || schedule.action_type}
            </p>
            <p className="text-xs text-slate-400">
              Scheduled for <span className="text-slate-200 font-medium">{new Date(schedule.trigger_time).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
          </div>
        </div>
        {schedule.status === 'pending' && (
          <span className="inline-block text-[10px] font-medium text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full mt-2">
            Pending
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Reminders</p>
      {schedules.map((schedule, i) => {
        const emoji = actionEmojis[schedule.action_type] || '🔔';
        return (
          <div key={schedule.id || i} className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
            <div className="flex items-center gap-2">
              <span className="text-lg">{emoji}</span>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {schedule.action_desc || schedule.action_type}
                </p>
                <p className="text-xs text-slate-400">
                  Scheduled for <span className="text-slate-200 font-medium">{new Date(schedule.trigger_time).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>
            {schedule.status === 'pending' && (
              <span className="inline-block text-[10px] font-medium text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full mt-2">
                Pending
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
