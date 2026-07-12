export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: ChatMetadata;
  created_at: string;
}

export interface ChatMetadata {
  proactive?: boolean;
  event_type?: 'morning_routine' | 'alarm' | 'reminder';
  data?: StructuredData;
}

export interface StructuredData {
  tasks?: Task[];
  weather?: WeatherData;
  alarm?: AlarmInfo;
  events?: CalendarEvent[];
  learning?: LearningData;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  due_date?: string | null;
  completed: boolean;
  created_at: string;
}

export interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';
  high: number;
  low: number;
  humidity: number;
  city: string;
}

export interface AlarmInfo {
  id: string;
  time: string;
  label?: string;
  status: 'pending' | 'completed';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  all_day?: boolean;
}

export interface LearningData {
  vocabulary?: VocabularyWord[];
  quote?: Quote;
  music?: MusicTrack[];
  language?: string;
  action?: string;
}

export interface VocabularyWord {
  english: string;
  nepali: string;
  pronunciation: string;
  category: string;
}

export interface Quote {
  text: string;
  author: string;
  language: string;
}

export interface MusicTrack {
  title: string;
  artist: string;
  genre: string;
  mood: string;
  duration: string;
}

export interface ChatResponse {
  reply: string;
  data?: StructuredData;
}

export interface PluginManifest {
  name: string;
  description: string;
  enabled: boolean;
}

export interface PluginListResponse {
  plugins: PluginManifest[];
}

export interface PluginToggleResponse {
  name: string;
  enabled: boolean;
}
