import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import path from "node:path";

import { apiErrorResponse } from "@/lib/api-handler";
import { tryDeletePdfFromDisk } from "@/lib/pdf-storage";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/proposals/[id]">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.proposals.findFirst({ where: eq(proposals.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/proposals/[id]");
  }
}

// Deletes this one proposal version (and its PDF on disk, if any) — the
// consultant confirms this from the lead page before it happens.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/proposals/[id]">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.proposals.findFirst({ where: eq(proposals.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    tryDeletePdfFromDisk(path.join(process.cwd(), "data", "proposals"), `${id}.pdf`);

    await db.delete(proposals).where(eq(proposals.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "DELETE /api/proposals/[id]");
  }
}
