import { Bot, Trash2, SlidersHorizontal, CalendarDays } from 'lucide-react';

interface Props {
  onClear: () => void;
  onOpenPlugins: () => void;
  onOpenRoutine?: () => void;
}

export default function ChatHeader({ onClear, onOpenPlugins, onOpenRoutine }: Props) {
  return (
    <header className="border-b border-border/40 px-4 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <Bot size={18} className="text-on-primary" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">LifeOS Agent</h1>
          <span className="text-[10px] text-foreground/40 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow inline-block" />
            Active
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenRoutine}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-foreground/40 
                     hover:text-foreground/70 hover:bg-muted transition-all duration-150 cursor-pointer"
          aria-label="Open routine"
        >
          <CalendarDays size={13} />
          Routine
        </button>

        <button
          onClick={onOpenPlugins}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-foreground/40 
                     hover:text-foreground/70 hover:bg-muted transition-all duration-150 cursor-pointer"
          aria-label="Open plugin manager"
        >
          <SlidersHorizontal size={13} />
          Plugins
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-foreground/40 
                     hover:text-foreground/70 hover:bg-muted transition-all duration-150 cursor-pointer"
          aria-label="Clear conversation"
        >
          <Trash2 size={13} />
          Clear
        </button>
      </div>
    </header>
  );
}