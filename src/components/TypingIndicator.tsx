import { useEffect, useState } from 'react';

interface Props {
  visible: boolean;
}

const dots = ['', '.', '..', '...'];

export default function TypingIndicator({ visible }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setI((p) => (p + 1) % dots.length), 400);
    return () => clearInterval(id);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-primary text-xs font-semibold">AI</span>
      </div>
      <div className="glass-surface rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
        <p className="text-foreground/60 text-sm font-mono">
          {`thinking${dots[i]}`}
        </p>
      </div>
    </div>
  );
}