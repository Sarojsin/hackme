import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Send, Plus, MessageSquare, CloudSun, Calendar, BookOpen } from 'lucide-react-native';
import type { ChatMessage, StructuredData } from '../src/types';
import { useChat } from '../src/hooks/useChat';

function LearningCard({ data }: { data: StructuredData['learning'] }) {
  if (!data) return null;

  return (
    <View className="mt-3 gap-3">
      {data.vocabulary && data.vocabulary.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vocabulary</Text>
          {data.vocabulary.map((word, i) => (
            <View key={i} className="flex-row justify-between items-start px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
              <View>
                <Text className="text-sm font-medium text-slate-100">{word.english}</Text>
                <Text className="text-xs text-slate-400">{word.nepali}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] text-slate-500">{word.pronunciation}</Text>
                <Text className="text-[10px] font-medium text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full mt-0.5 capitalize">
                  {word.category}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {data.quote && (
        <View className="px-4 py-3 rounded-xl bg-gradient-to-br from-blue-500/10 via-slate-800/50 to-transparent border border-slate-700/30">
          <Text className="text-sm text-slate-200 italic leading-relaxed">"{data.quote.text}"</Text>
          <Text className="text-xs text-slate-500 mt-2 font-medium">— {data.quote.author}</Text>
          <Text className="text-[10px] font-medium text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full mt-2 capitalize inline-block">
            {data.quote.language}
          </Text>
        </View>
      )}

      {data.music && data.music.length > 0 && (
        <View className="gap-2">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recommended Tracks</Text>
          {data.music.map((track, i) => (
            <View key={i} className="flex-row justify-between items-center px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
              <View className="flex-row items-center gap-3">
                <View className="w-6 h-6 rounded-full bg-blue-400/10 items-center justify-center">
                  <Text className="text-[10px] font-bold text-blue-400">{i + 1}</Text>
                </View>
                <View>
                  <Text className="text-sm font-medium text-slate-100">{track.title}</Text>
                  <Text className="text-xs text-slate-400">{track.artist}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[10px] font-medium text-slate-500 bg-slate-700/30 px-1.5 py-0.5 rounded-full capitalize">
                  {track.mood}
                </Text>
                <Text className="text-[10px] text-slate-500 mt-0.5">{track.duration}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ChatBubble({ message, userId }: { message: ChatMessage; userId: string }) {
  const isUser = message.role === 'user';
  const data = message.metadata?.data as StructuredData | undefined;

  return (
    <View className={`mb-3 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={`max-w-[85%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-blue-600 rounded-br-sm'
            : 'bg-slate-800 border border-slate-700/30 rounded-bl-sm'
        }`}
      >
        <Text
          className={`text-sm leading-5 ${
            isUser ? 'text-white' : 'text-slate-100'
          }`}
        >
          {message.content}
        </Text>
      </View>

      {!isUser && data && (
        <View className="mt-1 ml-1">
          {data.weather && (
            <View className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
              <View className="flex-row items-center gap-2">
                <CloudSun size={20} color="#38bdf8" />
                <Text className="text-sm font-medium text-slate-200">
                  {data.weather.city}: {data.weather.temperature}°
                </Text>
              </View>
              <Text className="text-xs text-slate-400 mt-1 capitalize">
                {data.weather.condition.replace('_', ' ')} · H: {data.weather.high}° L: {data.weather.low}°
              </Text>
            </View>
          )}

          {data.tasks && data.tasks.length > 0 && (
            <View className="mt-2 gap-2">
              {data.tasks.map((task) => (
                <View
                  key={task.id}
                  className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30"
                >
                  <Text className="text-sm text-slate-200">
                    {task.completed ? '✅' : '⬜'} {task.title}
                  </Text>
                  {task.due_date && (
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      Due: {task.due_date}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {data.alarm && (
            <View className="mt-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
              <Text className="text-sm text-slate-200">
                ⏰ Alarm: {data.alarm.time}
              </Text>
              {data.alarm.label && (
                <Text className="text-xs text-slate-400">{data.alarm.label}</Text>
              )}
            </View>
          )}

          {data.events && data.events.length > 0 && (
            <View className="mt-2 gap-2">
              {data.events.map((event) => (
                <View
                  key={event.id}
                  className="px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30"
                >
                  <Text className="text-sm text-slate-200">📅 {event.title}</Text>
                  {event.start_time && (
                    <Text className="text-[10px] text-slate-500 mt-0.5">
                      {event.start_time}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {data.learning && <LearningCard data={data.learning} />}
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const router = useRouter();
  const { messages, send, isLoading } = useChat('mobile-user');
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    await send(text);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header with navigation */}
        <View className="px-4 py-3 border-b border-slate-800">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-xl font-bold text-white">LifeOS</Text>
              <Text className="text-xs text-slate-400">Your AI assistant</Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => router.push('/tasks')}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700/30"
              >
                <MessageSquare size={20} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/alarms')}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700/30"
              >
                <Calendar size={20} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/learning')}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700/30"
              >
                <BookOpen size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-3"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} userId="mobile-user" />
          ))}
          {isLoading && (
            <View className="mb-3 items-start">
              <View className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700/30 rounded-bl-sm">
                <ActivityIndicator size="small" color="#38bdf8" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="px-4 py-3 border-t border-slate-800">
          <View className="flex-row gap-2 items-end">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#64748b"
              className="flex-1 bg-slate-800 border border-slate-700/30 rounded-2xl px-4 py-3 text-sm text-white max-h-24"
              multiline
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-3 rounded-2xl ${
                input.trim() && !isLoading ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <Send size={20} color={input.trim() && !isLoading ? '#ffffff' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
