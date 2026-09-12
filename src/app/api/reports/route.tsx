import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, assessments, scenarios, consultantSettings, reportSnapshots, followUps } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportDocument } from "@/lib/pdf/ReportDocument";
import { buildReportData } from "@/lib/pdf/build-report-data";
import { nextReportVersion } from "@/lib/versioning";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { tryWritePdfToDisk, tryDeletePdfFromDisk } from "@/lib/pdf-storage";

import { apiErrorResponse } from "@/lib/api-handler";

// The DB row's pdfData (base64) is what makes a re-download later return the
// exact same bytes even if benchmarks or scenarios change afterwards (spec
// section 45: "If benchmarks are updated later, old reports must NOT
// change") — see src/lib/pdf-storage.ts for why disk is best-effort only.
const REPORTS_DIR = path.join(process.cwd(), "data", "reports");

function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const leadId = req.nextUrl.searchParams.get("leadId");
    if (leadId) {
      const rows = await db
        .select()
        .from(reportSnapshots)
        .where(eq(reportSnapshots.leadId, leadId))
        .orderBy(desc(reportSnapshots.createdAt));
      return NextResponse.json(rows);
    }
    const rows = await db
      .select({
        id: reportSnapshots.id,
        leadId: reportSnapshots.leadId,
        pdfFileName: reportSnapshots.pdfFileName,
        createdAt: reportSnapshots.createdAt,
        businessName: leads.businessName,
        customerId: leads.customerId,
        customerName: leads.customerName,
        phone: leads.phone,
      })
      .from(reportSnapshots)
      .leftJoin(leads, eq(reportSnapshots.leadId, leads.id))
      .orderBy(desc(reportSnapshots.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/reports");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, assessmentId, scenarioIds } = body as {
      leadId: string;
      assessmentId?: string;
      scenarioIds?: string[];
    };
    if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });

    const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const settings = (await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") })) ?? {
      consultantName: "Your Name",
      companyName: "Your Consultancy",
      ctaText: "Let's discuss how we can build your digital growth strategy.",
      currency: "INR", // matches consultantSettings' own default — see schema.ts
      phone: null,
      whatsapp: null,
      email: null,
      website: null,
      linkedin: null,
    };

    const assessment = assessmentId
      ? await db.query.assessments.findFirst({ where: eq(assessments.id, assessmentId) })
      : (await db.select().from(assessments).where(eq(assessments.leadId, leadId)))[0];

    const scenarioRows = scenarioIds?.length
      ? await db.select().from(scenarios).where(inArray(scenarios.id, scenarioIds))
      : await db.select().from(scenarios).where(eq(scenarios.leadId, leadId));

    const reportData = buildReportData({
      lead: { ...lead, hasWebsite: lead.hasWebsite as "YES" | "NO" | null },
      settings,
      assessment: assessment
        ? {
            executiveSummary: parseJsonField(assessment.executiveSummary),
            auditScores: parseJsonField(assessment.auditScores),
            websiteAudit: parseJsonField(assessment.websiteAudit),
            websiteRecommendation: parseJsonField(assessment.websiteRecommendation),
            competitorAnalysis: parseJsonField(assessment.competitorAnalysis),
            socialMedia: parseJsonField(assessment.socialMedia),
            audienceRecommendation: parseJsonField(assessment.audienceRecommendation),
            platformRecommendation: parseJsonField(assessment.platformRecommendation),
            sampleAds: parseJsonField(assessment.sampleAds),
            growthPlan: parseJsonField(assessment.growthPlan),
            problemSolution: parseJsonField(assessment.problemSolution),
          }
        : null,
      scenarioRows: scenarioRows.map((s) => ({ name: s.name, tier: s.tier, adBudget: s.adBudget, results: s.results })),
    });

    // This rule guards against React DOM/RSC deferring rendering past a try/catch's
    // synchronous scope; @react-pdf/renderer's renderToBuffer() is unrelated to that — it's
    // a plain async function that renders server-side to a PDF buffer and rejects
    // synchronously into this await, which is exactly the failure this route's try/catch
    // is here to catch.
    // eslint-disable-next-line react-hooks/error-boundaries
    const buffer = await renderToBuffer(<ReportDocument data={reportData} />);

    const version = await nextReportVersion(leadId);
    const fileName = `${lead.customerId}-${lead.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report-v${version}.pdf`;

    // The id is generated here (rather than left to the DB's own default)
    // purely so the disk mirror and the DB row agree on a name.
    const snapshotId = randomUUID();
    tryWritePdfToDisk(REPORTS_DIR, `${snapshotId}.pdf`, buffer);

    let snapshot;
    try {
      [snapshot] = await db
        .insert(reportSnapshots)
        .values({
          id: snapshotId,
          leadId,
          scenarioResults: JSON.stringify(scenarioRows),
          benchmarksUsed: JSON.stringify({ note: "See scenario inputs — benchmark values used are captured at scenario save time." }),
          clientInputs: JSON.stringify(lead),
          assumptions: JSON.stringify(scenarioRows.map((s) => ({ name: s.name, tier: s.tier }))),
          version,
          reportData: JSON.stringify(reportData),
          pdfFileName: fileName,
          pdfData: buffer.toString("base64"),
        })
        .returning();
    } catch (insertErr) {
      // The PDF may have been written under snapshotId (disk is best-effort
      // — see tryWritePdfToDisk) — clean it up rather than leaving a stray
      // file with no DB row pointing at it.
      tryDeletePdfFromDisk(REPORTS_DIR, `${snapshotId}.pdf`);
      throw insertErr;
    }

    await db.insert(followUps).values({
      leadId,
      type: "Report Sent",
      note: `PDF report generated (${fileName}).`,
      completed: true,
    });
    await db
      .update(leads)
      .set({ status: lead.status === "NEW_LEAD" || lead.status === "CONTACTED" ? "AUDIT_SENT" : lead.status })
      .where(eq(leads.id, leadId));

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Report-Snapshot-Id": snapshot.id,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/reports");
  }
}
