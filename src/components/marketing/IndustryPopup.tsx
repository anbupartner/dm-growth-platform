"use client";

// Industry-selection popup (spec section 19) — "What business are you
// looking to grow?" Shown once per session on first arrival at the
// homepage, persists the choice (see IndustryContext) and routes straight
// into that industry's case-study landing page.

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { INDUSTRIES } from "@/lib/marketing/industries";
import { useSelectedIndustry } from "./IndustryContext";

const SEEN_KEY = "industryPopupSeen";

export function IndustryPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const { setSelectedIndustry } = useSelectedIndustry();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (sessionStorage.getItem(SEEN_KEY) === "1") return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  function dismiss() {
    setOpen(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }

  function choose(slug: string | null) {
    dismiss();
    if (!slug) {
      router.push("/contact");
      return;
    }
    setSelectedIndustry(slug);
    router.push(`/casestudy/${slug}`);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60" onClick={dismiss} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
        >
          <X size={18} />
        </button>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white pr-6">
          What business are you looking to grow?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Pick your industry to see relevant work, results and proof.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {INDUSTRIES.map((industry) => (
            <button
              key={industry.slug}
              onClick={() => choose(industry.slug)}
              className="rounded-full border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-900 hover:text-slate-900 dark:hover:border-white dark:hover:text-white transition-colors"
            >
              {industry.popupLabel}
            </button>
          ))}
          <button
            onClick={() => choose(null)}
            className="rounded-full border border-dashed border-slate-300 dark:border-slate-700 px-3.5 py-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-slate-900 hover:text-slate-900 dark:hover:border-white dark:hover:text-white transition-colors"
          >
            Other
          </button>
        </div>
        <button onClick={dismiss} className="mt-5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
          Skip for now
        </button>
      </div>
    </div>
  );
}
