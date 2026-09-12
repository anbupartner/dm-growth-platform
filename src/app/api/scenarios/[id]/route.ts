import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scenarios } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateForecast } from "@/lib/calculations";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/scenarios/[id]">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.scenarios.findFirst({ where: eq(scenarios.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/scenarios/[id]");
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/scenarios/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const existing = await db.query.scenarios.findFirst({ where: eq(scenarios.id, id) });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const inputs = {
      adBudget: body.adBudget ?? existing.adBudget,
      cpc: body.cpc ?? existing.cpc,
      leadConversionRate: body.leadConversionRate ?? existing.leadConversionRate,
      qualificationRate: body.qualificationRate ?? existing.qualificationRate,
      salesConversionRate: body.salesConversionRate ?? existing.salesConversionRate,
      avgSellingPrice: body.avgSellingPrice ?? existing.avgSellingPrice,
      profitMarginPct: body.profitMarginPct ?? existing.profitMarginPct,
      additionalMarketingCost: body.additionalMarketingCost ?? existing.additionalMarketingCost,
      organicTrafficGrowth: body.organicTrafficGrowth ?? existing.organicTrafficGrowth,
      organicLeadConversionRate: body.organicLeadConversionRate ?? existing.organicLeadConversionRate,
    };
    const results = calculateForecast(inputs);

    const [row] = await db
      .update(scenarios)
      .set({ ...inputs, name: body.name ?? existing.name, results: JSON.stringify(results) })
      .where(eq(scenarios.id, id))
      .returning();

    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "PATCH /api/scenarios/[id]");
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/scenarios/[id]">) {
  try {
    const { id } = await ctx.params;
    await db.delete(scenarios).where(eq(scenarios.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "DELETE /api/scenarios/[id]");
  }
}
