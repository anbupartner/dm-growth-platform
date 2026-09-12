// Centralized marketing forecast calculation engine.
// Every formula here mirrors the spec (sections 12–17) exactly. Nothing in
// the UI should compute these numbers itself — always call through here so
// the math stays in one place and benchmark changes never require touching
// the frontend.

export interface ForecastInputs {
  adBudget: number;
  cpc: number;
  leadConversionRate: number; // % — traffic -> leads
  qualificationRate: number; // % — default 85
  salesConversionRate: number; // % — qualified leads -> customers
  avgSellingPrice: number;
  profitMarginPct: number; // %
  additionalMarketingCost: number;
  // Organic (kept separate from paid per spec section 13)
  currentOrganicTraffic?: number;
  organicTrafficGrowth?: number; // % growth applied to currentOrganicTraffic
  organicLeadConversionRate?: number; // % — organic traffic -> organic leads
}

export interface PaidForecastResults {
  clicks: number; // = traffic
  traffic: number;
  leads: number;
  qualifiedLeads: number;
  customers: number;
  revenue: number;
  cpl: number;
  cac: number;
  roas: number; // multiplier, e.g. 2.92 -> display "2.92X"
  grossProfit: number;
  totalMarketingCost: number;
  netMarketingProfit: number;
  roi: number; // percentage
}

export interface OrganicForecastResults {
  organicTraffic: number;
  organicLeads: number;
}

export interface ForecastResults {
  paid: PaidForecastResults;
  organic: OrganicForecastResults;
  totalEstimatedTraffic: number; // paid.traffic + organic.organicTraffic, clearly labeled combined metric
  totalEstimatedLeads: number; // paid.leads + organic.organicLeads
}

function safeDiv(numerator: number, denominator: number): number {
  if (!denominator || Number.isNaN(denominator)) return 0;
  return numerator / denominator;
}

/** 12.1–12.12 — paid forecast */
export function calculatePaidForecast(inputs: ForecastInputs): PaidForecastResults {
  const traffic = safeDiv(inputs.adBudget, inputs.cpc); // 12.1 Traffic = Ad Spend / Avg CPC
  const leads = traffic * (inputs.leadConversionRate / 100); // 12.2 Leads = Traffic x Lead Conversion Rate
  const qualifiedLeads = leads * (inputs.qualificationRate / 100); // 12.3 Qualified Leads = Total Leads x Qualification Rate
  const customers = qualifiedLeads * (inputs.salesConversionRate / 100); // 12.4 Customers = Qualified Leads x Sales Conversion Rate
  const revenue = customers * inputs.avgSellingPrice; // 12.5 Revenue = Customers x Avg Selling Price
  const cpl = safeDiv(inputs.adBudget, leads); // 12.6 CPL = Ad Spend / Leads
  const cac = safeDiv(inputs.adBudget, customers); // 12.7 CAC = Ad Spend / Customers
  const roas = safeDiv(revenue, inputs.adBudget); // 12.8 ROAS = Revenue / Ad Spend (never %)
  const grossProfit = revenue * (inputs.profitMarginPct / 100); // 12.9 Gross Profit = Revenue x Profit Margin
  const totalMarketingCost = inputs.adBudget + inputs.additionalMarketingCost; // 12.10
  const netMarketingProfit = grossProfit - totalMarketingCost; // 12.11
  const roi = safeDiv(netMarketingProfit, totalMarketingCost) * 100; // 12.12 ROI = (GP - TMC) / TMC x 100

  return {
    clicks: traffic,
    traffic,
    leads,
    qualifiedLeads,
    customers,
    revenue,
    cpl,
    cac,
    roas,
    grossProfit,
    totalMarketingCost,
    netMarketingProfit,
    roi,
  };
}

/** Organic forecast, kept separate from paid (spec section 13) */
export function calculateOrganicForecast(inputs: ForecastInputs): OrganicForecastResults {
  const base = inputs.currentOrganicTraffic ?? 0;
  const growth = inputs.organicTrafficGrowth ?? 0;
  const organicTraffic = base * (1 + growth / 100);
  const organicLeads = organicTraffic * ((inputs.organicLeadConversionRate ?? 0) / 100);
  return { organicTraffic, organicLeads };
}

export function calculateForecast(inputs: ForecastInputs): ForecastResults {
  const paid = calculatePaidForecast(inputs);
  const organic = calculateOrganicForecast(inputs);
  return {
    paid,
    organic,
    totalEstimatedTraffic: paid.traffic + organic.organicTraffic,
    totalEstimatedLeads: paid.leads + organic.organicLeads,
  };
}

