"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Field, Select, Button, LinkButton, Spinner } from "@/components/ui";
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
import type { ReportData } from "@/lib/pdf/types";
import { DEFAULT_SERVICE_PACKAGES, type ProposalPackage, type ServicePackagesConfig } from "@/lib/pdf/proposal-types";
import { Download } from "lucide-react";

interface ReportRow {
  id: string;
  version: number;
  createdAt: string;
  hasReportData: boolean;
}

interface LeadDetail {
  lead: { id: string; businessName: string; customerName: string; quoteValue?: number | null };
  reports: ReportRow[];
}

const TIER_ORDER = ["conservative", "expected", "growth opportunity"];

function defaultTermsText() {
  return [
    "Validity: this proposal is valid for 30 days from the date above.",
    "Payment terms: 50% advance to begin work, balance due monthly in advance for the selected plan.",
    "What's included: campaign setup, ongoing management and optimization, and a monthly performance report.",
    "Ad spend is billed separately, directly to the ad platform (Google/Meta/etc.) at cost — not included in the management fee above.",
    "Either party may cancel with 30 days' written notice.",
  ].join("\n");
}

export default function NewProposalPage() {
  const params = useParams();
  const leadId = params.id as string;

  const [leadDetail, setLeadDetail] = useState<LeadDetail | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [packages, setPackages] = useState<ProposalPackage[]>([]);
  const [termsText, setTermsText] = useState(defaultTermsText());
  const [consultantOverride, setConsultantOverride] = useState<ConsultantOverrideValue>({});
  // Requirements/Strategy/Tools & Resource Plan/the 3 whole-engagement policy
  // fields all start pre-filled with a generic, editable default rather than
  // blank — otherwise these sections silently vanish from the generated PDF
  // whenever the consultant hasn't typed anything into them yet, which is
  // exactly what a real generated proposal was found to do (Digital Growth
  // Strategy, Tools & Resource Plan, Deliverables, Project Fee Discounts and
  // 3 of the 4 Policies subsections were all missing). Same "pre-filled but
  // freely editable/clearable" pattern already used for Terms and Next Steps.
  const [policy, setPolicy] = useState<ProposalPolicyValue>({
    revisionPolicyText: defaultRevisionPolicyText(),
    clientResponsibilitiesText: defaultClientResponsibilitiesText(),
    notIncludedText: defaultNotIncludedText(),
  });
  // 1.2 Requirements — its own numbered section, split out of the old
  // combined "Requirements & Strategy" card (see ProposalRequirementsCard).
  const [requirements, setRequirements] = useState<ProposalRequirementsValue>({
    requirementsText: defaultRequirementsText(),
  });
  const [strategy, setStrategy] = useState<ProposalStrategyValue>({
    strategyAttractText: defaultStrategyAttractText(),
    strategyEngageText: defaultStrategyEngageText(),
    strategyConvertText: defaultStrategyConvertText(),
    strategyRetainText: defaultStrategyRetainText(),
  });
  // "2.2 Recommended Services & Scope" — the strategic recommendation
  // write-up (client's requirement/goal, then what's recommended to achieve
  // it), NOT the priced packages below — see ProposalRecommendedServicesCard.
  const [recommendedServices, setRecommendedServices] = useState<ProposalRecommendedServicesValue>({
    recommendedServicesText: defaultRecommendedServicesText(),
  });
  const [scope, setScope] = useState<ProposalScopeValue>({
    toolsResourcePlanText: defaultToolsResourcePlanText(),
  });
  // "2.5 KPI & Measurement Framework" — NOT projected numbers. A dynamic
  // list of which platforms are in use and the important metrics tracked
  // for each (no numbers) — one shared list for the whole proposal, not per
  // package. See ProposalKpiCard's own comment for why this replaced the
  // old per-package Traffic/Leads/CPL/CAC/ROAS figures. Pre-filled with a
  // generic starting point, same pattern as Tools & Resource Plan/Next Steps.
  const [kpiPlatforms, setKpiPlatforms] = useState<ProposalKpiPlatform[]>(defaultKpiPlatforms());
  const [kpiFrameworkNotesText, setKpiFrameworkNotesText] = useState("");
  // Deliverables (Monthly/One-Time) — ONE shared field pair for the whole
  // proposal, not per package (see ProposalDeliverablesCard's own comment).
  // Same pre-filled-but-editable default pattern as the fields above.
  const [deliverables, setDeliverables] = useState<ProposalDeliverablesValue>({
    monthlyDeliverablesText: defaultMonthlyDeliverablesText(),
    oneTimeDeliverablesText: defaultOneTimeDeliverablesText(),
  });
  // "4.2 Project Fee Discounts" — ONE shared discount schedule for the whole
  // proposal (not per package — see ProposalFeeDiscountsCard's own comment),
  // gated by an explicit checkbox rather than "clear the text to omit."
  // Defaults on with a generic pre-filled schedule, same "always show every
  // section" pattern as the fields above — the consultant unchecks it when a
  // particular proposal isn't offering a discount.
  const [discountAvailable, setDiscountAvailable] = useState(true);
  const [discountTiersText, setDiscountTiersText] = useState(defaultDiscountTiersText());
  const [nextStepsText, setNextStepsText] = useState(defaultNextStepsText());
  // Executive Summary / Challenges & Opportunities / 90-Day Roadmap — used to
  // be computed live from the report; now seeded from it (below, whenever a
  // report version is selected) into their own editable proposal state, per
  // "each subsection want editable".
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
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  // Numbered section navigation, matching the consultant's full outline: 1.
  // Cover Page / 1.1 Executive Summary / 1.2 Requirements / 1.3 Challenges &
  // Opportunities / 2. Scope of the project [2.1-2.5] / 3. Deliverables / 4.
  // Commercial Terms [4.1 Pricing packages / 4.2 Project Fee Discounts] / 5.
  // Policies & Terms / 6. Next steps. "sec-packages" (Pricing Packages) lives
  // under "4. Commercial Terms" now, not under "2. Scope of the project" —
  // it used to be mislabeled "2.2 Recommended Services & Scope" there, but
  // it's really the pricing editor (name/price/services-included), a
  // Commercial Terms concern, not a scope recommendation. The section
  // wrapper `<div id=...>` elements only exist in the DOM once reportData
  // has loaded (see the JSX below), so the ids passed to the scroll-spy hook
  // are empty until then — once reportData arrives, the ids change and the
  // hook re-attaches to the now-rendered elements.
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
  const activeSectionId = useSectionScrollSpy(reportData ? navSections.map((s) => s.id) : []);

  const editableReports = useMemo(
    () => (leadDetail?.reports ?? []).filter((r) => r.hasReportData).sort((a, b) => b.version - a.version),
    [leadDetail]
  );

  // Quick Proposal support — a brand-new lead with no audit/assessment yet
  // has zero reports, and this builder needs a report snapshot to seed from
  // (even a generic, un-assessed one — buildReportData() is fully null-safe
  // for a missing assessment, see build-report-data.ts). Rather than
  // blocking with "generate a report first", auto-create one blank report
  // behind the scenes the first time we see a lead with no editable
  // reports, then load it exactly as if it already existed. `autoCreateRan`
  // guards against firing twice under React Strict Mode's dev double-invoke.
  const [createReportError, setCreateReportError] = useState<string | null>(null);
  const autoCreateRan = useRef(false);

  async function loadLead() {
    try {
      const d = await api.get<LeadDetail>(`/api/leads/${leadId}`);
      setLeadDetail(d);
      const editable = (d.reports ?? []).filter((r) => r.hasReportData).sort((a, b) => b.version - a.version);
      if (editable.length > 0) setSelectedReportId(editable[0].id);
      return d;
    } catch (e) {
      setLoadError((e as Error).message);
      return null;
    }
  }

  useEffect(() => {
    loadLead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useEffect(() => {
    if (!leadDetail || editableReports.length > 0 || autoCreateRan.current) return;
    autoCreateRan.current = true;
    setCreateReportError(null);
    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Couldn't prepare this lead for a proposal.");
        }
        await res.blob(); // discard the PDF bytes — we only needed the snapshot this created
        await loadLead();
      })
      .catch((e) => setCreateReportError((e as Error).message));
  }, [leadDetail, editableReports.length, leadId]);

  useEffect(() => {
    if (!selectedReportId) return;
    setReportData(null);
    api
      .get<{ reportData: string | null }>(`/api/reports/${selectedReportId}`)
      .then((row) => {
        if (!row.reportData) return;
        const parsed = JSON.parse(row.reportData) as ReportData;
        setReportData(parsed);
        const ordered = [...parsed.scenarios].sort((a, b) => {
          const ai = TIER_ORDER.indexOf(a.label.toLowerCase());
          const bi = TIER_ORDER.indexOf(b.label.toLowerCase());
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
        setPackages(
          ordered.map((sc) => ({
            key: sc.label.toLowerCase().replace(/\s+/g, "-"),
            label: sc.label,
            description: "",
            price: 0,
            currency: parsed.consultant.currency,
            scenarioLabel: sc.label,
            recommended: sc.label.toLowerCase().includes("expected"),
            // NOTE: Deliverables and Discount Tiers used to be seeded here
            // too, per package — both moved to shared proposal-level state
            // (`deliverables` below, `discountAvailable`/`discountTiersText`
            // above) since neither actually varies by pricing tier; see
            // ProposalDeliverablesCard's and ProposalFeeDiscountsCard's own
            // comments. The backing scenario's customers/revenue/roi used to
            // be seeded here too, purely to drive a builder-side stat row on
            // the package card — removed entirely at the consultant's
            // request; see ProposalPackage's own comment in proposal-types.ts.
          }))
        );
        // Seed Executive Summary / Challenges & Opportunities / 90-Day
        // Roadmap from this report version's own data — real text/phases
        // only, nothing invented — then the consultant can freely rewrite
        // any of it below before generating.
        setSummary({
          currentSituationText: parsed.executiveSummary.currentSituation ?? "",
          opportunityText: parsed.executiveSummary.biggestOpportunity ?? "",
          recommendedDirectionText: parsed.executiveSummary.recommendedDirection ?? "",
          approachText: parsed.problemSolutionStory?.strategy ?? "",
        });
        setChallenges({
          topProblemsText: (parsed.websiteRecommendations?.topProblems ?? []).join("\n"),
          competitorInsightsText: (parsed.competitorInsights ?? []).join("\n"),
        });
        setRoadmapPhases((parsed.growthPlan ?? []).map((p) => ({ title: p.phase, itemsText: p.items.join("\n") })));
      })
      .catch((e) => setLoadError((e as Error).message));
  }, [selectedReportId]);

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

  // Manual add/remove — for a lead with no audit scenarios to seed packages
  // from (the Quick Proposal flow), or simply to add an extra custom tier
  // alongside the seeded ones.
  function addPackage() {
    setPackages((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        label: `Package ${prev.length + 1}`,
        description: "",
        price: 0,
        currency: reportData?.consultant.currency ?? prev[0]?.currency ?? "INR",
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

  async function generate() {
    if (!reportData || !selectedReportId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          reportSnapshotId: selectedReportId,
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
        throw new Error(body?.error || "Generation failed.");
      }
      const version = res.headers.get("X-Proposal-Version");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(`${reportData.business.businessName || "proposal"}-proposal-v${version ?? ""}.pdf`);
      setSavedVersion(version ? Number(version) : null);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loadError && !leadDetail) {
    return (
      <div>
        <PageHeading title="Generate Proposal" />
        <Card className="p-5">
          <p className="text-sm text-red-600">{loadError}</p>
        </Card>
      </div>
    );
  }

  if (!leadDetail) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (editableReports.length === 0) {
    if (createReportError) {
      return (
        <div>
          <PageHeading title="Generate Proposal" subtitle={leadDetail.lead.businessName} />
          <Card className="p-5">
            <p className="text-sm text-red-600">{createReportError}</p>
            <LinkButton href={`/leads/${leadId}`} variant="secondary" className="mt-4">
              ← Back to Lead
            </LinkButton>
          </Card>
        </div>
      );
    }
    // Still auto-creating (or about to) the blank report this lead needs to
    // back a proposal — see the effect above. Once it lands, `leadDetail`
    // is reloaded with the new report and this branch stops rendering.
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeading
        title="Generate Proposal"
        subtitle={`${leadDetail.lead.businessName} · ${leadDetail.lead.customerName} · priced packages sent to the client for sign-off`}
        action={
          <LinkButton href={`/leads/${leadId}`} variant="secondary" size="sm">
            ← Back to Lead
          </LinkButton>
        }
      />

      {savedVersion ? (
        <Card className="p-4 mb-4 border-emerald-300 dark:border-emerald-700">
          <p className="text-sm text-emerald-600 font-medium mb-3">
            Proposal v{savedVersion} generated — ready to download and send to the client.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadPdf}>
              <Download size={16} /> Download Proposal v{savedVersion}
            </Button>
            <LinkButton href={`/leads/${leadId}`} variant="secondary">
              Go to Lead
            </LinkButton>
          </div>
        </Card>
      ) : null}

      <Card className="p-5 mb-4">
        <Field
          label="Based on report version"
          hint={
            reportData && reportData.scenarios.length === 0
              ? "This lead has no audit scenarios yet — use \"+ Add Package\" below to price this proposal from scratch."
              : "Packages below are seeded from this version's scenarios — pick a different version to reseed them."
          }
        >
          <Select value={selectedReportId} onChange={(e) => setSelectedReportId(e.target.value)} className="max-w-xs">
            {editableReports.map((r) => (
              <option key={r.id} value={r.id}>
                v{r.version} — {new Date(r.createdAt).toLocaleDateString()}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {!reportData ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="lg:flex lg:items-start lg:gap-6">
          <aside className="hidden lg:block lg:w-60 shrink-0 lg:sticky lg:top-6">
            <Card className="p-3">
              <ProposalSectionNav sections={navSections} activeId={activeSectionId} />
            </Card>
          </aside>

          <div className="flex-1 min-w-0">
            {/* 1.1 Executive Summary, 1.2 Requirements and 1.3 Challenges &
                Opportunities lead the builder, in the same order they render
                on the PDF. "Prepared By (this proposal)" — the 1. Cover
                Page override card — was moved to the bottom of the page (see
                sec-prepared-by further down): it's a rarely-touched contact
                override, not core proposal content, so it's a final check
                before generating rather than the first thing the consultant
                sees. Its nav entry moved with it, keeping the sidebar's
                order matching the page's actual scroll order. */}
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
                Recommended Services & Scope / 2.3 Tools & Resource Plan /
                2.4 90-Day Growth Roadmap / 2.5 KPI & Measurement Framework —
                in that order, matching the outline and the PDF's own page
                order exactly. Pricing Packages (Commercial Terms' pricing
                editor) is NOT part of this grouping — it used to sit here
                mislabeled "2.2", but pricing/services-checklist/discount
                tiers are a Commercial Terms concern, not a scope
                recommendation — see its own card further down, moved next
                to where Commercial Terms will eventually live. */}
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

            {/* 4. Commercial Terms: 4.1 Pricing packages (name, monthly
                price, description, services included) / 4.2 Project Fee
                Discounts (one shared discount schedule, gated by a checkbox
                — see ProposalFeeDiscountsCard). Positioned here, after
                Deliverables and before Policies & Terms/Next Steps,
                mirroring the PDF's own Deliverables -> Commercial Terms ->
                Policies & Terms -> Next Steps order. */}
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
                page, right before Generate. Still the "1. Cover Page" entry
                in the sidebar (it overrides the cover page/header/footer/
                closing-section identity), just reordered so the consultant
                fills in the actual proposal content first and only touches
                this contact override, if at all, as a last step. */}
            <div id="sec-prepared-by" className="scroll-mt-6">
              <ProposalConsultantCard
                override={consultantOverride}
                defaults={reportData.consultant}
                onChange={(patch) => setConsultantOverride((prev) => ({ ...prev, ...patch }))}
              />
            </div>

            {saveError && <p className="text-sm text-red-600 mb-3">{saveError}</p>}
            <div className="flex justify-end">
              <Button onClick={generate} disabled={saving || packages.length === 0 || packages.every((p) => !p.price)}>
                {saving ? "Generating…" : "Generate Proposal PDF"}
              </Button>
            </div>
            {(packages.length === 0 || packages.every((p) => !p.price)) && (
              <p className="text-xs text-amber-600 text-right mt-2">
                {packages.length === 0
                  ? "Add at least one package and set its price to generate the proposal."
                  : "Set a price on at least one package to generate the proposal."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
