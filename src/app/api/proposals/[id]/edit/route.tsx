import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, reportSnapshots, proposals, followUps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ProposalDocument } from "@/lib/pdf/ProposalDocument";
import { buildProposalData, type ConsultantOverride } from "@/lib/pdf/build-proposal-data";
import type { ReportData } from "@/lib/pdf/types";
import type { ProposalPackage } from "@/lib/pdf/proposal-types";
import { nextProposalVersion } from "@/lib/versioning";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { apiErrorResponse } from "@/lib/api-handler";

const PROPOSALS_DIR = path.join(process.cwd(), "data", "proposals");

// Lead statuses earlier in the funnel than "a priced proposal has gone out"
// — same convention /api/proposals uses when a proposal is first generated.
const PRE_PROPOSAL_STATUSES = new Set(["NEW_LEAD", "CONTACTED", "INTERESTED", "AUDIT_SENT", "MEETING_SCHEDULED"]);

// Saves a consultant's edits to a proposal (package prices/descriptions/
// scope, terms, valid-until) as a brand-new version — mirrors
// /api/reports/[id]/edit exactly: it never overwrites the version it was
// edited from, so an already-sent proposal PDF keeps showing exactly what
// the client was quoted, and every version stays individually downloadable.
// The source version (:id) only supplies which lead/report snapshot this
// belongs to — reportSnapshotId is carried over unchanged, since editing a
// proposal's pricing/scope doesn't change which report version it was
// quoted against (to quote off a different report version, use "New
// Proposal" instead, which lets you pick the source version).
export async function POST(req: NextRequest, ctx: RouteContext<"/api/proposals/[id]/edit">) {
  try {
    const { id } = await ctx.params;
    const source = await db.query.proposals.findFirst({ where: eq(proposals.id, id) });
    if (!source) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

    const body = await req.json();
    const {
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
    if (!packages?.length) return NextResponse.json({ error: "At least one package is required" }, { status: 400 });

    const lead = await db.query.leads.findFirst({ where: eq(leads.id, source.leadId) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const reportSnapshot = source.reportSnapshotId
      ? await db.query.reportSnapshots.findFirst({ where: eq(reportSnapshots.id, source.reportSnapshotId) })
      : undefined;
    if (!reportSnapshot?.reportData) {
      return NextResponse.json({ error: "The report version this proposal was quoted from is no longer available." }, { status: 400 });
    }
    const reportData = JSON.parse(reportSnapshot.reportData) as ReportData;

    const version = await nextProposalVersion(source.leadId);
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

    const buffer = await renderToBuffer(<ProposalDocument data={proposalData} />);

    const fileName = `${lead.customerId}-${lead.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-proposal-v${version}.pdf`;

    // Write the PDF to disk before inserting the row — see the matching
    // comment in POST /api/reports — so a write failure never leaves an
    // orphaned proposal row pointing at a PDF that doesn't exist.
    const proposalId = randomUUID();
    fs.mkdirSync(PROPOSALS_DIR, { recursive: true });
    fs.writeFileSync(path.join(PROPOSALS_DIR, `${proposalId}.pdf`), buffer);

    let row;
    try {
      [row] = await db
        .insert(proposals)
        .values({
          id: proposalId,
          leadId: source.leadId,
          reportSnapshotId: source.reportSnapshotId,
          version,
          packages: JSON.stringify(packages),
          termsText: termsText ?? "",
          validUntil: validUntil ? new Date(validUntil) : null,
          pdfFileName: fileName,
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
      fs.rmSync(path.join(PROPOSALS_DIR, `${proposalId}.pdf`), { force: true });
      throw insertErr;
    }

    await db.insert(followUps).values({
      leadId: source.leadId,
      type: "Proposal",
      note: `Proposal edited and saved as v${version} (${fileName}).`,
      completed: true,
    });

    // Same "keep the lead's Quote Value in sync with the latest proposal"
    // behavior as generating a fresh proposal.
    const quotePackage = packages.find((p) => p.recommended) ?? [...packages].sort((a, b) => b.price - a.price)[0];
    const statusUpdate = PRE_PROPOSAL_STATUSES.has(lead.status) ? { status: "PROPOSAL_SENT" as const } : {};
    if (quotePackage || Object.keys(statusUpdate).length) {
      await db
        .update(leads)
        .set({ ...(quotePackage ? { quoteValue: quotePackage.price } : {}), ...statusUpdate })
        .where(eq(leads.id, source.leadId));
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
    return apiErrorResponse(err, "POST /api/proposals/[id]/edit");
  }
}
