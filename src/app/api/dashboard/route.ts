import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, followUps } from "@/lib/db/schema";
import { LEAD_STATUSES } from "@/lib/constants";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET() {
  try {
    const allLeads = await db.select().from(leads);
    const allFollowUps = await db.select().from(followUps);

    const statusCounts: Record<string, number> = {};
    for (const s of LEAD_STATUSES) statusCounts[s] = 0;
    for (const l of allLeads) statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1;

    const sourceCounts: Record<string, number> = {};
    for (const l of allLeads) sourceCounts[l.leadSource] = (sourceCounts[l.leadSource] ?? 0) + 1;

    const won = allLeads.filter((l) => l.status === "WON");
    const lost = allLeads.filter((l) => l.status === "LOST");
    const wonValue = won.reduce((s, l) => s + (l.quoteValue ?? 0), 0);
    const pipelineValue = allLeads
      .filter((l) => !["WON", "LOST", "NOT_INTERESTED"].includes(l.status))
      .reduce((s, l) => s + (l.quoteValue ?? 0), 0);
    const totalQuoteValue = allLeads.reduce((s, l) => s + (l.quoteValue ?? 0), 0);
    const closedCount = won.length + lost.length;
    const conversionRate = closedCount > 0 ? (won.length / closedCount) * 100 : 0;
    const avgProjectValue = won.length > 0 ? wonValue / won.length : 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    const dueFollowUps = allFollowUps.filter((f) => !f.completed && f.dueDate);
    const todayFollowUps = dueFollowUps.filter((f) => f.dueDate! >= startOfToday && f.dueDate! < endOfToday);
    const overdueFollowUps = dueFollowUps.filter((f) => f.dueDate! < startOfToday);
    const upcomingFollowUps = dueFollowUps.filter((f) => f.dueDate! >= endOfToday);

    return NextResponse.json({
      totalLeads: allLeads.length,
      statusCounts,
      sourceCounts,
      revenue: {
        totalQuoteValue,
        wonValue,
        pipelineValue,
        avgProjectValue,
        conversionRate,
      },
      followUps: {
        dueCount: dueFollowUps.length,
        todayCount: todayFollowUps.length,
        overdueCount: overdueFollowUps.length,
        upcomingCount: upcomingFollowUps.length,
      },
      recentLeads: allLeads
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 8),
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/dashboard");
  }
}
