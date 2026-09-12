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

    const filePath = path.join(process.cwd(), "data", "proposals", `${id}.pdf`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "PDF file not found on disk." }, { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
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