// --- Scenario tiers (section 14) -------------------------------------------
// Conservative / Expected / Growth Opportunity — defensible, clearly labeled
// deltas on the *Expected* (as-entered) assumptions. Never inflates blindly;
// each tier's assumption changes are returned alongside the results so the
// UI/PDF can show exactly what changed and why.
//
// Every tier also nudges Avg. CPC (paid traffic efficiency), not just the
// downstream conversion rates. Traffic = Ad Spend / CPC (12.1), so leaving
// CPC identical across all three tiers made "Traffic / Clicks" render as the
// exact same number in Conservative/Expected/Growth Opportunity, which read
// as a bug even though the funnel below it correctly diverged — and it
// undersold the Growth Opportunity case, since the same "improved targeting,
// landing pages, creative, offer and campaign optimisation" that justifies a
// higher conversion rate also typically buys cheaper, more relevant clicks
// (a better Quality/Relevance Score), not just a better close rate. A ±10%
// CPC swing is used — smaller than the ±15-20% swing on conversion rates,
// since CPC is a paid-media market price the consultant has less unilateral
// control over than their own funnel.
const CPC_CONSERVATIVE_MULTIPLIER = 1.1; // pay more per click -> less traffic for the same budget
const CPC_GROWTH_MULTIPLIER = 0.9; // cheaper clicks from optimisation -> more traffic for the same budget

export interface ScenarioTierDefinition {
  tier: "CONSERVATIVE" | "EXPECTED" | "GROWTH_OPPORTUNITY";
  label: string;
  assumptionNote: string;
  inputs: ForecastInputs;
  results: ForecastResults;
  organicMonthly: OrganicMonthlyPoint[];
}

export function buildScenarioTiers(expected: ForecastInputs, competitionTier: SeoCompetitionTier = "Medium"): ScenarioTierDefinition[] {
  const conservativeInputs: ForecastInputs = {
    ...expected,
    cpc: expected.cpc * CPC_CONSERVATIVE_MULTIPLIER,
    leadConversionRate: expected.leadConversionRate * 0.8,
    salesConversionRate: expected.salesConversionRate * 0.85,
    organicTrafficGrowth: (expected.organicTrafficGrowth ?? 0) * 0.5,
  };

  const growthInputs: ForecastInputs = {
    ...expected,
    cpc: expected.cpc * CPC_GROWTH_MULTIPLIER,
    leadConversionRate: expected.leadConversionRate * 1.2,
    salesConversionRate: expected.salesConversionRate * 1.15,
    organicTrafficGrowth: (expected.organicTrafficGrowth ?? 0) * 1.5,
  };

  return [
    {
      tier: "CONSERVATIVE",
      label: "Conservative",
      assumptionNote:
        "Cautious assumptions: avg. CPC +10% (paying more per click, so less traffic for the same budget), lead conversion −20%, sales conversion −15%, organic growth halved vs. Expected.",
      inputs: conservativeInputs,
      results: calculateForecast(conservativeInputs),
      organicMonthly: calculateOrganicForecastMonthly(conservativeInputs, competitionTier),
    },
    {
      tier: "EXPECTED",
      label: "Expected",
      assumptionNote: "Most realistic assumptions, as entered.",
      inputs: expected,
      results: calculateForecast(expected),
      organicMonthly: calculateOrganicForecastMonthly(expected, competitionTier),
    },
    {
      tier: "GROWTH_OPPORTUNITY",
      label: "Growth Opportunity",
      assumptionNote:
        "Optimistic but defensible: avg. CPC −10% (cheaper, more relevant clicks from better targeting), lead conversion +20%, sales conversion +15%, organic growth x1.5 — reflecting improved targeting, landing pages, creative, offer and campaign optimisation.",
      inputs: growthInputs,
      results: calculateForecast(growthInputs),
      organicMonthly: calculateOrganicForecastMonthly(growthInputs, competitionTier),
    },
  ];
}

