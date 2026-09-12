import type { ReportConsultant, ReportData } from "./types";
import type { ProposalData, ProposalPackage } from "./proposal-types";

// The subset of ReportConsultant a single proposal can override — cover
// page / header / footer / closing-CTA identity fields only. currency,
// ctaText and logoUrl stay whole-business Settings, not something to
// re-type per proposal.
export type ConsultantOverride = Partial<
  Pick<ReportConsultant, "consultantName" | "companyName" | "phone" | "whatsapp" | "email" | "website">
>;

export interface BuildProposalDataArgs {
  reportData: ReportData; // the report version this proposal is quoting off of
  packages: ProposalPackage[];
  termsText: string;
  validUntil?: string | null; // already-formatted date string, or null/omitted for no expiry
  version: number;
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
  // "2.5 KPI & Measurement Framework" — platforms/metrics list, no report
  // fallback (no existing report data describes "which platforms are in
  // use"), so null/undefined just means an empty list, same as a proposal
  // that predates this field.
  kpiPlatforms?: { platform: string; metricsText: string }[] | null;
  nextStepsText?: string | null;
  // Deliverables (section 3: Monthly / One-Time) — one shared list for the
  // whole proposal, not per package. See the matching fields on ProposalData.
  monthlyDeliverablesText?: string | null;
  oneTimeDeliverablesText?: string | null;
  // "4.2 Project Fee Discounts" — one shared discount schedule + on/off
  // checkbox for the whole proposal. See the matching fields on ProposalData
  // for the full rationale. discountAvailable defaults to false when
  // omitted/undefined (a proposal that predates this field never showed a
  // discount section either, since it only existed per-package before).
  discountAvailable?: boolean | null;
  discountTiersText?: string | null;
  // Executive Summary / Challenges & Opportunities / 90-Day Roadmap — see the
  // matching fields on ProposalData for the full seeded-then-editable
  // rationale. All optional here: null/undefined means "not seeded on this
  // proposal (yet)" and falls back to computing from reportData, exactly as
  // this whole document always used to behave.
  summaryCurrentSituationText?: string | null;
  summaryOpportunityText?: string | null;
  summaryRecommendedDirectionText?: string | null;
  summaryApproachText?: string | null;
  summaryProblemsText?: string | null;
  challengesTopProblemsText?: string | null;
  challengesCompetitorInsightsText?: string | null;
  roadmapPhases?: { title: string; itemsText: string }[] | null;
}

// Only ever overrides a field the consultant actually typed something
// into — an override object with blank/whitespace-only strings behaves
// exactly like no override at all for that field, so clearing a field back
// to empty reverts it to the report snapshot's own value rather than
// showing an empty line on the PDF.
function applyConsultantOverride(base: ReportConsultant, override?: ConsultantOverride | null): ReportConsultant {
  if (!override) return base;
  const patch: ConsultantOverride = {};
  for (const [key, value] of Object.entries(override) as [keyof ConsultantOverride, string | undefined][]) {
    if (typeof value === "string" && value.trim() !== "") patch[key] = value.trim();
  }
  return { ...base, ...patch };
}

// Builds the flat ProposalData contract ProposalDocument consumes. Kept as a
// small pure function (same reasoning as build-report-data.ts) — the API
// route and any future "preview before sending" UI can share this exact
// logic instead of duplicating it.
export function buildProposalData(args: BuildProposalDataArgs): ProposalData {
  const {
    reportData,
    packages,
    monthlyDeliverablesText,
    oneTimeDeliverablesText,
    discountAvailable,
    discountTiersText,
    termsText,
    validUntil,
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
    nextStepsText,
    summaryCurrentSituationText,
    summaryOpportunityText,
    summaryRecommendedDirectionText,
    summaryApproachText,
    summaryProblemsText,
    challengesTopProblemsText,
    challengesCompetitorInsightsText,
    roadmapPhases,
  } = args;
  return {
    consultant: applyConsultantOverride(reportData.consultant, consultantOverride),
    business: {
      businessName: reportData.business.businessName,
      customerName: reportData.business.customerName,
    },
    // Each `?? ` falls back to the report snapshot's own value ONLY when the
    // field was never seeded (null/undefined) — a proposal that has been
    // through the builder always sends its own (possibly-edited, possibly
    // deliberately-blanked) value, so this fallback exists purely for
    // proposals saved before these fields existed.
    summaryCurrentSituationText: summaryCurrentSituationText ?? reportData.executiveSummary.currentSituation,
    summaryOpportunityText: summaryOpportunityText ?? reportData.executiveSummary.biggestOpportunity,
    summaryRecommendedDirectionText: summaryRecommendedDirectionText ?? reportData.executiveSummary.recommendedDirection,
    summaryApproachText: summaryApproachText ?? reportData.problemSolutionStory.strategy,
    summaryProblemsText: summaryProblemsText ?? (reportData.executiveSummary.problems ?? []).join("\n"),
    challengesTopProblemsText: challengesTopProblemsText ?? (reportData.websiteRecommendations?.topProblems ?? []).join("\n"),
    challengesCompetitorInsightsText: challengesCompetitorInsightsText ?? (reportData.competitorInsights ?? []).join("\n"),
    roadmapPhases:
      roadmapPhases && roadmapPhases.length > 0
        ? roadmapPhases
        : (reportData.growthPlan ?? []).map((p) => ({ title: p.phase, itemsText: p.items.join("\n") })),
    packages,
    monthlyDeliverablesText: monthlyDeliverablesText ?? null,
    oneTimeDeliverablesText: oneTimeDeliverablesText ?? null,
    discountAvailable: discountAvailable ?? false,
    discountTiersText: discountTiersText ?? null,
    termsText,
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
    kpiPlatforms: kpiPlatforms ?? [],
    nextStepsText: nextStepsText ?? null,
    validUntil: validUntil ?? null,
    generatedDate: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    version,
  };
}
