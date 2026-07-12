import { X, Power, PowerOff, Puzzle, Terminal, CloudSun, Calendar, BookOpen } from 'lucide-react';
import type { PluginManifest } from '../types';

const pluginIcons: Record<string, React.ReactNode> = {
  alarm: <Terminal size={16} />,
  tasks: <Puzzle size={16} />,
  weather: <CloudSun size={16} />,
  calendar: <Calendar size={16} />,
  learning: <BookOpen size={16} />,
};

interface Props {
  open: boolean;
  plugins: PluginManifest[];
  onToggle: (name: string) => void;
  onClose: () => void;
}

export default function PluginManagerSidebar({
  open,
  plugins,
  onToggle,
  onClose,
}: Props) {
  return (
    <>
      {/* Scrim */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-surface border-l border-border/40 
                    shadow-2xl transform transition-transform duration-300 ease-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Plugin manager"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Puzzle size={15} className="text-primary" />
            Plugins
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-foreground/40 hover:text-foreground 
                       hover:bg-muted transition-all duration-150 cursor-pointer"
            aria-label="Close plugin manager"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {plugins.length === 0 ? (
            <p className="text-xs text-foreground/40 text-center py-8">
              No plugins available yet.
            </p>
          ) : (
            plugins.map((plugin) => (
              <button
                key={plugin.name}
                onClick={() => onToggle(plugin.name)}
                className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border/30 
                           bg-muted/30 hover:bg-muted/60 transition-all duration-150 cursor-pointer text-left"
                aria-pressed={plugin.enabled}
              >
                <span className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-foreground/60 shrink-0">
                  {pluginIcons[plugin.name] ?? <Puzzle size={16} />}
                </span>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground capitalize block">
                    {plugin.name}
                  </span>
                  <span className="text-[11px] text-foreground/40 leading-tight block truncate">
                    {plugin.description}
                  </span>
                </div>

                <span
                  className={`flex items-center gap-1 text-[11px] font-medium shrink-0 transition-colors duration-150 ${
                    plugin.enabled ? 'text-primary' : 'text-foreground/30'
                  }`}
                >
                  {plugin.enabled ? (
                    <>
                      <Power size={12} /> On
                    </>
                  ) : (
                    <>
                      <PowerOff size={12} /> Off
                    </>
                  )}
                </span>
              </button>
            ))
          )}
        </div>

        <p className="absolute bottom-4 left-4 right-4 text-[10px] text-foreground/20 text-center leading-relaxed">
          Toggle plugins on or off to customise what your LifeOS Agent can do.
        </p>
      </aside>
    </>
  );
}