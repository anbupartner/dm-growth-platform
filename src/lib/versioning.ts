// Shared "next sequential version number" helpers for reports and proposals.
// Kept out of any src/app/api/**/route.ts file deliberately — Next.js's App
// Router only allows a route file to export the HTTP method handlers (GET,
// POST, ...) plus a small set of route-config fields, so a plain helper
// function has to live in a regular lib module instead, imported by every
// route that needs it. Both reports and proposals use the same "keep every
// version, number them sequentially per lead" scheme (see the comments on
// reportSnapshots.version / proposals.version in src/lib/db/schema.ts).

import { db } from "@/lib/db";
import { reportSnapshots, proposals } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function nextReportVersion(leadId: string): Promise<number> {
  const [row] = await db
    .select({ maxVersion: sql<number>`max(${reportSnapshots.version})` })
    .from(reportSnapshots)
    .where(eq(reportSnapshots.leadId, leadId));
  return (row?.maxVersion ?? 0) + 1;
}

export async function nextProposalVersion(leadId: string): Promise<number> {
  const [row] = await db
    .select({ maxVersion: sql<number>`max(${proposals.version})` })
    .from(proposals)
    .where(eq(proposals.leadId, leadId));
  return (row?.maxVersion ?? 0) + 1;
}
