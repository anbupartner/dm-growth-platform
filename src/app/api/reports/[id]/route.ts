import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reportSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import { apiErrorResponse } from "@/lib/api-handler";

// Historical snapshot metadata only (not a re-render). Per spec section 45,
// old reports must keep showing the numbers that were actually used at
// generation time — snapshot.clientInputs / scenarioResults capture that.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/reports/[id]">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.reportSnapshots.findFirst({ where: eq(reportSnapshots.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/reports/[id]");
  }
}

// Deletes this one report version (and its PDF on disk, if any) — the
// consultant confirms this from the lead page before it happens. Any
// proposal generated from this version keeps its own saved snapshot, so
// deleting a report never breaks a proposal that was already generated from
// it (proposals don't re-read the report at download time).
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/reports/[id]">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.reportSnapshots.findFirst({ where: eq(reportSnapshots.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const filePath = path.join(process.cwd(), "data", "reports", `${id}.pdf`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.delete(reportSnapshots).where(eq(reportSnapshots.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "DELETE /api/reports/[id]");
  }
}
