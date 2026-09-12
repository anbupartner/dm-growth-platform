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

export async function GET(req: NextRequest) {
  try {
    const leadId = req.nextUrl.searchParams.get("leadId");
    if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    const rows = await db.select().from(assessments).where(eq(assessments.leadId, leadId));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/assessments");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });

    const values: Record<string, unknown> = { leadId: body.leadId };
    for (const field of JSON_FIELDS) {
      if (body[field] !== undefined) values[field] = JSON.stringify(body[field]);
    }

    const [row] = await db
      .insert(assessments)
      .values(values as never)
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/assessments");
  }
}
