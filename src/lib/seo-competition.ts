// Real-data-backed proxy for how competitive it is to rank organically in a
// given business vertical, plus a sourced timeline for what a brand-new
// website (0 baseline organic traffic) can realistically expect in its
// first year. Used by the Organic (SEO) Forecast card on the Forecast step
// (src/app/assessment/new/page.tsx) for the case the %-growth-on-existing-
// traffic model in calculations.ts can't handle: 0 x anything is still 0.
//
// --- Competition tier ---
// There is no credible, citable "SEO competition by industry" dataset the
// way there is for CPC-by-industry (which major ad platforms publish).
// What IS real and already seeded in this app is Google Ads / Microsoft Ads
// CPC-by-industry data (data/benchmarks/google_ads.json,
// microsoft_ads.json — Google Ads sourced from WordStream's published
// report; Microsoft Ads modeled from that same data, per the methodology
// documented in that file). Advertisers bidding more per click and organic-
// ranking difficulty are correlated — both driven by how many businesses
// are fighting for the same customer intent — even though they aren't the
// same metric, so this reuses that real, already-seeded CPC data as a
// disclosed proxy rather than inventing a new "SEO difficulty" score.
// Google Ads Search CPC is preferred when a real row exists for the
// industry (16 of 34 industries — WordStream's own report doesn't cover
// the rest); Microsoft Ads Search CPC (modeled from Google Ads, covers all
// 34) fills the gap. Terciles are computed live across whatever industries
// have a resolved value, so this stays accurate if benchmark values are
// ever edited from the Benchmarks page.
//
// --- New-site timeline ---
// A brand-new site provably has 0 organic traffic, so there's nothing for
// a %-growth model to multiply. What IS real and citable instead is how
// long a new site typically takes to even get indexed, and how rarely (and
// how slowly) a new domain reaches competitive rankings:
//  - Indexing: Google's own guidance (John Mueller) is "several hours to
//    several weeks" for most content, and independent research (Onely,
//    cited via Search Engine Journal) found ~83% of pages indexed within
//    the first week, some taking up to 8 weeks.
//    https://www.searchenginejournal.com/how-long-before-google-indexes-my-new-page/464309/
//  - Reaching first rankings: Ahrefs' analysis of ~2M URLs with real
//    content found only ~6.11% reach Google's top 10 within 12 months at
//    all, and recommends revisiting content strategy if it's not ranking
//    by ~month 6.
//    https://ahrefs.com/blog/how-long-does-it-take-to-rank-in-google-and-how-old-are-top-ranking-pages/
//  - New-domain competitiveness: SE Ranking's analysis of 100,000 SERPs
//    (147,195 unique ranking domains) found domains under 2 years old
//    appear in only 2.03% of top-10 results, with young domains that do
//    succeed typically targeting lower-difficulty, longer-tail terms first
//    rather than head terms.
//    https://seranking.com/blog/domain-age-ranking-factor/
// These sources describe new sites/pages in general, not broken out by
// competition tier — the tier-based timing shift below is a reasoned,
// disclosed adjustment (a more competitive industry realistically takes
// longer to gain traction), not a separately sourced number per tier.

import type { SiteSignals } from "./competitor-analysis";
import type { SeoCompetitionTier } from "./calculations";

export interface CompetitionTierResult {
  tier: SeoCompetitionTier;
  cpcValue: number;
  source: "Google Ads" | "Microsoft Ads";
  currency: string;
}

interface CpcRow {
  industry: string;
  campaignType?: string | null;
  value: number;
  currency: string;
}

/** Resolves one CPC value per industry: real Google Ads Search CPC when a
 * row exists, else Microsoft Ads Search CPC. */
function resolveCpcByIndustry(
  googleRows: CpcRow[],
  msRows: CpcRow[]
): Record<string, { value: number; source: "Google Ads" | "Microsoft Ads"; currency: string }> {
  const result: Record<string, { value: number; source: "Google Ads" | "Microsoft Ads"; currency: string }> = {};
  for (const row of msRows) {
    if (row.campaignType !== "Search") continue;
    result[row.industry] = { value: row.value, source: "Microsoft Ads", currency: row.currency };
  }
  for (const row of googleRows) {
    if (row.campaignType !== "Search") continue;
    result[row.industry] = { value: row.value, source: "Google Ads", currency: row.currency }; // Google Ads preferred, overwrites
  }
  return result;
}

/** Computes a Low/Medium/High competition tier per industry using live
 * terciles across whatever industries have a resolved CPC value — never a
 * hardcoded cutoff, so this stays correct if benchmark values change. */
