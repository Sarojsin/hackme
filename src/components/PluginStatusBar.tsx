import { Bell, ListTodo, CloudSun, Calendar } from 'lucide-react';
import type { PluginManifest } from '../types';

interface Props {
  plugins: PluginManifest[];
}

const pluginIcons: Record<string, typeof Bell> = {
  alarm: Bell,
  tasks: ListTodo,
  weather: CloudSun,
  calendar: Calendar,
};

const pluginLabels: Record<string, string> = {
  alarm: 'Alarm',
  tasks: 'Tasks',
  weather: 'Weather',
  calendar: 'Calendar',
};

export default function PluginStatusBar({ plugins }: Props) {
  if (!plugins || plugins.length === 0) return null;

  return (
    <div className="border-b border-border/40 px-4 py-2 flex items-center gap-2 shrink-0 overflow-x-auto">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/30 mr-1 shrink-0">
        Plugins
      </span>
      {plugins.map((plugin) => {
        const Icon = pluginIcons[plugin.name];
        return (
          <div
            key={plugin.name}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
              plugin.enabled
                ? 'bg-accent/15 text-accent'
                : 'bg-muted text-foreground/30'
            }`}
          >
            {Icon && <Icon size={12} />}
            <span>{pluginLabels[plugin.name] || plugin.name}</span>
          </div>
        );
      })}
    </div>
  );
}