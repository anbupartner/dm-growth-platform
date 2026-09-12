import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenarios, leads } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { calculateForecast } from "@/lib/calculations";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  try {
    const leadId = req.nextUrl.searchParams.get("leadId");
    if (leadId) {
      const rows = await db.select().from(scenarios).where(eq(scenarios.leadId, leadId)).orderBy(desc(scenarios.createdAt));
      return NextResponse.json(rows);
    }
    // No leadId — return every scenario across every lead, for the global Scenarios screen.
    const rows = await db
      .select({
        id: scenarios.id,
        leadId: scenarios.leadId,
        name: scenarios.name,
        tier: scenarios.tier,
        adBudget: scenarios.adBudget,
        results: scenarios.results,
        createdAt: scenarios.createdAt,
        updatedAt: scenarios.updatedAt,
        businessName: leads.businessName,
        customerId: leads.customerId,
      })
      .from(scenarios)
      .leftJoin(leads, eq(scenarios.leadId, leads.id))
      .orderBy(desc(scenarios.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/scenarios");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.leadId || !body.name) {
      return NextResponse.json({ error: "leadId and name are required" }, { status: 400 });
    }

    const inputs = {
      adBudget: Number(body.adBudget) || 0,
      cpc: Number(body.cpc) || 0,
      leadConversionRate: Number(body.leadConversionRate) || 0,
      qualificationRate: Number(body.qualificationRate) || 85,
      salesConversionRate: Number(body.salesConversionRate) || 0,
      avgSellingPrice: Number(body.avgSellingPrice) || 0,
      profitMarginPct: Number(body.profitMarginPct) || 0,
      additionalMarketingCost: Number(body.additionalMarketingCost) || 0,
      currentOrganicTraffic: Number(body.currentOrganicTraffic) || 0,
      organicTrafficGrowth: Number(body.organicTrafficGrowth) || 0,
      organicLeadConversionRate: Number(body.organicLeadConversionRate) || 0,
    };
    const results = calculateForecast(inputs);

    const [row] = await db
      .insert(scenarios)
      .values({
        leadId: body.leadId,
        name: body.name,
        tier: body.tier ?? "CUSTOM",
        adBudget: inputs.adBudget,
        cpc: inputs.cpc,
        leadConversionRate: inputs.leadConversionRate,
        qualificationRate: inputs.qualificationRate,
        salesConversionRate: inputs.salesConversionRate,
        avgSellingPrice: inputs.avgSellingPrice,
        profitMarginPct: inputs.profitMarginPct,
        additionalMarketingCost: inputs.additionalMarketingCost,
        organicTrafficGrowth: inputs.organicTrafficGrowth,
        organicLeadConversionRate: inputs.organicLeadConversionRate,
        results: JSON.stringify(results),
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/scenarios");
  }
}
