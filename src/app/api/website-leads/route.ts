import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { websiteLeads } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

// Local mirror list for /admin/website-leads — Google Sheets remains the
// spec's primary record (see docs/GOOGLE_SHEETS_SETUP.md); this is the
// fast, no-external-round-trip view for the admin panel.
export async function GET() {
  try {
    const rows = await db.select().from(websiteLeads).orderBy(desc(websiteLeads.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/website-leads");
  }
}
