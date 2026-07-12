import { Calendar, Clock, MapPin } from 'lucide-react';
import type { CalendarEvent } from '../types';

interface Props {
  events: CalendarEvent[];
}

function formatEventTime(startTime: string, endTime?: string): string {
  try {
    const start = new Date(startTime);
    const formatted = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const time = start.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (endTime) {
      const end = new Date(endTime);
      const endFormatted = end.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${formatted} · ${time} – ${endFormatted}`;
    }

    return `${formatted} · ${time}`;
  } catch {
    return startTime;
  }
}

export default function CalendarEventCard({ events }: Props) {
  if (!events || events.length === 0) return null;

  return (
    <div className="mt-2 space-y-2" role="region" aria-label="Calendar events">
      {events.map((event) => {
        const isAllDay = event.all_day;

        return (
          <div
            key={event.id}
            className="glass-surface rounded-xl p-3 border border-border/40 hover:border-accent/30 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              {/* Calendar icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center mt-0.5">
                <Calendar size={15} className="text-accent" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                {/* Title */}
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {event.title}
                </h4>

                {/* Date/time */}
                <div className="flex items-center gap-1.5 text-xs text-foreground/60">
                  <Clock size={12} className="flex-shrink-0" />
                  <span>
                    {isAllDay
                      ? (() => {
                          try {
                            return new Date(event.start_time).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            }) + ' · All day';
                          } catch {
                            return 'All day';
                          }
                        })()
                      : formatEventTime(event.start_time, event.end_time)
                    }
                  </span>
                </div>

                {/* Location */}
                {event.location && (
                  <div className="flex items-center gap-1.5 text-xs text-foreground/50">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                {/* Description */}
                {event.description && (
                  <p className="text-xs text-foreground/50 line-clamp-2 leading-relaxed mt-1">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