export function deriveCompetitionTiers(googleRows: CpcRow[], msRows: CpcRow[]): Record<string, CompetitionTierResult> {
  const resolved = resolveCpcByIndustry(googleRows, msRows);
  const values = Object.values(resolved)
    .map((r) => r.value)
    .sort((a, b) => a - b);
  if (values.length === 0) return {};
  const lowCut = values[Math.floor(values.length / 3)];
  const highCut = values[Math.floor((values.length * 2) / 3)];
  const out: Record<string, CompetitionTierResult> = {};
  for (const [industry, r] of Object.entries(resolved)) {
    const tier: SeoCompetitionTier = r.value <= lowCut ? "Low" : r.value <= highCut ? "Medium" : "High";
    out[industry] = { tier, cpcValue: r.value, source: r.source, currency: r.currency };
  }
  return out;
}

export interface NewSiteTimelinePhase {
  phase: string;
  timeframe: string;
  description: string;
}

const BASE_TIMELINE: NewSiteTimelinePhase[] = [
  {
    phase: "Indexing",
    timeframe: "Weeks 1–8",
    description:
      "Google discovers and indexes the site (assuming a sitemap is submitted and there are no technical blockers). Most sites are indexed within the first week; some take up to ~8 weeks.",
  },
  {
    phase: "Early Signals",
    timeframe: "Months 2–4",
    description:
      "The site starts appearing for branded and very specific long-tail searches. Traffic is still close to zero — that's normal at this stage, not a sign anything is wrong.",
  },
  {
    phase: "Initial Rankings",
    timeframe: "Months 4–9",
    description:
      "First non-branded rankings appear, mostly for lower-competition, longer-tail terms. A brand-new domain rarely competes for head terms this early — that's expected, not a shortfall.",
  },
  {
    phase: "Compounding Growth",
    timeframe: "Months 9–12+",
    description:
      "Traffic starts compounding as rankings and backlinks accumulate. Once there's a real baseline — even a small one — the % growth model above becomes the right tool going forward, and year 2 is typically where organic growth accelerates most.",
  },
];

// Low-competition industries typically gain traction faster; high-
// competition industries typically take longer. The Indexing phase is
// unaffected — that's a Google mechanic, not a competition effect.
const TIER_SHIFT_MONTHS: Record<SeoCompetitionTier, number> = {
  Low: -2,
  Medium: 0,
  High: 3,
};

function shiftTimeframe(timeframe: string, shiftMonths: number): string {
  if (shiftMonths === 0 || timeframe.startsWith("Weeks")) return timeframe;
  const nums = timeframe.match(/\d+/g)?.map(Number);
  if (!nums) return timeframe;
  const shifted = nums.map((n) => Math.max(1, n + shiftMonths));
  if (timeframe.includes("+")) return `Months ${shifted[0]}+`;
  if (shifted.length === 2) return `Months ${shifted[0]}–${shifted[1]}`;
  return `Month ${shifted[0]}`;
}

/** The new-site timeline, adjusted for how competitive the industry is —
 * see module comment. Pass `null` for the "no vertical selected yet" case,
 * which returns the unshifted (Medium) baseline. */
export function getNewSiteTimeline(tier: SeoCompetitionTier | null): NewSiteTimelinePhase[] {
  const shift = tier ? TIER_SHIFT_MONTHS[tier] : 0;
  return BASE_TIMELINE.map((p) => ({ ...p, timeframe: shiftTimeframe(p.timeframe, shift) }));
}

export interface CompetitorContentSignal {
  level: "lighter than typical" | "typical" | "heavier than typical";
  avgWordCount: number;
  blogShare: number; // 0-1
  reachableCount: number;
}

/** Reads the SAME live competitor site data already fetched on the
 * Competitor step (src/lib/competitor-analysis.ts) — never a second,
 * separately fabricated signal — and summarizes it as a qualitative
 * content-investment note alongside the new-site timeline. Returns null
 * when no competitor site was successfully fetched (nothing real to
 * report), rather than guessing. */
export function getCompetitorContentSignal(sites: SiteSignals[]): CompetitorContentSignal | null {
  const reachable = sites.filter((s) => s.fetchedOk);
  if (reachable.length === 0) return null;
  const avgWordCount = Math.round(reachable.reduce((sum, s) => sum + s.wordCount, 0) / reachable.length);
  const blogShare = reachable.filter((s) => s.hasBlog).length / reachable.length;
  // Thresholds are a reasoned read of these two real, live-fetched signals
  // (word count + active blog presence) — not a separately sourced metric.
  let level: CompetitorContentSignal["level"] = "typical";
  if (avgWordCount >= 1500 || blogShare >= 0.6) level = "heavier than typical";
  else if (avgWordCount < 500 && blogShare < 0.2) level = "lighter than typical";
  return { level, avgWordCount, blogShare, reachableCount: reachable.length };
}
