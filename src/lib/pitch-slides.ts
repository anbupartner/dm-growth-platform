import type { ReportData, ReportAuditScores, ReportCompetitorSite } from "@/lib/pdf/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";

// A client-facing slide deck built from the same ReportData used for the
// full PDF report — this is the app's "Master Client Presentation Template"
// (see the DM Consultant project doc of the same name): a fixed 12-slide
// skeleton, fixed visual identity (charcoal + professional green, Cambria/
// Calibri, a feather-icon-in-a-circle motif, a dark/light "sandwich" with a
// dark opening and closing slide), applied identically to every client deck
// so two different clients' decks are immediately recognizable as coming
// from the same agency. Content is the only thing that changes per client.
//
// Every value shown here is read directly from ReportData — nothing is
// invented, estimated, or picked "on Claude's behalf" beyond straightforward
// truncation/condensing and light framework scaffolding that's the same on
// every deck regardless of client (e.g. the generic "Search -> Website ->
// Trust -> Enquiry -> Follow-Up -> Sale" funnel row, or the standard 5-stage
// methodology labels) — never a claim about this specific client that the
// report doesn't support. A slide slot is simply omitted when the report
// doesn't have real data for it (see the master template's own "flex" rule:
// condense, never invent, never exceed 12 slides).

export interface TextSection {
  label: string;
  text: string;
}

// The fixed set of motif icons this deck can use — each one exists as a
// pre-rendered PNG (public/pitch-icons/<key>-<color>.png, built once from
// react-icons/fi via the same render-icons.js used to establish the master
// template) for the .pptx export, and maps to a lucide-react component with
// the same silhouette for the on-screen preview, so both surfaces show the
// same icon for the same content.
export type IconKey =
  | "target"
  | "zap"
  | "trending-up"
  | "compass"
  | "search"
  | "message-circle"
  | "image"
  | "file-text"
  | "shield"
  | "map-pin"
  | "star"
  | "phone"
  | "message-square"
  | "thumbs-up"
  | "users"
  | "monitor"
  | "award"
  | "layers"
  | "send"
  | "link"
  | "globe"
  | "check-circle"
  | "activity"
  | "calendar"
  | "clock"
  | "repeat"
  | "dollar-sign"
  | "pie-chart"
  | "bar-chart"
  | "arrow-right"
  | "arrow-down";

export interface DeckCard {
  n: string;
  icon: IconKey;
  head: string;
  body: string;
}

export interface CompetitorCol {
  name: string;
  host: string;
  featured: boolean;
  reachable: boolean;
  wordCount: string;
  blog: string;
  schema: string;
  mobile: string;
  https: string;
  speed: string;
}

export type MasterSlide =
  | { kind: "opening"; businessName: string; customerName: string; companyName: string; generatedDate: string }
  | { kind: "execInsight"; cards: DeckCard[] }
  | { kind: "digitalHealth"; overall: number; scores: { label: string; value: number }[]; note: string }
  | { kind: "businessProblem"; stages: string[]; columns: { icon: IconKey; head: string; body: string }[] }
  | { kind: "discovered"; cards: { icon: IconKey; head: string; finding: string; opportunity: string }[] }
  | { kind: "customerInsight"; profile: TextSection[]; journey: { icon: IconKey; text: string }[] }
  | { kind: "competitor"; sites: CompetitorCol[]; insights: string[] }
  | { kind: "strategicApproach"; stages: { icon: IconKey; head: string; items: string[] }[] }
  | {
      kind: "channelInvestment";
      channels: { icon: IconKey; head: string; pct: number; amount: string | null; body: string }[];
      totalLabel: string | null;
    }
  | { kind: "actionPlan"; phases: { tag: string; head: string; icon: IconKey; items: string[] }[] }
  | {
      kind: "outcomes";
      currency: string;
      scenarios: { label: string; customers: number; roas: number; leads: number; roi: number; featured: boolean }[];
      kpis: string[];
      disclaimer: string;
    }
  | {
      kind: "closing";
      businessName: string;
      steps: { n: string; head: string; body: string }[];
      blurb: string;
      contacts: { icon: IconKey; text: string }[];
      closingLine: string;
      companyName: string;
      consultantName: string;
    };