// --- Organic (SEO) 12-month monthly growth curve ---------------------------
// Real, sourced research on how organic SEO traffic actually grows over
// time, rather than a linear/guessed ramp: Neil Patel's analysis of 42,391
// websites found +11.4% organic traffic growth in months 0-6 of active SEO
// work, and a further +9.5% in months 7-12
// (https://neilpatel.com/marketing-stats/average-seo-traffic-growth-over-time/)
// — a widening-then-continuing compounding pattern, not a flat ramp. That
// 6-month split (54.5% of a year's growth realized by month 6, the
// remaining 45.5% by month 12) sets this curve's two halves.
//
// The month-by-month shape *within* each half is a reasoned, disclosed
// distribution (the study doesn't break results out by individual month) —
// front-loaded to the back of each half, reflecting the widely-documented
// indexing/crawling and authority-building lag behind any SEO change
// (Google's own guidance is that SEO work typically takes 4 months to a
// year to show its full impact). This also matches the pattern found in
// Portent's separate 200-client study, where combined on-site + off-site
// SEO work produced the most consistent, compounding gains over time — as
// opposed to on-site-only work's fast initial rise and fast drop-off
// (https://portent.com/blog/analytics/seo-statistics-predicting-traffic-growth-over-time.htm).
//
// ORGANIC_MONTHLY_GROWTH_CURVE[i] is the cumulative fraction (0-1) of a
// full year's targeted growth % realized by the end of month i+1 (index 0
// = month 1 ... index 11 = month 12, always ending at 1.0). Applied to
// whatever total 12-month growth % the consultant enters/accepts (the same
// "Organic Traffic Growth %" field already on the Forecast step) — never a
// fabricated month-by-month number of its own, only this real, sourced
// shape distributing a consultant-set (or benchmark-suggested) total.
export const ORGANIC_MONTHLY_GROWTH_CURVE: number[] = [
  0.033, 0.087, 0.164, 0.262, 0.393, 0.545, // months 1-6 -> 54.5% of year total (Neil Patel's 0-6mo figure)
  0.604, 0.668, 0.741, 0.823, 0.909, 1.0, // months 7-12 -> the remaining 45.5% (Neil Patel's 7-12mo figure)
];

// How competitive it is to rank organically in a business's industry — see
// src/lib/seo-competition.ts for the full derivation (a disclosed proxy
// built from real, already-seeded Google Ads / Microsoft Ads CPC-by-
// industry benchmark data). "Medium" is the sourced default — the curve
// above (ORGANIC_MONTHLY_GROWTH_CURVE) applies unmodified for it.
export type SeoCompetitionTier = "Low" | "Medium" | "High";

// Tier-adjusted variants of the sourced H1/H2 growth curve above. These
// shift *when within the year* growth arrives — front-loaded for lower-
// competition industries (faster to gain traction, so more of the year's
// growth lands early), back-loaded for higher-competition industries
// (slower to gain traction, so more lands late) — a reasoned, disclosed
// adjustment on top of the real sourced Medium-tier baseline, not a
// separately sourced curve per tier. The TOTAL growth by month 12 is
// unchanged in every variant (all three end at 1.0) — only the month-by-
// month path there differs.
const ORGANIC_MONTHLY_GROWTH_CURVE_LOW: number[] = [
  0.06, 0.14, 0.24, 0.37, 0.52, 0.65, 0.72, 0.79, 0.85, 0.91, 0.96, 1.0,
];
const ORGANIC_MONTHLY_GROWTH_CURVE_HIGH: number[] = [
  0.015, 0.04, 0.08, 0.14, 0.22, 0.32, 0.42, 0.53, 0.64, 0.76, 0.88, 1.0,
];

function organicCurveForTier(tier: SeoCompetitionTier): number[] {
  if (tier === "Low") return ORGANIC_MONTHLY_GROWTH_CURVE_LOW;
  if (tier === "High") return ORGANIC_MONTHLY_GROWTH_CURVE_HIGH;
  return ORGANIC_MONTHLY_GROWTH_CURVE;
}

export interface OrganicMonthlyPoint {
  month: number; // 1-12
  traffic: number;
  leads: number;
  growthPct: number; // cumulative % growth vs. the baseline, as of this month
}

/**
 * 12-month organic (SEO) traffic & lead projection, distributing the total
 * `organicTrafficGrowth` % (the same value already collected on the
 * Forecast step — cumulative growth target by month 12) across the year via
 * ORGANIC_MONTHLY_GROWTH_CURVE above. Returns an empty array when there's no
 * baseline traffic to project from (nothing meaningful to show — a % of
 * zero is still zero, and this app never fills that gap with a fabricated
 * number).
 */
