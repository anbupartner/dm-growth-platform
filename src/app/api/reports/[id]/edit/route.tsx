import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, reportSnapshots, followUps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument } from "@/lib/pdf/ReportDocument";
import type { ReportData } from "@/lib/pdf/types";
import { nextReportVersion } from "@/lib/versioning";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { apiErrorResponse } from "@/lib/api-handler";

const REPORTS_DIR = path.join(process.cwd(), "data", "reports");

// Saves a consultant's manual edits to a report as a brand-new version — it
// never overwrites the version it was edited from, so every version stays
// individually viewable/downloadable (per the "keep every version" decision
// this feature was built around). The source version (:id) only supplies
// which lead this belongs to; the request body carries the complete,
// already-merged ReportData the "View / Edit Report" screen built from the
// consultant's form edits, so this route just re-renders and stores it —
// no partial-field merge logic needed here.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/reports/[id]/edit">) {
  try {
    const { id } = await ctx.params;
    const source = await db.query.reportSnapshots.findFirst({ where: eq(reportSnapshots.id, id) });
    if (!source) return NextResponse.json({ error: "Report version not found" }, { status: 404 });

    const body = await req.json();
    const reportData = body?.reportData as ReportData | undefined;
    if (!reportData) return NextResponse.json({ error: "reportData is required" }, { status: 400 });

    const lead = await db.query.leads.findFirst({ where: eq(leads.id, source.leadId) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const buffer = await renderToBuffer(<ReportDocument data={reportData} />);

    const version = await nextReportVersion(source.leadId);
    const fileName = `${lead.customerId}-${lead.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report-v${version}.pdf`;

    // Write the PDF to disk before inserting the row (see the matching
    // comment in POST /api/reports) so a write failure never leaves an
    // orphaned DB row pointing at a PDF that doesn't exist.
    const snapshotId = randomUUID();
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(path.join(REPORTS_DIR, `${snapshotId}.pdf`), buffer);

    let snapshot;
    try {
      [snapshot] = await db
        .insert(reportSnapshots)
        .values({
          id: snapshotId,
          leadId: source.leadId,
          // Reference/audit fields carried over unchanged from the version this
          // was edited from — only the presentation (reportData) changed here,
          // not which scenarios/benchmarks/inputs actually produced the numbers.
          scenarioResults: source.scenarioResults,
          benchmarksUsed: source.benchmarksUsed,
          clientInputs: source.clientInputs,
          assumptions: source.assumptions,
          version,
          reportData: JSON.stringify(reportData),
          pdfFileName: fileName,
        })
        .returning();
    } catch (insertErr) {
      fs.rmSync(path.join(REPORTS_DIR, `${snapshotId}.pdf`), { force: true });
      throw insertErr;
    }

    await db.insert(followUps).values({
      leadId: source.leadId,
      type: "Report Sent",
      note: `Report edited and saved as v${version} (${fileName}).`,
      completed: true,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Report-Snapshot-Id": snapshot.id,
        "X-Report-Version": String(version),
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/reports/[id]/edit");
  }
}
