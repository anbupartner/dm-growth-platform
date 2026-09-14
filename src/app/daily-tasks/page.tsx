"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { PageHeading, Card, CardHeader, Badge, Select, Button, Spinner, Input, Textarea, EmptyState, Modal, Field, StatTile } from "@/components/ui";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  type TaskStatus,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  type TaskPriority,
} from "@/lib/constants";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Bell, CalendarClock, SlidersHorizontal } from "lucide-react";

interface DailyTask {
  id: string;
  title: string;
  note?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  taskDate: string;
  endDate?: string | null;
  reminderAt?: string | null;
  createdAt: string;
}

// Left-edge accent + calendar dot color per priority — kept separate from
// TASK_PRIORITY_COLORS (badge bg/text pairs) since these need plain color
// tokens for borders/dots rather than a Tailwind bg+text className pair.
const PRIORITY_ACCENT: Record<TaskPriority, string> = {
  LOW: "border-l-slate-300 dark:border-l-slate-600",
  MEDIUM: "border-l-blue-400 dark:border-l-blue-500",
  HIGH: "border-l-red-500 dark:border-l-red-500",
};

// Local (not UTC) YYYY-MM-DD key — two tasks "for" the same calendar day in
// the consultant's own timezone should land in the same bucket regardless
// of what time of day each was created.
function dateKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return dateKey(new Date());
}

// Local midnight for "today" — an end date is a whole day, not a timestamp
// (see dateOnlyToISO), so a task due today shouldn't read as "Overdue" the
// instant the clock passes midnight on that same day. It only becomes
// overdue once the day itself has fully elapsed, i.e. endDate < today's
// start, not endDate < the current instant.
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return dateKey(date);
}

function formatDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (key === todayKey()) return `Today — ${date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`;
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatReminderLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function dateOnlyToISO(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}

