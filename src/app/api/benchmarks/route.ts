import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { benchmarks } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const filters = [];
    const platform = sp.get("platform");
    const industry = sp.get("industry");
    const metric = sp.get("metric");
    const status = sp.get("status");
    if (platform) filters.push(eq(benchmarks.platform, platform));
    if (industry) filters.push(eq(benchmarks.industry, industry));
    if (metric) filters.push(eq(benchmarks.metric, metric));
    if (status) filters.push(eq(benchmarks.status, status));

    const rows = await db
      .select()
      .from(benchmarks)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(benchmarks.platform), asc(benchmarks.industry), asc(benchmarks.metric));

    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/benchmarks");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = ["platform", "industry", "metric", "value", "unit"];
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === "") {
        return NextResponse.json({ error: `${f} is required` }, { status: 400 });
      }
    }
    const [row] = await db
      .insert(benchmarks)
      .values({
        platform: body.platform,
        industry: body.industry,
        metric: body.metric,
        campaignType: body.campaignType ?? null,
        value: Number(body.value),
        unit: body.unit,
        currency: body.currency ?? "USD",
        region: body.region ?? "Global",
        source: body.source ?? null,
        sourceUrl: body.sourceUrl ?? null,
        benchmarkYear: body.benchmarkYear ?? null,
        status: body.status ?? "active",
        notes: body.notes ?? null,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/benchmarks");
  }
}
