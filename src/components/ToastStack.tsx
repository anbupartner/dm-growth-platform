"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { ActivityToast } from "@/hooks/useActivityToasts";

const AUTO_DISMISS_MS = 8000;

function ToastCard({ toast, onDismiss }: { toast: ActivityToast; onDismiss: (id: string) => void }) {
  const router = useRouter();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    // Two rAFs so the initial (off-screen) state actually paints before we
    // transition it in — a single rAF can still get batched with the
    // mount's own paint and skip the animation.
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf1);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div
      role="status"
      onClick={() => {
        router.push(toast.href);
        onDismiss(toast.id);
      }}
      className={`pointer-events-auto w-80 max-w-[calc(100vw-2rem)] cursor-pointer rounded-lg border border-slate-200 bg-white shadow-lg transition-all duration-300 ease-out dark:border-slate-700 dark:bg-slate-800 ${
        entered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{toast.title}</p>
          {toast.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{toast.body}</p>}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(toast.id);
          }}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-0.5 text-slate-300 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/**
 * Fixed-position stack of pop-up notifications — new leads, status changes,
 * proposals/reports generated, follow-ups logged, and follow-ups coming due —
 * fed by useActivityToasts(). Mounted once in AppShell so it persists across
 * every page. Each toast auto-dismisses after a few seconds; clicking one
 * (anywhere but the close button) jumps straight to that lead.
 */
export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ActivityToast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 sm:bottom-6 sm:right-6">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
