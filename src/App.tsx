import { useState, useEffect, useCallback } from 'react';
import { useChat } from './hooks/useChat';
import ChatHeader from './components/ChatHeader';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import PluginStatusBar from './components/PluginStatusBar';
import PluginManagerSidebar from './components/PluginManagerSidebar';
import RoutineScreen from './components/RoutineScreen';

export default function App() {
  const { messages, isLoading, plugins, userId, send, runDemo, toggle, clearMessages } = useChat();
  const [showPlugins, setShowPlugins] = useState(false);
  const [showRoutine, setShowRoutine] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  // ── Celebration confetti (craft & delight) ──
  const celebrate = useCallback(() => {
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = () => { celebrate(); };
    window.addEventListener('lifeos-celebrate', handler);
    return () => window.removeEventListener('lifeos-celebrate', handler);
  }, [celebrate]);

  return (
    <div className="min-h-dvh bg-background bg-ambient-glow flex flex-col relative overflow-hidden">
      {/* ── Confetti overlay ── */}
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="confetti-particle absolute top-0"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d', '#c44dff'][i % 6],
                width: `${6 + Math.random() * 6}px`,
                height: `${6 + Math.random() * 6}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animationDuration: `${1.5 + Math.random() * 1.5}s`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
      {/* ── Mobile-first full-height chat container ── */}
      <div className="flex-1 flex flex-col mx-auto w-full max-w-2xl">
        {/* Header */}
        <ChatHeader
          onClear={clearMessages}
          onOpenPlugins={() => setShowPlugins(true)}
          onOpenRoutine={() => setShowRoutine(true)}
        />

        {/* Plugin status bar */}
        <PluginStatusBar plugins={plugins} />

        {/* Messages */}
        <ChatMessages messages={messages} isLoading={isLoading} />

        {/* Input */}
        <ChatInput onSend={send} onRunDemo={runDemo} disabled={isLoading} />
      </div>

      {/* Plugin manager sidebar */}
      <PluginManagerSidebar
        open={showPlugins}
        plugins={plugins}
        onToggle={toggle}
        onClose={() => setShowPlugins(false)}
      />

      {/* Routine sidebar */}
      <RoutineScreen
        open={showRoutine}
        onClose={() => setShowRoutine(false)}
        userId={userId || 'current-user'}
      />
    </div>
  );
}