export function calculateOrganicForecastMonthly(
  inputs: ForecastInputs,
  competitionTier: SeoCompetitionTier = "Medium"
): OrganicMonthlyPoint[] {
  const base = inputs.currentOrganicTraffic ?? 0;
  if (base <= 0) return [];
  const totalGrowth = inputs.organicTrafficGrowth ?? 0;
  const leadRate = (inputs.organicLeadConversionRate ?? 0) / 100;
  return organicCurveForTier(competitionTier).map((cumulativeFraction, i) => {
    const growthPct = totalGrowth * cumulativeFraction;
    const traffic = base * (1 + growthPct / 100);
    return {
      month: i + 1,
      traffic,
      leads: traffic * leadRate,
      growthPct,
    };
  });
}

// --- Benchmark priority resolution (section 42) -----------------------------
// 1. Client Historical Data  2. Consultant Custom Assumption
// 3. Current Industry Benchmark  4. Generic Fallback Benchmark

export interface BenchmarkRow {
  platform: string;
  industry: string;
  metric: string;
  campaignType?: string | null;
  value: number;
  unit: string;
  currency: string;
  region: string;
  source?: string | null;
}

export interface ResolvedMetric {
  value: number | null;
  source: string;
  priorityLevel: 1 | 2 | 3 | 4;
}

export function resolveBenchmarkMetric(params: {
  clientHistoricalValue?: number | null;
  consultantAssumption?: number | null;
  industryBenchmarks: BenchmarkRow[]; // pre-filtered to platform+industry+metric(+campaignType)
  genericFallback?: number | null;
  genericFallbackLabel?: string;
}): ResolvedMetric {
  const { clientHistoricalValue, consultantAssumption, industryBenchmarks, genericFallback, genericFallbackLabel } =
    params;

  if (clientHistoricalValue != null && !Number.isNaN(clientHistoricalValue)) {
    return { value: clientHistoricalValue, source: "Client Historical Data", priorityLevel: 1 };
  }
  if (consultantAssumption != null && !Number.isNaN(consultantAssumption)) {
    return { value: consultantAssumption, source: "Consultant Custom Assumption", priorityLevel: 2 };
  }
  if (industryBenchmarks.length > 0) {
    const match = industryBenchmarks[0];
    return {
      value: match.value,
      source: `Industry Benchmark — ${match.platform} ${match.industry}${match.campaignType ? " " + match.campaignType : ""}`,
      priorityLevel: 3,
    };
  }
  if (genericFallback != null) {
    return { value: genericFallback, source: genericFallbackLabel ?? "Generic Fallback Benchmark", priorityLevel: 4 };
  }
  return { value: null, source: "Data unavailable – requires external tool/account access.", priorityLevel: 4 };
}

// --- Formatting helpers ------------------------------------------------------

// Only currencies whose real symbol is safely renderable in the PDF's
// built-in Helvetica font (WinAnsi encoding — effectively just $ £ ¥ € and
// plain Latin letters) get a bare symbol here. Everything else — including
// INR, since ₹ (U+20B9) is outside WinAnsi and would not render correctly in
// the generated PDF — falls back to the ISO code prefix below (e.g.
// "INR 50,000"), which is always correct and unambiguous.
export function formatCurrency(value: number, currency = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    JPY: "¥",
    CNY: "CN¥",
    CAD: "C$",
    AUD: "A$",
    NZD: "NZ$",
    SGD: "S$",
    HKD: "HK$",
    MXN: "MX$",
    BRL: "R$",
    ZAR: "R ",
    AED: "AED ",
    SAR: "SAR ",
    QAR: "QAR ",
    KWD: "KWD ",
    BHD: "BHD ",
    OMR: "OMR ",
  };
  const symbol = symbols[currency] ?? currency + " ";
  return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// On-screen-only symbol overrides for currencies whose real symbol isn't
// safe inside a generated PDF (see the WinAnsi note above) but renders
// perfectly fine in a browser via any standard system/web font. Kept
// separate from formatCurrency's symbol table on purpose — never import
// this into a src/lib/pdf/*.tsx Document component, only into screen
// (src/app/**, src/components/**) code.
const DISPLAY_ONLY_SYMBOLS: Record<string, string> = {
  INR: "₹",
};

export function formatCurrencyDisplay(value: number, currency = "USD"): string {
  const symbol = DISPLAY_ONLY_SYMBOLS[currency];
  if (symbol) return `${symbol}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return formatCurrency(value, currency);
}

export function formatRoas(value: number): string {
  return `${value.toFixed(2)}X`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
