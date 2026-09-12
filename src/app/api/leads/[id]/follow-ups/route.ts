import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { followUps, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/follow-ups">) {
  try {
    const { id } = await ctx.params;
    const rows = await db.select().from(followUps).where(eq(followUps.leadId, id)).orderBy(desc(followUps.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads/[id]/follow-ups");
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/follow-ups">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    if (!body.type) return NextResponse.json({ error: "type is required" }, { status: 400 });

    const [row] = await db
      .insert(followUps)
      .values({
        leadId: id,
        type: body.type,
        note: body.note ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        completed: !!body.completed,
      })
      .returning();

    if (body.dueDate) {
      await db
        .update(leads)
        .set({ nextFollowUpDate: new Date(body.dueDate) })
        .where(eq(leads.id, id));
    }

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/leads/[id]/follow-ups");
  }
}
