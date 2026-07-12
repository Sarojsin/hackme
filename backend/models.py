from pydantic import BaseModel
from typing import Optional, List, Any


# ─── Request Models ──────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None  # Deprecated — auth token is source of truth


class TogglePluginRequest(BaseModel):
    user_id: Optional[str] = None  # Deprecated — auth token is source of truth
    enabled: bool


class UpdateTaskRequest(BaseModel):
    title: Optional[str] = None
    completed: Optional[bool] = None
    due_date: Optional[str] = None


# ─── Response Models ─────────────────────────────────────

class AlarmInfo(BaseModel):
    id: str
    time: str
    label: Optional[str] = None
    status: str = "pending"


class Task(BaseModel):
    id: str
    user_id: str
    title: str
    due_date: Optional[str] = None
    completed: bool = False
    created_at: Optional[str] = None


class WeatherData(BaseModel):
    temperature: float
    condition: str
    high: float
    low: float
    humidity: float
    city: str


class CalendarEventInfo(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: Optional[str] = None
    location: Optional[str] = None
    all_day: bool = False


class VocabularyWord(BaseModel):
    english: str
    nepali: str
    pronunciation: str
    category: str


class Quote(BaseModel):
    text: str
    author: str
    language: str


class MusicTrack(BaseModel):
    title: str
    artist: str
    genre: str
    mood: str
    duration: str


class LearningData(BaseModel):
    vocabulary: Optional[list[VocabularyWord]] = None
    quote: Optional[Quote] = None
    music: Optional[list[MusicTrack]] = None
    language: Optional[str] = None
    action: Optional[str] = None


class StructuredData(BaseModel):
    tasks: Optional[list[Task]] = None
    weather: Optional[WeatherData] = None
    alarm: Optional[AlarmInfo] = None
    events: Optional[list[CalendarEventInfo]] = None
    learning: Optional[LearningData] = None
    schedule: Optional[dict] = None
    schedules: Optional[list[dict]] = None


class ScheduleCreate(BaseModel):
    trigger_time: str
    action_type: str
    action_desc: Optional[str] = None
    payload: dict = {}


class Schedule(BaseModel):
    id: str
    user_id: str
    trigger_time: str
    action_type: str
    action_desc: Optional[str] = None
    payload: dict = {}
    status: str = "pending"
    created_at: str


class ChatResponse(BaseModel):
    reply: str
    data: Optional[StructuredData] = None


class PluginManifest(BaseModel):
    name: str
    description: str
    enabled: bool


class PluginListResponse(BaseModel):
    plugins: list[PluginManifest]


class PluginToggleResponse(BaseModel):
    name: str
    enabled: bool