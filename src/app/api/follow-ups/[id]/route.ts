import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { followUps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/follow-ups/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    if (body.completed !== undefined) updateData.completed = !!body.completed;
    if (body.note !== undefined) updateData.note = body.note;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;

    const [row] = await db.update(followUps).set(updateData).where(eq(followUps.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "PATCH /api/follow-ups/[id]");
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/follow-ups/[id]">) {
  try {
    const { id } = await ctx.params;
    await db.delete(followUps).where(eq(followUps.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "DELETE /api/follow-ups/[id]");
  }
}
