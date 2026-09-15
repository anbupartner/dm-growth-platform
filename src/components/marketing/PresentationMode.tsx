"use client";

// Presentation Mode (spec section 21) — lets the consultant open the site
// during a live client/prospect meeting with nav hidden, larger type, and
// full-screen sections you can step through with the arrow keys. Scoped to
// the Home page's <section data-slide> blocks; other pages simply keep
// their normal layout with header/footer since they aren't part of the
// pitch sequence.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

interface PresentationModeContextValue {
  active: boolean;
  toggle: () => void;
}

const PresentationModeContext = createContext<PresentationModeContextValue>({ active: false, toggle: () => {} });

const STORAGE_KEY = "presentationMode";

export function PresentationModeProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      setActive(sessionStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // sessionStorage unavailable (e.g. private mode) — default to off
    }
  }, []);

  const toggle = useCallback(() => {
    setActive((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("presentation-mode", active);
    return () => document.documentElement.classList.remove("presentation-mode");
  }, [active]);

  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") toggle();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, toggle]);

  return <PresentationModeContext.Provider value={{ active, toggle }}>{children}</PresentationModeContext.Provider>;
}

export function usePresentationMode() {
  return useContext(PresentationModeContext);
}

export function PresentationModeToggle({ className }: { className?: string }) {
  const { active, toggle } = usePresentationMode();
  return (
    <button
      type="button"
      onClick={toggle}
      title={active ? "Exit presentation mode" : "Enter presentation mode"}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white transition-colors"
      }
    >
      {active ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      {active ? "Exit presentation" : "Presentation mode"}
    </button>
  );
}

// The regular header (which normally hosts PresentationModeToggle) hides
// itself entirely while presenting — see MarketingHeader. Without this,
// there would be no visible way to exit once presenting. Rendered once in
// the marketing layout, always mounted, only visible while active.
export function PresentationModeExitButton() {
  const { active, toggle } = usePresentationMode();
  if (!active) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      title="Exit presentation mode (or press Esc)"
      className="fixed top-4 right-4 z-50 inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 text-white dark:bg-white/90 dark:text-slate-900 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur hover:bg-slate-900 dark:hover:bg-white transition-colors"
    >
      <Minimize2 size={14} /> Exit presentation
    </button>
  );
}

// Enables Up/Down/PageUp/PageDown/arrow-key navigation between the
// top-level `[data-slide]` sections on the page currently using it, only
// while presentation mode is active. Each section scrolls fully into view,
// one at a time, edge to edge.
export function usePresentationSlideNav() {
  const { active } = usePresentationMode();

  useEffect(() => {
    if (!active) return;

    function slides(): HTMLElement[] {
      return Array.from(document.querySelectorAll<HTMLElement>("[data-slide]"));
    }

    function currentIndex(list: HTMLElement[]): number {
      let closest = 0;
      let closestDist = Infinity;
      list.forEach((el, i) => {
        const dist = Math.abs(el.getBoundingClientRect().top);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      return closest;
    }

    function go(delta: number) {
      const list = slides();
      if (list.length === 0) return;
      const idx = currentIndex(list);
      const next = Math.min(Math.max(idx + delta, 0), list.length - 1);
      list[next].scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);
}