// Canonical scenario display order — mirrors the tierOrder used in
// ReportDocument.tsx (PDF) and the proposal builder, so every place the app
// shows scenarios side by side reads the same "conservative to growth" story
// left to right.
const SCENARIO_TIER_ORDER = ["conservative", "expected", "growth opportunity"];

const SCORE_LABELS: Record<keyof Omit<ReportAuditScores, "overall">, string> = {
  technicalSeo: "Technical SEO",
  onPageSeo: "On-Page SEO",
  content: "Content",
  uxConversion: "UX & Conversion",
  branding: "Branding",
  localSeo: "Local SEO",
  performance: "Performance",
};

const GENERIC_JOURNEY_STEPS: { icon: IconKey; text: string }[] = [
  { icon: "search", text: "Discovery — search, maps & social" },
  { icon: "star", text: "Reviews & trust signals" },
  { icon: "phone", text: "First contact — website, call or chat" },
  { icon: "message-circle", text: "Enquiry & follow-up" },
  { icon: "thumbs-up", text: "Purchase & referral" },
];

const STRATEGIC_STAGES: { icon: IconKey; head: string; items: string[] }[] = [
  { icon: "search", head: "Visibility", items: ["SEO", "Search Presence", "Directory & Profile Listings"] },
  { icon: "target", head: "Traffic", items: ["Paid Search", "Social & Display", "Retargeting"] },
  { icon: "zap", head: "Conversion", items: ["Website & Landing Pages", "Calls & Enquiries", "WhatsApp / Chat"] },
  { icon: "message-circle", head: "Follow-Up", items: ["Lead Management", "Remarketing", "Communication Cadence"] },
  { icon: "award", head: "Growth", items: ["Qualified Leads", "Customers", "Reviews & Referrals"] },
];

const PHASE_ICONS: IconKey[] = ["layers", "trending-up", "award"];

const KPI_PILLS = [
  "Organic Visibility",
  "Search Rankings",
  "Website Traffic",
  "Qualified Leads",
  "Cost Per Lead",
  "Conversion Rate",
  "ROAS",
  "Revenue Opportunities",
];

