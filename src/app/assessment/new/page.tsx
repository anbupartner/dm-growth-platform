"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import {
  PageHeading,
  Card,
  CardHeader,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  LinkButton,
  ToggleChip,
  Stepper,
  Spinner,
  Badge,
} from "@/components/ui";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  BUSINESS_GOALS,
  ORGANIC_GOALS,
  PPC_OBJECTIVES,
  LOCAL_ORGANIC_GOALS,
  LOCAL_PPC_OBJECTIVES,
  WHATSAPP_MARKETING_GOALS,
  SOCIAL_MEDIA_LINK_FIELDS,
  SOCIAL_MEDIA_PLAYBOOK,
  SOCIAL_MEDIA_INDUSTRY_CONTENT,
  INDUSTRY_TO_SOCIAL_CLUSTER,
  LOCAL_BRANDING_RECOMMENDATIONS,
  AD_PLATFORMS,
  WHATSAPP_PLATFORM_DETAIL,
  WEBSITE_TYPES,
  WEBSITE_TYPE_DETAILS,
  BUSINESS_TYPES,
  BUSINESS_TYPE_WEBSITE_TYPES,
  ONLINE_PRESENCE_SUGGESTIONS,
  INDUSTRIES,
  COUNTRIES,
  currencyForCountry,
  auditStatusLabel,
} from "@/lib/constants";
import type { BusinessType } from "@/lib/constants";
import { categorizeAuditScores, type AuditCheck } from "@/lib/website-audit";
import {
  categorizeGrowthRecommendations,
  getAudiencePlatformSuggestion,
  suggestBudgetAllocation,
  estimateChannelBudgetResult,
  suggestMonthlyBudget,
  STRATEGIC_RECOMMENDATIONS,
} from "@/lib/recommendations";
import { parseCompetitorUrls, type SiteSignals } from "@/lib/competitor-analysis";
import {
  calculatePaidForecast,
  buildScenarioTiers,
  formatCurrency,
  formatRoas,
  formatPercent,
  formatNumber,
  type BenchmarkRow,
  type OrganicMonthlyPoint,
  type SeoCompetitionTier,
} from "@/lib/calculations";
import { deriveCompetitionTiers, getNewSiteTimeline, getCompetitorContentSignal, type CompetitionTierResult } from "@/lib/seo-competition";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { FxRate } from "@/lib/fx-rate";
import type { SocialPlatformKey } from "@/lib/constants";
import type { SocialCheckResult } from "@/lib/social-audit";
import { initialWizardData, type WizardData } from "./wizard-types";

// Maps a SOCIAL_MEDIA_LINK_FIELDS/SOCIAL_MEDIA_PLAYBOOK key ("facebook") to
// its WizardData field name ("socialFacebook") — shared by the Business
// Details step (link inputs) and the Audit step (Social Media Insights).
function socialLinkDataKey(key: SocialPlatformKey): "socialFacebook" | "socialInstagram" | "socialLinkedin" | "socialYoutube" {
  return `social${key.charAt(0).toUpperCase()}${key.slice(1)}` as "socialFacebook" | "socialInstagram" | "socialLinkedin" | "socialYoutube";
}
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Sparkles, Plus, X as XIcon, Store, Download, Share2, TrendingUp } from "lucide-react";

const STEPS = [
  "Website?",
  "Business",
  "Audit / Info",
  "Organic, PPC & WhatsApp",
  "Audience",
  "Competitor",
  "Sample Ads",
  "Forecast",
  "Story",
  "Customer",
  "Generate",
];

// ---------------------------------------------------------------------------
// Mandatory-field gate — deliberately minimal, decided step by step with the
// consultant rather than guessed: most fields stay optional so the wizard
// doesn't get in the way, and a handful that either drive later steps'
// suggestions or are needed to save at all are required. Returns a clear,
// user-facing message naming exactly what's missing, or null once the step
// is complete enough to move on. Checked on Next only (not live per-
// keystroke) — same convention as the existing "Enter a website URL..."
// style errors elsewhere in this wizard. Business Name and Customer Name are
// also independently enforced at the final Generate step, right where the
// Save button is (see StepGenerate) — that one's a hard backend requirement
// (POST /api/leads rejects a missing name) that stays in place regardless of
// this step-gate policy, not something to remove now that both are required
// here too.
// ---------------------------------------------------------------------------
function getStepValidationError(stepIndex: number, data: WizardData): string | null {
  switch (stepIndex) {
    case 0: // Website?
      if (data.hasWebsite !== "YES" && data.hasWebsite !== "NO") {
        return "Select whether this business currently has a website.";
      }
      if (data.hasWebsite === "YES" && !data.websiteUrl.trim()) {
        return "Enter the Website URL — needed to run the audit on the next step.";
      }
      return null;
    case 1: // Business Details
      if (!data.businessName.trim()) {
        return "Enter the Business Name.";
      }
      if (!data.businessVertical) {
        return "Select a Business Vertical.";
      }
      return null;
    case 2: // Audit (has website) / Website Recommendation (no website)
      if (data.hasWebsite === "NO" && !data.businessType) {
        return "Select what this business sells (Services / Physical Products / E-commerce).";
      }
      return null;
    case 3: // Organic, PPC & WhatsApp
      if (!data.includeOrganic && !data.includePpc && !data.includeWhatsappMarketing) {
        return "Select at least one channel — Organic/SEO, PPC/Paid, or WhatsApp Marketing.";
      }
      return null;
    case 4: // Audience
      if (data.platforms.length === 0) {
        return "Select at least one platform.";
      }
      return null;
    case 9: // Customer
      if (!data.customerName.trim()) {
        return "Enter the Customer Name.";
      }
      return null;
    default: // Competitor, Sample Ads, Forecast, Story — nothing required
      return null;
  }
}

export default function NewAssessmentPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
      <WizardInner />
    </Suspense>
  );
}

function WizardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefillLeadId = searchParams.get("leadId");

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => {
    // Answers already collected in the "+ Business Audit" dialog on the
    // dashboard — carried over via query params so they're never re-asked.
    const hasWebsite = searchParams.get("hasWebsite");
    if (hasWebsite !== "YES" && hasWebsite !== "NO") return initialWizardData;
    return {
      ...initialWizardData,
      hasWebsite,
      websiteUrl: searchParams.get("websiteUrl") ?? initialWizardData.websiteUrl,
      businessDescription: searchParams.get("businessDescription") ?? initialWizardData.businessDescription,
    };
  });
  const [loadingLead, setLoadingLead] = useState(!!prefillLeadId);

  useEffect(() => {
    if (!prefillLeadId) return;
    api
      .get<{ lead: Record<string, unknown> }>(`/api/leads/${prefillLeadId}`)
      .then(({ lead }) => {
        setData((d) => ({
          ...d,
          leadId: prefillLeadId,
          customerName: (lead.customerName as string) ?? "",
          businessName: (lead.businessName as string) ?? "",
          email: (lead.email as string) ?? "",
          phone: (lead.phone as string) ?? "",
          whatsapp: (lead.whatsapp as string) ?? "",
          address: (lead.address as string) ?? "",
          city: (lead.city as string) ?? "",
          state: (lead.state as string) ?? "",
          country: (lead.country as string) || "India",
          businessVertical: (lead.businessVertical as string) ?? "",
          businessDescription: (lead.businessDescription as string) ?? "",
          productsServices: (lead.productsServices as string) ?? "",
          websiteUrl: (lead.websiteUrl as string) ?? "",
          competitorUrls: (lead.competitorUrls as string) ?? "",
          hasLocalStore: Boolean((lead.storeLocations as string | null)?.trim()),
          storeLocations: (lead.storeLocations as string | null)?.trim()
            ? (lead.storeLocations as string).split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          minOrderValue: lead.minOrderValue?.toString() ?? "",
          avgOrderValue: lead.avgOrderValue?.toString() ?? "",
          maxOrderValue: lead.maxOrderValue?.toString() ?? "",
          profitMarginPct: lead.profitMarginPct?.toString() ?? "",
          monthlyBudget: lead.monthlyBudget?.toString() ?? "",
          targetCountry: (lead.targetCountry as string) || "India",
          targetLocation: (lead.targetLocation as string) ?? "",
          targetAudience: (lead.targetAudience as string) ?? "",
          businessGoal: (lead.businessGoal as string) ?? "",
          leadSource: (lead.leadSource as string) ?? "OTHER",
          hasWebsite: (lead.hasWebsite as "YES" | "NO") ?? "",
        }));
      })
      .finally(() => setLoadingLead(false));
  }, [prefillLeadId]);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const steps = useMemo(() => {
    // Skip the audit step's automated checks when there's no website (Workflow B still uses the step for recommendations).
    return STEPS;
  }, []);

  // Tracks whether Next has been clicked while the current step was still
  // incomplete — the error message only shows after that attempt (same
  // convention as this wizard's other step-level errors), and re-derives
  // live from `data` on every render, so it disappears the moment the
  // missing field is filled in, without needing a separate effect.
  const [attemptedNext, setAttemptedNext] = useState(false);
  const stepError = attemptedNext ? getStepValidationError(step, data) : null;

  function next() {
    if (getStepValidationError(step, data)) {
      setAttemptedNext(true);
      return;
    }
    setAttemptedNext(false);
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setAttemptedNext(false);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  // Jump directly to any already-filled step (or the current one) from the
  // Stepper, so earlier answers can be corrected without clicking "Back"
  // repeatedly. goToStep never lets you jump ahead into a step you haven't
  // reached yet — Stepper itself only makes those steps clickable — so no
  // validation is needed here, only when moving forward via Next.
  function goToStep(i: number) {
    setAttemptedNext(false);
    setStep((s) => (i <= s ? i : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loadingLead) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-3xl">
      <PageHeading title="Business Audit" subtitle="Lead → Business Understanding → Audit → Strategy → Report." />
      <Stepper steps={steps} current={step} onStepClick={goToStep} />

      {step === 0 && <StepHasWebsite data={data} update={update} />}
      {step === 1 && <StepBusinessDetails data={data} update={update} />}
      {step === 2 && <StepAudit data={data} update={update} />}
      {step === 3 && <StepOrganicPpc data={data} update={update} />}
      {step === 4 && <StepAudience data={data} update={update} />}
      {step === 5 && <StepCompetitor data={data} update={update} />}
      {step === 6 && <StepSampleAds data={data} update={update} />}
      {step === 7 && <StepForecast data={data} update={update} />}
      {step === 8 && <StepStory data={data} update={update} />}
      {step === 9 && <StepCustomerContact data={data} update={update} />}
      {step === 10 && <StepGenerate data={data} onDone={(leadId) => router.push(`/leads/${leadId}`)} />}

      {step < steps.length - 1 && (
        <div className="mt-6">
          {stepError && <p className="text-sm text-red-600 mb-3 text-right">{stepError}</p>}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={back} disabled={step === 0}>
              Back
            </Button>
            <Button onClick={next}>Next →</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Business details (spec section 3, minus personal contact fields —
// those are asked last, see StepCustomerContact). Kept early because Audience
// and Forecast steps below depend on Business Vertical and order values.
// ---------------------------------------------------------------------------
function StepBusinessDetails({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  // Per-industry "Profit Margin" benchmarks live in the Benchmarks database
  // (Platform = "Industry Benchmark", Metric = "Profit Margin") — editable
  // there any time, same as every other CPC/CTR benchmark. Fetched once;
  // looked up by the selected Business Vertical to offer a one-click
  // starting value below, without ever overwriting a value already typed.
  const [marginBenchmarks, setMarginBenchmarks] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    api
      .get<Array<{ industry: string; value: number }>>("/api/benchmarks?metric=Profit%20Margin&status=active")
      .then((rows) => setMarginBenchmarks(Object.fromEntries(rows.map((r) => [r.industry, r.value]))))
      .catch(() => setMarginBenchmarks({}));
  }, []);
  const marginBenchmark = data.businessVertical ? marginBenchmarks?.[data.businessVertical] : undefined;

  // Suggested starting monthly budget — shown only while the field is empty
  // (once a real budget is entered there's nothing to suggest). Platforms
  // haven't been chosen yet at this point in the wizard (that's the Audience
  // step below), so this falls back to the vertical's full suggested
  // platform list — see suggestMonthlyBudget in recommendations.ts.
  const budgetSuggestion = useSuggestedMonthlyBudget(data.businessVertical, data.platforms, data.targetCountry);

  return (
    <Card className="p-5">
      <CardHeader title="Business Details" subtitle="What does this business do, and what does success look like?" />
      <div className="grid sm:grid-cols-2 gap-4 pt-4">
        <Field label="Business Name *"><Input value={data.businessName} onChange={(e) => update("businessName", e.target.value)} /></Field>
        <Field label="Business Vertical">
          <Select value={data.businessVertical} onChange={(e) => update("businessVertical", e.target.value)}>
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </Field>
        <Field label="Lead Source">
          <Select value={data.leadSource} onChange={(e) => update("leadSource", e.target.value)}>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>)}
          </Select>
        </Field>
        <Field label="Business Goal">
          <Select value={data.businessGoal} onChange={(e) => update("businessGoal", e.target.value)}>
            <option value="">Select…</option>
            {BUSINESS_GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Business Description">
        <Textarea value={data.businessDescription} onChange={(e) => update("businessDescription", e.target.value)} className="mt-4" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Field label="Products / Services"><Textarea value={data.productsServices} onChange={(e) => update("productsServices", e.target.value)} /></Field>
        <Field label="Competitor URLs" hint="Comma separated">
          <Textarea value={data.competitorUrls} onChange={(e) => update("competitorUrls", e.target.value)} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        <Field label="Min Order Value"><Input type="number" value={data.minOrderValue} onChange={(e) => update("minOrderValue", e.target.value)} /></Field>
        <Field label="Average Order Value"><Input type="number" value={data.avgOrderValue} onChange={(e) => update("avgOrderValue", e.target.value)} /></Field>
        <Field label="Max Order Value"><Input type="number" value={data.maxOrderValue} onChange={(e) => update("maxOrderValue", e.target.value)} /></Field>
        <div>
          <Field label="Profit Margin %"><Input type="number" value={data.profitMarginPct} onChange={(e) => update("profitMarginPct", e.target.value)} /></Field>
          {marginBenchmark != null && (
            <button
              type="button"
              onClick={() => update("profitMarginPct", String(marginBenchmark))}
              className="mt-1 text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Use industry benchmark: {marginBenchmark}% ({data.businessVertical})
            </button>
          )}
        </div>
        <div>
          <Field label="Monthly Marketing Budget"><Input type="number" value={data.monthlyBudget} onChange={(e) => update("monthlyBudget", e.target.value)} /></Field>
          {!(Number(data.monthlyBudget) > 0) && (
            !data.businessVertical ? (
              <p className="text-[11px] text-amber-600 mt-1">Set a Business Vertical above for a suggested starting budget.</p>
            ) : (
              <SuggestedBudgetHint suggestion={budgetSuggestion} onApply={(amount) => update("monthlyBudget", amount)} />
            )
          )}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Field label="Target Country" hint="Sharpens the auto-suggested target audience with real digital-behavior patterns for this market.">
          <Select value={data.targetCountry} onChange={(e) => update("targetCountry", e.target.value)}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Target City / Region (optional)" hint="Leave blank to target the whole country selected above.">
          <Input value={data.targetLocation} onChange={(e) => update("targetLocation", e.target.value)} placeholder="e.g. Austin, TX" />
        </Field>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
          <Share2 size={13} /> Social Media Presence — this business's own organic profiles
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIAL_MEDIA_LINK_FIELDS.map(({ key, label, placeholder }) => {
            const dataKey = socialLinkDataKey(key);
            return (
              // No "*" here — these are genuinely optional, unlike Business
              // Name/Business Vertical above (see getStepValidationError):
              // nothing blocks Next if they're left blank.
              <Field key={key} label={label}>
                <Input value={data[dataKey]} onChange={(e) => update(dataKey, e.target.value)} placeholder={placeholder} className="mt-1" />
              </Field>
            );
          })}
        </div>
      </div>

      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={data.hasLocalStore}
            onChange={(e) => {
              const checked = e.target.checked;
              update("hasLocalStore", checked);
              if (checked && data.storeLocations.length === 0) update("storeLocations", [""]);
            }}
          />
          <Store size={15} className="text-slate-400" />
          This business also has a physical/local store to promote
        </label>
        <p className="text-xs text-slate-400 mt-1 ml-6">
          For local-search visibility (Google Business Profile, Maps, &quot;near me&quot; search) alongside the website — separate from the Website URL.
        </p>

        {data.hasLocalStore && (
          <div className="mt-3 ml-6 space-y-2 max-w-xl">
            {data.storeLocations.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={url}
                  onChange={(e) => {
                    const next = [...data.storeLocations];
                    next[i] = e.target.value;
                    update("storeLocations", next);
                  }}
                  placeholder={i === 0 ? "Main store — Google Business Profile / Maps link" : "Additional store location — Google Business Profile / Maps link"}
                  className="flex-1"
                />
                {data.storeLocations.length > 1 && (
                  <button
                    type="button"
                    onClick={() => update("storeLocations", data.storeLocations.filter((_, idx) => idx !== i))}
                    className="p-2 text-slate-400 hover:text-red-500"
                    aria-label="Remove this location"
                  >
                    <XIcon size={15} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => update("storeLocations", [...data.storeLocations, ""])}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              <Plus size={14} /> Add another location
            </button>
            <p className="text-[11px] text-slate-400">
              Multiple stores in different locations? The first link above is treated as the main store — add the rest with the button above.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Last step before Generate — pure contact/identity details. Kept separate
// from Business Details (above) and asked last, per request: nothing here is
// needed by any earlier step's calculations or suggestions.
// ---------------------------------------------------------------------------
function StepCustomerContact({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  // Most customers give the same number for both — default to "same as
  // phone" unless the two already differ (e.g. re-opening an existing
  // lead where they were deliberately entered separately), so re-visiting
  // this step never silently overwrites an intentionally different number.
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(data.whatsapp === data.phone || !data.whatsapp);

  return (
    <Card className="p-5">
      <CardHeader title="Customer Information" subtitle="Who is this assessment for? Used for the report and CRM record." />
      <div className="grid sm:grid-cols-2 gap-4 pt-4">
        <Field label="Customer Name *"><Input value={data.customerName} onChange={(e) => update("customerName", e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} /></Field>
        <Field label="Phone">
          <Input
            value={data.phone}
            onChange={(e) => {
              update("phone", e.target.value);
              if (whatsappSameAsPhone) update("whatsapp", e.target.value);
            }}
          />
        </Field>
        <div className="block">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">WhatsApp Number</span>
          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
            <input
              type="checkbox"
              checked={whatsappSameAsPhone}
              onChange={(e) => {
                setWhatsappSameAsPhone(e.target.checked);
                if (e.target.checked) update("whatsapp", data.phone);
              }}
            />
            Same as Phone
          </label>
          {whatsappSameAsPhone ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-2">{data.phone || "—"}</p>
          ) : (
            <Input value={data.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="Enter WhatsApp number" />
          )}
        </div>
        <Field label="Address"><Input value={data.address} onChange={(e) => update("address", e.target.value)} /></Field>
        <Field label="City"><Input value={data.city} onChange={(e) => update("city", e.target.value)} /></Field>
        <Field label="State"><Input value={data.state} onChange={(e) => update("state", e.target.value)} /></Field>
        <Field label="Country">
          <Select value={data.country} onChange={(e) => update("country", e.target.value)}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — primary question (spec section 2)
// ---------------------------------------------------------------------------
function StepHasWebsite({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  return (
    <Card className="p-5">
      <CardHeader title="Does your business currently have a website?" subtitle="This determines the rest of the assessment workflow." />
      <div className="flex gap-4 pt-4">
        <button
          onClick={() => update("hasWebsite", "YES")}
          className={`flex-1 rounded-xl border-2 p-6 text-left transition-colors ${data.hasWebsite === "YES" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" : "border-slate-200 dark:border-slate-700"}`}
        >
          <p className="font-semibold text-slate-900 dark:text-white">YES</p>
          <p className="text-sm text-slate-500 mt-1">I have a website</p>
        </button>
        <button
          onClick={() => update("hasWebsite", "NO")}
          className={`flex-1 rounded-xl border-2 p-6 text-left transition-colors ${data.hasWebsite === "NO" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" : "border-slate-200 dark:border-slate-700"}`}
        >
          <p className="font-semibold text-slate-900 dark:text-white">NO</p>
          <p className="text-sm text-slate-500 mt-1">I don&apos;t have a website</p>
        </button>
      </div>
      {data.hasWebsite === "YES" && (
        <Field label="Website URL" hint="Used for the automated audit in the next step.">
          <Input value={data.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="https://" className="mt-4" />
        </Field>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Website Audit (Workflow A) or Recommendation (Workflow B)
// ---------------------------------------------------------------------------
const STATUS_ICON: Record<string, React.ReactNode> = {
  pass: <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />,
  warn: <AlertTriangle size={15} className="text-amber-500 shrink-0" />,
  fail: <XCircle size={15} className="text-red-500 shrink-0" />,
  unavailable: <HelpCircle size={15} className="text-slate-400 shrink-0" />,
};

function StepAudit({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAudit() {
    if (!data.websiteUrl) {
      setError("Enter a website URL on the Website? step first.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const result = await api.post<{ checks: AuditCheck[]; fetchedOk: boolean; ogImageUrl?: string }>("/api/audit", { url: data.websiteUrl });
      update("auditChecks", result.checks);
      update("websiteOgImageUrl", result.ogImageUrl ?? "");
      const cats = categorizeAuditScores(result.checks) as {
        technicalSeo: number;
        onPageSeo: number;
        content: number;
        uxConversion: number;
        performance: number;
        branding: number;
        localSeo: number;
      };
      const overall = Math.round(
        (cats.technicalSeo + cats.onPageSeo + cats.content + cats.uxConversion + cats.performance + cats.branding + cats.localSeo) / 7
      );
      update("auditScores", { ...cats, overall } as WizardData["auditScores"]);

      const problems: string[] = [];
      const improvements: string[] = [];
      for (const c of result.checks) {
        if (c.status === "fail") {
          problems.push(`${c.label}: ${c.detail}`);
          improvements.push(`Fix ${c.label.toLowerCase()}.`);
        } else if (c.status === "warn") {
          problems.push(`${c.label}: ${c.detail}`);
        }
      }
      update("topProblems", problems.slice(0, 6));
      update("recommendedImprovements", improvements.length ? improvements : ["Strengthen on-page SEO fundamentals.", "Improve content depth on key pages."]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  if (data.hasWebsite === "NO") {
    const typeDetail = WEBSITE_TYPE_DETAILS[data.websiteType];
    // Once a Business Type is chosen, narrow the dropdown to the website
    // types that actually fit what this business sells — full list of 7
    // stays available until then, or if Business Type is cleared again.
    const websiteTypeOptions = data.businessType ? BUSINESS_TYPE_WEBSITE_TYPES[data.businessType] : WEBSITE_TYPES;

    function handleBusinessTypeChange(bt: BusinessType) {
      update("businessType", bt);
      const options = BUSINESS_TYPE_WEBSITE_TYPES[bt];
      if (!options.includes(data.websiteType)) {
        update("websiteType", options[0]);
      }
    }

    return (
      <div className="space-y-5">
        <Card className="p-5">
          <CardHeader title="Website Recommendation" subtitle="No existing website yet — here's the fastest path to one that actually converts." />
          <div className="pt-4 space-y-4">
            <Field label="What does this business sell?" hint="Narrows the website type and online-presence suggestions below to what actually fits.">
              <div className="flex gap-2 flex-wrap">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => handleBusinessTypeChange(bt)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                      data.businessType === bt
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                        : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Recommended Website Type">
              <Select value={data.websiteType} onChange={(e) => update("websiteType", e.target.value)}>
                {websiteTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            {typeDetail && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-500/10">
                <p className="text-sm text-slate-700 dark:text-slate-200">{typeDetail.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Ideal for: </span>
                  {typeDetail.idealFor}
                </p>
                <div className="pt-2.5">
                  <Button size="sm" variant="secondary" onClick={() => update("websitePages", typeDetail.suggestedPages)}>
                    <Sparkles size={12} /> Use suggested pages for {data.websiteType}
                  </Button>
                </div>
              </div>
            )}
            <Field label="Recommended Pages" hint="One per line — edit freely.">
              <Textarea
                value={data.websitePages.join("\n")}
                onChange={(e) => update("websitePages", e.target.value.split("\n").filter(Boolean))}
                rows={6}
              />
            </Field>
          </div>
        </Card>
        <OnlinePresenceCard data={data} update={update} />
        {data.hasLocalStore && <LocalPresenceCard data={data} update={update} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
    <Card className="p-5">
      <CardHeader
        title="Website Audit"
        subtitle="Live checks only — nothing here is fabricated. Metrics needing paid APIs are marked unavailable."
        action={<Button size="sm" onClick={runAudit} disabled={running}>{running ? "Running…" : "Run Audit"}</Button>}
      />
      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {data.auditChecks.length > 0 && (
        <div className="pt-4 space-y-2">
          {data.auditChecks.map((c) => (
            <div key={c.key} className="flex items-start gap-2 text-sm">
              {STATUS_ICON[c.status]}
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">{c.label}: </span>
                <span className="text-slate-500">{c.detail}</span>
              </div>
            </div>
          ))}

          <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <Field label="Branding Score" hint="Auto-suggested from Open Graph tags, favicon and linked social profiles above — edit if you know better.">
              <Input
                type="number"
                min={0}
                max={100}
                value={data.auditScores.branding}
                onChange={(e) => update("auditScores", { ...data.auditScores, branding: Number(e.target.value) })}
              />
            </Field>
            <Field label="Local SEO Score" hint="Auto-suggested from LocalBusiness schema and phone detection above — edit if you know better.">
              <Input
                type="number"
                min={0}
                max={100}
                value={data.auditScores.localSeo}
                onChange={(e) => update("auditScores", { ...data.auditScores, localSeo: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            {(
              [
                ["Technical SEO", data.auditScores.technicalSeo],
                ["On-Page SEO", data.auditScores.onPageSeo],
                ["Content", data.auditScores.content],
                ["UX & Conversion", data.auditScores.uxConversion],
                ["Performance", data.auditScores.performance],
                ["Branding", data.auditScores.branding],
                ["Local SEO", data.auditScores.localSeo],
                ["Overall", data.auditScores.overall],
              ] as [string, number][]
            ).map(([label, score]) => (
              <div key={label} className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3">
                <p className="text-[11px] text-slate-400">{label}</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{score}</p>
                <p className="text-[10px] text-slate-400">{auditStatusLabel(score)}</p>
              </div>
            ))}
          </div>

          <OffPageMetricsPanel data={data} update={update} />

          <GrowthRecommendationsPanel checks={data.auditChecks} />

          <SocialMediaInsightsPanel data={data} update={update} />
        </div>
      )}
    </Card>
    {data.hasLocalStore && <LocalPresenceCard data={data} update={update} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Online Presence — no website yet, so this is what the client should stand
// up in the meantime. Gated on Business Type (Services / Physical Products /
// E-commerce, see constants.ts) since the right channels genuinely differ by
// what the business sells. Shown as a free-editable list (same pattern as
// Recommended Pages above) — real, well-known platforms, but which specific
// marketplace/directory is actually strong varies by country/city, so the
// consultant is expected to edit in local specifics per client.
// ---------------------------------------------------------------------------
function OnlinePresenceCard({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  if (!data.businessType) {
    return (
      <Card className="p-5">
        <CardHeader title="Online Presence — While the Website Is Being Built" subtitle="Select what this business sells above for suggestions tailored to it." />
      </Card>
    );
  }

  const suggestion = ONLINE_PRESENCE_SUGGESTIONS[data.businessType];

  return (
    <Card className="p-5">
      <CardHeader
        title="Online Presence — While the Website Is Being Built"
        subtitle={`For ${/^[aeiou]/i.test(data.businessType) ? "an" : "a"} ${data.businessType.toLowerCase()} business — real channels to stand up now, most of it carries straight over once the site is live.`}
      />
      <div className="pt-4 space-y-4">
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-500/10">
          <p className="text-sm text-slate-700 dark:text-slate-200">{suggestion.description}</p>
          <div className="pt-2.5">
            <Button size="sm" variant="secondary" onClick={() => update("onlinePresenceChannels", suggestion.channels)}>
              <Sparkles size={12} /> Use suggested channels for {data.businessType}
            </Button>
          </div>
        </div>
        <Field label="Recommended Channels" hint="One per line — edit freely, swap in whichever local platforms actually fit this client.">
          <Textarea
            value={data.onlinePresenceChannels.join("\n")}
            onChange={(e) => update("onlinePresenceChannels", e.target.value.split("\n").filter(Boolean))}
            rows={6}
          />
        </Field>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Local Presence — Google Business Profile / Maps listings can't be honestly
// scraped for rating, review count or category (no Places API configured,
// and Maps listings are JS-rendered, so a plain fetch returns nothing
// useful), so this stays a place for the consultant to note what they
// actually see when they open each link — never fabricated or guessed.
// ---------------------------------------------------------------------------
function LocalPresenceCard({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const locations = data.storeLocations.map((u) => u.trim()).filter(Boolean);
  return (
    <Card className="p-5">
      <CardHeader
        title="Local Presence"
        subtitle="Google Business Profile / Maps listings can't be automatically scored — note what you see when you open each one."
      />
      <div className="pt-4 space-y-4">
        {locations.length === 0 ? (
          <p className="text-sm text-slate-400">No store links added yet — add them on the Business Details step.</p>
        ) : (
          <div className="space-y-1.5">
            {locations.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-sm text-indigo-600 hover:underline break-all">
                <Store size={14} className="shrink-0 mt-0.5" />
                <span>{i === 0 ? "Main store: " : `Location ${i + 1}: `}{url}</span>
              </a>
            ))}
          </div>
        )}
        <Field
          label="Local Presence Notes"
          hint="What you see on each listing — claimed/verified, review count & rating, categories, photos, NAP consistency with the website. Manual, since none of this can be automatically checked."
        >
          <Textarea value={data.localPresenceNotes} onChange={(e) => update("localPresenceNotes", e.target.value)} rows={4} />
        </Field>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Recommended Local Branding Improvements</p>
          <p className="text-xs text-slate-400 mb-3">
            Standard Google Business Profile / local-SEO best practice — general guidance, not a claim about this specific listing (pair with your notes above).
          </p>
          <ul className="space-y-1.5">
            {LOCAL_BRANDING_RECOMMENDATIONS.map((item, i) => (
              <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5">
                <span className="text-indigo-500">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Off-Page, Link Building & Traffic snapshot — a single page fetch can never
// honestly report backlinks or real traffic, so this is a place for the
// consultant to paste real numbers pulled from their own SEO tools. Entirely
// optional; omitted from the report if left blank rather than shown as 0.
// ---------------------------------------------------------------------------
function OffPageMetricsPanel({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  return (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Off-Page, Link Building &amp; Traffic Snapshot</p>
      <p className="text-xs text-slate-400 mb-3">
        Backlinks and real traffic can&apos;t be honestly checked from a single page fetch — paste real figures from Ahrefs, SEMrush, Moz or Google Search Console/Analytics if you have them. Left blank, this section is skipped in the report rather than shown as zero.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Domain Authority / Rating">
          <Input type="number" min={0} max={100} value={data.domainAuthority} onChange={(e) => update("domainAuthority", e.target.value)} placeholder="e.g. 32" />
        </Field>
        <Field label="Total Backlinks">
          <Input type="number" value={data.totalBacklinks} onChange={(e) => update("totalBacklinks", e.target.value)} placeholder="e.g. 480" />
        </Field>
        <Field label="Referring Domains">
          <Input type="number" value={data.referringDomains} onChange={(e) => update("referringDomains", e.target.value)} placeholder="e.g. 65" />
        </Field>
        <Field label="Est. Monthly Organic Traffic">
          <Input type="number" value={data.estimatedOrganicTraffic} onChange={(e) => update("estimatedOrganicTraffic", e.target.value)} placeholder="e.g. 1200" />
        </Field>
      </div>
      {(data.domainAuthority || data.totalBacklinks || data.referringDomains || data.estimatedOrganicTraffic) && (
        <Field label="Source" hint="e.g. Ahrefs, SEMrush, Moz, Google Search Console — shown in the report so the client knows these are real, pulled numbers." >
          <Input value={data.offPageSource} onChange={(e) => update("offPageSource", e.target.value)} placeholder="e.g. Ahrefs, checked 1 Sep 2026" className="max-w-sm" />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Growth recommendations — audit findings grouped by Traffic / Branding / Reach
// ---------------------------------------------------------------------------
const REC_GROUPS: Array<{ key: "traffic" | "branding" | "reach"; title: string; subtitle: string }> = [
  { key: "traffic", title: "Increase Website Traffic", subtitle: "SEO fundamentals that help search engines find and rank this site." },
  { key: "branding", title: "Strengthen Branding & Trust", subtitle: "Signals that make the site look credible and professional." },
  { key: "reach", title: "Extend Reach", subtitle: "Making sure the audience can actually access and stay on the site." },
];

function GrowthRecommendationsPanel({ checks }: { checks: WizardData["auditChecks"] }) {
  const recs = useMemo(() => categorizeGrowthRecommendations(checks), [checks]);
  const total = recs.traffic.length + recs.branding.length + recs.reach.length;
  return (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Recommendations to Grow Traffic, Branding &amp; Reach</p>
      <p className="text-xs text-slate-400 mb-3">Generated directly from the audit findings above — nothing fabricated.</p>
      {total > 0 && (
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {REC_GROUPS.map((g) => (
            <div key={g.key}>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{g.title}</p>
              <p className="text-[11px] text-slate-400 mb-2">{g.subtitle}</p>
              {recs[g.key].length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nothing flagged here.</p>
              ) : (
                <ul className="space-y-1.5">
                  {recs[g.key].map((item, i) => (
                    <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5">
                      <span className="text-indigo-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Strategic Next Steps — Off-Page, Link Building &amp; Content</p>
        <p className="text-[11px] text-slate-400 mb-2">Standard practice for this kind of growth work, independent of what a single page can verify — pair with real numbers below if you have them.</p>
        <ul className="space-y-1.5">
          {STRATEGIC_RECOMMENDATIONS.map((item, i) => (
            <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5">
              <span className="text-indigo-500">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Social Media Insights — shown once the audit has actually run, but ONLY
// for platforms that actually have a link entered on the Business Details
// step; a platform left blank gets nothing here (no card, no guidance) —
// there's nothing to check or advise on for a profile that doesn't exist yet.
// For each filled-in platform: a real, live reachability check of that exact
// URL (src/lib/social-audit.ts — reports only what a plain fetch can
// honestly verify, never a fabricated follower/engagement number, since
// Facebook/Instagram/LinkedIn generally block automated page loads), a field
// for the consultant to paste in real metrics from that platform's own
// Insights/Analytics, and the curated best-practice playbook (recommendations
// & content ideas — general industry guidance, not account-specific data;
// see SOCIAL_MEDIA_PLAYBOOK's own comment in constants.ts).
// ---------------------------------------------------------------------------
function SocialMediaInsightsPanel({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const [checking, setChecking] = useState<Partial<Record<SocialPlatformKey, boolean>>>({});

  const filled = SOCIAL_MEDIA_LINK_FIELDS.filter(({ key }) => data[socialLinkDataKey(key)].trim());
  if (filled.length === 0) return null;

  async function checkPage(platformKey: SocialPlatformKey, url: string) {
    setChecking((c) => ({ ...c, [platformKey]: true }));
    try {
      const result = await api.post<SocialCheckResult>("/api/social-audit", { url });
      update("socialChecks", { ...data.socialChecks, [platformKey]: result });
    } catch (e) {
      update("socialChecks", {
        ...data.socialChecks,
        [platformKey]: { checkedUrl: url, reachable: false, https: url.startsWith("https://"), metrics: [], error: (e as Error).message },
      });
    } finally {
      setChecking((c) => ({ ...c, [platformKey]: false }));
    }
  }

  return (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
        <TrendingUp size={14} /> Social Media Insights
      </p>
      <p className="text-xs text-slate-400 mb-3">
        Only for the profiles entered on the Business Details step. Each one below is a real, live check of that exact link —
        not a guess. Follower counts and engagement numbers can't be honestly pulled from Facebook/Instagram/LinkedIn by an
        automated fetch, so paste real numbers from that platform's own Insights/Analytics into the field provided.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filled.map(({ key, label }) => {
          const url = data[socialLinkDataKey(key)];
          const check = data.socialChecks[key];
          const playbook = SOCIAL_MEDIA_PLAYBOOK.find((p) => p.key === key);
          const clusterKey = data.businessVertical ? INDUSTRY_TO_SOCIAL_CLUSTER[data.businessVertical] : undefined;
          const industryCluster = clusterKey ? SOCIAL_MEDIA_INDUSTRY_CONTENT[clusterKey] : undefined;
          const industryContent = industryCluster?.platforms[key];
          // Recommendations and content ideas come from the industry-specific
          // cluster when a Business Vertical is selected (see
          // INDUSTRY_TO_SOCIAL_CLUSTER in constants.ts); otherwise fall back
          // to the generic platform-level playbook. Key metrics to track stay
          // platform-only either way — those are analytics/algorithm
          // categories that don't meaningfully vary by industry.
          const recommendations = industryContent?.recommendations ?? playbook?.recommendations;
          const contentIdeas = industryContent?.contentIdeas ?? playbook?.contentIdeas;
          const isChecking = checking[key];
          return (
            <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{label}</p>
                <Button size="sm" variant="secondary" onClick={() => checkPage(key, url)} disabled={isChecking}>
                  {isChecking ? "Checking…" : check ? "Re-check Page" : "Check Page"}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 mb-2 break-all">{url}</p>

              {check && (
                <div className="mb-3 rounded-md bg-slate-50 dark:bg-slate-800/60 p-2">
                  {check.reachable ? (
                    <>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Page is reachable {check.https ? "(HTTPS)" : "(not HTTPS)"}</p>
                      {check.pageTitle && <p className="text-[11px] text-slate-500 mt-1">Page title: {check.pageTitle}</p>}
                      {check.metrics && check.metrics.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {check.metrics.map((m, i) => (
                            <span
                              key={i}
                              className="text-[11px] rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 font-medium"
                            >
                              {m.value} {m.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1">
                          No public follower/post stats found on this page — paste real numbers below.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">{check.error ?? "Could not verify this page."}</p>
                  )}
                </div>
              )}

              <Field label="Real Metrics (optional)" hint="Paste from this platform's own Insights/Analytics — followers, engagement rate, reach, etc. Never guessed.">
                <Textarea
                  value={data.socialMetrics[key] ?? ""}
                  onChange={(e) => update("socialMetrics", { ...data.socialMetrics, [key]: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </Field>

              {playbook && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Key metrics to track</p>
                  <ul className="space-y-1 mb-2">
                    {playbook.keyMetrics.map((item, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5">
                        <span className="text-indigo-500">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-[11px] text-slate-400 mb-2">
                    {industryCluster
                      ? `Tailored for ${industryCluster.label.toLowerCase()} businesses (${data.businessVertical}).`
                      : "General best practice — select a Business Vertical on the Business Details step for suggestions tailored to this industry."}
                  </p>

                  {recommendations && (
                    <>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Recommendations</p>
                      <ul className="space-y-1 mb-2">
                        {recommendations.map((item, i) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5">
                            <span className="text-indigo-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {contentIdeas && (
                    <>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Content ideas to improve engagement</p>
                      <ul className="space-y-1">
                        {contentIdeas.map((item, i) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5">
                            <span className="text-indigo-500">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Organic & PPC strategy. Not every customer wants both services, so
// the consultant picks which ones apply with a checkbox — each section only
// shows (and only gets saved into the report) when its box is checked.
// ---------------------------------------------------------------------------
function StepOrganicPpc({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  function toggleGoal(goal: string) {
    update("organicGoals", data.organicGoals.includes(goal) ? data.organicGoals.filter((g) => g !== goal) : [...data.organicGoals, goal]);
  }
  function toggleObjective(o: string) {
    update("ppcObjectives", data.ppcObjectives.includes(o) ? data.ppcObjectives.filter((x) => x !== o) : [...data.ppcObjectives, o]);
  }
  function toggleWhatsappGoal(g: string) {
    update("whatsappGoals", data.whatsappGoals.includes(g) ? data.whatsappGoals.filter((x) => x !== g) : [...data.whatsappGoals, g]);
  }

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Some customers only want Organic/SEO, some only want PPC, some want WhatsApp Marketing, and some want a mix.
          Choose what applies — anything unchecked will be skipped in the plan and report.
        </p>
        <div className="flex flex-wrap gap-6 pt-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={data.includeOrganic} onChange={(e) => update("includeOrganic", e.target.checked)} />
            Include Organic / SEO
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={data.includePpc} onChange={(e) => update("includePpc", e.target.checked)} />
            Include PPC / Paid
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={data.includeWhatsappMarketing}
              onChange={(e) => update("includeWhatsappMarketing", e.target.checked)}
            />
            Include WhatsApp Marketing
          </label>
        </div>
      </Card>

      {data.includeOrganic && (
        <Card className="p-5">
          <CardHeader title="Organic Growth Goals" subtitle="Current Situation → Goal → Strategy → Execution → Expected Outcome." />
          <div className="flex flex-wrap gap-2 pt-4">
            {ORGANIC_GOALS.map((g) => (
              <ToggleChip key={g} active={data.organicGoals.includes(g)} onClick={() => toggleGoal(g)}>{g}</ToggleChip>
            ))}
          </div>
          {data.hasLocalStore && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Store size={13} /> Local Presence Goals — this business also has a physical store
              </p>
              <div className="flex flex-wrap gap-2">
                {LOCAL_ORGANIC_GOALS.map((g) => (
                  <ToggleChip key={g} active={data.organicGoals.includes(g)} onClick={() => toggleGoal(g)}>{g}</ToggleChip>
                ))}
              </div>
            </div>
          )}
          <Field label="Current Organic Traffic (approx. monthly visits, if known)" hint="Leave blank if unknown.">
            <Input type="number" value={data.currentOrganicTraffic} onChange={(e) => update("currentOrganicTraffic", e.target.value)} className="mt-4 max-w-xs" />
          </Field>
        </Card>
      )}

      {data.includePpc && (
        <Card className="p-5">
          <CardHeader title="PPC / Paid Growth Objectives" subtitle="Budget → Traffic → Leads → Qualified Leads → Customers → Revenue → ROAS → ROI." />
          <div className="flex flex-wrap gap-2 pt-4">
            {PPC_OBJECTIVES.map((o) => (
              <ToggleChip key={o} active={data.ppcObjectives.includes(o)} onClick={() => toggleObjective(o)}>{o}</ToggleChip>
            ))}
          </div>
          {data.hasLocalStore && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Store size={13} /> Local Presence Objectives — this business also has a physical store
              </p>
              <div className="flex flex-wrap gap-2">
                {LOCAL_PPC_OBJECTIVES.map((o) => (
                  <ToggleChip key={o} active={data.ppcObjectives.includes(o)} onClick={() => toggleObjective(o)}>{o}</ToggleChip>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {data.includeWhatsappMarketing && (
        <Card className="p-5">
          <CardHeader
            title="WhatsApp Marketing Campaign Goals"
            subtitle="Broadcast → Click-to-WhatsApp Ads → Conversation → Qualified Lead → Sale → Repeat/Referral."
          />
          <div className="flex flex-wrap gap-2 pt-4">
            {WHATSAPP_MARKETING_GOALS.map((g) => (
              <ToggleChip key={g} active={data.whatsappGoals.includes(g)} onClick={() => toggleWhatsappGoal(g)}>{g}</ToggleChip>
            ))}
          </div>
          <Field label="WhatsApp Number for Campaigns" hint="Defaults to the WhatsApp number entered on the Customer step, if any.">
            <Input value={data.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} className="mt-4 max-w-xs" />
          </Field>
        </Card>
      )}

      {!data.includeOrganic && !data.includePpc && !data.includeWhatsappMarketing && (
        <p className="text-sm text-amber-600 dark:text-amber-400">Select at least one of Organic, PPC or WhatsApp Marketing to continue.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 6 — Audience & platform recommendation
// ---------------------------------------------------------------------------
// WhatsApp isn't one of the per-business-vertical platform suggestions in
// recommendations.ts (that file covers the paid search/social networks), so
// this fills in its Ad type / Expected result wherever a platform's detail
// is looked up — the Audience step's cards, the saved assessment record, and
// the Growth Story's paid-platform summary all go through this one place.
function platformDetailFor(
  platform: string,
  suggestion: { platforms: Array<{ platform: string; adType: string; expectedResult: string }> }
): { platform: string; adType: string; expectedResult: string } | undefined {
  return suggestion.platforms.find((sp) => sp.platform === platform) ?? (platform === "WhatsApp" ? { platform, ...WHATSAPP_PLATFORM_DETAIL } : undefined);
}

// Resolved once per currency and passed down to estimatedResultText — see
// getUsdExchangeRate in lib/fx-rate.ts for what each status means.
type FxState = { status: "loading" } | { status: "ok"; rate: FxRate } | { status: "unavailable" };

// Small reusable hooks for the two pieces of data both the suggested-budget
// feature below and the Audience step's existing budget-allocation estimate
// need: this industry's active benchmark rows, and a live USD rate for the
// client's currency. Business Details and Forecast steps didn't previously
// fetch either — added here so the "Suggested starting budget" hint can
// appear on those steps too, not just Audience.
function useIndustryBenchmarkRows(businessVertical: string): BenchmarkRow[] | null {
  const [rows, setRows] = useState<BenchmarkRow[] | null>(null);
  useEffect(() => {
    if (!businessVertical) {
      setRows(null);
      return;
    }
    api
      .get<BenchmarkRow[]>(`/api/benchmarks?industry=${encodeURIComponent(businessVertical)}&status=active`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [businessVertical]);
  return rows;
}

// SEO competition tier for the selected Business Vertical — see
// src/lib/seo-competition.ts for the full, disclosed methodology (a real,
// already-seeded Google Ads / Microsoft Ads CPC-by-industry proxy). Fetches
// both platforms' CPC benchmarks once and derives Low/Medium/High terciles
// across all industries; used by the Organic Forecast card on the Forecast
// step both to shift its 12-month curve and to time the new-website
// (0-baseline) cold-start timeline.
function useSeoCompetitionTier(businessVertical: string): CompetitionTierResult | null {
  const [tiers, setTiers] = useState<Record<string, CompetitionTierResult> | null>(null);
  useEffect(() => {
    Promise.all([
      api.get<Array<{ industry: string; campaignType?: string | null; value: number; currency: string }>>(
        "/api/benchmarks?platform=Google%20Ads&metric=CPC&status=active"
      ),
      api.get<Array<{ industry: string; campaignType?: string | null; value: number; currency: string }>>(
        "/api/benchmarks?platform=Microsoft%20Ads&metric=CPC&status=active"
      ),
    ])
      .then(([google, ms]) => setTiers(deriveCompetitionTiers(google, ms)))
      .catch(() => setTiers({}));
  }, []);
  if (!businessVertical || !tiers) return null;
  return tiers[businessVertical] ?? null;
}

function useFxState(currency: string): FxState {
  const [fxState, setFxState] = useState<FxState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    setFxState({ status: "loading" });
    api
      .get<{ available: boolean; rate?: number; asOf?: string }>(`/api/fx-rate?currency=${encodeURIComponent(currency)}`)
      .then((res) => {
        if (cancelled) return;
        if (res.available && res.rate != null && res.asOf) {
          setFxState({ status: "ok", rate: { rate: res.rate, asOf: res.asOf } });
        } else {
          setFxState({ status: "unavailable" });
        }
      })
      .catch(() => !cancelled && setFxState({ status: "unavailable" }));
    return () => {
      cancelled = true;
    };
  }, [currency]);
  return fxState;
}

// Turns a raw suggestMonthlyBudget() result (always USD, since every seeded
// benchmark is USD-denominated) into a display-ready figure in the client's
// own currency — pure, so both the new hook below and StepAudience (which
// already has its own industryBenchmarkRows/fxState from the existing
// budget-allocation feature) can call it without a second network fetch.
type BudgetSuggestionDisplay =
  | null // not computable yet — no vertical selected, or benchmark rows still loading
  | { status: "loading" }
  | { status: "unavailable" }
  | {
      status: "ok";
      amountLocal: number;
      currency: string;
      targetConversions: number;
      platforms: string[];
      excludedPlatforms: string[];
      usedFallbackAlternative: boolean;
      verticalDefaultPlatforms: string[];
    };

function composeBudgetSuggestion(
  businessVertical: string,
  platforms: string[],
  targetCountry: string,
  benchmarkRows: BenchmarkRow[] | null,
  fxState: FxState
): BudgetSuggestionDisplay {
  if (!businessVertical || benchmarkRows === null) return null;
  const currency = currencyForCountry(targetCountry);
  const rankedPlatforms = getAudiencePlatformSuggestion(businessVertical, targetCountry).platforms.map((p) => p.platform);
  const raw = suggestMonthlyBudget(platforms, rankedPlatforms, benchmarkRows);
  if (!raw) return null;
  if (currency !== "USD") {
    if (fxState.status === "loading") return { status: "loading" };
    if (fxState.status === "unavailable") return { status: "unavailable" };
  }
  const rate = currency === "USD" ? 1 : (fxState as { status: "ok"; rate: FxRate }).rate.rate;
  return {
    status: "ok",
    amountLocal: raw.totalUsd / rate,
    currency,
    targetConversions: raw.targetConversions,
    platforms: raw.perPlatform.filter((p) => p.targetConversions != null).map((p) => p.platform),
    excludedPlatforms: raw.excludedPlatforms,
    usedFallbackAlternative: raw.usedFallbackAlternative,
    verticalDefaultPlatforms: raw.verticalDefaultPlatforms,
  };
}

function useSuggestedMonthlyBudget(businessVertical: string, platforms: string[], targetCountry: string): BudgetSuggestionDisplay {
  const benchmarkRows = useIndustryBenchmarkRows(businessVertical);
  const fxState = useFxState(currencyForCountry(targetCountry));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- platforms is a fresh array each render; join() gives a stable dep
  return useMemo(
    () => composeBudgetSuggestion(businessVertical, platforms, targetCountry, benchmarkRows, fxState),
    [businessVertical, platforms.join(","), targetCountry, benchmarkRows, fxState]
  );
}

// Shown under the Monthly Marketing Budget field (Business Details, Forecast)
// and in the Audience step's budget-allocation card whenever no budget has
// been entered yet — click applies it, same "never auto-overwrite, always
// user-initiated" convention as every other benchmark suggestion in this
// wizard (Profit Margin, Sales Conversion Rate).
function SuggestedBudgetHint({ suggestion, onApply }: { suggestion: BudgetSuggestionDisplay; onApply: (amount: string) => void }) {
  if (!suggestion) return null;
  if (suggestion.status === "loading") {
    return <p className="text-[11px] text-slate-400 mt-1">Loading a suggested starting budget…</p>;
  }
  if (suggestion.status === "unavailable") {
    return <p className="text-[11px] text-amber-600 mt-1">Live currency conversion is unavailable right now — try again shortly for a suggested starting budget.</p>;
  }
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => onApply(String(Math.round(suggestion.amountLocal)))}
        className="text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
      >
        Suggested starting budget: {formatCurrency(suggestion.amountLocal, suggestion.currency)}/mo — click to apply
      </button>
      <p className="text-[11px] text-slate-400 mt-0.5">
        {suggestion.usedFallbackAlternative ? (
          <>
            This vertical&apos;s usual channels ({suggestion.verticalDefaultPlatforms.join(", ")}) don&apos;t have lead-based benchmark data yet, so this
            is sized instead for ~{suggestion.targetConversions} conversions/mo across {suggestion.platforms.join(", ")}, using seeded CPC/CVR
            benchmarks for those
          </>
        ) : (
          <>
            Sized for ~{suggestion.targetConversions} conversions/mo across {suggestion.platforms.join(", ")}, using this vertical&apos;s seeded CPC/CVR
            benchmarks
          </>
        )}
        {" "}— Google Ads&apos; documented minimum-data threshold for automated bidding to optimize effectively.
        {suggestion.excludedPlatforms.length > 0 ? ` Excludes ${suggestion.excludedPlatforms.join(", ")} (no lead-based benchmark yet).` : ""} A
        starting point, not a guarantee — refine with real campaign data over time.
      </p>
    </div>
  );
}

// Shared by the Audience step's live preview and the Generate step's saved
// snapshot, so the number the consultant sees while building the assessment
// is exactly what ends up in the PDF. Every seeded benchmark
// (data/benchmarks/*.json) is denominated in USD, so a budget entered in
// another currency is converted to its USD equivalent with a live exchange
// rate (fx) before being compared to the benchmark — never divided directly
// against a mismatched currency, and never guessed when a live rate isn't
// available.
function estimatedResultText(
  platform: string,
  spendLocal: number,
  pct: number,
  currency: string,
  industry: string | undefined | null,
  benchmarkRows: BenchmarkRow[] | null,
  fx: FxState
): string {
  if (!industry) return "Set a Business Vertical on Step 1 for a benchmark-based click/lead estimate.";
  if (benchmarkRows === null) return "Loading benchmark data…";
  if (fx.status === "loading") return "Converting to USD benchmark rates…";
  if (fx.status === "unavailable") {
    const article = /^[AEIOU]/.test(currency) ? "an" : "a";
    return `Live currency conversion is unavailable right now — showing budget allocation only. Try again shortly, or add ${article} ${currency}-denominated benchmark on the Benchmarks page.`;
  }
  const spendUsd = spendLocal * fx.rate.rate;
  const est = estimateChannelBudgetResult(platform, spendUsd, pct, benchmarkRows);
  if (!est || est.volume == null) {
    return `No active benchmark for ${platform} in ${industry} yet — add one on the Benchmarks page for a click/lead estimate.`;
  }
  // "~" not "≈", "->" not "→" — this text is saved into the assessment and
  // rendered in the PDF by react-pdf's built-in Helvetica font, which only
  // supports WinAnsi/CP1252 and silently mangles characters outside it (the
  // same class of bug fixed for the ₹ currency symbol — see formatCurrency).
  const parts = [`~${formatNumber(est.volume)} ${est.volumeLabel}/mo`];
  if (est.leads != null) parts.push(`~${formatNumber(est.leads)} leads/mo`);
  // formatCurrency rounds to whole dollars (right for budgets/revenue, but a
  // sub-$10 CPC/CPV benchmark like $1.16 would round to "$1" and no longer
  // visibly explain the estimate above) — show the benchmark rate itself to
  // cents instead.
  const rawRate = est.spendMetricValue ?? 0;
  const rate = String(Number(rawRate.toFixed(rawRate < 1 ? 3 : 2))); // trims trailing zeros (e.g. 0.630 -> 0.63)
  const benchmarkNote =
    est.conversionRatePct != null
      ? `benchmark ${est.spendMetric} $${rate}, CVR ${est.conversionRatePct}%`
      : `benchmark ${est.spendMetric} $${rate}`;
  const fxNote = currency !== "USD" ? `; FX 1 ${currency} = $${fx.rate.rate.toFixed(4)} as of ${fx.rate.asOf}` : "";
  return `${parts.join(" -> ")} (${benchmarkNote}${fxNote})`;
}

function StepAudience({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const suggestion = useMemo(() => getAudiencePlatformSuggestion(data.businessVertical, data.targetCountry), [data.businessVertical, data.targetCountry]);

  // Real per-platform CPC/CPV + CVR benchmarks for the selected industry,
  // used below to turn the suggested budget split into an estimated
  // clicks/views → leads figure instead of just a dollar amount. Fetched
  // fresh whenever the vertical changes — same pattern as the Business
  // Details step's Profit Margin benchmark fetch.
  const [industryBenchmarkRows, setIndustryBenchmarkRows] = useState<BenchmarkRow[] | null>(null);
  useEffect(() => {
    if (!data.businessVertical) {
      setIndustryBenchmarkRows(null);
      return;
    }
    api
      .get<BenchmarkRow[]>(`/api/benchmarks?industry=${encodeURIComponent(data.businessVertical)}&status=active`)
      .then(setIndustryBenchmarkRows)
      .catch(() => setIndustryBenchmarkRows([]));
  }, [data.businessVertical]);

  const currency = currencyForCountry(data.targetCountry);

  // Live USD exchange rate for the client's own currency, so the budget
  // estimate below always matches the country the client is actually in
  // (see fx-rate.ts) instead of only working for USD budgets.
  const [fxState, setFxState] = useState<FxState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    setFxState({ status: "loading" });
    api
      .get<{ available: boolean; rate?: number; asOf?: string }>(`/api/fx-rate?currency=${encodeURIComponent(currency)}`)
      .then((res) => {
        if (cancelled) return;
        if (res.available && res.rate != null && res.asOf) {
          setFxState({ status: "ok", rate: { rate: res.rate, asOf: res.asOf } });
        } else {
          setFxState({ status: "unavailable" });
        }
      })
      .catch(() => !cancelled && setFxState({ status: "unavailable" }));
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const budget = Number(data.monthlyBudget) || 0;
  const rankedPlatforms = suggestion.platforms.map((p) => p.platform);
  const budgetAllocations = suggestBudgetAllocation(data.platforms, rankedPlatforms);
  // Reuses the industryBenchmarkRows + fxState this step already fetches for
  // the click/lead estimate above — no second network call.
  const budgetSuggestion = composeBudgetSuggestion(data.businessVertical, data.platforms, data.targetCountry, industryBenchmarkRows, fxState);

  function toggle(p: string) {
    update("platforms", data.platforms.includes(p) ? data.platforms.filter((x) => x !== p) : [...data.platforms, p]);
  }

  function applySuggestion() {
    if (!data.targetAudience.trim()) {
      const local = data.hasLocalStore
        ? `\n\nLocal targeting: this business also has a physical store, so include "near me" search intent and a geo-radius around the store location(s) alongside standard interest/demographic targeting — prioritise visibility in the Google Maps / Local Pack, not just organic search results.`
        : "";
      const whatsapp = data.includeWhatsappMarketing
        ? `\n\nWhatsApp targeting: layer Click-to-WhatsApp ads (same interest/demographic targeting as above, plus retargeting of website visitors and past enquirers) on top of the platforms below, and grow a first-party opted-in contact list — website chat widget, in-store QR code, post-purchase opt-in — for broadcast campaigns. Broadcasts can only reach numbers that have explicitly opted in, so this audience is built over time, not bought.`
        : "";
      update("targetAudience", suggestion.audience + local + whatsapp);
    }
    const suggested = suggestion.platforms.map((p) => p.platform);
    if (data.includeWhatsappMarketing) suggested.push("WhatsApp");
    update("platforms", Array.from(new Set([...data.platforms, ...suggested])));
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <CardHeader
          title="Target Audience & Platform Recommendation"
          subtitle="Recommend only platforms relevant to this business — not every platform automatically."
          action={
            <Button size="sm" variant="secondary" onClick={applySuggestion}>
              <Sparkles size={14} /> Auto-suggest for {data.businessVertical || "this business"}
            </Button>
          }
        />
        <div className="pt-4">
          <Field
            label="Target Audience"
            hint="Buyer type (B2B/B2C/D2C/local), demographic, online interests & behaviour, and an example customer — edit freely before it reaches the client."
          >
            <Textarea value={data.targetAudience} onChange={(e) => update("targetAudience", e.target.value)} rows={9} />
          </Field>
          {!data.businessVertical && (
            <p className="text-xs text-amber-600 mt-2">Set a Business Vertical on Step 1 for an industry-specific suggestion — showing a general default for now.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-4">
          {AD_PLATFORMS.map((p) => (
            <ToggleChip key={p} active={data.platforms.includes(p)} onClick={() => toggle(p)}>{p}</ToggleChip>
          ))}
        </div>

        {data.platforms.length > 0 && (
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Platform-Wise Ad Type &amp; Expected Result</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.platforms.map((p) => {
                const detail = platformDetailFor(p, suggestion);
                return (
                  <div key={p} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                    <Badge className="bg-indigo-600 text-white mb-2">{p}</Badge>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Ad type: </span>
                      {detail?.adType ?? "Add the ad type you'd recommend for this platform."}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-medium">Expected result: </span>
                      {detail?.expectedResult ?? "Add the expected result for this platform."}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Starting-point suggestions based on business vertical — edit freely, never a performance guarantee.</p>
          </div>
        )}
      </Card>

      {data.platforms.length > 0 && (
        <Card className="p-5">
          <CardHeader
            title="Suggested Campaign Budget Allocation"
            subtitle={`How the Monthly Marketing Budget splits across the selected platforms, and what that spend is expected to buy — in ${currency}, matching this client's Target Country.`}
          />
          {budget <= 0 && (
            <div className="pt-4">
              <SuggestedBudgetHint suggestion={budgetSuggestion} onApply={(amount) => update("monthlyBudget", amount)} />
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3 pt-4">
            {data.platforms.map((p) => {
              const pct = budgetAllocations[p] ?? 0;
              const spend = (budget * pct) / 100;
              return (
                <div key={p} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <Badge className="bg-indigo-600 text-white mb-2">{p}</Badge>
                  {budget > 0 ? (
                    <>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium">Suggested budget: </span>
                        {formatCurrency(spend, currency)}/mo ({pct}% of budget)
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-medium">At this spend: </span>
                        {estimatedResultText(p, spend, pct, currency, data.businessVertical, industryBenchmarkRows, fxState)}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-amber-600">
                      Set a Monthly Marketing Budget above (or apply the suggested starting budget) for a budget split and click/lead estimate.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            A starting split, not a performance guarantee — weighted toward the platforms recommended first for this business type. Click/lead estimates use the live channel benchmarks from the Benchmarks page, converted to {currency} at the current exchange rate.
          </p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 7 — Competitor analysis. Fetches each competitor's live site (the
// same honest single-page-fetch approach as the website audit) and the
// client's own site, then compares real, detected signals. No search-engine
// ranking API is configured, so rankings/traffic/keywords are never guessed
// — only what's actually verifiable in the HTML.
// ---------------------------------------------------------------------------
function yesNo(v: boolean) {
  return v ? "Yes" : "No";
}

function CompetitorTable({ client, competitors }: { client: SiteSignals | null; competitors: SiteSignals[] }) {
  const sites = [...(client ? [client] : []), ...competitors];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Metric</th>
            {sites.map((s) => (
              <th key={s.url} className="text-left px-3 py-2 font-medium">
                {s === client ? "Your client's site" : s.hostname}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          <Row label="Reachable" values={sites.map((s) => (s.fetchedOk ? "Yes" : "No — " + (s.fetchError ?? "unreachable")))} />
          <Row label="On-Page Word Count" values={sites.map((s) => (s.fetchedOk ? String(s.wordCount) : "—"))} />
          <Row label="Blog / Content Hub" values={sites.map((s) => (s.fetchedOk ? yesNo(s.hasBlog) : "—"))} />
          <Row label="Structured Data (Schema)" values={sites.map((s) => (s.fetchedOk ? yesNo(s.hasSchema) : "—"))} />
          <Row label="Mobile-Friendly (Viewport)" values={sites.map((s) => (s.fetchedOk ? yesNo(s.hasViewport) : "—"))} />
          <Row label="HTTPS" values={sites.map((s) => yesNo(s.https))} />
          <Row label="Social Links Found" values={sites.map((s) => (s.fetchedOk ? (s.socialLinks.length ? s.socialLinks.join(", ") : "None") : "—"))} />
          <Row label="Platform / Tech" values={sites.map((s) => (s.fetchedOk ? s.techPlatform : "—"))} />
          <Row label="Response Time" values={sites.map((s) => (s.fetchedOk && s.responseTimeMs != null ? `${s.responseTimeMs}ms` : "—"))} />
        </tbody>
      </table>
    </div>
  );
}

function StepCompetitor({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const urls = useMemo(() => parseCompetitorUrls(data.competitorUrls), [data.competitorUrls]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    if (urls.length === 0) {
      setError("Add one or more competitor URLs in the Business Details step first.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const result = await api.post<{ client: SiteSignals | null; competitors: SiteSignals[]; insights: string[] }>("/api/competitor-analysis", {
        competitorUrls: data.competitorUrls,
        clientUrl: data.hasWebsite === "YES" ? data.websiteUrl : "",
      });
      update("competitorClientSignals", result.client);
      update("competitorSiteResults", result.competitors);
      update("competitorAutoInsights", result.insights);
      update("competitorAnalysisRan", true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Competitor analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="p-5">
      <CardHeader title="Competitor Analysis" subtitle="Real, live research on each competitor's site — never sample or fabricated data." />

      <p className="text-xs text-slate-500 pt-3">
        Competitor URLs (from Business Details): {urls.length > 0 ? urls.join(", ") : "None provided"}
      </p>

      <Button onClick={runAnalysis} disabled={running || urls.length === 0} className="mt-3">
        {running ? <Spinner className="h-4 w-4" /> : <Sparkles size={15} />}
        {running ? "Analyzing live sites…" : data.competitorAnalysisRan ? "Re-run Competitor Analysis" : "Run Competitor Analysis"}
      </Button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {data.competitorAnalysisRan && (
        <div className="mt-5 space-y-4">
          <CompetitorTable client={data.competitorClientSignals} competitors={data.competitorSiteResults} />

          {data.competitorAutoInsights.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Insights &amp; Recommendations</p>
              <ul className="space-y-1.5">
                {data.competitorAutoInsights.map((item, i) => (
                  <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex gap-1.5">
                    <span className="text-indigo-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-5">
        <Field label="Additional Notes (optional)" hint="Your own observations — positioning, offers, CTAs, anything you noticed that the automated check can't detect.">
          <Textarea value={data.competitorInsights} onChange={(e) => update("competitorInsights", e.target.value)} rows={4} className="mt-2" />
        </Field>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        If a competitor site can&apos;t be reached, the report will note it rather than guessing its content.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 8 — Sample advertisement concepts (visual-first, spec section 22).
// Sample ads are paid-campaign creative, so this step only applies when PPC
// is included (Organic & PPC step). Platforms and ad types come straight
// from the Audience step's recommendation, and the copy is built from the
// business's own products/services and target audience — never a generic
// template, and never fabricated competitor ad content (that needs a paid
// ad-intelligence API this app doesn't have access to).
// ---------------------------------------------------------------------------
// CTA defaults vary a little by business vertical (a dental clinic shouldn't
// default to "Shop Now") — still just an editable starting point, per the
// same non-fabrication rule as everywhere else in this wizard.
const SHOP_CTA_VERTICALS = new Set(["E-Commerce", "Retail", "Apparel", "Home Goods"]);
const BOOKING_CTA_VERTICALS = new Set(["Health & Medical", "Healthcare", "Fitness", "Beauty", "Home Improvement", "Auto", "Dating & Personals", "Travel & Hospitality"]);

function defaultCtaFor(platform: string, vertical: string): string {
  const isShop = SHOP_CTA_VERTICALS.has(vertical);
  const isBooking = BOOKING_CTA_VERTICALS.has(vertical);
  switch (platform) {
    case "Google Search":
      return isShop ? "Shop Now" : isBooking ? "Book Now" : "Get a Quote";
    case "Google Display":
      return isShop ? "Shop Now" : "Learn More";
    case "YouTube":
      return "Watch Now";
    case "Facebook":
    case "Instagram":
      return isShop ? "Shop Now" : isBooking ? "Book Now" : "Learn More";
    case "WhatsApp":
      return "Chat on WhatsApp";
    case "LinkedIn":
      return "Get in Touch";
    case "Microsoft Ads":
      return isShop ? "Shop Now" : "Learn More";
    default:
      return "Learn More";
  }
}

// Which creative format fits each platform. Search platforms don't have a
// visual; social/display platforms do (a real AI-generated image, opt-in per
// card); YouTube gets a written video script/storyboard since real AI video
// generation isn't practical here (cost, latency, no reliable free/cheap API).
const PLATFORM_FORMAT: Record<string, "Search Ad" | "Image Ad" | "Video Ad"> = {
  "Google Search": "Search Ad",
  "Microsoft Ads": "Search Ad",
  "Google Display": "Image Ad",
  Facebook: "Image Ad",
  Instagram: "Image Ad",
  WhatsApp: "Image Ad",
  LinkedIn: "Image Ad",
  YouTube: "Video Ad",
};

const PLATFORM_IMAGE_SIZE: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
  "Google Display": "1792x1024",
  Facebook: "1024x1024",
  Instagram: "1024x1024",
  WhatsApp: "1024x1024",
  LinkedIn: "1024x1024",
};

// ---------------------------------------------------------------------------
// Ad-copy helpers. Every field below is built only from data the consultant
// actually entered (products/services, description, location, audience) —
// never an invented factual claim about the business (no fake "20+ years",
// "award-winning", "free shipping" etc.). Character limits follow each
// platform's real published ad specs; all fields stay fully editable.
// ---------------------------------------------------------------------------
function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function splitList(raw: string): string[] {
  return raw
    .split(/[,\n•]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(s: string, max = 15): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, max);
}

/**
 * The Target Audience field can now hold a full multi-line, detailed
 * suggestion (buyer type, demographic, interests/behaviour, example
 * customer — see getAudiencePlatformSuggestion). Ad copy, image prompts and
 * narrative sentences need a short, punchy phrase, not the whole block — so
 * this pulls just the lead-line summary (everything before the first blank
 * line) and caps its length as a safety net.
 */
function audienceSummary(raw: string): string {
  const first = raw.trim().split(/\n\s*\n/)[0]?.trim() ?? "";
  return truncate(first, 160);
}

function standardCtaButton(cta: string): string {
  const map: Record<string, string> = {
    "Get a Quote": "Get Quote",
    "Book Now": "Book Now",
    "Shop Now": "Shop Now",
    "Learn More": "Learn More",
    "Get in Touch": "Contact Us",
    "Watch Now": "Watch More",
  };
  return map[cta] ?? "Learn More";
}

/**
 * Ad-copy writing helpers. Every piece of copy assembled below still comes
 * only from data the consultant actually entered (business name, offerings,
 * audience, location) — these helpers never invent a claim. Their job is
 * purely to turn raw form fields into a properly punctuated,
 * platform-appropriate line instead of a bare concatenation, which
 * previously produced artifacts like a trailing ".." when a field already
 * ended in its own period.
 */

/** Trims a fragment's surrounding whitespace and any trailing period(s) so
 * it can be safely joined into a larger sentence without double punctuation. */
function frag(s: string | undefined | null): string {
  return (s ?? "").trim().replace(/[.\s]+$/, "");
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** Joins already-clean fragments into one sentence-cased line ending in
 * exactly one period. Empty/undefined fragments are dropped silently so an
 * optional piece of data (e.g. no location entered) never leaves a stray
 * empty clause behind. */
function sentence(...parts: (string | undefined | null)[]): string {
  const joined = parts.map((p) => frag(p)).filter(Boolean).join(", ");
  return joined ? `${capFirst(joined)}.` : "";
}

/** Combines up to 2 offerings into a natural "X" or "X & Y" phrase, e.g.
 * "Power weeder & Power tiller" from a comma-separated products field. */
function offeringsPhrase(offerings: string[]): string {
  const list = offerings.map((o) => frag(o)).filter(Boolean).slice(0, 2);
  if (list.length === 0) return "";
  if (list.length === 1) return capFirst(list[0]);
  return `${capFirst(list[0])} & ${list[1]}`;
}

// A short closing line matched to the CTA type, giving a Search-ad
// description a real call to action instead of trailing off mid-sentence.
const CTA_CLOSING_LINE: Record<string, string> = {
  "Get a Quote": "Get a free quote today",
  "Book Now": "Book your slot today",
  "Shop Now": "Shop the range today",
  "Get in Touch": "Get in touch today",
  "Learn More": "Learn more today",
  "Watch Now": "Watch now",
  "Chat on WhatsApp": "Message us today",
};
function ctaClosingLine(cta: string): string {
  return CTA_CLOSING_LINE[cta] ?? "Get in touch today";
}

/**
 * Builds a headline + one-line description for the sample-ad card, tailored
 * to how each platform actually reads: a Search headline leads with the
 * offering/keyword and its description closes with a real call to action; a
 * Display banner stays short and brand-led; Facebook/Instagram reads as a
 * benefit-led hook; WhatsApp reads as an invitation to message; LinkedIn is
 * offering-led and professional; YouTube leads with a hook for the
 * companion banner. Every input is real data already entered for this
 * business — offerings, audience and location — nothing here is invented.
 */
function craftAdCopy(
  platform: string,
  cta: string,
  p: { business: string; offeringPhrase: string; primary: string; audience: string; adLocation: string }
): { headline: string; benefit: string } {
  const { business, offeringPhrase, primary, audience, adLocation } = p;
  const offering = offeringPhrase || capFirst(primary);
  const locTail = adLocation ? `serving ${adLocation}` : "";
  const audienceTail = audience ? `built for ${lowerFirst(frag(audience))}` : "";

  switch (platform) {
    case "Google Search":
    case "Microsoft Ads":
      return {
        headline: truncate(capFirst(offeringPhrase || primary), 30),
        benefit: [sentence(`${offering} from ${business}`, locTail, audienceTail), `${ctaClosingLine(cta)}.`]
          .filter(Boolean)
          .join(" "),
      };
    case "Google Display":
      return {
        headline: truncate(business, 30),
        benefit: sentence(offering, locTail, audienceTail),
      };
    case "Facebook":
    case "Instagram":
      return {
        headline: truncate(offeringPhrase ? `Looking for ${lowerFirst(offeringPhrase)}?` : `Meet ${business}`, 60),
        benefit: sentence(`${business} offers ${lowerFirst(offering)}`, audienceTail, locTail),
      };
    case "WhatsApp":
      return {
        headline: truncate(`Chat with ${business}`, 60),
        benefit: sentence(`Message us for ${lowerFirst(offering)}`, locTail, audienceTail),
      };
    case "LinkedIn":
      return {
        headline: truncate(`${business}: ${offeringPhrase || primary}`, 60),
        benefit: sentence(`Partner with ${business} for ${lowerFirst(offering)}`, locTail),
      };
    case "YouTube":
      return {
        headline: truncate(offeringPhrase ? `See how ${business} delivers ${lowerFirst(offeringPhrase)}` : `Meet ${business}`, 60),
        benefit: sentence(offering, audienceTail),
      };
    default:
      return {
        headline: truncate(`${business}: ${offeringPhrase || primary}`, 60),
        benefit: sentence(offering, locTail, audienceTail),
      };
  }
}

/** A real, already-published photo (own site first, then a reachable competitor's) to show while no AI image has been generated — never presented as finished creative, always attributed. */
function pickReferenceImage(data: WizardData): { url: string; source: string } | null {
  if (data.hasWebsite === "YES" && data.websiteOgImageUrl) {
    return { url: data.websiteOgImageUrl, source: "your client's own website" };
  }
  const comp = data.competitorSiteResults.find((c) => c.fetchedOk && c.ogImageUrl);
  if (comp?.ogImageUrl) return { url: comp.ogImageUrl, source: comp.hostname };
  return null;
}

function buildSearchAdFields(data: WizardData, business: string, offerings: string[], cta: string) {
  // Fall back to the target country when no city/region was entered, so ads
  // still carry a location line for nationally-targeted businesses.
  const adLocation = data.targetLocation.trim() || data.targetCountry.trim();
  const headlineCandidates = [
    business,
    offerings[0],
    cta,
    adLocation ? `Serving ${adLocation}` : offerings[1],
    offerings[2] ?? (data.businessGoal || undefined),
  ].filter((h): h is string => Boolean(h && h.trim()));
  const headlines = Array.from(new Set(headlineCandidates.map((h) => truncate(h, 30)))).slice(0, 5);

  const productsLine = frag(data.productsServices || data.businessDescription);
  const audienceLine = audienceSummary(data.targetAudience);
  const descriptions = [
    truncate(
      sentence(productsLine, adLocation ? `serving ${adLocation}` : "", audienceLine ? `built for ${lowerFirst(frag(audienceLine))}` : "") ||
        `Quality ${offerings[0] ?? "products & services"} you can trust.`,
      90
    ),
  ];
  if (offerings.length > 1) {
    const offeringsList = offerings.slice(0, 3).map((o) => frag(o)).filter(Boolean).join(", ");
    descriptions.push(truncate(`${sentence(offeringsList)} ${ctaClosingLine(cta)}.`, 90));
  }

  const displayPath = offerings[0] ? [slugify(offerings[0])] : data.businessVertical ? [slugify(data.businessVertical)] : [];

  const sitelinks: Array<{ text: string; description: string }> = [
    { text: "Our Services", description: truncate(offerings[0] ? `Explore ${offerings[0]}` : "See what we offer", 60) },
    { text: truncate(cta, 25), description: "Get started today" },
    { text: "Contact Us", description: "Get in touch with our team" },
  ];
  if (data.businessDescription) sitelinks.push({ text: "About Us", description: truncate(data.businessDescription, 60) });

  const callouts = Array.from(new Set(offerings.slice(0, 5).map((o) => truncate(o, 25))));
  if (adLocation) callouts.push(truncate(`Serving ${adLocation}`, 25));

  return {
    headlines,
    descriptions,
    displayPath,
    sitelinks: sitelinks.slice(0, 4),
    callouts: callouts.slice(0, 6),
    structuredSnippetHeader: "Services",
    structuredSnippetValues: offerings.slice(0, 10).map((o) => truncate(o, 25)),
  };
}

function buildDisplayAdFields(data: WizardData, business: string, offerings: string[], cta: string) {
  const headlines = Array.from(new Set([truncate(business, 30), offerings[0] ? truncate(frag(offerings[0]), 30) : truncate(cta, 30)]));
  const productsLine = frag(data.productsServices || data.businessDescription);
  return {
    headlines,
    longHeadline: truncate(`${business}${offerings[0] ? `: ${frag(offerings[0])}` : ""}`, 90),
    descriptions: [truncate(sentence(productsLine) || `Quality ${offerings[0] ?? "products & services"} you can trust.`, 90)],
    businessName: truncate(business, 25),
  };
}

function buildSocialAdFields(data: WizardData, offerings: string[], headline: string, benefit: string, cta: string) {
  const adLocation = data.targetLocation.trim() || data.targetCountry.trim();
  const productsLine = frag(data.productsServices || data.businessDescription);
  const audienceLine = audienceSummary(data.targetAudience);
  const primaryText =
    sentence(productsLine, audienceLine ? `built for ${lowerFirst(frag(audienceLine))}` : "", adLocation ? `serving ${adLocation}` : "") ||
    `Quality ${offerings[0] ?? "products & services"} you can trust.`;
  return {
    primaryText: truncate(primaryText, 220),
    headline: truncate(headline, 40),
    description: truncate(adLocation ? `Serving ${adLocation}` : benefit, 30),
    ctaButton: standardCtaButton(cta),
  };
}

function buildVideoAdFields(business: string, headline: string, cta: string) {
  return {
    companionHeadline: truncate(headline, 30),
    companionDescription: truncate(`${business} — ${ctaClosingLine(cta)}`, 90),
    ctaButton: standardCtaButton(cta),
  };
}

function StepSampleAds({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const suggestion = useMemo(() => getAudiencePlatformSuggestion(data.businessVertical, data.targetCountry), [data.businessVertical, data.targetCountry]);
  const usingFallbackPlatforms = data.platforms.length === 0;
  const activePlatforms = usingFallbackPlatforms ? suggestion.platforms.map((p) => p.platform) : data.platforms;
  const [aiKeyConfigured, setAiKeyConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    api.get<{ aiImageApiKey: string | null }>("/api/settings").then(
      (s) => setAiKeyConfigured(Boolean(s.aiImageApiKey)),
      () => setAiKeyConfigured(false)
    );
  }, []);

  function generate() {
    const business = data.businessName || "Your Business";
    const offerings = splitList(data.productsServices || data.businessDescription || "");
    const offering = offerings[0];
    const audience = audienceSummary(data.targetAudience);
    const vertical = data.businessVertical || "business";
    const adLocation = data.targetLocation.trim() || data.targetCountry.trim();
    const offeringPhrase = offeringsPhrase(offerings);
    const primary = frag(offering) || frag(data.businessGoal) || "your business";
    const referenceImage = pickReferenceImage(data);

    const ads = activePlatforms.slice(0, 4).map((platform) => {
      const detail = suggestion.platforms.find((sp) => sp.platform === platform);
      const cta = defaultCtaFor(platform, data.businessVertical);
      const format = PLATFORM_FORMAT[platform] ?? "Search Ad";
      // Headline + description written to fit how each platform actually
      // reads (Search leads with the offering, Facebook/WhatsApp read as a
      // hook/invitation, etc.) — see craftAdCopy — instead of the same
      // "Business: Offering" string repeated identically on every card.
      const { headline, benefit } = craftAdCopy(platform, cta, { business, offeringPhrase, primary, audience, adLocation });

      const base = { platform, headline, benefit, cta, adType: detail?.adType ?? "", format };

      if (format === "Image Ad") {
        const visualDescription = `Professional, photorealistic advertisement image for ${business}, a ${vertical.toLowerCase()} business${
          offering ? `, showcasing ${offering}` : ""
        }${audience ? `, appealing to ${audience}` : ""}. Clean, modern marketing style, natural lighting, no text or words in the image.`;
        const extFields =
          platform === "Google Display"
            ? { displayAd: buildDisplayAdFields(data, business, offerings, cta) }
            : { socialAd: buildSocialAdFields(data, offerings, headline, benefit, cta) };
        return {
          ...base,
          visualDescription,
          referenceImageUrl: referenceImage?.url,
          referenceImageSource: referenceImage?.source,
          ...extFields,
        };
      }
      if (format === "Video Ad") {
        const hook = offeringPhrase ? `Struggling with ${lowerFirst(offeringPhrase)}? Here's how ${business} helps.` : `Meet ${business}.`;
        const story = benefit || `Show ${business}'s product/service in action, real results, real customers.`;
        const videoCta = `${ctaClosingLine(cta)} — ${business}.`;
        return {
          ...base,
          videoScript: { hook, story, cta: videoCta },
          referenceImageUrl: referenceImage?.url,
          referenceImageSource: referenceImage?.source,
          videoAd: buildVideoAdFields(business, headline, cta),
        };
      }
      return { ...base, searchAd: buildSearchAdFields(data, business, offerings, cta) };
    });
    update("sampleAds", ads);
  }

  function updateAd(i: number, patch: Partial<WizardData["sampleAds"][number]>) {
    const copy = [...data.sampleAds];
    copy[i] = { ...copy[i], ...patch };
    update("sampleAds", copy);
  }

  if (!data.includePpc) {
    return (
      <Card className="p-5">
        <CardHeader title="Sample Advertisement Concepts" subtitle="Paid ad creative concepts — only relevant when PPC is included." />
        <p className="text-sm text-slate-500 pt-3">
          PPC / Paid wasn&apos;t selected on the Organic &amp; PPC step, so sample ad concepts are skipped here and won&apos;t appear in the report.
          Go back to that step if this customer does want paid campaigns.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <CardHeader
        title="Sample Advertisement Concepts"
        subtitle="Search, Image and Video ad concepts — headlines, descriptions, primary text and extensions — built from this business's real details and the platforms recommended in the Audience step."
        action={<Button size="sm" onClick={generate}><Sparkles size={14} /> Generate</Button>}
      />
      {usingFallbackPlatforms && (
        <p className="text-xs text-amber-600 mt-2">
          No platforms were selected on the Audience step, so these use the industry-suggested platforms instead. Select platforms there for a tighter match.
        </p>
      )}
      {aiKeyConfigured === false && (
        <p className="text-xs text-slate-400 mt-2">
          Image Ad concepts include a real AI-generated image once you add an OpenAI API key in Settings. Until then, if your client&apos;s own site or a
          competitor&apos;s site has a usable photo, that&apos;s shown instead as a labeled reference — never a stock or invented image.
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-4 pt-4">
        {data.sampleAds.map((ad, i) => (
          <SampleAdCard key={i} ad={ad} onChange={(patch) => updateAd(i, patch)} aiKeyConfigured={aiKeyConfigured} />
        ))}
      </div>
      {data.sampleAds.length === 0 && <p className="text-sm text-slate-400 pt-4">Click Generate to create starter concepts from this business&apos;s real details, then edit freely.</p>}
    </Card>
  );
}

// Multi-value text field: one item per line, kept as a plain string[] on
// change (blank lines filtered only when the data is actually used/saved,
// so mid-edit typing isn't fought).
function LinesField({ label, hint, values, onChange, rows = 3 }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; rows?: number }) {
  return (
    <Field label={label} hint={hint}>
      <Textarea value={values.join("\n")} onChange={(e) => onChange(e.target.value.split("\n"))} rows={rows} className="text-xs" />
    </Field>
  );
}

function SitelinksField({ values, onChange }: { values: Array<{ text: string; description: string }>; onChange: (v: Array<{ text: string; description: string }>) => void }) {
  const text = values.map((s) => `${s.text} — ${s.description}`).join("\n");
  return (
    <Field label="Sitelinks" hint="One per line: Label — Description">
      <Textarea
        value={text}
        onChange={(e) => {
          const lines = e.target.value.split("\n");
          onChange(
            lines.map((line) => {
              const [t, ...rest] = line.split(" — ");
              return { text: (t ?? "").trim(), description: rest.join(" — ").trim() };
            })
          );
        }}
        rows={4}
        className="text-xs"
      />
    </Field>
  );
}

function SampleAdCard({
  ad,
  onChange,
  aiKeyConfigured,
}: {
  ad: WizardData["sampleAds"][number];
  onChange: (patch: Partial<WizardData["sampleAds"][number]>) => void;
  aiKeyConfigured: boolean | null;
}) {
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  async function generateImage() {
    if (!ad.visualDescription) return;
    setGeneratingImage(true);
    onChange({ imageError: undefined });
    try {
      const result = await api.post<{ dataUrl: string }>("/api/generate-ad-image", {
        prompt: ad.visualDescription,
        size: PLATFORM_IMAGE_SIZE[ad.platform] ?? "1024x1024",
      });
      onChange({ imageDataUrl: result.dataUrl, imageError: undefined });
    } catch (e) {
      onChange({ imageError: e instanceof Error ? e.message : "Image generation failed." });
    } finally {
      setGeneratingImage(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-600 text-white">{ad.platform}</Badge>
          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{ad.format}</Badge>
        </div>
        {ad.adType && <span className="text-[11px] text-slate-400">{ad.adType}</span>}
      </div>

      {ad.format === "Image Ad" && (
        <div className="mb-3">
          {ad.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.imageDataUrl} alt="Generated ad concept" className="w-full rounded-lg mb-2 border border-slate-200 dark:border-slate-700" />
          ) : ad.referenceImageUrl ? (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.referenceImageUrl} alt="Reference photo" className="w-full rounded-lg border border-slate-200 dark:border-slate-700" />
              <p className="text-[10px] text-slate-400 mt-1">Reference photo from {ad.referenceImageSource} — for visual inspiration only, not finished ad creative.</p>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg mb-2 border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs text-slate-400 p-3 text-center">
              No image generated yet
            </div>
          )}
          <Textarea
            value={ad.visualDescription ?? ""}
            onChange={(e) => onChange({ visualDescription: e.target.value })}
            rows={2}
            className="mb-2 text-xs"
            placeholder="What should the image show?"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={generateImage}
            disabled={generatingImage || !aiKeyConfigured || !ad.visualDescription}
            className="mb-2"
          >
            {generatingImage ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles size={13} />}
            {generatingImage ? "Generating…" : ad.imageDataUrl ? "Regenerate Image" : "Generate Image"}
          </Button>
          {!aiKeyConfigured && <p className="text-[11px] text-amber-600 mb-2">Add an OpenAI API key in Settings to generate real images.</p>}
          {ad.imageError && <p className="text-[11px] text-red-600 mb-2">{ad.imageError}</p>}
        </div>
      )}

      {ad.format === "Video Ad" && ad.videoScript && (
        <div className="mb-3 space-y-2">
          {!ad.referenceImageUrl ? null : (
            <div className="mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.referenceImageUrl} alt="Reference photo" className="w-full rounded-lg border border-slate-200 dark:border-slate-700" />
              <p className="text-[10px] text-slate-400 mt-1">Reference photo from {ad.referenceImageSource} — for visual inspiration only.</p>
            </div>
          )}
          <Field label="Hook (0–3s)">
            <Textarea value={ad.videoScript.hook} onChange={(e) => onChange({ videoScript: { ...ad.videoScript!, hook: e.target.value } })} rows={2} className="text-xs" />
          </Field>
          <Field label="Story / Demo">
            <Textarea value={ad.videoScript.story} onChange={(e) => onChange({ videoScript: { ...ad.videoScript!, story: e.target.value } })} rows={2} className="text-xs" />
          </Field>
          <Field label="Closing CTA">
            <Textarea value={ad.videoScript.cta} onChange={(e) => onChange({ videoScript: { ...ad.videoScript!, cta: e.target.value } })} rows={2} className="text-xs" />
          </Field>
          <p className="text-[11px] text-slate-400">A written script/storyboard concept — not a generated video clip.</p>
        </div>
      )}

      <Input value={ad.headline} onChange={(e) => onChange({ headline: e.target.value })} className="mb-2 font-medium" />
      <Textarea value={ad.benefit} onChange={(e) => onChange({ benefit: e.target.value })} className="mb-2 text-xs" rows={2} />
      <Input value={ad.cta} onChange={(e) => onChange({ cta: e.target.value })} className="text-xs w-32 mb-2" />

      {(ad.searchAd || ad.displayAd || ad.socialAd || ad.videoAd) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showDetails ? "Hide" : "Show"} full ad copy &amp; extensions {showDetails ? "▴" : "▾"}
          </button>

          {showDetails && ad.searchAd && (
            <div className="mt-3 space-y-2">
              <LinesField label="Headlines" hint="One per line, max 30 characters each." values={ad.searchAd.headlines} onChange={(v) => onChange({ searchAd: { ...ad.searchAd!, headlines: v } })} rows={4} />
              <LinesField label="Descriptions" hint="One per line, max 90 characters each." values={ad.searchAd.descriptions} onChange={(v) => onChange({ searchAd: { ...ad.searchAd!, descriptions: v } })} rows={2} />
              <LinesField label="Display Path" hint="Shown after your domain, e.g. yoursite.com/this-path." values={ad.searchAd.displayPath} onChange={(v) => onChange({ searchAd: { ...ad.searchAd!, displayPath: v } })} rows={1} />
              <SitelinksField values={ad.searchAd.sitelinks} onChange={(v) => onChange({ searchAd: { ...ad.searchAd!, sitelinks: v } })} />
              <LinesField label="Callout Extensions" hint="One per line, max 25 characters each." values={ad.searchAd.callouts} onChange={(v) => onChange({ searchAd: { ...ad.searchAd!, callouts: v } })} rows={3} />
              <Field label="Structured Snippet Header">
                <Input value={ad.searchAd.structuredSnippetHeader} onChange={(e) => onChange({ searchAd: { ...ad.searchAd!, structuredSnippetHeader: e.target.value } })} className="text-xs" />
              </Field>
              <LinesField label="Structured Snippet Values" values={ad.searchAd.structuredSnippetValues} onChange={(v) => onChange({ searchAd: { ...ad.searchAd!, structuredSnippetValues: v } })} rows={3} />
            </div>
          )}

          {showDetails && ad.displayAd && (
            <div className="mt-3 space-y-2">
              <LinesField label="Short Headlines" hint="One per line, max 30 characters each." values={ad.displayAd.headlines} onChange={(v) => onChange({ displayAd: { ...ad.displayAd!, headlines: v } })} rows={3} />
              <Field label="Long Headline" hint="Max 90 characters.">
                <Input value={ad.displayAd.longHeadline} onChange={(e) => onChange({ displayAd: { ...ad.displayAd!, longHeadline: e.target.value } })} className="text-xs" />
              </Field>
              <LinesField label="Descriptions" hint="One per line, max 90 characters each." values={ad.displayAd.descriptions} onChange={(v) => onChange({ displayAd: { ...ad.displayAd!, descriptions: v } })} rows={2} />
              <Field label="Business Name">
                <Input value={ad.displayAd.businessName} onChange={(e) => onChange({ displayAd: { ...ad.displayAd!, businessName: e.target.value } })} className="text-xs" />
              </Field>
            </div>
          )}

          {showDetails && ad.socialAd && (
            <div className="mt-3 space-y-2">
              <Field label="Primary Text">
                <Textarea value={ad.socialAd.primaryText} onChange={(e) => onChange({ socialAd: { ...ad.socialAd!, primaryText: e.target.value } })} rows={3} className="text-xs" />
              </Field>
              <Field label="Headline">
                <Input value={ad.socialAd.headline} onChange={(e) => onChange({ socialAd: { ...ad.socialAd!, headline: e.target.value } })} className="text-xs" />
              </Field>
              <Field label="Description">
                <Input value={ad.socialAd.description} onChange={(e) => onChange({ socialAd: { ...ad.socialAd!, description: e.target.value } })} className="text-xs" />
              </Field>
              <Field label="CTA Button">
                <Input value={ad.socialAd.ctaButton} onChange={(e) => onChange({ socialAd: { ...ad.socialAd!, ctaButton: e.target.value } })} className="text-xs w-40" />
              </Field>
            </div>
          )}

          {showDetails && ad.videoAd && (
            <div className="mt-3 space-y-2">
              <Field label="Companion Banner Headline">
                <Input value={ad.videoAd.companionHeadline} onChange={(e) => onChange({ videoAd: { ...ad.videoAd!, companionHeadline: e.target.value } })} className="text-xs" />
              </Field>
              <Field label="Companion Banner Description">
                <Input value={ad.videoAd.companionDescription} onChange={(e) => onChange({ videoAd: { ...ad.videoAd!, companionDescription: e.target.value } })} className="text-xs" />
              </Field>
              <Field label="CTA Button">
                <Input value={ad.videoAd.ctaButton} onChange={(e) => onChange({ videoAd: { ...ad.videoAd!, ctaButton: e.target.value } })} className="text-xs w-40" />
              </Field>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 9 — Budget & forecast (calculation engine)
// ---------------------------------------------------------------------------
function StepForecast({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  const currency = currencyForCountry(data.targetCountry);

  // Per-industry "Sales Conversion Rate" benchmarks (qualified lead ->
  // customer close rate) live in the Benchmarks database (Platform =
  // "Industry Benchmark", Metric = "Sales Conversion Rate") — same pattern
  // as the Profit Margin benchmark on the Business Details step. Fetched
  // once; looked up by the selected Business Vertical to offer a one-click
  // starting value, without ever overwriting a value already typed.
  const [salesConvBenchmarks, setSalesConvBenchmarks] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    api
      .get<Array<{ industry: string; value: number }>>("/api/benchmarks?metric=Sales%20Conversion%20Rate&status=active")
      .then((rows) => setSalesConvBenchmarks(Object.fromEntries(rows.map((r) => [r.industry, r.value]))))
      .catch(() => setSalesConvBenchmarks({}));
  }, []);
  const salesConvBenchmark = data.businessVertical ? salesConvBenchmarks?.[data.businessVertical] : undefined;

  // Same suggested-starting-budget hint as the Business Details step, shown
  // here too since this field (data.monthlyBudget) is the same underlying
  // value as that step's Monthly Marketing Budget — by this point in the
  // wizard the Audience step has usually already set data.platforms, so the
  // suggestion here is typically sharper (weighted across the platforms
  // actually selected, not just the vertical's full suggested list).
  const budgetSuggestion = useSuggestedMonthlyBudget(data.businessVertical, data.platforms, data.targetCountry);

  // How competitive this business's industry is to rank organically in —
  // see useSeoCompetitionTier / src/lib/seo-competition.ts. Drives both the
  // shape of the 12-month organic curve below and, for a brand-new site
  // with no baseline traffic yet, the new-website cold-start timeline.
  const competitionTierResult = useSeoCompetitionTier(data.businessVertical);
  const competitionTier: SeoCompetitionTier = competitionTierResult?.tier ?? "Medium";

  const tiers = useMemo(() => {
    const inputs = {
      adBudget: Number(data.monthlyBudget) || 0,
      cpc: Number(data.cpc) || 1,
      leadConversionRate: Number(data.leadConversionRate) || 0,
      qualificationRate: Number(data.qualificationRate) || 85,
      salesConversionRate: Number(data.salesConversionRate) || 0,
      avgSellingPrice: Number(data.avgSellingPrice) || Number(data.avgOrderValue) || 0,
      profitMarginPct: Number(data.profitMarginPct) || 0,
      additionalMarketingCost: Number(data.additionalMarketingCost) || 0,
      currentOrganicTraffic: Number(data.currentOrganicTraffic) || 0,
      organicTrafficGrowth: Number(data.organicTrafficGrowth) || 0,
      organicLeadConversionRate: Number(data.organicLeadConversionRate) || 0,
    };
    return buildScenarioTiers(inputs, competitionTier);
  }, [data, competitionTier]);

  return (
    <Card className="p-5">
      <CardHeader title="Marketing Forecast & Calculation Engine" subtitle="Formulas are centralized — see spec section 12. Nothing here is guessed." />
      <div className="grid sm:grid-cols-3 gap-4 pt-4">
        <div>
          <Field label="Monthly Ad Spend (from Business Details)"><Input type="number" value={data.monthlyBudget} onChange={(e) => update("monthlyBudget", e.target.value)} /></Field>
          {!(Number(data.monthlyBudget) > 0) && data.businessVertical && (
            <SuggestedBudgetHint suggestion={budgetSuggestion} onApply={(amount) => update("monthlyBudget", amount)} />
          )}
        </div>
        <Field label="Average CPC"><Input type="number" step="0.01" value={data.cpc} onChange={(e) => update("cpc", e.target.value)} /></Field>
        <Field label="Lead Conversion Rate %"><Input type="number" value={data.leadConversionRate} onChange={(e) => update("leadConversionRate", e.target.value)} /></Field>
        <Field label="Qualification Rate %" hint="Default 85%, editable"><Input type="number" value={data.qualificationRate} onChange={(e) => update("qualificationRate", e.target.value)} /></Field>
        <div>
          <Field label="Sales Conversion Rate %" hint="Qualified lead → customer close rate"><Input type="number" value={data.salesConversionRate} onChange={(e) => update("salesConversionRate", e.target.value)} /></Field>
          {salesConvBenchmark != null && (
            <button
              type="button"
              onClick={() => update("salesConversionRate", String(salesConvBenchmark))}
              className="mt-1 text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Use industry benchmark: {salesConvBenchmark}% ({data.businessVertical})
            </button>
          )}
        </div>
        <Field label="Average Selling Price"><Input type="number" value={data.avgSellingPrice} onChange={(e) => update("avgSellingPrice", e.target.value)} placeholder={data.avgOrderValue || "0"} /></Field>
        <Field label="Profit Margin % (from Business Details)"><Input type="number" value={data.profitMarginPct} onChange={(e) => update("profitMarginPct", e.target.value)} /></Field>
        <Field label="Additional Marketing Cost"><Input type="number" value={data.additionalMarketingCost} onChange={(e) => update("additionalMarketingCost", e.target.value)} /></Field>
        <Field label="Organic Traffic Growth %"><Input type="number" value={data.organicTrafficGrowth} onChange={(e) => update("organicTrafficGrowth", e.target.value)} /></Field>
        <Field label="Organic Lead Conversion Rate %"><Input type="number" value={data.organicLeadConversionRate} onChange={(e) => update("organicLeadConversionRate", e.target.value)} /></Field>
      </div>

      <div className="overflow-x-auto mt-6">
        <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Metric</th>
              {tiers.map((t) => <th key={t.tier} className="text-left px-3 py-2 font-medium">{t.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <Row label="Traffic / Clicks" values={tiers.map((t) => formatNumber(t.results.paid.traffic))} />
            <Row label="Leads" values={tiers.map((t) => formatNumber(t.results.paid.leads))} />
            <Row label="Qualified Leads" values={tiers.map((t) => formatNumber(t.results.paid.qualifiedLeads))} />
            <Row label="Customers" values={tiers.map((t) => formatNumber(t.results.paid.customers))} />
            <Row label="Revenue" values={tiers.map((t) => formatCurrency(t.results.paid.revenue, currency))} />
            <Row label="CPL" values={tiers.map((t) => formatCurrency(t.results.paid.cpl, currency))} />
            <Row label="CAC" values={tiers.map((t) => formatCurrency(t.results.paid.cac, currency))} />
            <Row label="ROAS" values={tiers.map((t) => formatRoas(t.results.paid.roas))} />
            <Row label="Gross Profit" values={tiers.map((t) => formatCurrency(t.results.paid.grossProfit, currency))} />
            <Row label="Net Marketing Profit" values={tiers.map((t) => formatCurrency(t.results.paid.netMarketingProfit, currency))} />
            <Row label="ROI" values={tiers.map((t) => formatPercent(t.results.paid.roi))} />
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        {tiers.map((t) => t.assumptionNote).join(" ")}
      </p>
      <p className="text-xs text-slate-400 mt-1">These are scenario-based estimates. Actual results may vary.</p>

      <OrganicForecastCard data={data} tiers={tiers} competitionTierResult={competitionTierResult} />
      <OrderValueRangeTable data={data} />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Organic (SEO) 12-month growth forecast — separate from the paid/PPC table
// above, since organic growth compounds over time rather than being a
// single per-month spend-driven number. The monthly shape comes from real,
// sourced research (see ORGANIC_MONTHLY_GROWTH_CURVE in calculations.ts —
// Neil Patel's analysis of 42,391 websites), applied to whatever total
// 12-month growth % and baseline traffic the consultant has entered on the
// Organic Growth Goals card (Step 4). Only rendered when Organic/SEO is
// actually part of the strategy and a baseline traffic number exists —
// otherwise there's nothing real to project from, and this app never fills
// that gap with a guessed number.
// ---------------------------------------------------------------------------
function CompetitionTierBadge({ result }: { result: CompetitionTierResult | null }) {
  if (!result) return null;
  const colors: Record<SeoCompetitionTier, string> = {
    Low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    High: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colors[result.tier]}`}>
      {result.tier} SEO competition
    </span>
  );
}

function OrganicForecastCard({
  data,
  tiers,
  competitionTierResult,
}: {
  data: WizardData;
  tiers: Array<{ tier: string; label: string; organicMonthly: OrganicMonthlyPoint[] }>;
  competitionTierResult: CompetitionTierResult | null;
}) {
  if (!data.includeOrganic) return null;

  const baseline = Number(data.currentOrganicTraffic) || 0;
  const competitorSignal = getCompetitorContentSignal(data.competitorSiteResults);

  if (baseline <= 0) {
    const timeline = getNewSiteTimeline(competitionTierResult?.tier ?? null);
    return (
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">New Website — Organic (SEO) Traction Timeline</p>
          <CompetitionTierBadge result={competitionTierResult} />
        </div>
        <p className="text-xs text-slate-400 mb-3">
          No Current Organic Traffic baseline was entered on the Organic Growth Goals card (Step 4) — for a genuinely
          new website that's usually the honest answer (0), not a missing field. A % growth model can't project
          anything from zero, so instead this is a real, sourced timeline of what a brand-new site typically
          experiences in year 1, adjusted for how competitive {data.businessVertical || "this industry"} is to rank
          in{competitionTierResult ? ` (based on a ${competitionTierResult.source} CPC benchmark of ${formatCurrency(competitionTierResult.cpcValue, competitionTierResult.currency)} for this industry — see the note below)` : ""}.
        </p>

        <div className="space-y-2">
          {timeline.map((phase) => (
            <div key={phase.phase} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex gap-3">
              <div className="shrink-0 w-28">
                <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">{phase.timeframe}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{phase.phase}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{phase.description}</p>
              </div>
            </div>
          ))}
        </div>

        {competitorSignal && (
          <p className="text-xs text-slate-400 mt-3">
            Live competitor check from Step 6: the {competitorSignal.reachableCount} reachable competitor site
            {competitorSignal.reachableCount === 1 ? "" : "s"} averaged {formatNumber(competitorSignal.avgWordCount)} words per page
            with {Math.round(competitorSignal.blogShare * 100)}% running an active blog — {competitorSignal.level} content
            investment to compete against.
          </p>
        )}

        <p className="text-xs text-slate-400 mt-3">
          Sourced from: Google's own indexing guidance and independent research on indexing speed (
          <a href="https://www.searchenginejournal.com/how-long-before-google-indexes-my-new-page/464309/" target="_blank" rel="noreferrer" className="underline">
            Search Engine Journal
          </a>
          ); Ahrefs' analysis of ~2M URLs on time-to-rank (
          <a href="https://ahrefs.com/blog/how-long-does-it-take-to-rank-in-google-and-how-old-are-top-ranking-pages/" target="_blank" rel="noreferrer" className="underline">
            Ahrefs
          </a>
          ); SE Ranking's analysis of 100,000 SERPs on new-domain competitiveness (
          <a href="https://seranking.com/blog/domain-age-ranking-factor/" target="_blank" rel="noreferrer" className="underline">
            SE Ranking
          </a>
          ). Once there's a real baseline, even a small one, switch this input to that number to see the 12-month %
          growth chart instead.
        </p>
      </div>
    );
  }

  const conservative = tiers.find((t) => t.tier === "CONSERVATIVE")?.organicMonthly ?? [];
  const expected = tiers.find((t) => t.tier === "EXPECTED")?.organicMonthly ?? [];
  const growth = tiers.find((t) => t.tier === "GROWTH_OPPORTUNITY")?.organicMonthly ?? [];

  const chartData = expected.map((point, i) => ({
    month: `M${point.month}`,
    Conservative: Math.round(conservative[i]?.traffic ?? 0),
    Expected: Math.round(point.traffic),
    "Growth Opportunity": Math.round(growth[i]?.traffic ?? 0),
  }));

  const month12Expected = expected[expected.length - 1];
  const month6Expected = expected[5];
  const year1LeadsExpected = expected.reduce((sum, p) => sum + p.leads, 0);

  return (
    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Organic (SEO) 12-Month Growth Forecast</p>
        <CompetitionTierBadge result={competitionTierResult} />
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Projects the Current Organic Traffic baseline and Organic Traffic Growth % above across 12 months, using a
        month-by-month shape sourced from Neil Patel's analysis of 42,391 websites (+11.4% organic traffic growth in
        months 0–6 of active SEO work, a further +9.5% in months 7–12 — growth compounds through the year rather than
        arriving evenly or immediately). Conservative/Expected/Growth Opportunity apply the same 0.5x/1x/1.5x range
        already used in the table above.
        {competitionTierResult && (
          <>
            {" "}The curve's timing is also shifted for {data.businessVertical}'s {competitionTierResult.tier.toLowerCase()} SEO
            competition (based on a {competitionTierResult.source} CPC benchmark of{" "}
            {formatCurrency(competitionTierResult.cpcValue, competitionTierResult.currency)} for this industry, used as a proxy
            — higher-CPC industries tend to be harder to rank in organically too, so growth is modeled as arriving later in the
            year; lower-CPC industries, earlier). The total 12-month growth % is unchanged — only when within the year it lands.
          </>
        )}
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[11px] text-slate-400">Month 6 Organic Traffic (Expected)</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatNumber(month6Expected?.traffic ?? 0)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[11px] text-slate-400">Month 12 Organic Traffic (Expected)</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {formatNumber(month12Expected?.traffic ?? 0)}
            <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 ml-1.5">
              +{(month12Expected?.growthPct ?? 0).toFixed(0)}%
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-[11px] text-slate-400">Year 1 Organic Leads (Expected)</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatNumber(year1LeadsExpected)}</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={56} />
            <Tooltip formatter={(value) => formatNumber(Number(value) || 0)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Conservative" stroke="#64748b" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Expected" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="Growth Opportunity" stroke="#059669" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Scenario-based projection from a real starting point, not a guarantee — actual organic growth depends on
        competition, content quality, technical execution and starting domain authority.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ROAS/ROI across the customer's own Min → Avg → Max order value (Business Details step),
// holding every other Expected-tier assumption constant so the only thing
// that changes is order value itself.
// ---------------------------------------------------------------------------
function OrderValueRangeTable({ data }: { data: WizardData }) {
  const currency = currencyForCountry(data.targetCountry);
  const rows = useMemo(() => {
    const baseInputs = {
      adBudget: Number(data.monthlyBudget) || 0,
      cpc: Number(data.cpc) || 1,
      leadConversionRate: Number(data.leadConversionRate) || 0,
      qualificationRate: Number(data.qualificationRate) || 85,
      salesConversionRate: Number(data.salesConversionRate) || 0,
      profitMarginPct: Number(data.profitMarginPct) || 0,
      additionalMarketingCost: Number(data.additionalMarketingCost) || 0,
    };
    const tiers: Array<["Min Order Value" | "Avg Order Value" | "Max Order Value", string]> = [
      ["Min Order Value", data.minOrderValue],
      ["Avg Order Value", data.avgOrderValue],
      ["Max Order Value", data.maxOrderValue],
    ];
    return tiers
      .filter(([, value]) => value !== "")
      .map(([label, value]) => ({
        label,
        avgSellingPrice: Number(value) || 0,
        results: calculatePaidForecast({ ...baseInputs, avgSellingPrice: Number(value) || 0 }),
      }));
  }, [data.minOrderValue, data.avgOrderValue, data.maxOrderValue, data.monthlyBudget, data.cpc, data.leadConversionRate, data.qualificationRate, data.salesConversionRate, data.profitMarginPct, data.additionalMarketingCost]);

  if (rows.length === 0) return null;

  return (
    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Revenue, ROAS &amp; ROI by Order Value</p>
      <p className="text-xs text-slate-400 mb-3">Uses the Min / Avg / Max Order Value entered in Step 1, with every other assumption above held at the Expected tier — shows how deal size alone moves ROAS and ROI.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Metric</th>
              {rows.map((r) => <th key={r.label} className="text-left px-3 py-2 font-medium">{r.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <Row label="Order Value" values={rows.map((r) => formatCurrency(r.avgSellingPrice, currency))} />
            <Row label="Revenue" values={rows.map((r) => formatCurrency(r.results.revenue, currency))} />
            <Row label="ROAS" values={rows.map((r) => formatRoas(r.results.roas))} />
            <Row label="ROI" values={rows.map((r) => formatPercent(r.results.roi))} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{label}</td>
      {values.map((v, i) => <td key={i} className="px-3 py-2 tabular-nums text-slate-800 dark:text-slate-100">{v}</td>)}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Step 10 — Problem/Solution/Strategy/Execution/Result story. Auto-suggested
// by synthesizing every real data point already collected in this wizard —
// audit findings, growth recommendations, the Organic/PPC choice, the
// Audience step's platform recommendation, and live competitor insights —
// written the way an SEO analyst, campaign manager, and growth strategist
// would frame it for a client. Expected Result stays strictly directional
// (no invented numbers or guarantees), matching the rest of the app.
// ---------------------------------------------------------------------------
function buildGrowthStorySuggestion(data: WizardData): { problem: string; solution: string; strategy: string; execution: string; expectedResult: string } {
  const business = data.businessName || "This business";
  const goal = data.businessGoal || "sustainable growth";
  const audience = audienceSummary(data.targetAudience);
  const location = [data.targetLocation.trim(), data.targetCountry?.trim()].filter(Boolean).join(", ");
  const hasWebsite = data.hasWebsite === "YES";

  // Problem — the SEO analyst's diagnosis, grounded in the real audit.
  let problem: string;
  if (hasWebsite && data.topProblems.length > 0) {
    const overall = data.auditScores.overall;
    const top = data.topProblems.slice(0, 3).map((p) => {
      const [, ...rest] = p.split(": ");
      return rest.length ? rest.join(": ") : p;
    });
    problem = `A technical and on-page audit of ${business}'s website scored ${overall}/100 overall and surfaced ${data.topProblems.length} issue${
      data.topProblems.length === 1 ? "" : "s"
    } limiting search visibility and conversion — most notably: ${top.join("; ")}. These gaps mean ${business} is losing qualified traffic and enquiries it could otherwise capture, even before any ad spend is considered.`;
  } else if (hasWebsite) {
    problem = `${business}'s website is functional but hasn't yet been positioned to actively generate leads — there's no structured plan turning existing traffic into qualified enquiries.`;
  } else {
    problem = `${business} currently has no website, which means there's no owned digital asset to capture search demand, run paid campaigns against, or build long-term organic visibility around — every enquiry today depends on channels outside ${business}'s direct control.`;
  }

  // Solution — the growth manager's point of view on the fix.
  const growthRecs = categorizeGrowthRecommendations(data.auditChecks);
  const recCount = growthRecs.traffic.length + growthRecs.branding.length + growthRecs.reach.length;
  const channelMix =
    data.includeOrganic && data.includePpc
      ? "a combined SEO and paid acquisition strategy"
      : data.includeOrganic
      ? "an organic-first SEO and content strategy"
      : data.includePpc
      ? "a paid-acquisition-led strategy"
      : "a foundational digital strategy";
  const solutionParts = [`${business} needs ${channelMix}, sequenced over a 90-day plan and focused on qualified lead volume rather than vanity traffic.`];
  if (hasWebsite && recCount > 0) {
    solutionParts.push(`Closing the ${recCount} traffic, branding and reach gaps identified in the audit comes first — sending paid traffic to an unoptimised site wastes budget.`);
  } else if (!hasWebsite) {
    solutionParts.push(`Standing up a ${(data.websiteType || "lead-generation website").toLowerCase()} gives ${business} a real conversion point before scaling any traffic channel.`);
  }
  if (audience) solutionParts.push(`Everything is built around ${audience}${location ? ` in ${location}` : ""}.`);
  const solution = solutionParts.join(" ");

  // Strategy — the campaign manager's channel plan, using the platforms and
  // ad types actually recommended in the Audience step (never a generic list).
  const strategyParts: string[] = [];
  if (data.includeOrganic) {
    strategyParts.push(`Organic/SEO: ${data.organicGoals.length ? data.organicGoals.join(", ") : "technical SEO, content and on-page fixes"}.`);
  }
  if (data.includePpc) {
    const suggestion = getAudiencePlatformSuggestion(data.businessVertical, data.targetCountry);
    const platforms = data.platforms.length ? data.platforms : suggestion.platforms.map((p) => p.platform);
    const platformDetail = platforms
      .map((p) => {
        const d = platformDetailFor(p, suggestion);
        return d ? `${p} (${d.adType})` : p;
      })
      .join(", ");
    strategyParts.push(`Paid: ${platformDetail || "platform mix to be confirmed"}${data.monthlyBudget ? `, at ${formatCurrency(Number(data.monthlyBudget), currencyForCountry(data.targetCountry))}/month` : ""}.`);
  }
  if (data.includeWhatsappMarketing) {
    strategyParts.push(
      `WhatsApp Marketing: ${data.whatsappGoals.length ? data.whatsappGoals.join(", ") : "click-to-WhatsApp campaigns and broadcast messaging"}.`
    );
  }
  const reachableCompetitors = data.competitorSiteResults.filter((c) => c.fetchedOk).length;
  if (data.competitorAutoInsights.length > 0 && reachableCompetitors > 0) {
    strategyParts.push(`Positioning informed by live analysis of ${reachableCompetitors} competitor site${reachableCompetitors === 1 ? "" : "s"}.`);
  }
  const localStoreCount = data.hasLocalStore ? data.storeLocations.filter((u) => u.trim()).length : 0;
  if (localStoreCount > 0) {
    strategyParts.push(
      `Local presence (${localStoreCount} location${localStoreCount === 1 ? "" : "s"}): Google Business Profile → Search/Maps → Reviews → Website/Call/WhatsApp → Qualified Enquiry → Sales Follow-up → Purchase → Review + Referral.`
    );
  }
  const strategy = strategyParts.join(" ") || "Strategy to be defined with the client.";

  // Execution — a phased plan referencing the actual issues and platforms
  // chosen above, not a generic template.
  const fixItems = hasWebsite ? data.topProblems.slice(0, 2).map((p) => p.split(": ")[0]).filter(Boolean) : [];
  const execution = [
    `0–30 Days — Foundation: ${fixItems.length ? `Fix ${fixItems.join(" and ")}` : "Technical setup"}, install tracking, finalise audience and creative${
      localStoreCount > 0 ? `, claim/optimise Google Business Profile for all ${localStoreCount} location${localStoreCount === 1 ? "" : "s"} and set up a review-generation flow` : ""
    }${data.includeWhatsappMarketing ? ", set up WhatsApp Business catalogue and quick-reply automation" : ""}.`,
    data.includePpc
      ? `31–60 Days — Launch: Go live on ${data.platforms.length ? data.platforms.join(", ") : "the recommended platforms"}, monitor early performance, iterate creative${
          data.includeWhatsappMarketing ? ", launch click-to-WhatsApp campaigns" : ""
        }.`
      : `31–60 Days — Build: Publish priority SEO content and on-page fixes${data.includeWhatsappMarketing ? ", launch WhatsApp broadcast and quick-reply flows" : ""}.`,
    `61–90 Days — Scale: Double down on what's converting, expand ${data.includeOrganic ? "keyword/content" : "audience"} coverage, and tighten cost per qualified lead${
      data.includeWhatsappMarketing ? ", scale WhatsApp broadcast lists and automated follow-ups" : ""
    }.`,
  ].join(" ");

  // Expected Result — directional only, never a number or guarantee.
  const resultExtras = [
    data.includePpc ? "more consistent paid lead flow" : null,
    data.includeWhatsappMarketing ? "faster response via WhatsApp conversations" : null,
  ].filter((x): x is string => Boolean(x));
  const expectedResult = `With ${hasWebsite ? "the audit issues addressed and " : ""}${channelMix} in place, ${business} can expect stronger search visibility${
    resultExtras.length ? `, ${resultExtras.join(", ")},` : ""
  } and steady progress toward ${business}'s goal of "${goal}". These are directional outcomes based on the strategy above, not a guarantee — actual results depend on execution, budget and market conditions.`;

  return { problem, solution, strategy, execution, expectedResult };
}

function StepStory({ data, update }: { data: WizardData; update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void }) {
  function suggestStory() {
    const s = buildGrowthStorySuggestion(data);
    update("problem", s.problem);
    update("solution", s.solution);
    update("strategy", s.strategy);
    update("execution", s.execution);
    update("expectedResult", s.expectedResult);
  }

  return (
    <Card className="p-5">
      <CardHeader
        title="Business Growth Story"
        subtitle="Auto-suggested from the real audit findings, chosen channels, and audience/platform recommendations — framed the way an SEO analyst, campaign manager and growth strategist would. Edit freely."
        action={<Button size="sm" onClick={suggestStory}><Sparkles size={14} /> Suggest Story</Button>}
      />
      <p className="text-xs text-slate-400 pt-2">Suggesting will replace the text below with a fresh draft — edit or rewrite anything before generating the report.</p>
      <div className="grid gap-4 pt-4">
        <Field label="Client Problem"><Textarea value={data.problem} onChange={(e) => update("problem", e.target.value)} placeholder={data.topProblems.join(" ")} /></Field>
        <Field label="Solution"><Textarea value={data.solution} onChange={(e) => update("solution", e.target.value)} /></Field>
        <Field label="Strategy"><Textarea value={data.strategy} onChange={(e) => update("strategy", e.target.value)} /></Field>
        <Field label="Execution"><Textarea value={data.execution} onChange={(e) => update("execution", e.target.value)} /></Field>
        <Field label="Expected Result" hint="Never a guarantee — potential outcomes only."><Textarea value={data.expectedResult} onChange={(e) => update("expectedResult", e.target.value)} /></Field>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Step 11 — Save lead, save assessment, save scenarios, generate PDF, schedule follow-up
// ---------------------------------------------------------------------------
function StepGenerate({ data, onDone }: { data: WizardData; onDone: (leadId: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  // Populated once Save & Generate succeeds — the Save button is then
  // replaced with a Download PDF button so the consultant can grab the
  // report (and revisit it) on their own timing, instead of a browser
  // download firing automatically and the wizard immediately navigating
  // away before they've had a chance to see it succeeded.
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

  // The object URL above is only valid for this browser tab's lifetime —
  // release it if the wizard unmounts (e.g. the consultant navigates away
  // via the stepper) without ever clicking Download.
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function downloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFilename || "report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function saveAndGenerate() {
    setSaving(true);
    setError(null);
    try {
      const leadPayload = {
        customerName: data.customerName,
        businessName: data.businessName,
        email: data.email || undefined,
        phone: data.phone || undefined,
        whatsapp: data.whatsapp || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        country: data.country || undefined,
        businessVertical: data.businessVertical || undefined,
        businessDescription: data.businessDescription || undefined,
        productsServices: data.productsServices || undefined,
        websiteUrl: data.websiteUrl || undefined,
        competitorUrls: data.competitorUrls || undefined,
        storeLocations: data.hasLocalStore && data.storeLocations.some((u) => u.trim()) ? data.storeLocations.filter((u) => u.trim()).join(",") : undefined,
        minOrderValue: data.minOrderValue ? Number(data.minOrderValue) : undefined,
        avgOrderValue: data.avgOrderValue ? Number(data.avgOrderValue) : undefined,
        maxOrderValue: data.maxOrderValue ? Number(data.maxOrderValue) : undefined,
        profitMarginPct: data.profitMarginPct ? Number(data.profitMarginPct) : undefined,
        monthlyBudget: data.monthlyBudget ? Number(data.monthlyBudget) : undefined,
        targetCountry: data.targetCountry || undefined,
        targetLocation: data.targetLocation || undefined,
        targetAudience: data.targetAudience || undefined,
        businessGoal: data.businessGoal || undefined,
        leadSource: data.leadSource,
        hasWebsite: data.hasWebsite || undefined,
      };

      let leadId = data.leadId;
      if (leadId) {
        await api.patch(`/api/leads/${leadId}`, leadPayload);
      } else {
        const lead = await api.post<{ id: string }>("/api/leads", leadPayload);
        leadId = lead.id;
      }

      const growthRecs = categorizeGrowthRecommendations(data.auditChecks);
      const audiencePlatformSuggestion = getAudiencePlatformSuggestion(data.businessVertical, data.targetCountry);

      // Recompute the same budget split + benchmark-based estimate shown on
      // the Audience step, so the saved assessment (and its PDF) carries the
      // exact figures the consultant reviewed — see estimatedResultText.
      const genCurrency = currencyForCountry(data.targetCountry);
      const genBudget = Number(data.monthlyBudget) || 0;
      const genRankedPlatforms = audiencePlatformSuggestion.platforms.map((p) => p.platform);
      const genAllocations = suggestBudgetAllocation(data.platforms, genRankedPlatforms);
      let genBenchmarkRows: BenchmarkRow[] = [];
      let genFxState: FxState = { status: "unavailable" };
      if (data.businessVertical && genBudget > 0) {
        try {
          genBenchmarkRows = await api.get<BenchmarkRow[]>(
            `/api/benchmarks?industry=${encodeURIComponent(data.businessVertical)}&status=active`
          );
        } catch {
          genBenchmarkRows = [];
        }
        try {
          const fx = await api.get<{ available: boolean; rate?: number; asOf?: string }>(
            `/api/fx-rate?currency=${encodeURIComponent(genCurrency)}`
          );
          genFxState = fx.available && fx.rate != null && fx.asOf ? { status: "ok", rate: { rate: fx.rate, asOf: fx.asOf } } : { status: "unavailable" };
        } catch {
          genFxState = { status: "unavailable" };
        }
      }
      const platformDetails = data.platforms.map((p) => {
        const base = platformDetailFor(p, audiencePlatformSuggestion) ?? { platform: p, adType: "", expectedResult: "" };
        const pct = genAllocations[p] ?? 0;
        const spend = (genBudget * pct) / 100;
        return {
          ...base,
          budgetAllocation: genBudget > 0 ? `${formatCurrency(spend, genCurrency)}/mo (${pct}% of budget)` : "",
          estimatedResult:
            genBudget > 0
              ? estimatedResultText(p, spend, pct, genCurrency, data.businessVertical, genBenchmarkRows, genFxState)
              : "",
        };
      });

      const assessment = await api.post<{ id: string }>("/api/assessments", {
        leadId,
        executiveSummary: {
          currentSituation: `${data.businessName} — ${data.businessDescription || "digital presence under review."}`,
          problems: data.topProblems.length ? data.topProblems : [data.problem].filter(Boolean),
          biggestOpportunity: data.solution || "Improve digital acquisition and conversion.",
          recommendedDirection: data.strategy || "Combined SEO + paid acquisition strategy.",
        },
        websiteAudit: {
          topProblems: data.topProblems,
          recommendedImprovements: data.recommendedImprovements,
          growthRecommendations: growthRecs,
          strategicRecommendations: STRATEGIC_RECOMMENDATIONS,
          offPageMetrics:
            data.domainAuthority || data.totalBacklinks || data.referringDomains || data.estimatedOrganicTraffic
              ? {
                  domainAuthority: data.domainAuthority || undefined,
                  totalBacklinks: data.totalBacklinks || undefined,
                  referringDomains: data.referringDomains || undefined,
                  estimatedOrganicTraffic: data.estimatedOrganicTraffic || undefined,
                  source: data.offPageSource || undefined,
                }
              : null,
          localPresence:
            data.hasLocalStore && data.storeLocations.some((u) => u.trim())
              ? {
                  storeLocations: data.storeLocations.filter((u) => u.trim()),
                  notes: data.localPresenceNotes || undefined,
                  recommendations: LOCAL_BRANDING_RECOMMENDATIONS,
                }
              : null,
        },
        auditScores: data.auditScores,
        websiteRecommendation: {
          type: data.websiteType,
          pages: data.websitePages,
          businessType: data.businessType || undefined,
          onlinePresenceChannels: data.onlinePresenceChannels.length ? data.onlinePresenceChannels : undefined,
        },
        organicStrategy: data.includeOrganic
          ? { included: true, goals: data.organicGoals, currentOrganicTraffic: data.currentOrganicTraffic }
          : { included: false, goals: [], currentOrganicTraffic: "" },
        ppcStrategy: data.includePpc
          ? { included: true, objectives: data.ppcObjectives }
          : { included: false, objectives: [] },
        whatsappStrategy: data.includeWhatsappMarketing
          ? { included: true, goals: data.whatsappGoals }
          : { included: false, goals: [] },
        socialMedia:
          data.socialFacebook || data.socialInstagram || data.socialLinkedin || data.socialYoutube
            ? {
                facebook: data.socialFacebook || undefined,
                instagram: data.socialInstagram || undefined,
                linkedin: data.socialLinkedin || undefined,
                youtube: data.socialYoutube || undefined,
                // Real metrics the consultant pasted in from each platform's
                // own Insights/Analytics (Audit step) — never fabricated.
                // Omitted entirely when none were entered.
                metrics:
                  data.socialMetrics.facebook || data.socialMetrics.instagram || data.socialMetrics.linkedin || data.socialMetrics.youtube
                    ? {
                        facebook: data.socialMetrics.facebook || undefined,
                        instagram: data.socialMetrics.instagram || undefined,
                        linkedin: data.socialMetrics.linkedin || undefined,
                        youtube: data.socialMetrics.youtube || undefined,
                      }
                    : undefined,
              }
            : null,
        audienceRecommendation: { targetAudience: data.targetAudience, suggestedAudience: audiencePlatformSuggestion.audience },
        platformRecommendation: { platforms: data.platforms, details: platformDetails },
        competitorAnalysis: {
          insights: [...data.competitorAutoInsights, ...(data.competitorInsights ? [data.competitorInsights] : [])],
          client: data.competitorClientSignals,
          competitors: data.competitorSiteResults,
        },
        sampleAds: data.includePpc ? data.sampleAds : [],
        growthPlan: [
          {
            phase: "0–30 Days – Foundation",
            items: [
              "Website improvements",
              "Tracking setup",
              "Technical SEO",
              "Audience research",
              "Landing pages",
              "Campaign setup",
              ...(data.hasLocalStore ? ["Claim/optimise Google Business Profile", "Set up review-generation flow"] : []),
              ...(data.includeWhatsappMarketing ? ["Set up WhatsApp Business catalogue & quick-reply automation"] : []),
            ],
          },
          {
            phase: "31–60 Days – Growth",
            items: [
              "SEO content",
              "Campaign optimisation",
              "Lead generation",
              "Remarketing",
              "Social campaigns",
              "Conversion optimisation",
              ...(data.hasLocalStore ? ["Local citation & NAP consistency cleanup"] : []),
              ...(data.includeWhatsappMarketing ? ["Launch click-to-WhatsApp ads & broadcast campaigns"] : []),
            ],
          },
          {
            phase: "61–90 Days – Scale",
            items: [
              "Scale successful campaigns",
              "Improve ROAS",
              "Expand keywords/audiences",
              "Increase qualified leads",
              "Improve conversion",
              "Build sustainable acquisition",
              ...(data.hasLocalStore ? ["Expand to additional store locations if applicable"] : []),
              ...(data.includeWhatsappMarketing ? ["Scale WhatsApp broadcast lists & automated follow-ups"] : []),
            ],
          },
        ],
        problemSolution: {
          problem: data.problem,
          solution: data.solution,
          strategy: data.strategy,
          execution: data.execution,
          expectedResult: data.expectedResult,
        },
      });

      const inputs = {
        adBudget: Number(data.monthlyBudget) || 0,
        cpc: Number(data.cpc) || 1,
        leadConversionRate: Number(data.leadConversionRate) || 0,
        qualificationRate: Number(data.qualificationRate) || 85,
        salesConversionRate: Number(data.salesConversionRate) || 0,
        avgSellingPrice: Number(data.avgSellingPrice) || Number(data.avgOrderValue) || 0,
        profitMarginPct: Number(data.profitMarginPct) || 0,
        additionalMarketingCost: Number(data.additionalMarketingCost) || 0,
        organicTrafficGrowth: Number(data.organicTrafficGrowth) || 0,
        organicLeadConversionRate: Number(data.organicLeadConversionRate) || 0,
      };
      const tiers = buildScenarioTiers(inputs);
      const scenarioIds: string[] = [];
      for (const tier of tiers) {
        const scenario = await api.post<{ id: string }>("/api/scenarios", {
          leadId,
          name: tier.label,
          tier: tier.tier,
          ...tier.inputs,
        });
        scenarioIds.push(scenario.id);
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, assessmentId: assessment.id, scenarioIds }),
      });
      if (!res.ok) throw new Error("Report generation failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (followUpDate) {
        await api.post(`/api/leads/${leadId}/follow-ups`, { type: "Call", note: "Follow up after sending audit report.", dueDate: followUpDate });
      }

      setPdfUrl(url);
      setPdfFilename(`${data.businessName || "report"}.pdf`);
      setSavedLeadId(leadId!);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5">
      <CardHeader title="Review & Generate" subtitle="Saves the lead, assessment and forecast scenarios, then generates the client-ready PDF." />
      <div className="pt-4 space-y-4">
        <Field label="Schedule a follow-up for" hint="Optional — creates a follow-up reminder on this lead.">
          <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="max-w-xs" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {done ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-600 font-medium">Saved — the client-ready PDF is ready to download.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={downloadPdf}>
                <Download size={16} /> Download PDF Report
              </Button>
              {savedLeadId && (
                <LinkButton href={`/leads/${savedLeadId}`} variant="secondary">
                  Go to Lead →
                </LinkButton>
              )}
            </div>
          </div>
        ) : (
          <Button onClick={saveAndGenerate} disabled={saving || !data.customerName || !data.businessName}>
            {saving ? "Generating…" : "Save & Generate PDF Report"}
          </Button>
        )}
        {(!data.customerName || !data.businessName) && (
          <p className="text-xs text-amber-600">Business name (Business Details step) and customer name (Customer step) are required.</p>
        )}
      </div>
    </Card>
  );
}
