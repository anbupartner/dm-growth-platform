import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leadDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

// Streams the stored data: URL back out as the original file (correct
// Content-Type + a download filename) rather than returning JSON — the doc's
// leadId in the path is only there for a clean/consistent URL shape (mirrors
// every other per-lead sub-resource in this app); the row is looked up by its
// own id.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/documents/[docId]">) {
  try {
    const { docId } = await ctx.params;
    const row = await db.query.leadDocuments.findFirst({ where: eq(leadDocuments.id, docId) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const commaIdx = row.fileData.indexOf(",");
    const base64 = commaIdx === -1 ? row.fileData : row.fileData.slice(commaIdx + 1);
    const buffer = Buffer.from(base64, "base64");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": row.mimeType,
        "Content-Disposition": `attachment; filename="${row.fileName.replace(/"/g, "")}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads/[id]/documents/[docId]");
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/documents/[docId]">) {
  try {
    const { docId } = await ctx.params;
    await db.delete(leadDocuments).where(eq(leadDocuments.id, docId));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "DELETE /api/leads/[id]/documents/[docId]");
  }
}
