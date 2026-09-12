"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

interface FollowUpRow {
  id: string;
  leadId: string;
  type: string;
  note?: string | null;
  dueDate?: string | null;
  completed: boolean;
  businessName?: string;
}

const POLL_MS = 60_000;
const NOTIFIED_KEY = "dm-growth-notified-follow-ups";

function loadNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveNotifiedIds(ids: Set<string>) {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore — localStorage may be unavailable (private browsing, quota)
  }
}

/**
 * Polls /api/follow-ups on an interval and:
 *  - returns a badge count of follow-ups that are overdue or due today
 *  - when desktopNotificationsEnabled is true and the browser has actually
 *    granted Notification permission, fires a real desktop notification for
 *    each such follow-up, once per browser (deduped via localStorage).
 *
 * Intended to be called exactly once, from AppShell, so a single tab of the
 * app keeps polling regardless of which page is currently mounted.
 */
export function useFollowUpAlerts(desktopNotificationsEnabled: boolean) {
  const [badgeCount, setBadgeCount] = useState(0);
  const notifiedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (notifiedRef.current === null) notifiedRef.current = loadNotifiedIds();
    let cancelled = false;

    async function poll() {
      let rows: FollowUpRow[];
      try {
        rows = await api.get<FollowUpRow[]>("/api/follow-ups");
      } catch {
        return;
      }
      if (cancelled) return;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 86_400_000);
      const overdueOrToday = rows.filter(
        (r) => !r.completed && r.dueDate && new Date(r.dueDate) < endOfToday
      );

      setBadgeCount(overdueOrToday.length);

      if (
        desktopNotificationsEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        const notified = notifiedRef.current!;
        let changed = false;
        for (const fu of overdueOrToday) {
          if (notified.has(fu.id)) continue;
          notified.add(fu.id);
          changed = true;
          const overdue = new Date(fu.dueDate!) < startOfToday;
          const n = new Notification(overdue ? "Follow-up overdue" : "Follow-up due today", {
            body: `${fu.businessName ?? "A lead"} — ${fu.type}${fu.note ? `: ${fu.note}` : ""}`,
            tag: `follow-up-${fu.id}`,
          });
          n.onclick = () => {
            window.focus();
            // Fired from a Notification click handler, outside React's
            // render tree — no router instance is available here, so a
            // hard navigation is the correct tool, not a lint violation.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = `/leads/${fu.leadId}`;
          };
        }
        if (changed) saveNotifiedIds(notified);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [desktopNotificationsEnabled]);

  return badgeCount;
}
