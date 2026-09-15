"use client";

import { useEffect } from "react";
import { setCaseStudyViewed } from "@/lib/marketing/attribution";

export function CaseStudyViewTracker({ clientName }: { clientName: string }) {
  useEffect(() => {
    setCaseStudyViewed(clientName);
  }, [clientName]);

  return null;
}
