"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureLandingPageOnce, captureUtmOnce } from "@/lib/marketing/attribution";

function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    captureLandingPageOnce(qs ? `${pathname}?${qs}` : pathname);
    captureUtmOnce(searchParams);
    // Only ever runs on the very first render of a session (both capture
    // functions are no-ops once a value is already stored) — deliberately
    // not re-running per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// useSearchParams needs a Suspense boundary or the route opts fully into
// dynamic rendering — wrapping just this invisible tracker keeps the rest
// of each marketing page statically generated.
export function AttributionTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
