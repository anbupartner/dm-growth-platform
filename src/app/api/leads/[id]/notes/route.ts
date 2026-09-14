import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
// import { leadNotes } from "@/lib/db/schema";   jsut update the root below line
import { leadDocuments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

// Dated notes log for a lead — every save is its own row (see the comment
// on leadNotes in schema.ts for why this replaced a single overwritable
// `leads.notes` field). Always returned newest-first, mirroring every other
// per-lead activity list in this app (follow-ups, reports, proposals,
// payments all order by created date descending).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/notes">) {
  try {
    const { id } = await ctx.params;
    const rows = await db.select().from(leadNotes).where(eq(leadNotes.leadId, id)).orderBy(desc(leadNotes.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads/[id]/notes");
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/notes">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

    const [row] = await db.insert(leadNotes).values({ leadId: id, text }).returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/leads/[id]/notes");
  }
}
