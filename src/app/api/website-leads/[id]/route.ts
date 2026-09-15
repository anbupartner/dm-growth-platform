import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { websiteLeads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { WEBSITE_LEAD_STATUSES, WEBSITE_LEAD_PRIORITIES } from "@/lib/marketing/website-lead-constants";

import { apiErrorResponse } from "@/lib/api-handler";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/website-leads/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!WEBSITE_LEAD_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `status must be one of: ${WEBSITE_LEAD_STATUSES.join(", ")}` }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body.priority !== undefined) {
      if (!WEBSITE_LEAD_PRIORITIES.includes(body.priority)) {
        return NextResponse.json({ error: `priority must be one of: ${WEBSITE_LEAD_PRIORITIES.join(", ")}` }, { status: 400 });
      }
      updateData.priority = body.priority;
    }
    if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes).trim() || null : null;

    const [row] = await db.update(websiteLeads).set(updateData).where(eq(websiteLeads.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "PATCH /api/website-leads/[id]");
  }
}
