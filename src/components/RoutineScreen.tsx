import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Check, Trash2, Edit2 } from 'lucide-react';
import type { Task, ScheduleInfo } from '../types';
import { getTasks, createTask, updateTask, deleteTask } from '../api/fastapi';
import { getSchedules, getDueSchedules, updateScheduleStatus, executeScheduleAction } from '../api/fastapi';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  token?: string;
}

type Tab = 'tasks' | 'schedules';

export default function RoutineScreen({ open, onClose, userId, token }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<ScheduleInfo[]>([]);
  const [actionResults, setActionResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [tab, setTab] = useState<Tab>('tasks');
  const seenScheduleIds = useRef<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await getTasks(userId, token);
      setTasks(data || []);
    } catch {
      // silently fail for now
    } finally {
      setLoading(false);
    }
  }, [open, userId, token]);

  const loadSchedules = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await getSchedules(userId, token);
      setSchedules(data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [open, userId, token]);

  useEffect(() => {
    if (tab === 'tasks') loadTasks();
    else loadSchedules();
  }, [tab, loadTasks, loadSchedules, open]);

  // 30s poller for due schedules
  useEffect(() => {
    if (!open || tab !== 'schedules') return;

    const pollDue = async () => {
      try {
        const due = await getDueSchedules(userId, token);
        const newDue = due.filter((s) => !seenScheduleIds.current.has(s.id));
        for (const s of newDue) {
          seenScheduleIds.current.add(s.id);
          try {
            const result = await executeScheduleAction(s.id, token);
            setActionResults((prev) => ({ ...prev, [s.id]: result }));
          } catch {
            // ignore
          }
          try { await updateScheduleStatus(s.id, 'completed', token); } catch { /* ignore */ }
        }
        if (newDue.length > 0) {
          loadSchedules();
        }
      } catch {
        // ignore
      }
    };

    pollDue();
    const interval = setInterval(pollDue, 30000);
    return () => clearInterval(interval);
  }, [open, tab, userId, token, loadSchedules]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const task = await createTask(userId, newTaskTitle.trim(), token);
      setTasks((prev) => [...prev, task]);
      setNewTaskTitle('');
    } catch {
      // ignore
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, userId, { completed: !task.completed }, token);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      // ignore
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId, userId, token);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      // ignore
    }
  };

  const handleStartEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editingId) return;
    try {
      const updated = await updateTask(editingId, userId, { title: editTitle.trim() }, token);
      setTasks((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      setEditingId(null);
    } catch {
      // ignore
    }
  };

  const handleScheduleToggleComplete = async (schedule: ScheduleInfo) => {
    try {
      const updated = await updateScheduleStatus(schedule.id, 'completed', token);
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)));
    } catch {
      // ignore
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const pendingTaskCount = tasks.filter((t) => !t.completed).length;
  const completedTaskCount = tasks.filter((t) => t.completed).length;
  const pendingScheduleCount = schedules.filter((s) => s.status === 'pending').length;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-surface border-l border-border/40 
                    shadow-2xl transform transition-transform duration-300 ease-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Today's Routine"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Today&apos;s Routine</h2>
            <p className="text-[11px] text-foreground/40">
              {tab === 'tasks'
                ? `${pendingTaskCount} pending · ${completedTaskCount} done`
                : `${pendingScheduleCount} pending`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-foreground/40 hover:text-foreground 
                       hover:bg-muted transition-all duration-150 cursor-pointer"
            aria-label="Close routine"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-3 border-b border-border/30">
          <div className="flex rounded-lg bg-muted/50 p-1">
            <button
              onClick={() => setTab('tasks')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === 'tasks'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-foreground/40 hover:text-foreground/70'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setTab('schedules')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === 'schedules'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-foreground/40 hover:text-foreground/70'
              }`}
            >
              Schedules
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <p className="text-xs text-foreground/40 mb-3">{today}</p>

          {loading ? (
            <div className="py-10 text-center text-xs text-foreground/40">Loading...</div>
          ) : tab === 'tasks' ? (
            tasks.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-foreground/40 mb-2">No tasks yet</p>
                <p className="text-xs text-foreground/30">
                  Chat with the agent to add tasks, or add them here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="px-3.5 py-3 rounded-xl border border-border/30 bg-muted/30"
                  >
                    {editingId === task.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-white"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 rounded-lg bg-blue-600 text-white"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-slate-700 text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className="flex-1 flex items-center gap-2.5 text-left"
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              task.completed
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-slate-500'
                            }`}
                          >
                            {task.completed && <Check size={10} color="#fff" />}
                          </div>
                          <span
                            className={`text-sm ${
                              task.completed
                                ? 'text-foreground/30 line-through'
                                : 'text-foreground/85'
                            }`}
                          >
                            {task.title}
                          </span>
                        </button>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleStartEdit(task)}
                            className="p-1.5 rounded-md hover:bg-muted text-foreground/40 hover:text-foreground/70 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1.5 rounded-md hover:bg-muted text-foreground/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            schedules.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-foreground/40 mb-2">No schedules yet</p>
                <p className="text-xs text-foreground/30">
                  Chat with the agent to create schedules.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="px-3.5 py-3 rounded-xl border border-border/30 bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            schedule.status === 'completed'
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-slate-500'
                          }`}
                        >
                          {schedule.status === 'completed' && <Check size={10} color="#fff" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground/85">
                            {schedule.action_desc || schedule.action_type}
                          </span>
                          <span className="text-[11px] text-foreground/40">
                            {new Date(schedule.trigger_time).toLocaleString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      {schedule.status === 'pending' && (
                        <button
                          onClick={() => handleScheduleToggleComplete(schedule)}
                          className="px-2 py-1 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {Object.entries(actionResults).map(([id, result]) => {
                  const schedule = schedules.find((s) => s.id === id);
                  if (!schedule) return null;
                  const isQuote = result.action_type === 'quote';
                  const isLearning = result.action_type === 'learning';
                  const isMusic = result.action_type === 'music';
                  const isAlarm = result.action_type === 'alarm';
                  const isGym = result.action_type === 'gym';
                  const isWeather = result.action_type === 'weather';
                  return (
                    <div key={`result-${id}`} className="px-3.5 py-3 rounded-xl border border-blue-500/30 bg-blue-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground/85">
                          {schedule.action_desc || schedule.action_type}
                        </span>
                        <span className="text-[10px] text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded-full">
                          Executed
                        </span>
                      </div>
                      {isQuote && result.items && (
                        <div className="mt-2 space-y-1">
                          {result.items.map((q: any, i: number) => (
                            <div key={i} className="text-xs text-foreground/70 italic">
                              “{q.text}” — {q.author}
                            </div>
                          ))}
                        </div>
                      )}
                      {(isLearning || isMusic) && result.items && (
                        <div className="mt-2 space-y-1">
                          {result.items.map((item: any, i: number) => (
                            <div key={i} className="text-xs text-foreground/70">
                              {isLearning ? `${item.english} → ${item.nepali} (${item.category})` : `${item.title} — ${item.artist}`}
                            </div>
                          ))}
                        </div>
                      )}
                      {isAlarm && (
                        <div className="mt-1 text-xs text-foreground/70">
                          {result.message} {result.label && `• ${result.label}`}
                        </div>
                      )}
                      {isGym && (
                        <div className="mt-1 text-xs text-foreground/70">
                          {result.message}
                          {result.items && result.items.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {result.items.map((ex: any, i: number) => (
                                <div key={i}>{i + 1}. {ex.name || ex.exercise || 'Exercise'} — {ex.sets ?? ''}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {isWeather && result.weather && (
                        <div className="mt-1 text-xs text-foreground/70">
                          <div className="font-medium">Weather in {result.weather.city}:</div>
                          <div>• Temperature: {result.weather.temperature}°C ({result.weather.condition.replace('_', ' ')})\n• High: {result.weather.high}° / Low: {result.weather.low}°\n• Humidity: {result.weather.humidity}%</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border/40 bg-surface p-3">
          {tab === 'tasks' && (
            <div className="flex gap-2 items-end">
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a new task..."
                className="flex-1 bg-slate-800 border border-slate-700/30 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim()}
                className={`p-2.5 rounded-xl ${
                  newTaskTitle.trim() ? 'bg-blue-600' : 'bg-slate-800'
                }`}
              >
                <Plus size={18} color={newTaskTitle.trim() ? '#fff' : '#64748b'} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