export function buildPitchSlides(data: ReportData): MasterSlide[] {
  const slides: MasterSlide[] = [];

  // Slide 1 — Opening (always present, dark bg).
  slides.push({
    kind: "opening",
    businessName: data.business.businessName,
    customerName: data.business.customerName,
    companyName: data.consultant.companyName,
    generatedDate: data.generatedDate,
  });

  // Slide 2 — Executive Insight: up to 4 cards, one per real piece of
  // executive-summary content. A card is only shown when the report actually
  // has text for it.
  {
    const candidates: { icon: IconKey; head: string; body: string }[] = [];
    if (data.executiveSummary.currentSituation) {
      candidates.push({ icon: "target", head: "Current Position", body: data.executiveSummary.currentSituation });
    }
    if (data.executiveSummary.problems.length > 0) {
      candidates.push({ icon: "zap", head: "Key Challenge", body: data.executiveSummary.problems[0] });
    }
    if (data.executiveSummary.biggestOpportunity) {
      candidates.push({ icon: "trending-up", head: "Growth Opportunity", body: data.executiveSummary.biggestOpportunity });
    }
    if (data.executiveSummary.recommendedDirection) {
      candidates.push({ icon: "compass", head: "Our Direction", body: data.executiveSummary.recommendedDirection });
    }
    if (candidates.length > 0) {
      slides.push({
        kind: "execInsight",
        cards: candidates.map((c, i) => ({ ...c, n: String(i + 1).padStart(2, "0") })),
      });
    }
  }

  // Slide 3 — Digital Health Today: only for has-website reports with real
  // computed audit scores.
  if (data.auditScores) {
    const s = data.auditScores;
    slides.push({
      kind: "digitalHealth",
      overall: s.overall,
      scores: (Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>).map((key) => ({
        label: SCORE_LABELS[key],
        value: s[key],
      })),
      note:
        s.overall >= 70
          ? "A strong foundation — now we turn it into a stronger growth engine."
          : s.overall >= 40
            ? "The foundation exists. Now we need to turn it into a stronger growth engine."
            : "The biggest gains here will come from fixing the foundation first.",
    });
  }

  // Slide 4 — The Business Problem: a fixed generic funnel row (framework,
  // not a client-specific claim) plus up to 3 real opportunity columns —
  // preferring the audit's own traffic/branding/reach breakdown when
  // present, since that's the closest real 3-way split the data has.
  {
    const gr = data.websiteRecommendations.growthRecommendations;
    let columns: { icon: IconKey; head: string; body: string }[] = [];
    if (gr && (gr.traffic.length || gr.branding.length || gr.reach.length)) {
      if (gr.traffic.length) columns.push({ icon: "search", head: "Traffic", body: gr.traffic.slice(0, 2).join(" ") });
      if (gr.branding.length) columns.push({ icon: "star", head: "Branding", body: gr.branding.slice(0, 2).join(" ") });
      if (gr.reach.length) columns.push({ icon: "globe", head: "Reach", body: gr.reach.slice(0, 2).join(" ") });
    } else if (data.websiteRecommendations.topProblems.length > 0) {
      columns = data.websiteRecommendations.topProblems.slice(0, 3).map((p, i) => ({
        icon: (["zap", "shield", "message-circle"] as IconKey[])[i % 3],
        head: `Issue ${i + 1}`,
        body: p,
      }));
    } else if (data.executiveSummary.problems.length > 0) {
      columns = data.executiveSummary.problems.slice(0, 3).map((p, i) => ({
        icon: (["zap", "shield", "message-circle"] as IconKey[])[i % 3],
        head: `Issue ${i + 1}`,
        body: p,
      }));
    }
    if (columns.length > 0) {
      slides.push({ kind: "businessProblem", stages: ["Search", "Website", "Trust", "Enquiry", "Follow-Up", "Sale"], columns });
    }
  }

  // Slide 5 — What We Discovered: real Finding -> Opportunity pairs, capped
  // at 4 for a clean 2x2 grid. Opportunity is left blank rather than
  // fabricated when there's no matching real recommendation at that index.
  {
    const findings = data.websiteRecommendations.topProblems.length > 0
      ? data.websiteRecommendations.topProblems
      : data.executiveSummary.problems;
    if (findings.length > 0) {
      const improvements = data.websiteRecommendations.recommendedImprovements;
      const icons: IconKey[] = ["zap", "image", "file-text", "shield"];
      slides.push({
        kind: "discovered",
        cards: findings.slice(0, 4).map((f, i) => ({
          icon: icons[i % icons.length],
          head: `Finding ${i + 1}`,
          finding: f,
          opportunity: improvements[i] ?? "",
        })),
      });
    }
  }

  // Slide 6 — Customer & Market Insight: real target-audience profile (split
  // into labeled sections when the text already reads that way) beside a
  // fixed generic customer-journey funnel — same framework role as slide 4's
  // stage row, not a client-specific claim.
  if (data.audiencePlatform.targetAudience) {
    const parsed = parseLabeledSections(data.audiencePlatform.targetAudience);
    const profile: TextSection[] = parsed?.sections?.length
      ? parsed.sections
      : [{ label: "Target Audience", text: data.audiencePlatform.targetAudience }];
    slides.push({ kind: "customerInsight", profile, journey: GENERIC_JOURNEY_STEPS });
  }

  // Slide 7 — Competitor / Market Insight: real competitor metrics only.
  // Omitted entirely when the report has no competitor data at all, per the
  // master template's own flex rule — condense rather than invent.
  {
    const cs = data.competitorSites;
    const hasSites = !!(cs && (cs.client || cs.competitors.length > 0));
    if (hasSites || data.competitorInsights.length > 0) {
      const sites: CompetitorCol[] = [];
      if (cs?.client) sites.push(competitorCol(cs.client, data.business.businessName, true));
      (cs?.competitors ?? []).slice(0, 2).forEach((c) => sites.push(competitorCol(c, c.hostname, false)));
      slides.push({ kind: "competitor", sites, insights: data.competitorInsights.slice(0, 3) });
    }
  }

  // Slide 8 — Our Strategic Approach: the agency's standard 5-stage
  // methodology (same on every deck, by design — see master template
  // "cross-client visual consistency"), shown whenever there's an actual
  // strategy to walk through.
  if (
    data.executiveSummary.recommendedDirection ||
    data.audiencePlatform.platforms.length > 0 ||
    data.growthPlan.length > 0
  ) {
    slides.push({ kind: "strategicApproach", stages: STRATEGIC_STAGES });
  }

  // Slide 9 — Channel Strategy & Investment: real platforms with a real,
  // parseable budget split only. Skipped when the report doesn't have a
  // numeric allocation to chart.
  {
    const withPct = data.audiencePlatform.platforms
      .map((p) => ({ p, pct: parsePercent(p.budgetAllocation) }))
      .filter((x): x is { p: (typeof data.audiencePlatform.platforms)[number]; pct: number } => x.pct !== null);
    if (withPct.length >= 2) {
      const expected = data.scenarios.find((s) => s.label.toLowerCase() === "expected") ?? data.scenarios[0];
      slides.push({
        kind: "channelInvestment",
        channels: withPct.slice(0, 4).map(({ p, pct }) => ({
          icon: platformIcon(p.platform),
          head: p.platform,
          pct,
          amount: expected ? formatCurrency((expected.budget * pct) / 100, data.consultant.currency) + "/mo" : null,
          body: p.expectedResult || p.adType,
        })),
        totalLabel: expected ? `${formatCurrency(expected.budget, data.consultant.currency)} / month` : null,
      });
    }
  }

  // Slide 10 — 90-Day Action Plan: the real phased growth plan (or, for
  // no-website reports that never get one, the real strategic/website
  // recommendations that ARE always present) — capped at 3 phases for the
  // fixed 3-column layout.
  {
    const phases = buildPlanPhases(data);
    if (phases.length > 0) slides.push({ kind: "actionPlan", phases });
  }

  // Slide 11 — Expected Outcomes & Success Measurement: real scenario
  // figures only, in the same conservative-to-growth order used everywhere
  // else in the app.
  if (data.scenarios.length > 0) {
    const orderedScenarios = [...data.scenarios].sort((a, b) => {
      const ai = SCENARIO_TIER_ORDER.indexOf(a.label.toLowerCase());
      const bi = SCENARIO_TIER_ORDER.indexOf(b.label.toLowerCase());
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const capped = orderedScenarios.slice(0, 3);
    slides.push({
      kind: "outcomes",
      currency: data.consultant.currency,
      scenarios: capped.map((s) => ({
        label: s.label,
        customers: s.customers,
        roas: s.roas,
        leads: s.leads,
        roi: s.roi,
        featured: s.label.toLowerCase() === "expected",
      })),
      kpis: KPI_PILLS,
      disclaimer:
        data.benchmarkDisclaimer ||
        "Actual results will depend on market demand, competition, media investment, website conversion performance and sales follow-up.",
    });
  }

  // Slide 12 — Closing (always present, dark bg matching slide 1).
  {
    const contacts: { icon: IconKey; text: string }[] = [];
    if (data.consultant.phone) contacts.push({ icon: "phone", text: data.consultant.phone });
    if (data.consultant.whatsapp && data.consultant.whatsapp !== data.consultant.phone)
      contacts.push({ icon: "message-circle", text: data.consultant.whatsapp });
    if (data.consultant.email) contacts.push({ icon: "send", text: data.consultant.email });
    if (data.consultant.website) contacts.push({ icon: "globe", text: data.consultant.website });
    if (data.consultant.linkedin) contacts.push({ icon: "link", text: data.consultant.linkedin });

    slides.push({
      kind: "closing",
      businessName: data.business.businessName,
      steps: [
        { n: "01", head: "Discuss", body: "Business goals, priorities & challenges" },
        { n: "02", head: "Align", body: "Target audience, markets, budget & KPIs" },
        { n: "03", head: "Propose", body: "Complete digital marketing strategy & commercial proposal" },
      ],
      blurb:
        data.executiveSummary.recommendedDirection ||
        "The complete proposal will be prepared based on our discussion, business priorities and agreed objectives.",
      contacts,
      closingLine:
        data.consultant.ctaText ||
        "Our goal is not simply to generate traffic. It is to build a measurable system that creates qualified business opportunities.",
      companyName: data.consultant.companyName,
      consultantName: data.consultant.consultantName,
    });
  }

  return slides;
}

function competitorCol(site: ReportCompetitorSite, displayName: string, featured: boolean): CompetitorCol {
  if (!site.fetchedOk) {
    return {
      name: featured ? "Your Client" : displayName,
      host: site.hostname,
      featured,
      reachable: false,
      wordCount: "—",
      blog: "—",
      schema: "—",
      mobile: "—",
      https: "—",
      speed: "Not reachable",
    };
  }
  return {
    name: featured ? "Your Client" : displayName,
    host: site.hostname,
    featured,
    reachable: true,
    wordCount: `${formatNumber(site.wordCount)} words`,
    blog: site.hasBlog ? "Yes" : "No",
    schema: site.hasSchema ? "Yes" : "No",
    mobile: site.hasViewport ? "Yes" : "No",
    https: site.https ? "Yes" : "No",
    speed: site.responseTimeMs ? `${(site.responseTimeMs / 1000).toFixed(2)}s` : "—",
  };
}

function platformIcon(platform: string): IconKey {
  const p = platform.toLowerCase();
  if (p.includes("whatsapp")) return "message-circle";
  if (p.includes("google") || p.includes("search")) return "search";
  if (p.includes("youtube") || p.includes("video")) return "monitor";
  if (p.includes("linkedin")) return "users";
  if (p.includes("facebook") || p.includes("instagram") || p.includes("social")) return "users";
  if (p.includes("display")) return "monitor";
  return "target";
}

function parsePercent(v?: string): number | null {
  if (!v) return null;
  const m = v.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function buildPlanPhases(data: ReportData): { tag: string; head: string; icon: IconKey; items: string[] }[] {
  const TAGS = ["PHASE 1", "PHASE 2", "PHASE 3"];
  if (data.growthPlan.length > 0) {
    return data.growthPlan.slice(0, 3).map((phase, i) => ({
      tag: TAGS[i] ?? `PHASE ${i + 1}`,
      head: phase.phase.replace(/^\d+[–-]\d+\s*days?\s*[-–]\s*/i, "").trim() || phase.phase,
      icon: PHASE_ICONS[i % PHASE_ICONS.length],
      items: phase.items.slice(0, 4),
    }));
  }
  const fallback =
    data.websiteRecommendations.strategicRecommendations?.length
      ? data.websiteRecommendations.strategicRecommendations
      : data.websiteRecommendations.recommendedImprovements;
  if (fallback?.length) {
    return [{ tag: TAGS[0], head: "Recommended Actions", icon: PHASE_ICONS[0], items: fallback.slice(0, 4) }];
  }
  return [];
}

// Some auto-generated report fields come back as one long paragraph that
// already embeds its own "Label: detail." sub-sections — e.g. a target
// audience description that reads "...Buyer type: X. Demographic: Y.
// Interests & online behaviour: Z...". Detecting that pattern and splitting
// it out turns a dense wall of text into a scannable list — using only text
// that was already there. Nothing is summarized, reworded, or invented; a
// label is only ever text the report itself already wrote right before its
// own colon. Text that doesn't follow this pattern (fewer than 2 matches)
// returns null.
function parseLabeledSections(text: string): { intro: string; sections: TextSection[] } | null {
  if (!text) return null;
  const labelPattern = /(?:^|\.\s+)([A-Z][A-Za-z0-9 /&()'-]{1,40}):\s+/g;
  const matches = [...text.matchAll(labelPattern)];
  if (matches.length < 2) return null;

  const firstIndex = matches[0].index ?? 0;
  const intro = text.slice(0, firstIndex).trim().replace(/\.$/, "");

  const sections: TextSection[] = matches.map((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    return { label: m[1].trim(), text: text.slice(start, end).trim() };
  });

  return { intro, sections };
}

// Re-exported so the modal can format numbers identically to the rest of the
// app without duplicating the currency/percent logic here.
export { formatCurrency, formatNumber, formatPercent };
