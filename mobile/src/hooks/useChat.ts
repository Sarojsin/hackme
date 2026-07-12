import { useState, useCallback, useEffect } from 'react';
import type { ChatMessage, ChatResponse } from '../types';
import { sendMessage } from '../api/fastapi';

const STORAGE_KEY = 'lifeos_chat_history';

export function useChat(userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      } else {
        setMessages([
          {
            id: crypto.randomUUID(),
            user_id: userId,
            role: 'assistant',
            content:
              "Hey there! I'm your **LifeOS Agent**. Here's how I can help:\n\n" +
              '⏰ **Alarms** — "Set an alarm for 7am"\n' +
              '📋 **Tasks** — "What are my tasks today?" and I\'ll ask for your todo list\n' +
              '🌤 **Weather** — "What\'s the weather?"\n' +
              '📅 **Calendar** — "Add a meeting called \'Design Review\' at 3pm"\n' +
              '📚 **Learning** — "Teach me Nepali vocabulary", "Give me a quote", or "Play some music"\n\n' +
              'What would you like to do?',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // Storage not available
    }
  }, [userId]);

  const persistMessages = useCallback((updated: ChatMessage[]) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(updated));
    } catch {
      // Storage not available
    }
  }, [userId]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      user_id: userId,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => {
      const updated = [...prev, userMsg];
      persistMessages(updated);
      return updated;
    });

    setIsLoading(true);

    try {
      const response: ChatResponse = await sendMessage(text, userId);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: userId,
        role: 'assistant',
        content: response.reply,
        metadata: response.data ? { data: response.data } : undefined,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => {
        const updated = [...prev, assistantMsg];
        persistMessages(updated);
        return updated;
      });
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        user_id: userId,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong'}`,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => {
        const updated = [...prev, errorMsg];
        persistMessages(updated);
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading, persistMessages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
    } catch {
      // Storage not available
    }
  }, [userId]);

  return { messages, send, isLoading, clearHistory };
}
