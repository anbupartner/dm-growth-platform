import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { followUps, leads } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: followUps.id,
        leadId: followUps.leadId,
        type: followUps.type,
        note: followUps.note,
        dueDate: followUps.dueDate,
        completed: followUps.completed,
        createdAt: followUps.createdAt,
        businessName: leads.businessName,
        customerId: leads.customerId,
        customerName: leads.customerName,
      })
      .from(followUps)
      .leftJoin(leads, eq(followUps.leadId, leads.id))
      .orderBy(asc(followUps.dueDate));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/follow-ups");
  }
}
