import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyTasks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";

import { apiErrorResponse } from "@/lib/api-handler";

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/daily-tasks/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return NextResponse.json({ error: "title can't be empty" }, { status: 400 });
      updateData.title = title;
    }
    if (body.note !== undefined) updateData.note = body.note ? String(body.note).trim() || null : null;
    if (body.status !== undefined) {
      if (!TASK_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "status must be PENDING, ONGOING, or CLOSED" }, { status: 400 });
      }
      updateData.status = body.status;
    }
    if (body.priority !== undefined) {
      if (!TASK_PRIORITIES.includes(body.priority)) {
        return NextResponse.json({ error: "priority must be LOW, MEDIUM, or HIGH" }, { status: 400 });
      }
      updateData.priority = body.priority;
    }
    if (body.taskDate !== undefined) updateData.taskDate = new Date(body.taskDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.reminderAt !== undefined) updateData.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null;

    const [row] = await db.update(dailyTasks).set(updateData).where(eq(dailyTasks.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "PATCH /api/daily-tasks/[id]");
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/daily-tasks/[id]">) {
  try {
    const { id } = await ctx.params;
    await db.delete(dailyTasks).where(eq(dailyTasks.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "DELETE /api/daily-tasks/[id]");
  }
}
