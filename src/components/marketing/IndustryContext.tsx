"use client";

// Session-persisted "which industry is this visitor" state (spec section
// 19/22) — set by the industry-selection popup or by visiting an industry
// page directly, read by the homepage's "How I Can Help Your Business"
// section so it stays relevant across the visit without asking again.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface IndustryContextValue {
  selectedIndustry: string | null;
  setSelectedIndustry: (slug: string | null) => void;
}

const IndustryContext = createContext<IndustryContextValue>({
  selectedIndustry: null,
  setSelectedIndustry: () => {},
});

const STORAGE_KEY = "selectedIndustry";

export function SelectedIndustryProvider({ children }: { children: ReactNode }) {
  const [selectedIndustry, setSelectedIndustryState] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSelectedIndustryState(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      // ignore
    }
  }, []);

  const setSelectedIndustry = useCallback((slug: string | null) => {
    setSelectedIndustryState(slug);
    try {
      if (slug) sessionStorage.setItem(STORAGE_KEY, slug);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <IndustryContext.Provider value={{ selectedIndustry, setSelectedIndustry }}>{children}</IndustryContext.Provider>
  );
}

export function useSelectedIndustry() {
  return useContext(IndustryContext);
}
