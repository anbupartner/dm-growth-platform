"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CTAButton } from "@/components/marketing/ui";

export default function MarketingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("[site] Unhandled render error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
        {error.message || "This page failed to load. Please try again."}
      </p>
      <div className="mt-6 flex gap-3">
        <CTAButton variant="secondary" href="/">
          Back to Home
        </CTAButton>
        <button
          onClick={() => {
            reset();
            router.refresh();
          }}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-6 py-3 text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
