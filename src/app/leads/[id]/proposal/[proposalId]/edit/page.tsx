"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Button, LinkButton, Spinner } from "@/components/ui";
import {
  ProposalPackagesGrid,
  ProposalFeeDiscountsCard,
  ProposalConsultantCard,
  type ConsultantOverrideValue,
  ProposalPolicyCard,
  type ProposalPolicyValue,
  defaultRevisionPolicyText,
  defaultClientResponsibilitiesText,
  defaultNotIncludedText,
  ProposalStrategyCard,
  type ProposalStrategyValue,
  ProposalRequirementsCard,
  type ProposalRequirementsValue,
  defaultRequirementsText,
  defaultStrategyAttractText,
  defaultStrategyEngageText,
  defaultStrategyConvertText,
  defaultStrategyRetainText,
  ProposalRecommendedServicesCard,
  type ProposalRecommendedServicesValue,
  defaultRecommendedServicesText,
  ProposalScopeCard,
  type ProposalScopeValue,
  defaultToolsResourcePlanText,
  ProposalKpiCard,
  type ProposalKpiPlatform,
  defaultKpiPlatforms,
  ProposalNextStepsCard,
  defaultNextStepsText,
  ProposalSummaryCard,
  type ProposalSummaryValue,
  ProposalChallengesCard,
  type ProposalChallengesValue,
  ProposalRoadmapCard,
  type ProposalRoadmapPhase,
  ProposalDeliverablesCard,
  type ProposalDeliverablesValue,
  defaultMonthlyDeliverablesText,
  defaultOneTimeDeliverablesText,
  defaultDiscountTiersText,
  ProposalSectionNav,
  type ProposalNavSection,
  useSectionScrollSpy,
} from "@/components/ProposalBuilderFields";
import { DEFAULT_SERVICE_PACKAGES, type ProposalPackage, type ServicePackagesConfig } from "@/lib/pdf/proposal-types";
import type { ReportData } from "@/lib/pdf/types";
import { Download } from "lucide-react";

interface ProposalRow {
  id: string;
  leadId: string;
  reportSnapshotId: string | null;
  version: number;
  packages: string; // JSON
  termsText: string | null;
  validUntil: string | null;
  pdfFileName: string | null;
  consultantOverride: string | null; // JSON
  revisionPolicyText: string | null;
  clientResponsibilitiesText: string | null;
  notIncludedText: string | null;
  requirementsText: string | null;
  strategyAttractText: string | null;
  strategyEngageText: string | null;
  strategyConvertText: string | null;
  strategyRetainText: string | null;
  recommendedServicesText: string | null;
  toolsResourcePlanText: string | null;
  kpiFrameworkNotesText: string | null;
  monthlyDeliverablesText: string | null;
  oneTimeDeliverablesText: string | null;
  discountAvailable: boolean | null;
  discountTiersText: string | null;
  nextStepsText: string | null;
  summaryCurrentSituationText: string | null;
  summaryOpportunityText: string | null;
  summaryRecommendedDirectionText: string | null;
  summaryApproachText: string | null;
  summaryProblemsText: string | null;
  challengesTopProblemsText: string | null;
  challengesCompetitorInsightsText: string | null;
  roadmapPhasesJson: string | null;
  kpiPlatformsJson: string | null;
}

interface LeadDetail {
  lead: { id: string; businessName: string; customerName: string };
}

