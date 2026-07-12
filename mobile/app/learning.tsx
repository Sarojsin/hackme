import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookOpen, Send } from 'lucide-react-native';
import { useChat } from '../src/hooks/useChat';

export default function LearningScreen() {
  const router = useRouter();
  const { messages, send, isLoading } = useChat('mobile-user');
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    await send(text);
  };

  const quickActions = [
    { label: 'Vocabulary', message: 'Teach me Nepali vocabulary' },
    { label: 'Quote', message: 'Give me a daily quote' },
    { label: 'Music', message: 'Play some uplifting music' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-4 py-3">
        {messages.map((message) => (
          <View key={message.id} className="mb-3">
            {message.role === 'user' ? (
              <View className="self-end bg-blue-600 px-4 py-3 rounded-2xl rounded-br-sm max-w-[85%]">
                <Text className="text-sm text-white">{message.content}</Text>
              </View>
            ) : (
              <View className="self-start bg-slate-800 border border-slate-700/30 px-4 py-3 rounded-2xl rounded-bl-sm max-w-[85%]">
                <Text className="text-sm text-slate-100">{message.content}</Text>
              </View>
            )}
          </View>
        ))}
        {isLoading && (
          <View className="mb-3 items-start">
            <ActivityIndicator size="small" color="#38bdf8" />
          </View>
        )}
      </ScrollView>

      <View className="px-4 py-3 border-t border-slate-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 gap-2">
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              onPress={() => send(action.message)}
              className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700/30"
            >
              <Text className="text-sm text-slate-200">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View className="flex-row gap-2 items-end">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about vocabulary, quotes, or music..."
            placeholderTextColor="#64748b"
            className="flex-1 bg-slate-800 border border-slate-700/30 rounded-2xl px-4 py-3 text-sm text-white"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-2xl ${input.trim() && !isLoading ? 'bg-blue-600' : 'bg-slate-800'}`}
          >
            <Send size={20} color={input.trim() && !isLoading ? '#ffffff' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
