import { CheckCircle2, Circle, ClipboardList } from 'lucide-react';
import type { Task } from '../types';

interface Props {
  tasks: Task[];
}

export default function TaskCard({ tasks }: Props) {
  if (!tasks || tasks.length === 0) return null;

  const completed = tasks.filter((t) => t.completed);
  const pending = tasks.filter((t) => !t.completed);

  return (
    <div className="glass-surface rounded-xl p-4 mt-3 animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={16} className="text-accent" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
          {pending.length > 0 ? `Tasks — ${pending.length} remaining` : 'All caught up!'}
        </span>
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <ul className="space-y-2 mb-2">
          {pending.map((task) => (
            <li key={task.id} className="flex items-start gap-2.5">
              <Circle size={14} className="text-border mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-foreground">{task.title}</p>
                {task.due_date && (
                  <p className="text-xs text-foreground/40 mt-0.5">
                    Due {new Date(task.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Completed tasks (collapsed) */}
      {completed.length > 0 && (
        <details className="group">
          <summary className="text-xs text-foreground/40 cursor-pointer hover:text-foreground/60 transition-colors list-none flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-primary" />
            {completed.length} completed
            <span className="ml-auto group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <ul className="space-y-1.5 mt-2">
            {completed.map((task) => (
              <li key={task.id} className="flex items-start gap-2.5 opacity-60">
                <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground line-through">{task.title}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}