"use client";

import { useEffect } from "react";
import { useSelectedIndustry } from "./IndustryContext";
import { setIndustryViewed } from "@/lib/marketing/attribution";

// Mounted on an industry landing page — persists the industry selection
// (for the homepage's "How I Can Help" section) and records it as the
// most-recently-viewed industry for lead attribution, even for a visitor
// who lands here directly (e.g. from a paid ad) without going through the
// popup.
export function IndustryViewTracker({ industrySlug, industryName }: { industrySlug: string; industryName: string }) {
  const { setSelectedIndustry } = useSelectedIndustry();

  useEffect(() => {
    setSelectedIndustry(industrySlug);
    setIndustryViewed(industryName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [industrySlug, industryName]);

  return null;
}
