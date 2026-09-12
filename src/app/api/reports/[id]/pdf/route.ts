import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reportSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import { apiErrorResponse } from "@/lib/api-handler";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/reports/[id]/pdf">) {
  try {
    const { id } = await ctx.params;
    const row = await db.query.reportSnapshots.findFirst({ where: eq(reportSnapshots.id, id) });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // pdfData (base64, in the DB) is the source of truth — production's
    // filesystem is read-only, so nothing generated there ever lands on
    // disk. The disk path only serves rows saved before this column existed
    // that happen to still have their file on this particular machine.
    let buffer: Buffer;
    if (row.pdfData) {
      buffer = Buffer.from(row.pdfData, "base64");
    } else {
      const filePath = path.join(process.cwd(), "data", "reports", `${id}.pdf`);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: "PDF file not found (it may predate this feature)." }, { status: 404 });
      }
      buffer = fs.readFileSync(filePath);
    }
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${row.pdfFileName ?? "report.pdf"}"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/reports/[id]/pdf");
  }
}