// Edit an already-generated proposal: pre-filled with exactly what was
// saved (package prices, descriptions/scope, terms, valid-until), so the
// consultant can add points, adjust cost, or change scope, then save.
// Mirrors leads/[id]/report/[reportId]/edit's philosophy exactly — saving
// never overwrites the version being edited from, it creates the next
// version instead, so a proposal already sent to a client keeps showing
// exactly what they were quoted, and every version stays downloadable from
// the Proposals list.
export default function EditProposalPage() {
  const params = useParams();
  const leadId = params.id as string;
  const proposalId = params.proposalId as string;

  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [source, setSource] = useState<ProposalRow | null>(null);
  // The next version number is the highest version across ALL of this
  // lead's proposals, plus one — not just source.version + 1. A lead can
  // have several proposal versions, and editing an older one (not
  // necessarily the latest) still produces the next number in that whole
  // sequence, same as nextProposalVersion() computes server-side — so this
  // is fetched rather than assumed, to avoid showing a version number here
  // that wouldn't match what actually gets saved.
  const [nextVersion, setNextVersion] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [packages, setPackages] = useState<ProposalPackage[]>([]);
  const [termsText, setTermsText] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [consultantOverride, setConsultantOverride] = useState<ConsultantOverrideValue>({});
  const [policy, setPolicy] = useState<ProposalPolicyValue>({
    revisionPolicyText: "",
    clientResponsibilitiesText: "",
    notIncludedText: "",
  });
  // 1.2 Requirements — its own numbered section, split out of the old
  // combined "Requirements & Strategy" card (see ProposalRequirementsCard).
  const [requirements, setRequirements] = useState<ProposalRequirementsValue>({ requirementsText: "" });
  const [strategy, setStrategy] = useState<ProposalStrategyValue>({
    strategyAttractText: "",
    strategyEngageText: "",
    strategyConvertText: "",
    strategyRetainText: "",
  });
  // "2.2 Recommended Services & Scope" — the strategic recommendation
  // write-up, NOT the priced packages below — see ProposalRecommendedServicesCard.
  const [recommendedServices, setRecommendedServices] = useState<ProposalRecommendedServicesValue>({
    recommendedServicesText: "",
  });
  const [scope, setScope] = useState<ProposalScopeValue>({
    toolsResourcePlanText: "",
  });
  // "2.5 KPI & Measurement Framework" — NOT projected numbers. A dynamic
  // list of which platforms are in use and the important metrics tracked
  // for each (no numbers) — one shared list for the whole proposal, not per
  // package. See ProposalKpiCard's own comment for why this replaced the
  // old per-package Traffic/Leads/CPL/CAC/ROAS figures. Starts empty here
  // (not the generic default) — the load effect below fills it in from
  // this proposal's own saved value, falling back to the generic default
  // only if it was never saved, same pattern as nextStepsText.
  const [kpiPlatforms, setKpiPlatforms] = useState<ProposalKpiPlatform[]>([]);
  const [kpiFrameworkNotesText, setKpiFrameworkNotesText] = useState("");
  const [deliverables, setDeliverables] = useState<ProposalDeliverablesValue>({
    monthlyDeliverablesText: "",
    oneTimeDeliverablesText: "",
  });
  // "4.2 Project Fee Discounts" — one shared discount schedule + on/off
  // checkbox for the whole proposal, not per package (a discount schedule
  // doesn't vary by which package the customer picks — only the computed
  // dollar amount does, and that's computed on the PDF side per package
  // price). Starts true/generic-default here; the load effect below
  // overwrites both from this proposal's own saved values, same "never-saved
  // falls back to the generic default, deliberately-cleared stays blank"
  // pattern as the fields above — the consultant unchecks it when a
  // particular proposal isn't offering a discount.
  const [discountAvailable, setDiscountAvailable] = useState(true);
  const [discountTiersText, setDiscountTiersText] = useState(defaultDiscountTiersText());
  const [nextStepsText, setNextStepsText] = useState(defaultNextStepsText());
  const [summary, setSummary] = useState<ProposalSummaryValue>({
    currentSituationText: "",
    opportunityText: "",
    recommendedDirectionText: "",
    approachText: "",
  });
  const [challenges, setChallenges] = useState<ProposalChallengesValue>({
    topProblemsText: "",
    competitorInsightsText: "",
  });
  const [roadmapPhases, setRoadmapPhases] = useState<ProposalRoadmapPhase[]>([]);
  const [servicePackages, setServicePackages] = useState<ServicePackagesConfig>(DEFAULT_SERVICE_PACKAGES);
  // The report snapshot's own consultant block — shown only as placeholder
  // text in the override fields below, so the consultant can see what will
  // actually appear on the PDF for any field they leave blank.
  const [reportDefaults, setReportDefaults] = useState<ReportData["consultant"] | undefined>(undefined);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  // Numbered section navigation — same scheme as New Proposal (see that
  // page's matching comment for the full outline: 1-1.3 / 2. Scope of the
  // project [2.1-2.5] / 3. Deliverables / 4. Commercial Terms [4.1/4.2] / 5.
  // Policies & Terms / 6. Next steps). The section wrapper `<div id=...>`
  // elements only exist once this proposal's own data has loaded (`source`),
  // so the ids passed to the scroll-spy hook are empty until then.
  const navSections: ProposalNavSection[] = [
    {
      id: "sec-summary",
      number: "1.1",
      label: "Executive Summary",
      filled: !!(summary.currentSituationText || summary.opportunityText || summary.recommendedDirectionText || summary.approachText),
    },
    { id: "sec-requirements", number: "1.2", label: "Requirements", filled: !!requirements.requirementsText.trim(), optional: true },
    {
      id: "sec-challenges",
      number: "1.3",
      label: "Challenges & Opportunities",
      filled: !!(challenges.topProblemsText || challenges.competitorInsightsText),
      optional: true,
    },
    { id: "group-scope", label: "2. Scope of the project", heading: true },
    {
      id: "sec-strategy",
      number: "2.1",
      label: "Digital Growth Strategy",
      filled: !!(strategy.strategyAttractText || strategy.strategyEngageText || strategy.strategyConvertText || strategy.strategyRetainText),
      optional: true,
    },
    {
      id: "sec-recommended-services",
      number: "2.2",
      label: "Recommended Services & Scope",
      filled: !!recommendedServices.recommendedServicesText.trim(),
      optional: true,
    },
    { id: "sec-scope", number: "2.3", label: "Tools & Resource Plan", filled: !!scope.toolsResourcePlanText.trim(), optional: true },
    { id: "sec-roadmap", number: "2.4", label: "90-Day Growth Roadmap", filled: roadmapPhases.some((p) => p.title.trim()), optional: true },
    {
      id: "sec-kpi",
      number: "2.5",
      label: "KPI & Measurement Framework",
      filled: kpiPlatforms.some((p) => p.platform.trim()) || !!kpiFrameworkNotesText.trim(),
      optional: true,
    },
    {
      id: "sec-deliverables",
      number: "3",
      label: "Deliverables",
      filled: !!(deliverables.monthlyDeliverablesText || deliverables.oneTimeDeliverablesText),
      optional: true,
    },
    { id: "group-commercial", label: "4. Commercial Terms", heading: true },
    { id: "sec-packages", number: "4.1", label: "Pricing packages", filled: packages.some((p) => p.price > 0) },
    {
      id: "sec-fee-discounts",
      number: "4.2",
      label: "Project Fee Discounts",
      filled: discountAvailable && !!discountTiersText.trim(),
      optional: true,
    },
    {
      id: "sec-policy",
      number: "5",
      label: "Policies & Terms",
      filled: !!(policy.revisionPolicyText || policy.clientResponsibilitiesText || policy.notIncludedText || termsText.trim()),
    },
    { id: "sec-nextsteps", number: "6", label: "Next steps", filled: !!nextStepsText.trim(), optional: true },
    { id: "sec-prepared-by", number: "1", label: "Cover Page", note: "Prepared By override — moved to the bottom of the page" },
  ];
  const activeSectionId = useSectionScrollSpy(source ? navSections.map((s) => s.id) : []);

  useEffect(() => {
    api.get<LeadDetail>(`/api/leads/${leadId}`).then(setLeadDetail).catch((e) => setLoadError((e as Error).message));
  }, [leadId]);

  useEffect(() => {
    api
      .get<ProposalRow>(`/api/proposals/${proposalId}`)
      .then((row) => {
        setSource(row);
        // Discount Tiers used to be backfilled here too, per package — moved
        // to the proposal-level `discountAvailable`/`discountTiersText`
        // state below (Monthly/One-Time Deliverables made the same move
        // earlier; see ProposalDeliverablesCard).
        setPackages(JSON.parse(row.packages) as ProposalPackage[]);
        setTermsText(row.termsText ?? "");
        setValidUntil(row.validUntil ? new Date(row.validUntil).toISOString().slice(0, 10) : "");
        setConsultantOverride(row.consultantOverride ? (JSON.parse(row.consultantOverride) as ConsultantOverrideValue) : {});
        // Unlike a purely-optional field, these describe universal
        // policy/strategy content rather than this client's data, so a
        // never-saved value (null) falls back to the same generic default
        // shown on New Proposal — same reasoning as nextStepsText below —
        // rather than blank. A deliberately-cleared value (saved as "")
        // stays blank, which omits that section exactly as the consultant
        // left it.
        setPolicy({
          revisionPolicyText: row.revisionPolicyText ?? defaultRevisionPolicyText(),
          clientResponsibilitiesText: row.clientResponsibilitiesText ?? defaultClientResponsibilitiesText(),
          notIncludedText: row.notIncludedText ?? defaultNotIncludedText(),
        });
        setRequirements({ requirementsText: row.requirementsText ?? defaultRequirementsText() });
        setStrategy({
          strategyAttractText: row.strategyAttractText ?? defaultStrategyAttractText(),
          strategyEngageText: row.strategyEngageText ?? defaultStrategyEngageText(),
          strategyConvertText: row.strategyConvertText ?? defaultStrategyConvertText(),
          strategyRetainText: row.strategyRetainText ?? defaultStrategyRetainText(),
        });
        // Same never-saved-falls-back-to-generic-default pattern as the
        // fields above — a proposal built before this field existed (null)
        // gets the generic starting point; a deliberately-cleared value
        // (saved as "") stays blank.
        setRecommendedServices({
          recommendedServicesText: row.recommendedServicesText ?? defaultRecommendedServicesText(),
        });
        setScope({
          toolsResourcePlanText: row.toolsResourcePlanText ?? defaultToolsResourcePlanText(),
        });
        // Never-saved (null) kpiFrameworkNotesText is fine as blank here —
        // unlike toolsResourcePlanText, this field was never seeded with a
        // generic default (it's proposal-specific commentary, not universal
        // process text), so a proposal that never saved it just starts
        // blank, same behavior as before this card was split out.
        setKpiFrameworkNotesText(row.kpiFrameworkNotesText ?? "");
        // Platforms/metrics list — no report data to seed from (unlike
        // roadmapPhases), so a never-saved value (null/missing, including a
        // proposal built before this field existed) falls back to the same
        // generic default shown on New Proposal, same reasoning as
        // nextStepsText above. A deliberately-saved empty list (`[]`) stays
        // empty, honoring a consultant who cleared every platform.
        if (row.kpiPlatformsJson) {
          try {
            setKpiPlatforms(JSON.parse(row.kpiPlatformsJson) as ProposalKpiPlatform[]);
          } catch {
            setKpiPlatforms(defaultKpiPlatforms());
          }
        } else {
          setKpiPlatforms(defaultKpiPlatforms());
        }
        // Same "never-saved (null) falls back to the generic default, a
        // deliberately-cleared value (saved as "") stays blank" pattern as
        // the fields above — now proposal-level rather than per-package.
        setDeliverables({
          monthlyDeliverablesText: row.monthlyDeliverablesText ?? defaultMonthlyDeliverablesText(),
          oneTimeDeliverablesText: row.oneTimeDeliverablesText ?? defaultOneTimeDeliverablesText(),
        });
        // discountAvailable: a proposal that predates this field has it saved
        // as null/undefined (it only ever existed per-package before) — falls
        // back to true (the same generic starting point as a fresh New
        // Proposal) rather than false, so re-saving an old proposal through
        // Edit doesn't silently drop a section it never had a chance to turn
        // off. A proposal that DID save this field (true or false) always
        // uses that saved value, including a deliberate false. discountTiersText
        // follows the same never-saved-falls-back-to-generic-default,
        // deliberately-cleared-stays-blank pattern as every other text field
        // above.
        setDiscountAvailable(row.discountAvailable ?? true);
        setDiscountTiersText(row.discountTiersText ?? defaultDiscountTiersText());
        // Unlike every other field above, a never-saved nextStepsText (null —
        // this proposal predates the field, or was built before this
        // consultant ever touched it) falls back to the same generic default
        // shown on New Proposal, rather than blank — it describes a
        // universal process, not this client's data. A proposal where the
        // consultant deliberately cleared it (saved as "") stays blank, which
        // omits the section, exactly as they left it.
        setNextStepsText(row.nextStepsText ?? defaultNextStepsText());
        // Executive Summary / Challenges & Opportunities / 90-Day Roadmap:
        // use this proposal's own saved values if it ever saved any (even a
        // deliberately-blank one — every proposal built through the current
        // New Proposal flow always saves real values for the 4 required
        // summary fields, so "row.summaryCurrentSituationText != null" is a
        // reliable signal that this proposal has its own saved set). An
        // older proposal from before these columns existed has them all
        // null and gets seeded fresh from the report snapshot instead, once
        // it loads below.
        if (row.summaryCurrentSituationText != null) {
          setSummary({
            currentSituationText: row.summaryCurrentSituationText ?? "",
            opportunityText: row.summaryOpportunityText ?? "",
            recommendedDirectionText: row.summaryRecommendedDirectionText ?? "",
            approachText: row.summaryApproachText ?? "",
          });
        }
        if (row.challengesTopProblemsText != null || row.challengesCompetitorInsightsText != null) {
          setChallenges({
            topProblemsText: row.challengesTopProblemsText ?? "",
            competitorInsightsText: row.challengesCompetitorInsightsText ?? "",
          });
        }
        if (row.roadmapPhasesJson) {
          try {
            setRoadmapPhases(JSON.parse(row.roadmapPhasesJson) as ProposalRoadmapPhase[]);
          } catch {
            /* fall through to the report-seeded default below */
          }
        }
        if (row.reportSnapshotId) {
          api
            .get<{ reportData: string | null }>(`/api/reports/${row.reportSnapshotId}`)
            .then((snap) => {
              if (!snap.reportData) return;
              const parsed = JSON.parse(snap.reportData) as ReportData;
              setReportDefaults(parsed.consultant);
              // Only seed from the report when this proposal never saved its
              // own values — never overwrites a saved (possibly edited or
              // deliberately blanked) value already applied above.
              if (row.summaryCurrentSituationText == null) {
                setSummary({
                  currentSituationText: parsed.executiveSummary.currentSituation ?? "",
                  opportunityText: parsed.executiveSummary.biggestOpportunity ?? "",
                  recommendedDirectionText: parsed.executiveSummary.recommendedDirection ?? "",
                  approachText: parsed.problemSolutionStory?.strategy ?? "",
                });
              }
              if (row.challengesTopProblemsText == null && row.challengesCompetitorInsightsText == null) {
                setChallenges({
                  topProblemsText: (parsed.websiteRecommendations?.topProblems ?? []).join("\n"),
                  competitorInsightsText: (parsed.competitorInsights ?? []).join("\n"),
                });
              }
              if (!row.roadmapPhasesJson) {
                setRoadmapPhases((parsed.growthPlan ?? []).map((p) => ({ title: p.phase, itemsText: p.items.join("\n") })));
              }
            })
            .catch(() => {}); // defaults are just placeholder text/seeding — fine to skip if unavailable
        }
        return api.get<ProposalRow[]>(`/api/proposals?leadId=${row.leadId}`);
      })
      .then((allForLead) => {
        const maxVersion = Math.max(0, ...allForLead.map((p) => p.version));
        setNextVersion(maxVersion + 1);
      })
      .catch((e) => setLoadError((e as Error).message));
  }, [proposalId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Settings' Service Packages config, for the package cards' Services
  // Included checklist and "Load a preset" picker — falls back to the
  // starter template if the consultant hasn't configured their own yet.
  useEffect(() => {
    api
      .get<{ servicePackagesJson: string | null }>("/api/settings")
      .then((s) => {
        if (!s.servicePackagesJson) return;
        try {
          setServicePackages(JSON.parse(s.servicePackagesJson));
        } catch {
          /* keep the starter template if saved JSON is somehow invalid */
        }
      })
      .catch(() => {}); // purely a builder convenience — fine to skip if unavailable
  }, []);

  function updatePackage(i: number, patch: Partial<ProposalPackage>) {
    setPackages((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  function markRecommended(i: number) {
    setPackages((prev) => prev.map((p, j) => ({ ...p, recommended: j === i })));
  }

  // Manual add/remove — mirrors New Proposal's addPackage/removePackage, so
  // a proposal with no packages left (or one built for a no-audit lead via
  // the Quick Proposal flow) can still be edited into something priceable.
  // reportDefaults (this proposal's backing report snapshot's consultant
  // block, loaded above) is the fallback currency source here, since this
  // page has no full `reportData` state of its own.
  function addPackage() {
    setPackages((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        label: `Package ${prev.length + 1}`,
        description: "",
        price: 0,
        currency: reportDefaults?.currency ?? prev[0]?.currency ?? "INR",
        recommended: prev.length === 0,
      },
    ]);
  }

  function removePackage(i: number) {
    setPackages((prev) => {
      const removed = prev[i];
      const next = prev.filter((_, j) => j !== i);
      if (removed?.recommended && next.length > 0 && !next.some((p) => p.recommended)) {
        next[0] = { ...next[0], recommended: true };
      }
      return next;
    });
  }

  function downloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFilename || "proposal.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packages,
          termsText,
          validUntil: validUntil || null,
          consultantOverride,
          revisionPolicyText: policy.revisionPolicyText || null,
          clientResponsibilitiesText: policy.clientResponsibilitiesText || null,
          notIncludedText: policy.notIncludedText || null,
          requirementsText: requirements.requirementsText || null,
          strategyAttractText: strategy.strategyAttractText || null,
          strategyEngageText: strategy.strategyEngageText || null,
          strategyConvertText: strategy.strategyConvertText || null,
          strategyRetainText: strategy.strategyRetainText || null,
          recommendedServicesText: recommendedServices.recommendedServicesText || null,
          toolsResourcePlanText: scope.toolsResourcePlanText || null,
          kpiFrameworkNotesText: kpiFrameworkNotesText || null,
          kpiPlatforms,
          monthlyDeliverablesText: deliverables.monthlyDeliverablesText || null,
          oneTimeDeliverablesText: deliverables.oneTimeDeliverablesText || null,
          discountAvailable,
          discountTiersText: discountTiersText || null,
          nextStepsText: nextStepsText || null,
          summaryCurrentSituationText: summary.currentSituationText,
          summaryOpportunityText: summary.opportunityText,
          summaryRecommendedDirectionText: summary.recommendedDirectionText,
          summaryApproachText: summary.approachText,
          challengesTopProblemsText: challenges.topProblemsText || null,
          challengesCompetitorInsightsText: challenges.competitorInsightsText || null,
          roadmapPhases,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Save failed.");
      }
      const version = res.headers.get("X-Proposal-Version");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(`${leadDetail?.lead.businessName || "proposal"}-proposal-v${version ?? ""}.pdf`);
      setSavedVersion(version ? Number(version) : null);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loadError && (!leadDetail || !source)) {
    return (
      <div>
        <PageHeading title="Edit Proposal" />
        <Card className="p-5">
          <p className="text-sm text-red-600">{loadError}</p>
        </Card>
      </div>
    );
  }

  if (!leadDetail || !source || nextVersion === null) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeading
        title={`Edit Proposal v${source.version}`}
        subtitle={`${leadDetail.lead.businessName} · ${leadDetail.lead.customerName} · saving creates a new version (v${nextVersion}) — v${source.version} stays exactly as sent`}
        action={
          <LinkButton href={`/leads/${leadId}`} variant="secondary" size="sm">
            ← Back to Lead
          </LinkButton>
        }
      />

      {savedVersion ? (
        <Card className="p-4 mb-4 border-emerald-300 dark:border-emerald-700">
          <p className="text-sm text-emerald-600 font-medium mb-3">
            Proposal v{savedVersion} saved — ready to download and send to the client.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadPdf}>
              <Download size={16} /> Download Proposal v{savedVersion}
            </Button>
            <LinkButton href="/proposals" variant="secondary">
              Go to Proposals
            </LinkButton>
          </div>
        </Card>
      ) : null}

      <div className="lg:flex lg:items-start lg:gap-6">
        <aside className="hidden lg:block lg:w-60 shrink-0 lg:sticky lg:top-6">
          <Card className="p-3">
            <ProposalSectionNav sections={navSections} activeId={activeSectionId} />
          </Card>
        </aside>

        <div className="flex-1 min-w-0">
          {/* 1.1 Executive Summary, 1.2 Requirements and 1.3 Challenges &
              Opportunities lead the builder, in the same order they render
              on the PDF. "Prepared By (this proposal)" — the 1. Cover Page
              override card — was moved to the bottom of the page (see
              sec-prepared-by further down) — see the matching comment on New
              Proposal for why. */}
          <div id="sec-summary" className="scroll-mt-6">
            <ProposalSummaryCard value={summary} onChange={(patch) => setSummary((prev) => ({ ...prev, ...patch }))} />
          </div>

          <div id="sec-requirements" className="scroll-mt-6">
            <ProposalRequirementsCard
              value={requirements}
              onChange={(patch) => setRequirements((prev) => ({ ...prev, ...patch }))}
            />
          </div>

          <div id="sec-challenges" className="scroll-mt-6">
            <ProposalChallengesCard value={challenges} onChange={(patch) => setChallenges((prev) => ({ ...prev, ...patch }))} />
          </div>

          {/* 2. Scope of the project: 2.1 Digital Growth Strategy / 2.2
              Recommended Services & Scope / 2.3 Tools & Resource Plan / 2.4
              90-Day Growth Roadmap / 2.5 KPI & Measurement Framework — in
              that order, matching the outline and the PDF's own page order
              exactly. Pricing Packages (Commercial Terms' pricing editor) is
              NOT part of this grouping — see its own card further down. */}
          <div id="sec-strategy" className="scroll-mt-6">
            <ProposalStrategyCard value={strategy} onChange={(patch) => setStrategy((prev) => ({ ...prev, ...patch }))} />
          </div>

          <div id="sec-recommended-services" className="scroll-mt-6">
            <ProposalRecommendedServicesCard
              value={recommendedServices}
              onChange={(patch) => setRecommendedServices((prev) => ({ ...prev, ...patch }))}
            />
          </div>

          <div id="sec-scope" className="scroll-mt-6">
            <ProposalScopeCard value={scope} onChange={(patch) => setScope((prev) => ({ ...prev, ...patch }))} />
          </div>

          <div id="sec-roadmap" className="scroll-mt-6">
            <ProposalRoadmapCard phases={roadmapPhases} onChange={setRoadmapPhases} />
          </div>

          <div id="sec-kpi" className="scroll-mt-6">
            <ProposalKpiCard
              platforms={kpiPlatforms}
              onChange={setKpiPlatforms}
              notesValue={kpiFrameworkNotesText}
              onNotesChange={setKpiFrameworkNotesText}
            />
          </div>

          <div id="sec-deliverables" className="scroll-mt-6">
            <ProposalDeliverablesCard
              value={deliverables}
              onChange={(patch) => setDeliverables((prev) => ({ ...prev, ...patch }))}
            />
          </div>

          {/* 4. Commercial Terms: 4.1 Pricing packages / 4.2 Project Fee
              Discounts, positioned here (after Deliverables, before
              Policies & Terms/Next Steps) mirroring the PDF's Deliverables
              -> Commercial Terms -> Policies & Terms -> Next Steps order. */}
          <div id="sec-packages" className="scroll-mt-6">
            <ProposalPackagesGrid
              packages={packages}
              onUpdate={updatePackage}
              onMarkRecommended={markRecommended}
              onAdd={addPackage}
              onRemove={removePackage}
              servicePackages={servicePackages}
            />
          </div>

          <div id="sec-fee-discounts" className="scroll-mt-6">
            <ProposalFeeDiscountsCard
              available={discountAvailable}
              onAvailableChange={setDiscountAvailable}
              tiersText={discountTiersText}
              onTiersTextChange={setDiscountTiersText}
            />
          </div>

          <div id="sec-policy" className="scroll-mt-6">
            <ProposalPolicyCard
              value={policy}
              onChange={(patch) => setPolicy((prev) => ({ ...prev, ...patch }))}
              termsText={termsText}
              onTermsTextChange={setTermsText}
              validUntil={validUntil}
              onValidUntilChange={setValidUntil}
            />
          </div>

          <div id="sec-nextsteps" className="scroll-mt-6">
            <ProposalNextStepsCard value={nextStepsText} onChange={setNextStepsText} />
          </div>

          {/* "Prepared By (this proposal)" — moved to the bottom of the
              page, right before Save — see the matching comment on New
              Proposal for why. */}
          <div id="sec-prepared-by" className="scroll-mt-6">
            <ProposalConsultantCard
              override={consultantOverride}
              defaults={reportDefaults}
              onChange={(patch) => setConsultantOverride((prev) => ({ ...prev, ...patch }))}
            />
          </div>

          {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || packages.length === 0 || packages.every((p) => !p.price)}>
              {saving ? "Saving…" : `Save as v${nextVersion}`}
            </Button>
          </div>
          {(packages.length === 0 || packages.every((p) => !p.price)) && (
            <p className="text-xs text-amber-600 text-right mt-2">
              {packages.length === 0 ? "Add at least one package and set its price to save." : "Set a price on at least one package to save."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
