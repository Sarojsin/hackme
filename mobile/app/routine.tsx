import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Check, Trash2, Edit2, X } from 'lucide-react-native';
import type { Task } from '../../src/types';

const FASTAPI_URL = process.env.EXPO_PUBLIC_FASTAPI_URL || 'http://localhost:8000';

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${FASTAPI_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  return response.json() as Promise<T>;
}

export default function RoutineScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      const data = await apiFetch<Task[]>('/tasks?user_id=mobile-user');
      setTasks(data || []);
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const task = await apiFetch<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title: newTaskTitle.trim() }),
      });
      setTasks((prev) => [...prev, task]);
      setNewTaskTitle('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add task');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updated = await apiFetch<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await apiFetch<{ ok: boolean }>(`/tasks/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {
      Alert.alert('Error', 'Failed to delete task');
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editTitle.trim()) return;
    try {
      const updated = await apiFetch<Task>(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      setEditingId(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-4 py-3">
        <View className="mb-4">
          <Text className="text-2xl font-bold text-white mb-1">Today's Routine</Text>
          <Text className="text-sm text-slate-400">{today}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" className="mt-10" />
        ) : tasks.length === 0 ? (
          <View className="py-10 items-center">
            <Text className="text-slate-400 text-center mb-4">
              No tasks yet.{'\n'}Add your first task below or chat with the agent to create tasks.
            </Text>
          </View>
        ) : (
          <View className="space-y-2">
            {tasks.map((task) => (
              <View
                key={task.id}
                className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/30"
              >
                {editingId === task.id ? (
                  <View className="flex-row gap-2 items-center">
                    <TextInput
                      value={editTitle}
                      onChangeText={setEditTitle}
                      className="flex-1 bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white"
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => handleSaveEdit(task.id)}
                      className="p-2 rounded-lg bg-blue-600"
                    >
                      <Check size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditingId(null)}
                      className="p-2 rounded-lg bg-slate-700"
                    >
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-between gap-3">
                    <TouchableOpacity
                      onPress={() => handleToggleComplete(task)}
                      className="flex-1 flex-row items-center gap-3"
                    >
                      <View
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          task.completed
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-slate-500'
                        }`}
                      >
                        {task.completed && <Check size={12} color="#fff" />}
                      </View>
                      <Text
                        className={`text-sm flex-1 ${
                          task.completed
                            ? 'text-slate-500 line-through'
                            : 'text-slate-200'
                        }`}
                      >
                        {task.title}
                      </Text>
                    </TouchableOpacity>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => handleStartEdit(task)}
                        className="p-2 rounded-lg bg-slate-700/50"
                      >
                        <Edit2 size={14} color="#94a3b8" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(task.id)}
                        className="p-2 rounded-lg bg-slate-700/50"
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add task input */}
      <View className="px-4 py-3 border-t border-slate-800">
        <View className="flex-row gap-2 items-end">
          <TextInput
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            placeholder="Add a new task..."
            placeholderTextColor="#64748b"
            className="flex-1 bg-slate-800 border border-slate-700/30 rounded-2xl px-4 py-3 text-sm text-white"
            onSubmitEditing={handleAddTask}
          />
          <TouchableOpacity
            onPress={handleAddTask}
            disabled={!newTaskTitle.trim()}
            className={`p-3 rounded-2xl ${newTaskTitle.trim() ? 'bg-blue-600' : 'bg-slate-800'}`}
          >
            <Plus size={20} color={newTaskTitle.trim() ? '#fff' : '#64748b'} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
