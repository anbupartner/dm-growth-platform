import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assessments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

const JSON_FIELDS = [
  "executiveSummary",
  "websiteAudit",
  "auditScores",
  "websiteRecommendation",
  "branding",
  "organicStrategy",
  "ppcStrategy",
  "whatsappStrategy",
  "socialMedia",
  "audienceRecommendation",
  "platformRecommendation",
  "competitorAnalysis",
  "competitorAds",
  "sampleAds",
  "growthPlan",
  "problemSolution",
] as const;

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/assessments/[id]">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.assessments.findFirst({ where: eq(assessments.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/assessments/[id]");
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/assessments/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const values: Record<string, unknown> = {};
    for (const field of JSON_FIELDS) {
      if (body[field] !== undefined) values[field] = JSON.stringify(body[field]);
    }
    const [row] = await db.update(assessments).set(values).where(eq(assessments.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "PATCH /api/assessments/[id]");
  }
}
