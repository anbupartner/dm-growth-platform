import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proposals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/proposals/[id]/pdf">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.proposals.findFirst({ where: eq(proposals.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // pdfData (base64, in the DB) is the source of truth — see the matching
    // comment in GET /api/reports/[id]/pdf.
    let buffer: Buffer;
    if (row.pdfData) {
      buffer = Buffer.from(row.pdfData, "base64");
    } else {
      const filePath = path.join(process.cwd(), "data", "proposals", `${id}.pdf`);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "PDF file not found (it may predate this feature)." }, { status: 404 });
      }
      buffer = fs.readFileSync(filePath);
    }
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${row.pdfFileName ?? "proposal.pdf"}"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/proposals/[id]/pdf");
  }
}
