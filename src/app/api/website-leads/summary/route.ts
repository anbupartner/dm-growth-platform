import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { websiteLeads } from "@/lib/db/schema";

import { apiErrorResponse } from "@/lib/api-handler";

// Feeds the admin dashboard's "Lead Overview" widget (spec section 12) —
// Google Sheets stays the primary record; this is a fast local read.
export async function GET() {
  try {
    const rows = await db.select().from(websiteLeads);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayRows = rows.filter((r) => r.createdAt >= startOfToday);

    const count = (predicate: (r: (typeof rows)[number]) => boolean) => rows.filter(predicate).length;

    return NextResponse.json({
      totalLeads: rows.length,
      todayLeads: todayRows.length,
      newLeads: count((r) => r.status === "New"),
      hotLeads: count((r) => r.priority === "Hot"),
      followUps: count((r) => r.status === "Follow Up"),
      meetings: count((r) => r.status === "Meeting Scheduled"),
      proposals: count((r) => r.status === "Proposal Sent"),
      won: count((r) => r.status === "Won"),
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/website-leads/summary");
  }
}
