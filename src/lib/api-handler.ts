import { NextResponse } from "next/server";

// Every API route handler in this app funnels an unexpected thrown
// exception through here rather than letting it become an unhandled 500
// with Next's raw default error page/stack trace. Before this existed, 30
// of the app's 32 route files had zero try/catch anywhere — a malformed
// request body, a DB constraint violation, a filesystem permission error,
// or a @react-pdf/renderer failure all surfaced as an opaque, undiagnosable
// crash with nothing logged server-side either.
//
// This only ever fires for a genuinely UNEXPECTED failure. Every route
// still returns its own specific 400/404/etc. NextResponse for expected,
// already-handled cases (missing required field, record not found, and so
// on) — those never reach here, and this file changes nothing about them.
//
// `routeLabel` is a short "METHOD /api/..." string, so a failure logged
// here is traceable back to exactly which route produced it from server
// logs alone.
//
// The client-facing message intentionally includes the real error message
// rather than a generic "something went wrong": this is a single-
// consultant internal tool, not a public multi-tenant SaaS, so whoever
// hits the error is also the person who needs to diagnose it — hiding the
// real message would only make that harder, and there's no other-user data
// to leak by showing it.
export function apiErrorResponse(err: unknown, routeLabel: string): NextResponse {
  console.error(`[API] ${routeLabel} failed:`, err);
  const message = err instanceof Error ? err.message : "Unexpected error.";
  return NextResponse.json({ error: message }, { status: 500 });
}