function datetimeLocalToISO(value: string): string {
  return new Date(value).toISOString();
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

// --- Mini month calendar helpers --------------------------------------------

function monthKeyOf(key: string): string {
  return key.slice(0, 7); // "YYYY-MM"
}

function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function monthGrid(monthKey: string): { key: string; inMonth: boolean; day: number }[] {
  const [y, m] = monthKey.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startWeekday = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: { key: string; inMonth: boolean; day: number }[] = [];

  for (let i = startWeekday; i > 0; i--) {
    const d = new Date(y, m - 1, 1 - i);
    cells.push({ key: dateKey(d), inMonth: false, day: d.getDate() });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: dateKey(new Date(y, m - 1, day)), inMonth: true, day });
  }
  while (cells.length % 7 !== 0) {
    const [ly, lm, ld] = cells[cells.length - 1].key.split("-").map(Number);
    const d = new Date(ly, lm - 1, ld + 1);
    cells.push({ key: dateKey(d), inMonth: false, day: d.getDate() });
  }
  return cells;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DailyTasksPage() {
  const [tasks, setTasks] = useState<DailyTask[] | null>(null);
  const [viewDate, setViewDate] = useState(todayKey());
  // The calendar normally just follows whatever day is selected. Only once
  // the user browses its own prev/next-month arrows does it decouple from
  // the selected day — tracked here as an override, rather than through an
  // effect, so browsing the calendar independently of `viewDate` never
  // triggers a synchronous setState-in-effect render cascade.
  const [calendarMonthOverride, setCalendarMonthOverride] = useState<string | null>(null);
  const calendarMonth = calendarMonthOverride ?? monthKeyOf(viewDate);
  const [showAllOpen, setShowAllOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("MEDIUM");
  const [newEndDate, setNewEndDate] = useState("");
  const [newReminder, setNewReminder] = useState("");
  const [showMoreFields, setShowMoreFields] = useState(false);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editReminder, setEditReminder] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api.get<DailyTask[]>("/api/daily-tasks").then(setTasks);
  }, []);

  useEffect(() => load(), [load]);

  // Any explicit day selection (arrows, Today, tapping the calendar) drops
  // the calendar back to following the selected day.
  function selectDay(key: string) {
    setCalendarMonthOverride(null);
    setShowAllOpen(false);
    setViewDate(key);
  }

  const tasksByDay = useMemo(() => {
    const map = new Map<string, { count: number; hasHigh: boolean }>();
    for (const t of tasks ?? []) {
      const key = dateKey(t.taskDate);
      const entry = map.get(key) ?? { count: 0, hasHigh: false };
      entry.count += 1;
      if (t.priority === "HIGH") entry.hasHigh = true;
      map.set(key, entry);
    }
    return map;
  }, [tasks]);

  if (!tasks) return <div className="flex justify-center py-20"><Spinner /></div>;

  const visible = showAllOpen
    ? tasks.filter((t) => t.status !== "CLOSED")
    : tasks.filter((t) => dateKey(t.taskDate) === viewDate);

  const byStatus = (status: TaskStatus) =>
    visible
      .filter((t) => t.status === status)
      .slice()
      .sort((a, b) => TASK_PRIORITY_ORDER[b.priority] - TASK_PRIORITY_ORDER[a.priority]);

  const openTasks = tasks.filter((t) => t.status !== "CLOSED");
  const overdueCount = openTasks.filter((t) => t.endDate && new Date(t.endDate) < startOfToday()).length;
  const highPriorityOpenCount = openTasks.filter((t) => t.priority === "HIGH").length;

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    const [y, m, d] = viewDate.split("-").map(Number);
    await api.post("/api/daily-tasks", {
      title: newTitle.trim(),
      note: newNote.trim() || undefined,
      priority: newPriority,
      taskDate: new Date(y, m - 1, d).toISOString(),
      endDate: newEndDate ? dateOnlyToISO(newEndDate) : undefined,
      reminderAt: newReminder ? datetimeLocalToISO(newReminder) : undefined,
    });
    setNewTitle("");
    setNewNote("");
    setNewPriority("MEDIUM");
    setNewEndDate("");
    setNewReminder("");
    setAdding(false);
    load();
  }

  async function setStatus(task: DailyTask, status: TaskStatus) {
    await api.patch(`/api/daily-tasks/${task.id}`, { status });
    load();
  }

  async function setPriority(task: DailyTask, priority: TaskPriority) {
    await api.patch(`/api/daily-tasks/${task.id}`, { priority });
    load();
  }

  function startEdit(task: DailyTask) {
    setEditingId(task.id);
    setEditNote(task.note ?? "");
    setEditEndDate(task.endDate ? dateKey(task.endDate) : "");
    setEditReminder(toDatetimeLocalValue(task.reminderAt));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditNote("");
    setEditEndDate("");
    setEditReminder("");
  }

  async function saveEdit(task: DailyTask) {
    setSavingEdit(true);
    await api.patch(`/api/daily-tasks/${task.id}`, {
      note: editNote.trim() || null,
      endDate: editEndDate ? dateOnlyToISO(editEndDate) : null,
      reminderAt: editReminder ? datetimeLocalToISO(editReminder) : null,
    });
    setSavingEdit(false);
    cancelEdit();
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await api.del(`/api/daily-tasks/${deleteTarget.id}`);
    setDeleting(false);
    setDeleteTarget(null);
    load();
  }

  return (
    <div>
      <PageHeading title="Daily To-Do's" subtitle="Your own task list — separate from lead follow-ups." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatTile label="Pending" value={tasks.filter((t) => t.status === "PENDING").length} />
        <StatTile label="Ongoing" value={tasks.filter((t) => t.status === "ONGOING").length} />
        <StatTile label="Overdue" value={overdueCount} hint="past end date, still open" />
        <StatTile label="High Priority Open" value={highPriorityOpenCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={showAllOpen} onClick={() => selectDay(addDays(viewDate, -1))}>
                <ChevronLeft size={14} />
              </Button>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[13rem] text-center">
                {showAllOpen ? "All open tasks (any date)" : formatDateLabel(viewDate)}
              </div>
              <Button size="sm" variant="secondary" disabled={showAllOpen} onClick={() => selectDay(addDays(viewDate, 1))}>
                <ChevronRight size={14} />
              </Button>
              {!showAllOpen && viewDate !== todayKey() && (
                <Button size="sm" variant="ghost" onClick={() => selectDay(todayKey())}>
                  Today
                </Button>
              )}
            </div>
            <Button size="sm" variant={showAllOpen ? "primary" : "secondary"} onClick={() => setShowAllOpen((v) => !v)}>
              {showAllOpen ? "Showing all open" : "Show all open"}
            </Button>
          </div>

          <Card>
            <div className="p-4">
              <form onSubmit={addTask} className="space-y-3">
                <Input
                  placeholder="What needs doing?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />

                <button
                  type="button"
                  onClick={() => setShowMoreFields((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <SlidersHorizontal size={12} />
                  {showMoreFields ? "Hide details" : "Note, end date, priority, reminder…"}
                </button>

                {showMoreFields && (
                  <div className="space-y-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                    <Field label="Note (optional)">
                      <Textarea
                        placeholder="Any extra detail…"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={2}
                      />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Field label="End date">
                        <Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
                      </Field>
                      <Field label="Priority">
                        <Select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)}>
                          {TASK_PRIORITIES.map((p) => (
                            <option key={p} value={p}>
                              {TASK_PRIORITY_LABELS[p]}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Reminder">
                        <Input type="datetime-local" value={newReminder} onChange={(e) => setNewReminder(e.target.value)} />
                      </Field>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  {showAllOpen ? (
                    <p className="text-xs text-slate-400">
                      New tasks are added for {formatDateLabel(viewDate)}.
                    </p>
                  ) : (
                    <span />
                  )}
                  <Button type="submit" size="sm" disabled={adding || !newTitle.trim()}>
                    <Plus size={14} /> {adding ? "Adding…" : "Add task"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          {visible.length === 0 ? (
            <EmptyState
              title={showAllOpen ? "Nothing open" : "Nothing for this day"}
              subtitle={showAllOpen ? "No pending or ongoing tasks on any date." : "Add a task above, or check another day."}
            />
          ) : (
            <div className="space-y-4">
              <TaskGroup
                title="Ongoing"
                tasks={byStatus("ONGOING")}
                {...{ setStatus, setPriority, startEdit, cancelEdit, editingId, editNote, setEditNote, editEndDate, setEditEndDate, editReminder, setEditReminder, saveEdit, savingEdit, setDeleteTarget, showDate: showAllOpen }}
              />
              <TaskGroup
                title="Pending"
                tasks={byStatus("PENDING")}
                {...{ setStatus, setPriority, startEdit, cancelEdit, editingId, editNote, setEditNote, editEndDate, setEditEndDate, editReminder, setEditReminder, saveEdit, savingEdit, setDeleteTarget, showDate: showAllOpen }}
              />
              {!showAllOpen && (
                <TaskGroup
                  title="Closed"
                  tasks={byStatus("CLOSED")}
                  {...{ setStatus, setPriority, startEdit, cancelEdit, editingId, editNote, setEditNote, editEndDate, setEditEndDate, editReminder, setEditReminder, saveEdit, savingEdit, setDeleteTarget, showDate: showAllOpen }}
                />
              )}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-6 self-start">
          <Card>
            <CardHeader
              title={formatMonthLabel(calendarMonth)}
              action={
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setCalendarMonthOverride(addMonths(calendarMonth, -1))}>
                    <ChevronLeft size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCalendarMonthOverride(addMonths(calendarMonth, 1))}>
                    <ChevronRight size={14} />
                  </Button>
                </div>
              }
            />
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 mb-1">
                {WEEKDAY_LABELS.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid(calendarMonth).map((c) => {
                  const info = tasksByDay.get(c.key);
                  const isToday = c.key === todayKey();
                  const isSelected = !showAllOpen && c.key === viewDate;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => selectDay(c.key)}
                      title={info ? `${info.count} task${info.count === 1 ? "" : "s"}` : undefined}
                      className={clsx(
                        "aspect-square rounded-lg text-[11px] flex flex-col items-center justify-center gap-0.5 transition-colors",
                        !c.inMonth && "text-slate-300 dark:text-slate-700",
                        c.inMonth && !info && "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800",
                        c.inMonth && info && "bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20",
                        isSelected && "ring-2 ring-indigo-600",
                        isToday && !isSelected && "border border-indigo-300 dark:border-indigo-700"
                      )}
                    >
                      <span>{c.day}</span>
                      {info && <span className={clsx("h-1 w-1 rounded-full", info.hasHigh ? "bg-red-500" : "bg-indigo-500")} />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">Days with a dot have tasks — tap one to jump there.</p>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!deleteTarget} onClose={() => (deleting ? null : setDeleteTarget(null))}>
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Delete &ldquo;{deleteTarget?.title}&rdquo;?</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This permanently deletes this task. This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  setStatus,
  setPriority,
  startEdit,
  cancelEdit,
  editingId,
  editNote,
  setEditNote,
  editEndDate,
  setEditEndDate,
  editReminder,
  setEditReminder,
  saveEdit,
  savingEdit,
  setDeleteTarget,
  showDate,
}: {
  title: string;
  tasks: DailyTask[];
  setStatus: (t: DailyTask, s: TaskStatus) => void;
  setPriority: (t: DailyTask, p: TaskPriority) => void;
  startEdit: (t: DailyTask) => void;
  cancelEdit: () => void;
  editingId: string | null;
  editNote: string;
  setEditNote: (v: string) => void;
  editEndDate: string;
  setEditEndDate: (v: string) => void;
  editReminder: string;
  setEditReminder: (v: string) => void;
  saveEdit: (t: DailyTask) => void;
  savingEdit: boolean;
  setDeleteTarget: (t: { id: string; title: string } | null) => void;
  showDate: boolean;
}) {
  if (tasks.length === 0) return null;
  return (
    <Card>
      <CardHeader title={`${title} (${tasks.length})`} />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {tasks.map((t) => {
          const editing = editingId === t.id;
          const overdue = !!t.endDate && new Date(t.endDate) < startOfToday() && t.status !== "CLOSED";
          return (
            <div key={t.id} className={clsx("border-l-4 px-4 py-3 sm:px-5", PRIORITY_ACCENT[t.priority])}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx("text-sm font-medium", t.status === "CLOSED" ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200")}>
                      {t.title}
                    </span>
                    <Badge className={TASK_STATUS_COLORS[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
                    {t.endDate && (
                      <Badge
                        className={
                          overdue
                            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }
                      >
                        <CalendarClock size={11} className="mr-1 -ml-0.5 inline" />
                        {overdue ? "Overdue " : "Due "}
                        {formatShortDate(t.endDate)}
                      </Badge>
                    )}
                    {t.reminderAt && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        <Bell size={11} className="mr-1 -ml-0.5 inline" />
                        {formatReminderLabel(t.reminderAt)}
                      </Badge>
                    )}
                    {showDate && <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{dateKey(t.taskDate)}</Badge>}
                    {!editing && (
                      <button onClick={() => startEdit(t)} className="text-slate-300 hover:text-indigo-600" title="Edit note, end date, or reminder">
                        <Pencil size={12} />
                      </button>
                    )}
                  </div>

                  {editing ? (
                    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
                      <Field label="Note">
                        <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={2} className="text-xs" placeholder="Note (optional)" />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="End date">
                          <Input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} className="text-xs" />
                        </Field>
                        <Field label="Reminder">
                          <Input type="datetime-local" value={editReminder} onChange={(e) => setEditReminder(e.target.value)} className="text-xs" />
                        </Field>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(t)} disabled={savingEdit}>
                          {savingEdit ? "Saving…" : "Save"}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={savingEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    t.note && <p className="text-xs text-slate-500 mt-1">{t.note}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24">
                    <Select value={t.priority} onChange={(e) => setPriority(t, e.target.value as TaskPriority)} className="text-xs">
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {TASK_PRIORITY_LABELS[p]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-28">
                    <Select value={t.status} onChange={(e) => setStatus(t, e.target.value as TaskStatus)} className="text-xs">
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {TASK_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button size="sm" variant="ghost" title="Delete this task" onClick={() => setDeleteTarget({ id: t.id, title: t.title })}>
                    <Trash2 size={13} className="text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
