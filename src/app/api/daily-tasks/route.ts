import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyTasks } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/lib/constants";

import { apiErrorResponse } from "@/lib/api-handler";

// Returns every task (this is a personal to-do list, not a paginated feed —
// same "fetch everything, bucket client-side" approach the Follow-ups page
// already uses). The Daily To-Do's page buckets by taskDate/status itself.
export async function GET() {
  try {
    const rows = await db.select().from(dailyTasks).orderBy(desc(dailyTasks.taskDate), desc(dailyTasks.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/daily-tasks");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const status = TASK_STATUSES.includes(body.status) ? body.status : "PENDING";
    const priority = TASK_PRIORITIES.includes(body.priority) ? body.priority : "MEDIUM";
    const taskDate = body.taskDate ? new Date(body.taskDate) : new Date();
    const endDate = body.endDate ? new Date(body.endDate) : null;
    const reminderAt = body.reminderAt ? new Date(body.reminderAt) : null;

    const [row] = await db
      .insert(dailyTasks)
      .values({
        title,
        note: body.note ? String(body.note).trim() || null : null,
        status,
        priority,
        taskDate,
        endDate,
        reminderAt,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/daily-tasks");
  }
}
