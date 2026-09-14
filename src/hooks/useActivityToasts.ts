"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

interface FollowUpRow {
  id: string;
  leadId: string;
  type: string;
  note?: string | null;
  dueDate?: string | null;
  completed: boolean;
  createdAt: string;
  businessName?: string | null;
}

interface DailyTaskRow {
  id: string;
  title: string;
  note?: string | null;
  status: "PENDING" | "ONGOING" | "CLOSED";
  reminderAt?: string | null;
}

export interface ActivityToast {
  id: string;
  title: string;
  body?: string;
  href: string;
}

interface StoredState {
  // ids that have already produced an "activity" toast (a brand-new
  // follow-up/lead-history row of any kind)
  newRowSeen: string[];
  // ids that have already produced a "due/overdue" toast (a still-open
  // follow-up whose due date has arrived) — tracked separately from
  // newRowSeen because the SAME row can toast once when it's logged and
  // again later, on a different day, when it actually comes due
  dueSeen: string[];
  // daily-task ids that have already produced a "reminder" toast (their
  // reminderAt has arrived) — same seen-once idea, its own bucket because
  // a task and a follow-up can never share an id.
  reminderSeen: string[];
}

const POLL_MS = 60_000;
const STATE_KEY = "dm-growth-activity-toast-state-v1";
const MAX_VISIBLE_TOASTS = 5;

function loadState(): StoredState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      newRowSeen: Array.isArray(parsed.newRowSeen) ? parsed.newRowSeen : [],
      dueSeen: Array.isArray(parsed.dueSeen) ? parsed.dueSeen : [],
      reminderSeen: Array.isArray(parsed.reminderSeen) ? parsed.reminderSeen : [],
    };
  } catch {
    return null;
  }
}

function saveState(newRowSeen: Set<string>, dueSeen: Set<string>, reminderSeen: Set<string>) {
  try {
    localStorage.setItem(
      STATE_KEY,
      JSON.stringify({ newRowSeen: [...newRowSeen], dueSeen: [...dueSeen], reminderSeen: [...reminderSeen] })
    );
  } catch {
    // ignore — localStorage may be unavailable (private browsing, quota)
  }
}

function activityTitle(type: string): string {
  switch (type) {
    case "Lead Created":
      return "New lead";
    case "Status Change":
      return "Status changed";
    case "Proposal":
      return "Proposal generated";
    case "Report Sent":
      return "Report generated";
    default:
      return `${type} logged`;
  }
}

/**
 * Polls /api/follow-ups (every lead-history event plus scheduled follow-ups)
 * and /api/daily-tasks (the personal to-do list), turning three kinds of
 * moments into an in-app pop-up toast, on top of the existing nav badge /
 * optional desktop notification:
 *
 *  1. A brand-new follow-up/lead-history row appears.
 *  2. A still-open follow-up's due date arrives (due today or overdue).
 *  3. A daily task's reminder time arrives, while the task is still open.
 *
 * On the very first poll ever in a given browser, nothing is toasted —
 * the whole existing backlog (including any reminders already in the past)
 * is just recorded as "seen" — so installing/changing this feature doesn't
 * dump a wall of pop-ups. Every poll after that toasts only what's new.
 */
export function useActivityToasts() {
  const [toasts, setToasts] = useState<ActivityToast[]>([]);
  const stateRef = useRef<{ newRowSeen: Set<string>; dueSeen: Set<string>; reminderSeen: Set<string> } | null>(null);
  const bootstrappedRef = useRef(false);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const [followUps, tasks] = await Promise.all([
        api.get<FollowUpRow[]>("/api/follow-ups").catch(() => [] as FollowUpRow[]),
        api.get<DailyTaskRow[]>("/api/daily-tasks").catch(() => [] as DailyTaskRow[]),
      ]);
      if (cancelled) return;

      if (stateRef.current === null) {
        const stored = loadState();
        if (stored) {
          stateRef.current = {
            newRowSeen: new Set(stored.newRowSeen),
            dueSeen: new Set(stored.dueSeen),
            reminderSeen: new Set(stored.reminderSeen),
          };
          bootstrappedRef.current = true;
        } else {
          stateRef.current = { newRowSeen: new Set(), dueSeen: new Set(), reminderSeen: new Set() };
          bootstrappedRef.current = false;
        }
      }
      const { newRowSeen, dueSeen, reminderSeen } = stateRef.current;

      const now = new Date();
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const isDueOrOverdue = (r: FollowUpRow) => !r.completed && r.dueDate && new Date(r.dueDate) < endOfToday;
      const isReminderDue = (t: DailyTaskRow) =>
        t.status !== "CLOSED" && !!t.reminderAt && new Date(t.reminderAt) <= now;

      if (!bootstrappedRef.current) {
        for (const r of followUps) {
          newRowSeen.add(r.id);
          if (isDueOrOverdue(r)) dueSeen.add(r.id);
        }
        for (const t of tasks) {
          if (isReminderDue(t)) reminderSeen.add(t.id);
        }
        bootstrappedRef.current = true;
        saveState(newRowSeen, dueSeen, reminderSeen);
        return;
      }

      const fresh: ActivityToast[] = [];

      for (const r of followUps) {
        if (!newRowSeen.has(r.id)) {
          newRowSeen.add(r.id);
          fresh.push({
            id: `new:${r.id}`,
            title: `${activityTitle(r.type)}${r.businessName ? ` — ${r.businessName}` : ""}`,
            body: r.note ?? undefined,
            href: `/leads/${r.leadId}`,
          });
          // A row we've just toasted as "new" can't simultaneously need the
          // due/overdue toast below — if it's already due today, that's
          // covered by the same message, so mark it seen for that too.
          if (isDueOrOverdue(r)) dueSeen.add(r.id);
          continue;
        }
        if (isDueOrOverdue(r) && !dueSeen.has(r.id)) {
          dueSeen.add(r.id);
          const overdue = new Date(r.dueDate!) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
          fresh.push({
            id: `due:${r.id}`,
            title: overdue ? "Follow-up overdue" : "Follow-up due today",
            body: `${r.businessName ?? "A lead"} — ${r.type}${r.note ? `: ${r.note}` : ""}`,
            href: `/leads/${r.leadId}`,
          });
        }
      }

      for (const t of tasks) {
        if (isReminderDue(t) && !reminderSeen.has(t.id)) {
          reminderSeen.add(t.id);
          fresh.push({
            id: `reminder:${t.id}`,
            title: "Task reminder",
            body: t.note ? `${t.title} — ${t.note}` : t.title,
            href: `/daily-tasks`,
          });
        }
      }

      if (fresh.length > 0) {
        saveState(newRowSeen, dueSeen, reminderSeen);
        setToasts((prev) => [...fresh, ...prev].slice(0, MAX_VISIBLE_TOASTS));
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { toasts, dismiss };
}
