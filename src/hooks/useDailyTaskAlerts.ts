"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

interface DailyTaskRow {
  id: string;
  status: string;
}

const POLL_MS = 60_000;

/**
 * Polls /api/daily-tasks on an interval and returns a badge count of tasks
 * currently in progress (status === "ONGOING") — mirrors useFollowUpAlerts'
 * polling shape but only needs a count, no desktop notifications.
 *
 * Intended to be called once, from AppShell, so a single tab keeps this
 * fresh regardless of which page is currently mounted.
 */
export function useDailyTaskAlerts() {
  const [ongoingCount, setOngoingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      let rows: DailyTaskRow[];
      try {
        rows = await api.get<DailyTaskRow[]>("/api/daily-tasks");
      } catch {
        return;
      }
      if (cancelled) return;
      setOngoingCount(rows.filter((r) => r.status === "ONGOING").length);
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return ongoingCount;
}
