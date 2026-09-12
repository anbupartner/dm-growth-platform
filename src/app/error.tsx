"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

// Next's App Router error boundary — catches any exception thrown while
// rendering a page (or a data-fetching call made directly in a Server
// Component) and shows this instead of Next's own default, unstyled error
// screen. It renders inside the root layout (AppShell), so the sidebar nav
// stays visible and usable — the person can navigate away instead of being
// stuck on a dead page. A route-level API failure (fetch calls from client
// pages) is a separate, already-handled concern — see the loadError/setError
// patterns throughout the app; this only ever fires for a genuine render-time
// exception, which previously had no fallback screen at all anywhere in the
// app.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("[UI] Unhandled render error:", error);
  }, [error]);

  return (
    <div className="flex justify-center py-20 px-4">
      <Card className="max-w-md w-full p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h1 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">Something went wrong</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/")}>
            Go to Dashboard
          </Button>
          <Button onClick={reset}>Try again</Button>
        </div>
      </Card>
    </div>
  );
}
