import { Bell, BellOff, Clock } from 'lucide-react';
import type { AlarmInfo } from '../types';

interface Props {
  alarm: AlarmInfo;
}

export default function AlarmCard({ alarm }: Props) {
  return (
    <div className="glass-surface rounded-xl p-4 mt-3 animate-slide-in-right">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${alarm.status === 'pending' ? 'bg-accent/20' : 'bg-primary/20'}`}>
          {alarm.status === 'pending' ? (
            <Bell size={18} className="text-accent" />
          ) : (
            <BellOff size={18} className="text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {alarm.label || 'Alarm'}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Clock size={12} className="text-foreground/40" />
            <span className="text-sm text-foreground/60">{alarm.time}</span>
          </div>
          <div className="mt-1.5">
            <span
              className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                alarm.status === 'pending'
                  ? 'bg-accent/20 text-accent'
                  : 'bg-primary/20 text-primary'
              }`}
            >
              {alarm.status === 'pending' ? 'Pending' : 'Completed'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}