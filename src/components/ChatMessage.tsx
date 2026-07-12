import { Bot, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../types';
import TaskCard from './TaskCard';
import WeatherCard from './WeatherCard';
import AlarmCard from './AlarmCard';
import CalendarEventCard from './CalendarEventCard';
import LearningCard from './LearningCard';
import ScheduleCard from './ScheduleCard';

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isAssistant = message.role === 'assistant' || message.role === 'system';

  // Parse markdown-like bold for display
  const renderContent = (text: string) => {
    // Convert **text** to <strong>text</strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      // Handle line breaks
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  return (
    <div
      className={`flex items-start gap-3 animate-fade-in ${
        isAssistant ? '' : 'flex-row-reverse'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isAssistant
            ? 'bg-primary/20 text-primary'
            : 'bg-accent/20 text-accent'
        }`}
      >
        {isAssistant ? (
          <Bot size={16} />
        ) : (
          <User size={16} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] sm:max-w-[75%] ${
          isAssistant ? '' : 'items-end flex flex-col'
        }`}
      >
        <div
          className={`px-4 py-2.5 text-sm leading-relaxed ${
            isAssistant
              ? 'glass-surface rounded-2xl rounded-tl-sm'
              : 'bg-primary text-on-primary rounded-2xl rounded-tr-sm'
          }`}
        >
          {/* Proactive badge for automated messages */}
          {message.metadata?.proactive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent mb-1.5 bg-accent/10 px-1.5 py-0.5 rounded-full animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
              Proactive
            </span>
          )}

          <p className={`${isAssistant ? 'text-foreground/85' : ''}`}>
            {renderContent(message.content)}
          </p>
        </div>

        {/* Structured data cards */}
        {message.metadata?.data && (
          <div className="space-y-2">
            {message.metadata.data.tasks && (
              <TaskCard tasks={message.metadata.data.tasks} />
            )}
            {message.metadata.data.weather && (
              <WeatherCard weather={message.metadata.data.weather} />
            )}
            {message.metadata.data.alarm && (
              <AlarmCard alarm={message.metadata.data.alarm} />
            )}
            {message.metadata.data.events && (
              <CalendarEventCard events={message.metadata.data.events} />
            )}
            {message.metadata.data.learning && (
              <LearningCard data={message.metadata.data.learning} />
            )}
            {message.metadata.data.schedule && (
              <ScheduleCard schedules={message.metadata.data.schedules ? message.metadata.data.schedules : [message.metadata.data.schedule]} />
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-foreground/30 mt-1 px-1 block">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}