// ─── Chat ───────────────────────────────────────────────
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

// ─── Structured data that can appear inside assistant messages ──
export interface StructuredData {
  tasks?: Task[];
  weather?: WeatherData;
  alarm?: AlarmInfo;
  events?: CalendarEvent[];
  learning?: LearningData;
  schedule?: ScheduleInfo;
  schedules?: ScheduleInfo[];
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

// ─── Calendar Events ────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  all_day?: boolean;
}

// ─── Learning ──────────────────────────────────────────
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

export interface LearningData {
  vocabulary?: VocabularyWord[];
  quote?: Quote;
  music?: MusicTrack[];
  language?: string;
  action?: string;
}

// ─── Schedule / Reminders ──────────────────────────────
export interface ScheduleInfo {
  id: string;
  trigger_time: string;
  action_type: 'alarm' | 'quote' | 'learning' | 'gym' | 'task' | 'reminder' | 'morning_routine';
  action_desc?: string;
  payload?: Record<string, any>;
  status: 'pending' | 'completed' | 'cancelled';
}

// ─── Plugins ────────────────────────────────────────────
export interface PluginManifest {
  name: string;
  description: string;
  enabled: boolean;
}

// ─── API Responses ──────────────────────────────────────
export interface ChatResponse {
  reply: string;
  data?: StructuredData;
}

export interface PluginListResponse {
  plugins: PluginManifest[];
}

export interface PluginToggleResponse {
  name: string;
  enabled: boolean;
}

// ─── Morning Routine ────────────────────────────────────
export interface MorningBriefing {
  tasks: Task[];
  weather: WeatherData;
  quote?: string;
}

// ─── Scheduled Event ────────────────────────────────────
export interface ScheduledEvent {
  id: string;
  user_id: string;
  trigger_time: string;
  action_type: 'alarm' | 'morning_routine' | 'reminder';
  payload: {
    label?: string;
    follow_up_actions?: string[];
  };
  status: 'pending' | 'completed' | 'cancelled';
}

// ─── User Plugin ────────────────────────────────────────
export interface UserPlugin {
  id: string;
  user_id: string;
  plugin_name: string;
  enabled: boolean;
}
