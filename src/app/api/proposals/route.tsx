import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, reportSnapshots, proposals, followUps } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalDocument } from "@/lib/pdf/ProposalDocument";
import { buildProposalData, type ConsultantOverride } from "@/lib/pdf/build-proposal-data";
import type { ReportData } from "@/lib/pdf/types";
import type { ProposalPackage } from "@/lib/pdf/proposal-types";
import { nextProposalVersion } from "@/lib/versioning";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { apiErrorResponse } from "@/lib/api-handler";
import { tryWritePdfToDisk, tryDeletePdfFromDisk } from "@/lib/pdf-storage";

const PROPOSALS_DIR = path.join(process.cwd(), "data", "proposals");

// Lead statuses earlier in the funnel than "a priced proposal has gone out"
// — generating a proposal bumps the lead forward to PROPOSAL_SENT only from
// one of these, same convention as /api/reports bumping NEW_LEAD/CONTACTED
// to AUDIT_SENT. Never regresses a lead that's already further along
// (NEGOTIATION, WON, LOST, etc.).
const PRE_PROPOSAL_STATUSES = new Set(["NEW_LEAD", "CONTACTED", "INTERESTED", "AUDIT_SENT", "MEETING_SCHEDULED"]);

export async function GET(req: NextRequest) {
  try {
    const leadId = req.nextUrl.searchParams.get("leadId");
    if (leadId) {
      const rows = await db.select().from(proposals).where(eq(proposals.leadId, leadId)).orderBy(desc(proposals.createdAt));
      return NextResponse.json(rows);
    }
    const rows = await db
      .select({
        id: proposals.id,
        leadId: proposals.leadId,
        version: proposals.version,
        pdfFileName: proposals.pdfFileName,
        createdAt: proposals.createdAt,
        businessName: leads.businessName,
        customerId: leads.customerId,
        customerName: leads.customerName,
      })
      .from(proposals)
      .leftJoin(leads, eq(proposals.leadId, leads.id))
      .orderBy(desc(proposals.createdAt));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/proposals");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      reportSnapshotId,
      packages,
      termsText,
      validUntil,
      consultantOverride,
      revisionPolicyText,
      clientResponsibilitiesText,
      notIncludedText,
      requirementsText,
      strategyAttractText,
      strategyEngageText,
      strategyConvertText,
      strategyRetainText,
      recommendedServicesText,
      toolsResourcePlanText,
      kpiFrameworkNotesText,
      kpiPlatforms,
      monthlyDeliverablesText,
      oneTimeDeliverablesText,
      discountAvailable,
      discountTiersText,
      nextStepsText,
      summaryCurrentSituationText,
      summaryOpportunityText,
      summaryRecommendedDirectionText,
      summaryApproachText,
      summaryProblemsText,
      challengesTopProblemsText,
      challengesCompetitorInsightsText,
      roadmapPhases,
    } = body as {
      leadId: string;
      reportSnapshotId: string;
      packages: ProposalPackage[];
      termsText: string;
      validUntil?: string | null;
      consultantOverride?: ConsultantOverride | null;
      revisionPolicyText?: string | null;
      clientResponsibilitiesText?: string | null;
      notIncludedText?: string | null;
      requirementsText?: string | null;
      strategyAttractText?: string | null;
      strategyEngageText?: string | null;
      strategyConvertText?: string | null;
      strategyRetainText?: string | null;
      recommendedServicesText?: string | null;
      toolsResourcePlanText?: string | null;
      kpiFrameworkNotesText?: string | null;
      kpiPlatforms?: { platform: string; metricsText: string }[] | null;
      monthlyDeliverablesText?: string | null;
      oneTimeDeliverablesText?: string | null;
      discountAvailable?: boolean | null;
      discountTiersText?: string | null;
      nextStepsText?: string | null;
      summaryCurrentSituationText?: string | null;
      summaryOpportunityText?: string | null;
      summaryRecommendedDirectionText?: string | null;
      summaryApproachText?: string | null;
      summaryProblemsText?: string | null;
      challengesTopProblemsText?: string | null;
      challengesCompetitorInsightsText?: string | null;
      roadmapPhases?: { title: string; itemsText: string }[] | null;
    };
    if (!leadId) return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    if (!reportSnapshotId) return NextResponse.json({ error: "reportSnapshotId is required" }, { status: 400 });
    if (!packages?.length) return NextResponse.json({ error: "At least one package is required" }, { status: 400 });

    const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const source = await db.query.reportSnapshots.findFirst({ where: eq(reportSnapshots.id, reportSnapshotId) });
    if (!source) return NextResponse.json({ error: "Report version not found" }, { status: 404 });
    if (!source.reportData) {
      return NextResponse.json(
        { error: "This report version predates editable/proposal support — generate a new report version first." },
        { status: 400 },
      );
    }
    const reportData = JSON.parse(source.reportData) as ReportData;

    const version = await nextProposalVersion(leadId);
    const proposalData = buildProposalData({
      reportData,
      packages,
      termsText: termsText ?? "",
      validUntil: validUntil ?? null,
      version,
      consultantOverride,
      revisionPolicyText,
      clientResponsibilitiesText,
      notIncludedText,
      requirementsText,
      strategyAttractText,
      strategyEngageText,
      strategyConvertText,
      strategyRetainText,
      recommendedServicesText,
      toolsResourcePlanText,
      kpiFrameworkNotesText,
      kpiPlatforms,
      monthlyDeliverablesText,
      oneTimeDeliverablesText,
      discountAvailable,
      discountTiersText,
      nextStepsText,
      summaryCurrentSituationText,
      summaryOpportunityText,
      summaryRecommendedDirectionText,
      summaryApproachText,
      summaryProblemsText,
      challengesTopProblemsText,
      challengesCompetitorInsightsText,
      roadmapPhases,
    });

    // This rule guards against React DOM/RSC deferring rendering past a try/catch's
    // synchronous scope; @react-pdf/renderer's renderToBuffer() is unrelated to that — it's
    // a plain async function that renders server-side to a PDF buffer and rejects
    // synchronously into this await, which is exactly the failure this route's try/catch
    // is here to catch.
    // eslint-disable-next-line react-hooks/error-boundaries
    const buffer = await renderToBuffer(<ProposalDocument data={proposalData} />);

    const fileName = `${lead.customerId}-${lead.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-proposal-v${version}.pdf`;

    // Best-effort local-disk copy; the base64 pdfData column below is the
    // load-bearing copy — see the comment on proposals.pdfData in
    // schema.ts and the matching comment in POST /api/reports.
    const proposalId = randomUUID();
    tryWritePdfToDisk(PROPOSALS_DIR, `${proposalId}.pdf`, buffer);

    let row;
    try {
      [row] = await db
        .insert(proposals)
        .values({
          id: proposalId,
          leadId,
          reportSnapshotId,
          version,
          packages: JSON.stringify(packages),
          termsText: termsText ?? "",
          validUntil: validUntil ? new Date(validUntil) : null,
          pdfFileName: fileName,
          pdfData: buffer.toString("base64"),
          consultantOverride: consultantOverride ? JSON.stringify(consultantOverride) : null,
          revisionPolicyText: revisionPolicyText ?? null,
          clientResponsibilitiesText: clientResponsibilitiesText ?? null,
          notIncludedText: notIncludedText ?? null,
          requirementsText: requirementsText ?? null,
          strategyAttractText: strategyAttractText ?? null,
          strategyEngageText: strategyEngageText ?? null,
          strategyConvertText: strategyConvertText ?? null,
          strategyRetainText: strategyRetainText ?? null,
          recommendedServicesText: recommendedServicesText ?? null,
          toolsResourcePlanText: toolsResourcePlanText ?? null,
          kpiFrameworkNotesText: kpiFrameworkNotesText ?? null,
          kpiPlatformsJson: kpiPlatforms ? JSON.stringify(kpiPlatforms) : null,
          monthlyDeliverablesText: monthlyDeliverablesText ?? null,
          oneTimeDeliverablesText: oneTimeDeliverablesText ?? null,
          discountAvailable: discountAvailable ?? false,
          discountTiersText: discountTiersText ?? null,
          nextStepsText: nextStepsText ?? null,
          summaryCurrentSituationText: summaryCurrentSituationText ?? null,
          summaryOpportunityText: summaryOpportunityText ?? null,
          summaryRecommendedDirectionText: summaryRecommendedDirectionText ?? null,
          summaryApproachText: summaryApproachText ?? null,
          summaryProblemsText: summaryProblemsText ?? null,
          challengesTopProblemsText: challengesTopProblemsText ?? null,
          challengesCompetitorInsightsText: challengesCompetitorInsightsText ?? null,
          roadmapPhasesJson: roadmapPhases ? JSON.stringify(roadmapPhases) : null,
        })
        .returning();
    } catch (insertErr) {
      tryDeletePdfFromDisk(PROPOSALS_DIR, `${proposalId}.pdf`);
      throw insertErr;
    }

    await db.insert(followUps).values({
      leadId,
      type: "Proposal",
      note: `Proposal generated (${fileName}).`,
      completed: true,
    });

    // Keep the lead's Quote Value (shown on the Lead page and the Proposals
    // pipeline page) in sync with what was actually quoted — the recommended
    // package's price if one is marked, otherwise the highest-priced package.
    // Always overwrites with the latest proposal's number: regenerating a
    // proposal means the quote changed, so the old figure shouldn't linger.
    const quotePackage = packages.find((p) => p.recommended) ?? [...packages].sort((a, b) => b.price - a.price)[0];
    const statusUpdate = PRE_PROPOSAL_STATUSES.has(lead.status) ? { status: "PROPOSAL_SENT" as const } : {};
    if (quotePackage || Object.keys(statusUpdate).length) {
      await db
        .update(leads)
        .set({ ...(quotePackage ? { quoteValue: quotePackage.price } : {}), ...statusUpdate })
        .where(eq(leads.id, leadId));
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Proposal-Id": row.id,
        "X-Proposal-Version": String(version),
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/proposals");
  }
}
