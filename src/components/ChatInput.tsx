import { useState, useRef, useCallback } from 'react';
import { Send, Sparkles, Play } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onRunDemo?: () => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, onRunDemo, disabled }: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-border/40 px-4 py-3 space-y-2">
      {/* Run Demo button — prominent hint for first-time users */}
      {onRunDemo && (
        <div className="flex justify-center">
          <button
            onClick={onRunDemo}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                       bg-primary/10 text-primary text-xs font-medium
                       hover:bg-primary/20 active:scale-95
                       transition-all duration-150 ease-out cursor-pointer
                       disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
            aria-label="Run a demo conversation"
          >
            <Play size={12} className="fill-primary" />
            Run Demo
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 glass-surface-strong rounded-2xl px-4 py-2">
        {/* Sparkle icon */}
        <div className="pb-1.5">
          <Sparkles size={16} className="text-accent/60" />
        </div>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          rows={1}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-foreground placeholder-foreground/30 
                     resize-none outline-none py-2 max-h-[120px]
                     disabled:opacity-40"
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary flex items-center justify-center
                     hover:bg-primary/90 active:scale-95 transition-all duration-150 ease-out
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100
                     cursor-pointer"
          aria-label="Send message"
        >
          <Send size={15} className="text-on-primary" />
        </button>
      </div>
    </div>
  );
}