import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { benchmarks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

// PATCH creates a NEW VERSION rather than overwriting — section 44:
// "When a benchmark changes, create a new version. Do not overwrite
// historical benchmark records." The old row is marked superseded but kept
// so any report snapshot referencing it by id still resolves to the value
// that was actually used at the time.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/benchmarks/[id]">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const existing = await db.query.benchmarks.findFirst({ where: eq(benchmarks.id, id) });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.status === "disabled" || body.status === "active") {
      // Simple status toggle doesn't need a new version.
      const [row] = await db.update(benchmarks).set({ status: body.status }).where(eq(benchmarks.id, id)).returning();
      return NextResponse.json(row);
    }

    await db.update(benchmarks).set({ status: "superseded" }).where(eq(benchmarks.id, id));

    const [row] = await db
      .insert(benchmarks)
      .values({
        platform: body.platform ?? existing.platform,
        industry: body.industry ?? existing.industry,
        metric: body.metric ?? existing.metric,
        campaignType: body.campaignType ?? existing.campaignType,
        value: body.value !== undefined ? Number(body.value) : existing.value,
        unit: body.unit ?? existing.unit,
        currency: body.currency ?? existing.currency,
        region: body.region ?? existing.region,
        source: body.source ?? existing.source,
        sourceUrl: body.sourceUrl ?? existing.sourceUrl,
        benchmarkYear: body.benchmarkYear ?? existing.benchmarkYear,
        status: "active",
        notes: body.notes ?? existing.notes,
        version: existing.version + 1,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "PATCH /api/benchmarks/[id]");
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/benchmarks/[id]">) {
  try {
    const { id } = await ctx.params;
    await db.delete(benchmarks).where(eq(benchmarks.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "DELETE /api/benchmarks/[id]");
  }
}
