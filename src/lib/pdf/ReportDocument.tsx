import { Document, Page, Text, View, StyleSheet, Image, Svg, Circle, G, Path, Font } from "@react-pdf/renderer";
import path from "node:path";
import type { ReportData } from "./types";
import { auditStatusLabel } from "@/lib/constants";
import { formatCurrency, formatNumber } from "@/lib/calculations";

// --- Design system -----------------------------------------------------
// This document follows the same house "Proposal Documentation" structural
// system as ProposalDocument.tsx (Inter typeface, continuous page flow,
// orphan-safe section headings) — applied here per the user's 2026-09-07
// request to bring the audit Report PDF in line with the already-rebuilt
// Proposal PDF. Content, data fields, and every conditional branch are
// unchanged from the prior version; only the visual layer and page-flow
// structure were rebuilt.
//
// Color palette: deliberately its OWN palette, not shared with
// ProposalDocument.tsx (which keeps its green/bronze editorial accent) — per
// a later 2026-09-07 request, this Report PDF's colors were switched to
// match the running website's own brand palette instead: indigo (Tailwind
// indigo-600, the site's primary/logo/active-nav color) as the one accent,
// slate grays (the site's actual neutral scale) in place of the old warm
// neutrals, and amber/red for the same two semantic uses (mid/low audit
// score, problem callouts) the site itself already uses for its
// PROPOSAL_SENT/LOST status badges (see LEAD_STATUS_COLORS in
// src/lib/constants.ts) — so a client comparing the PDF to the dashboard
// sees the same brand, not a different in-house design system.
//
// Font: Inter, the same embedded local .woff files ProposalDocument.tsx
// already registers (full glyph set, not the "latin" subset — see that
// file's own comment on why: the latin subset silently drops ₹/→/★). Both
// documents share one font registration key ("Inter") but @react-pdf's
// Font.register keyed by family name is idempotent per render, so
// registering it again here (rather than importing a shared module) keeps
// this file self-contained the same way ProposalDocument.tsx is.
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), /* turbopackIgnore: true */ "src/lib/pdf/fonts/Inter-Regular.woff"), fontWeight: 400 },
    { src: path.join(process.cwd(), /* turbopackIgnore: true */ "src/lib/pdf/fonts/Inter-SemiBold.woff"), fontWeight: 600 },
    { src: path.join(process.cwd(), /* turbopackIgnore: true */ "src/lib/pdf/fonts/Inter-Bold.woff"), fontWeight: 700 },
  ],
});

// Same reasoning as ProposalDocument.tsx: no auto-hyphenation on narrow
// columns (e.g. table header cells) — a too-narrow column wraps at the next
// space instead of inserting a "-" that was never typed. But a blanket
// "never break a word" rule has its own failure mode: a competitor hostname
// like "competitor-one.example.com" is one unbroken token, and with no
// break point available at all it silently overflows a narrow table column
// and overlaps the next cell instead of wrapping. So instead of treating
// every word as fully atomic, only allow a break immediately after a "."
// or "-" that's already present in the word — that lets long dotted/
// hyphenated tokens (hostnames, URLs) wrap onto multiple lines without ever
// inserting a hyphen that wasn't already there.
Font.registerHyphenationCallback((word) => {
  const parts = word.split(/(?<=[.-])/);
  return parts.length > 0 ? parts : [word];
});

const COLORS = {
  // Slate — the website's own neutral scale (Tailwind slate-*, used for
  // body text/backgrounds/borders across the app's UI) in place of the old
  // warm-neutral ink/surface tones.
  ink: "#0f172a", // slate-900 — headings, primary text
  body: "#334155", // slate-700 — paragraph copy
  sub: "#64748b", // slate-500 — secondary/meta text
  faint: "#94a3b8", // slate-400 — tertiary text — footer, captions
  line: "#e2e8f0", // slate-200 — hairline borders
  white: "#ffffff",
  surface: "#f8fafc", // slate-50 — card/table backgrounds
  surfaceAlt: "#f1f5f9", // slate-100 — alternating row shade

  // Indigo — the website's actual brand color (Tailwind indigo-600: the
  // logo mark, active nav item, and primary links/buttons across the app).
  // The document's one primary accent, replacing the prior green.
  primary: "#4f46e5", // indigo-600
  primaryDark: "#4338ca", // indigo-700
  primarySoft: "#eef2ff", // indigo-50

  // Amber — matches the site's own PROPOSAL_SENT status badge
  // (bg-amber-100 text-amber-700 in LEAD_STATUS_COLORS) — used sparingly
  // as the mid-tier semantic accent (audit score 40-64, "the solution" step).
  accent: "#b45309", // amber-700
  accentSoft: "#fffbeb", // amber-50

  // Red — matches the site's own LOST status badge (bg-red-100 text-red-700
  // in LEAD_STATUS_COLORS). Kept ONLY for audit-status coding (score bars,
  // problem/issue badges) — a real business need for a red/amber/indigo
  // read at a glance, not decoration.
  bad: "#b91c1c", // red-700
  badSoft: "#fef2f2", // red-50
};

const TYPE = {
  coverTitle: 32,
  pageTitle: 21,
  subheading: 13.5,
  body: 10,
  small: 8.5,
  table: 9,
};

const PAGE_PADDING = 54; // ~19mm — matches ProposalDocument.tsx's margin

function scoreColor(score: number) {
  if (score < 40) return COLORS.bad;
  if (score < 65) return COLORS.accent;
  return COLORS.primary;
}

const s = StyleSheet.create({
  page: { padding: PAGE_PADDING, paddingBottom: 46, fontSize: TYPE.body, color: COLORS.body, fontFamily: "Inter", fontWeight: 400 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  headerBrand: { flexDirection: "row", alignItems: "center" },
  headerBrandName: { fontSize: 8.5, fontWeight: 700, color: COLORS.ink, letterSpacing: 0.4, textTransform: "uppercase" },
  headerDivider: { fontSize: 8.5, color: COLORS.faint, marginHorizontal: 6 },
  headerDocLabel: { fontSize: 8.5, color: COLORS.sub, letterSpacing: 0.4, textTransform: "uppercase" },
  headerConsultant: { fontSize: 8, color: COLORS.faint },
  footer: {
    position: "absolute",
    bottom: 22,
    left: PAGE_PADDING,
    right: PAGE_PADDING,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    fontSize: 7.5,
    color: COLORS.faint,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  pageTitleRow: { marginBottom: 18 },
  pageTitle: { fontSize: TYPE.pageTitle, fontWeight: 700, color: COLORS.ink, marginBottom: 3 },
  pageSubtitle: { fontSize: TYPE.small, color: COLORS.sub },

  majorHeadRow: { flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 12 },
  majorHeadNumber: { fontSize: 15, fontWeight: 700, color: COLORS.primary, marginRight: 8 },
  majorHeadTitle: { fontSize: 15, fontWeight: 700, color: COLORS.primary },
  majorHeadRule: { flex: 1, height: 1, backgroundColor: COLORS.line, marginLeft: 10 },
  majorHeadSub: { fontSize: TYPE.small, color: COLORS.sub, marginTop: 2 },

  subSectionLabel: { fontSize: 9.5, fontWeight: 700, color: COLORS.sub, marginTop: 12, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.4 },

  bodyText: { fontSize: TYPE.body, color: COLORS.body, lineHeight: 1.55 },
  bulletRow: { flexDirection: "row", marginBottom: 5, paddingRight: 4 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, marginTop: 5, marginRight: 8 },
  bulletText: { fontSize: TYPE.body, color: COLORS.body, lineHeight: 1.5, flex: 1 },

  // --- Cover page ------------------------------------------------------
  coverEyebrowBlock: { marginBottom: 46 },
  coverEyebrow: { fontSize: 10.5, fontWeight: 700, color: COLORS.primary, letterSpacing: 2.5 },
  coverEyebrow2: { fontSize: 10.5, fontWeight: 700, color: COLORS.ink, letterSpacing: 2.5 },
  coverTitle: { fontSize: TYPE.coverTitle, fontWeight: 700, color: COLORS.ink, marginBottom: 8, maxWidth: 440, lineHeight: 1.15 },
  coverSubtitle: { fontSize: 12.5, color: COLORS.sub, marginBottom: 54 },
  coverRule: { height: 3, width: 46, backgroundColor: COLORS.primary, marginBottom: 54 },
  coverBlocksRow: { flexDirection: "row" },
  coverBlock: { flex: 1, paddingRight: 20 },
  coverBlockLabel: { fontSize: 8, fontWeight: 700, color: COLORS.faint, letterSpacing: 1.4, marginBottom: 7 },
  coverBlockName: { fontSize: 13, fontWeight: 700, color: COLORS.ink, marginBottom: 2 },
  coverBlockSub: { fontSize: 9.5, color: COLORS.sub, marginBottom: 1.5 },
  coverMetaBlock: { position: "absolute", left: PAGE_PADDING, right: PAGE_PADDING, bottom: 64 },
  coverMetaRule: { height: 1, backgroundColor: COLORS.line, marginBottom: 12 },
  coverMeta: { fontSize: 8.5, color: COLORS.faint },

  // --- Hero stat tiles (Executive Summary) ------------------------------
  heroRow: { flexDirection: "row" },
  statTile: { flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12, marginRight: 10, justifyContent: "center" },
  statTileLast: { marginRight: 0 },
  statLabel: { fontSize: 7.5, color: COLORS.sub, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.4 },
  statValue: { fontSize: 18, fontWeight: 700, color: COLORS.ink },
  statSub: { fontSize: 7, color: COLORS.faint, marginTop: 3 },

  // --- Callout cards -----------------------------------------------------
  calloutCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: 8, padding: 13, marginBottom: 12 },
  calloutText: { flex: 1, fontSize: TYPE.body, lineHeight: 1.5, marginLeft: 10, color: COLORS.body },
  calloutLabel: { fontSize: 9.5, fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },

  // --- Problem grid (Executive Summary) ---------------------------------
  problemGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  problemCard: { width: "48.5%", flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.badSoft, borderRadius: 8, padding: 10, marginBottom: 10 },
  problemCardText: { flex: 1, fontSize: TYPE.small, lineHeight: 1.4, marginLeft: 8, color: COLORS.ink },

  // --- Problem -> Solution -> Result steps -------------------------------
  stepCard: { borderRadius: 8, padding: 13 },
  stepHeadRow: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  stepLabel: { fontSize: 11, fontWeight: 700, marginLeft: 9 },
  stepText: { fontSize: TYPE.body, lineHeight: 1.55, color: COLORS.body },
  flowArrowRow: { alignItems: "center", paddingVertical: 4 },
  resultStatsRow: { flexDirection: "row", marginTop: 12 },
  resultStatTile: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, padding: 9, marginRight: 8 },
  resultStatTileLast: { marginRight: 0 },
  resultStatLabel: { fontSize: 7, color: COLORS.sub, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.3 },
  resultStatValue: { fontSize: 13, fontWeight: 700, color: COLORS.primary },

  // --- Simple bordered info card ------------------------------------------
  infoBlockCard: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 13, marginTop: 4, marginBottom: 4 },
  infoBlockTitle: { fontSize: 9.5, fontWeight: 700, color: COLORS.ink, marginBottom: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap" },
  statGridItem: { width: "50%", marginBottom: 8 },
  statGridLabel: { fontSize: TYPE.small, color: COLORS.sub },
  statGridValue: { fontSize: 11, fontWeight: 700, color: COLORS.ink, marginTop: 1 },

  // --- Audit scorecard ----------------------------------------------------
  scoreHeroRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  scoreCategoryRow: { marginBottom: 11 },
  scoreCategoryHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  scoreCategoryLabel: { fontSize: TYPE.body, fontWeight: 700, color: COLORS.ink },
  scoreCategoryValue: { fontSize: TYPE.small, color: COLORS.sub },
  scoreBarTrack: { height: 6, backgroundColor: COLORS.line, borderRadius: 3, marginTop: 3 },
  scoreBarFill: { height: 6, borderRadius: 3 },

  // --- Competitor / findings tables ---------------------------------------
  table: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: "hidden" },
  theadRow: { flexDirection: "row", backgroundColor: COLORS.ink },
  thCell: { width: "8%", padding: 8, fontSize: 8, fontWeight: 700, color: COLORS.white },
  thCellFirst: { width: "26%" },
  thCellLast: { width: "34%" },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.white },
  trAlt: { backgroundColor: COLORS.surface },
  tdCell: { width: "8%", padding: 8, fontSize: TYPE.table, color: COLORS.body },
  tdCellFirst: { width: "26%", fontWeight: 700, color: COLORS.ink },
  tdCellLast: { width: "34%" },

  // --- Metric breakdown table (variable 2-4 columns; every cell's content
  // is space-separated — "INR 84,150", "Qualified Leads" — so, unlike the
  // fixed-column, unspaced-hostname competitor table above, flex-based
  // columns wrap safely here and adapt cleanly to however many scenario
  // columns are present. ---------------------------------------------------
  metricThCell: { flex: 1, padding: 8, fontSize: 8, fontWeight: 700, color: COLORS.white },
  metricThCellFirst: { flex: 1.4 },
  metricTdCell: { flex: 1, padding: 8, fontSize: TYPE.table, color: COLORS.body },
  metricTdCellFirst: { flex: 1.4, fontWeight: 700, color: COLORS.ink },

  // --- Sample ad cards -----------------------------------------------------
  adCard: { width: "48.5%", borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 11, marginBottom: 12 },
  chip: { fontSize: 7.5, fontWeight: 700, color: COLORS.primary, backgroundColor: COLORS.primarySoft, borderRadius: 9, paddingVertical: 3, paddingHorizontal: 7, alignSelf: "flex-start" },

  // --- Ad copy detail blocks -----------------------------------------------
  adCopyCard: { marginBottom: 12, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12 },
  adCopyHead: { fontSize: 10, fontWeight: 700, color: COLORS.primary, marginBottom: 6 },
  adCopyLine: { fontSize: TYPE.small, color: COLORS.body, lineHeight: 1.5, marginBottom: 3 },

  // --- Scenario cards -------------------------------------------------------
  scenarioCardsRow: { flexDirection: "row" },
  scenarioCard: { flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, marginRight: 10, overflow: "hidden" },
  scenarioCardLast: { marginRight: 0 },
  scenarioCardHead: { padding: 10, backgroundColor: COLORS.ink },
  scenarioCardLabel: { fontSize: 9.5, fontWeight: 700, color: COLORS.white, textTransform: "uppercase", letterSpacing: 0.4 },
  scenarioCardBody: { padding: 12 },
  scenarioBigLabel: { fontSize: 7, color: COLORS.sub, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.3 },
  scenarioBigValue: { fontSize: 16, fontWeight: 700, color: COLORS.ink, marginBottom: 8 },
  scenarioSubGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  scenarioSubItem: { width: "50%", marginBottom: 7 },
  scenarioSubLabel: { fontSize: 6.5, color: COLORS.sub },
  scenarioSubValue: { fontSize: 9.5, fontWeight: 700, color: COLORS.ink },

  // --- 90-day growth plan timeline ------------------------------------------
  timelineRow: { flexDirection: "row" },
  timelineCol: { flex: 1, marginRight: 10 },
  timelineColLast: { marginRight: 0 },
  timelineHeadWrap: { alignItems: "center", marginBottom: 9 },
  timelineNumber: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  timelineNumberText: { fontSize: 11, fontWeight: 700, color: COLORS.white },
  timelinePhase: { fontSize: 9, fontWeight: 700, color: COLORS.ink, textAlign: "center" },
  timelineCard: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 10 },
  timelineBulletRow: { flexDirection: "row", marginBottom: 5, alignItems: "flex-start" },
  timelineBulletText: { flex: 1, fontSize: 8, lineHeight: 1.4, color: COLORS.body, marginLeft: 6 },

  // --- Closing / CTA -----------------------------------------------------
  ctaBlock: { alignItems: "center", marginVertical: 16 },
  ctaText: { fontSize: 15, fontWeight: 700, color: COLORS.ink, textAlign: "center" },
  contactBlock: { alignItems: "center", marginTop: 10 },
  contactName: { fontSize: 10.5, fontWeight: 700, color: COLORS.ink },
  contactLine: { fontSize: 9.5, color: COLORS.sub, marginTop: 2 },
});

// --- Small drawn primitives ------------------------------------------------

// A ring/donut score gauge drawn with react-pdf's SVG primitives — vector
// shapes, not font glyphs, so there's no glyph-coverage risk.
function ScoreGauge({ score, size = 72, sublabel }: { score: number; size?: number; sublabel?: string }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const dash = circumference * pct;
  const color = scoreColor(score);
  const center = size / 2;
  return (
    <View style={{ width: size, height: size, position: "relative", alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={radius} stroke={COLORS.line} strokeWidth={strokeWidth} fill="none" />
        {dash > 0 && (
          // A zero-length dash array (score === 0 — e.g. a "no website" lead)
          // makes react-pdf's SVG renderer throw, so the arc is simply
          // skipped at score 0 rather than drawn with an invalid dash.
          <G transform={`rotate(-90 ${center} ${center})`}>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        )}
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontSize: size * 0.24, fontWeight: 700, color: COLORS.ink }}>{Math.round(score)}</Text>
        {sublabel ? <Text style={{ fontSize: 6, color: COLORS.sub }}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

// Small vector icon badges (warning / check / trending-up / flag), drawn as
// SVG paths inside a colored circle — renders identically everywhere,
// independent of font glyph coverage.
function IconBadge({ icon, color, size = 22 }: { icon: "warn" | "check" | "up" | "flag"; color: string; size?: number }) {
  const iconSize = size * 0.58;
  const offset = (size - iconSize) / 2;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" style={{ position: "absolute", left: offset, top: offset }}>
        {icon === "check" && <Path d="M4 12 L10 18 L20 6" stroke="#fff" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {icon === "warn" && (
          <>
            <Circle cx={12} cy={17.5} r={1.6} fill="#fff" />
            <Path d="M12 6 L12 13.5" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
          </>
        )}
        {icon === "up" && (
          <Path d="M3 16 L10 9 L14 13 L21 5 M15 5 H21 V11" stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {icon === "flag" && <Path d="M6 3 L6 21 M6 4 L18 4 L15 8 L18 12 L6 12" stroke="#fff" strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
      </Svg>
    </View>
  );
}

// A small downward connector between stacked flow steps — the embedded
// Inter font renders "↓" correctly (verified in ProposalDocument.tsx),
// so this uses the same real-glyph approach as that document's FlowArrow
// rather than a separately-drawn SVG triangle.
function FlowArrow({ color = COLORS.primary }: { color?: string }) {
  return (
    <View style={s.flowArrowRow} wrap={false}>
      <Text style={{ fontSize: 13, color, fontWeight: 700 }}>↓</Text>
    </View>
  );
}

function StatTile({ label, value, sub, last }: { label: string; value: string; sub?: string; last?: boolean }) {
  return (
    <View style={[s.statTile, last ? s.statTileLast : undefined]}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub ? <Text style={s.statSub}>{sub}</Text> : null}
    </View>
  );
}

// Generic bullet list — one drawn dot per non-blank line, same component as
// ProposalDocument.tsx's BulletList for visual consistency between the two
// document types.
function BulletList({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <View>
      {lines.map((line, i) => (
        <View key={i} style={s.bulletRow} wrap={false}>
          <View style={s.bulletDot} />
          <Text style={s.bulletText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

// A consistent "N  Title ————" heading for every numbered section, matching
// ProposalDocument.tsx's SectionHead exactly (level="major" scale, same
// minPresenceAhead orphan guard — a heading can never render at the very
// bottom of a page with nothing under it).
function SectionHead({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <View wrap={false} minPresenceAhead={70}>
      <View style={s.majorHeadRow}>
        <Text style={s.majorHeadNumber}>{number}</Text>
        <Text style={s.majorHeadTitle}>{title}</Text>
        <View style={s.majorHeadRule} />
      </View>
      {subtitle ? <Text style={s.majorHeadSub}>{subtitle}</Text> : null}
    </View>
  );
}

function Header({ consultant }: { consultant: ReportData["consultant"] }) {
  return (
    <View style={s.headerRow} fixed>
      <View style={s.headerBrand}>
        {consultant.logoUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text -- this is @react-pdf/renderer's Image, not an HTML <img>
          <Image src={consultant.logoUrl} style={{ width: 16, height: 16, marginRight: 6, objectFit: "contain" }} />
        )}
        <Text style={s.headerBrandName}>{consultant.companyName}</Text>
        <Text style={s.headerDivider}>|</Text>
        <Text style={s.headerDocLabel}>Digital Growth Report</Text>
      </View>
      <Text style={s.headerConsultant}>{consultant.consultantName}</Text>
    </View>
  );
}

// Page numbers computed by react-pdf itself via the `render` prop, exactly
// like ProposalDocument.tsx — reflects the actual rendered page count
// rather than a hardcoded total.
function Footer({ consultant }: { consultant: ReportData["consultant"] }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {consultant.companyName} · {consultant.website || consultant.email || ""}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

export function ReportDocument({ data }: { data: ReportData }) {
  const { consultant, business, executiveSummary, websiteRecommendations, auditScores, competitorInsights, competitorSites, audiencePlatform, sampleAds, scenarios, growthPlan, problemSolutionStory } = data;
  const competitorRows = competitorSites ? [...(competitorSites.client ? [competitorSites.client] : []), ...competitorSites.competitors] : [];
  const hasAdCopyPage = sampleAds.some((ad) => ad.searchAd || ad.displayAd || ad.socialAd || ad.videoAd);

  // Section numbers shift by one when the optional Ad Copy section is
  // omitted — same adjustment the previous per-page version made for its
  // page numbers, just renamed now that sections flow continuously instead
  // of each forcing a fresh physical page.
  const nAdCopy = "7";
  const nBudget = hasAdCopyPage ? "8" : "7";
  const nGrowthPlan = hasAdCopyPage ? "9" : "8";
  const nClosing = hasAdCopyPage ? "10" : "9";

  const expectedScenario = scenarios.find((sc) => sc.label.toLowerCase().includes("expected")) ?? scenarios[0] ?? null;

  const tierOrder = ["conservative", "expected", "growth opportunity"];
  const orderedScenarios = [...scenarios].sort((a, b) => {
    const ai = tierOrder.indexOf(a.label.toLowerCase());
    const bi = tierOrder.indexOf(b.label.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const maxRevenue = Math.max(1, ...scenarios.map((sc) => sc.revenue));

  return (
    <Document title={`${business.businessName} — Digital Growth Report`} author={consultant.companyName}>
      {/* PAGE 1 — COVER, matching ProposalDocument.tsx's cover layout */}
      <Page size="A4" style={s.page}>
        <View style={{ marginTop: 60 }}>
          <View style={s.coverEyebrowBlock}>
            <Text style={s.coverEyebrow2}>DIGITAL GROWTH</Text>
            <Text style={s.coverEyebrow}>AUDIT &amp; STRATEGY REPORT</Text>
          </View>

          <Text style={s.coverTitle}>{business.businessName}</Text>
          <Text style={s.coverSubtitle}>Digital Growth &amp; Lead Conversion Report</Text>
          <View style={s.coverRule} />

          <View style={s.coverBlocksRow}>
            <View style={s.coverBlock}>
              <Text style={s.coverBlockLabel}>PREPARED FOR</Text>
              <Text style={s.coverBlockName}>{business.customerName}</Text>
              <Text style={s.coverBlockSub}>{business.businessName}</Text>
            </View>

            <View style={s.coverBlock}>
              <Text style={s.coverBlockLabel}>PREPARED BY</Text>
              <Text style={s.coverBlockName}>{consultant.consultantName}</Text>
              <Text style={s.coverBlockSub}>{consultant.companyName}</Text>
              {consultant.email ? <Text style={s.coverBlockSub}>{consultant.email}</Text> : null}
              {consultant.phone ? <Text style={s.coverBlockSub}>{consultant.phone}</Text> : null}
              {consultant.whatsapp ? <Text style={s.coverBlockSub}>WhatsApp: {consultant.whatsapp}</Text> : null}
            </View>
          </View>
        </View>

        <View style={s.coverMetaBlock}>
          <View style={s.coverMetaRule} />
          <Text style={s.coverMeta}>Prepared on {data.generatedDate}</Text>
        </View>
      </Page>

      {/* PAGE 2+ — THE WHOLE BODY, ONE CONTINUOUS FLOW, matching
          ProposalDocument.tsx's continuous-flow structure: every section
          used to be its own dedicated <Page> (10 of them), guaranteeing
          leftover white space whenever a section was short. Now the whole
          body lives inside ONE <Page> and @react-pdf/renderer's own
          automatic pagination decides where content actually spills onto a
          new physical page. Header/Footer are `fixed` so they repeat on
          every physical page this spans; every card/table/grid keeps
          wrap={false} so nothing splits mid-element; every SectionHead is
          wrapped together with its first content block (not the whole
          section) so a heading can never render orphaned at the bottom of a
          page with nothing under it — same rule as the Proposal PDF. */}
      <Page size="A4" style={s.page}>
        <Header consultant={consultant} />
        <View style={s.pageTitleRow}>
          <Text style={s.pageTitle}>Digital Growth Report</Text>
          <Text style={s.pageSubtitle}>
            Prepared for {business.customerName} · {business.businessName} · {data.generatedDate}
          </Text>
        </View>

        {/* 1. EXECUTIVE SUMMARY — heading wrapped with the hero stats row
            only (the first block); everything after flows freely. */}
        <View>
          <View wrap={false}>
            <SectionHead number="1" title="Executive Summary" />
            <View style={[s.heroRow, { marginBottom: 14 }]}>
              {auditScores ? (
                <View style={[s.statTile, { flexDirection: "row", alignItems: "center" }]}>
                  <ScoreGauge score={auditScores.overall} size={50} />
                  <View style={{ marginLeft: 9, flex: 1 }}>
                    <Text style={s.statLabel}>Website Score</Text>
                    <Text style={{ fontSize: TYPE.small, color: COLORS.sub, lineHeight: 1.3 }}>out of 100</Text>
                  </View>
                </View>
              ) : (
                <StatTile label="Website Score" value="N/A" sub="No live audit for this lead" />
              )}
              {expectedScenario ? (
                <>
                  <StatTile
                    label="Projected Monthly Customers"
                    value={formatNumber(Math.round(expectedScenario.customers))}
                    sub={`at ${formatCurrency(expectedScenario.budget, consultant.currency)}/mo · Expected case`}
                  />
                  <StatTile label="Projected ROI" value={`${Math.round(expectedScenario.roi)}%`} sub="Expected case, this budget" last />
                </>
              ) : (
                <StatTile label="Projected Results" value="Set a budget" sub="to see customer &amp; ROI projections" last />
              )}
            </View>
          </View>

          <View style={[s.calloutCard, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, flexDirection: "column", alignItems: "stretch" }]} wrap={false}>
            <Text style={[s.calloutLabel, { color: COLORS.ink }]}>Current Situation</Text>
            <Text style={s.bodyText}>{executiveSummary.currentSituation}</Text>
          </View>

          <Text style={s.subSectionLabel}>Key Problems Affecting Growth</Text>
          <View style={s.problemGrid}>
            {executiveSummary.problems.slice(0, 6).map((p, i) => (
              <View style={s.problemCard} key={i} wrap={false}>
                <IconBadge icon="warn" color={COLORS.bad} size={18} />
                <Text style={s.problemCardText}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={[s.calloutCard, { backgroundColor: COLORS.primarySoft, marginTop: 4 }]} wrap={false}>
            <IconBadge icon="flag" color={COLORS.primary} size={20} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.calloutLabel, { color: COLORS.primaryDark }]}>Biggest Growth Opportunity</Text>
              <Text style={s.bodyText}>{executiveSummary.biggestOpportunity}</Text>
            </View>
          </View>

          <View style={[s.calloutCard, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }]} wrap={false}>
            <IconBadge icon="up" color={COLORS.ink} size={20} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.calloutLabel, { color: COLORS.ink }]}>Recommended Direction</Text>
              <Text style={s.bodyText}>{executiveSummary.recommendedDirection}</Text>
            </View>
          </View>
        </View>

        {/* 2. PROBLEM -> SOLUTION -> RESULT — the persuasive narrative arc.
            Heading wrapped with the first step card only. */}
        <View>
          <View wrap={false}>
            <SectionHead number="2" title="Problem, Solution &amp; Result" subtitle={`Why ${business.businessName} is losing growth today, what changes, and what that's worth.`} />
            <View style={[s.stepCard, { backgroundColor: COLORS.badSoft }]}>
              <View style={s.stepHeadRow}>
                <IconBadge icon="warn" color={COLORS.bad} size={24} />
                <Text style={[s.stepLabel, { color: COLORS.bad }]}>01 · The Problem</Text>
              </View>
              <Text style={s.stepText}>{problemSolutionStory.problem}</Text>
            </View>
          </View>
          <FlowArrow color={COLORS.accent} />
          <View style={[s.stepCard, { backgroundColor: COLORS.accentSoft }]} wrap={false}>
            <View style={s.stepHeadRow}>
              <IconBadge icon="check" color={COLORS.accent} size={24} />
              <Text style={[s.stepLabel, { color: COLORS.accent }]}>02 · The Solution</Text>
            </View>
            <Text style={s.stepText}>{problemSolutionStory.solution}</Text>
          </View>
          <FlowArrow color={COLORS.primary} />
          <View style={[s.stepCard, { backgroundColor: COLORS.primarySoft }]} wrap={false}>
            <View style={s.stepHeadRow}>
              <IconBadge icon="up" color={COLORS.primary} size={24} />
              <Text style={[s.stepLabel, { color: COLORS.primaryDark }]}>03 · The Result</Text>
            </View>
            <Text style={s.stepText}>{problemSolutionStory.expectedResult}</Text>
            {expectedScenario ? (
              <View style={s.resultStatsRow}>
                <View style={s.resultStatTile}>
                  <Text style={s.resultStatLabel}>Expected Customers/mo</Text>
                  <Text style={s.resultStatValue}>{formatNumber(Math.round(expectedScenario.customers))}</Text>
                </View>
                <View style={s.resultStatTile}>
                  <Text style={s.resultStatLabel}>Expected Revenue/mo</Text>
                  <Text style={s.resultStatValue}>{formatCurrency(Math.round(expectedScenario.revenue), consultant.currency)}</Text>
                </View>
                <View style={[s.resultStatTile, s.resultStatTileLast]}>
                  <Text style={s.resultStatLabel}>Expected ROI</Text>
                  <Text style={s.resultStatValue}>{Math.round(expectedScenario.roi)}%</Text>
                </View>
              </View>
            ) : null}
          </View>
          <Text style={{ fontSize: 7.5, color: COLORS.faint, marginTop: 10 }}>
            Result figures are scenario-based estimates from the Budget &amp; Scenario Projections section — see section {nBudget} for the full breakdown, including Conservative and Growth Opportunity cases.
          </Text>
        </View>

        {/* 3. WEBSITE RECOMMENDATIONS — heading wrapped with the first
            present block (top problems / recommended website type). */}
        <View>
          {websiteRecommendations.hasWebsite ? (
            <>
              <View wrap={false}>
                <SectionHead number="3" title="Website Recommendations" />
                <Text style={s.subSectionLabel}>Top Website Problems</Text>
                <BulletList text={websiteRecommendations.topProblems.join("\n")} />
              </View>

              {websiteRecommendations.growthRecommendations ? (
                (
                  [
                    ["Increase Traffic", websiteRecommendations.growthRecommendations.traffic],
                    ["Strengthen Branding", websiteRecommendations.growthRecommendations.branding],
                    ["Extend Reach", websiteRecommendations.growthRecommendations.reach],
                  ] as [string, string[]][]
                ).map(([label, items]) =>
                  items.length === 0 ? null : (
                    <View key={label} wrap={false}>
                      <Text style={s.subSectionLabel}>{label}</Text>
                      <BulletList text={items.join("\n")} />
                    </View>
                  )
                )
              ) : (
                <View wrap={false}>
                  <Text style={s.subSectionLabel}>Recommended Improvements</Text>
                  <BulletList text={websiteRecommendations.recommendedImprovements.join("\n")} />
                </View>
              )}

              {websiteRecommendations.offPageMetrics ? (
                <View style={s.infoBlockCard} wrap={false}>
                  <Text style={s.infoBlockTitle}>Off-Page &amp; Traffic Snapshot</Text>
                  <View style={s.statGrid}>
                    {(
                      [
                        ["Domain Authority / Rating", websiteRecommendations.offPageMetrics.domainAuthority],
                        ["Total Backlinks", websiteRecommendations.offPageMetrics.totalBacklinks],
                        ["Referring Domains", websiteRecommendations.offPageMetrics.referringDomains],
                        ["Est. Monthly Organic Traffic", websiteRecommendations.offPageMetrics.estimatedOrganicTraffic],
                      ] as [string, string | undefined][]
                    )
                      .filter(([, v]) => v)
                      .map(([label, value]) => (
                        <View key={label} style={s.statGridItem}>
                          <Text style={s.statGridLabel}>{label}</Text>
                          <Text style={s.statGridValue}>{value}</Text>
                        </View>
                      ))}
                  </View>
                  {websiteRecommendations.offPageMetrics.source ? (
                    <Text style={{ fontSize: 7, color: COLORS.faint, marginTop: 2 }}>Source: {websiteRecommendations.offPageMetrics.source}</Text>
                  ) : null}
                </View>
              ) : null}

              {websiteRecommendations.strategicRecommendations && websiteRecommendations.strategicRecommendations.length > 0 && (
                <View wrap={false}>
                  <Text style={s.subSectionLabel}>Strategic Next Steps — Off-Page, Link Building &amp; Content</Text>
                  <BulletList text={websiteRecommendations.strategicRecommendations.join("\n")} />
                </View>
              )}
            </>
          ) : (
            <>
              <View wrap={false}>
                <SectionHead number="3" title="Website Recommendations" />
                <Text style={s.subSectionLabel}>Recommended Website Type</Text>
                <Text style={s.bodyText}>{websiteRecommendations.recommendedWebsiteType ?? "Lead-generation website"}</Text>
                {websiteRecommendations.recommendedWebsiteTypeDescription ? (
                  <Text style={[{ fontSize: TYPE.small, color: COLORS.sub, lineHeight: 1.45 }, { marginTop: 3, marginBottom: 8 }]}>
                    {websiteRecommendations.recommendedWebsiteTypeDescription}
                  </Text>
                ) : null}
              </View>
              <View wrap={false}>
                <Text style={s.subSectionLabel}>Recommended Pages</Text>
                <BulletList text={(websiteRecommendations.recommendedPages ?? []).join("\n")} />
              </View>
              {websiteRecommendations.onlinePresenceChannels && websiteRecommendations.onlinePresenceChannels.length > 0 && (
                <View wrap={false}>
                  <Text style={s.subSectionLabel}>
                    Online Presence While the Website Is Being Built
                    {websiteRecommendations.businessType ? ` (${websiteRecommendations.businessType})` : ""}
                  </Text>
                  <BulletList text={websiteRecommendations.onlinePresenceChannels.join("\n")} />
                </View>
              )}
            </>
          )}

          {websiteRecommendations.localPresence ? (
            <View style={s.infoBlockCard} wrap={false}>
              <Text style={s.infoBlockTitle}>
                Local Presence — {websiteRecommendations.localPresence.storeLocations.length} Location
                {websiteRecommendations.localPresence.storeLocations.length === 1 ? "" : "s"}
              </Text>
              {websiteRecommendations.localPresence.storeLocations.map((url, i) => (
                <Text key={url + i} style={{ fontSize: TYPE.small, color: COLORS.sub, marginBottom: 2 }}>
                  {i === 0 ? "Main store: " : `Location ${i + 1}: `}
                  {url}
                </Text>
              ))}
              {websiteRecommendations.localPresence.notes ? (
                <Text style={{ fontSize: TYPE.small, marginTop: 4, lineHeight: 1.4, color: COLORS.body }}>{websiteRecommendations.localPresence.notes}</Text>
              ) : null}
              {websiteRecommendations.localPresence.recommendations && websiteRecommendations.localPresence.recommendations.length > 0 ? (
                <>
                  <Text style={{ fontSize: TYPE.small, fontWeight: 700, color: COLORS.ink, marginTop: 8, marginBottom: 4 }}>
                    Recommended Local Branding Improvements (Google Business Profile)
                  </Text>
                  <BulletList text={websiteRecommendations.localPresence.recommendations.join("\n")} />
                </>
              ) : null}
            </View>
          ) : null}

          {websiteRecommendations.socialPresence ? (
            <View style={s.infoBlockCard} wrap={false}>
              <Text style={s.infoBlockTitle}>Social Media Presence</Text>
              {(
                [
                  ["Facebook", websiteRecommendations.socialPresence.facebook, websiteRecommendations.socialPresence.metrics?.facebook],
                  ["Instagram", websiteRecommendations.socialPresence.instagram, websiteRecommendations.socialPresence.metrics?.instagram],
                  ["LinkedIn", websiteRecommendations.socialPresence.linkedin, websiteRecommendations.socialPresence.metrics?.linkedin],
                  ["YouTube", websiteRecommendations.socialPresence.youtube, websiteRecommendations.socialPresence.metrics?.youtube],
                ] as [string, string | undefined, string | undefined][]
              )
                .filter(([, url]) => url)
                .map(([label, url, metrics]) => (
                  <View key={label} style={{ marginBottom: 5 }}>
                    <Text style={{ fontSize: TYPE.small, color: COLORS.sub }}>
                      {label}: {url}
                    </Text>
                    {metrics ? <Text style={{ fontSize: 7.5, color: COLORS.faint, marginTop: 1 }}>{metrics}</Text> : null}
                  </View>
                ))}
            </View>
          ) : null}
        </View>

        {/* 4. WEBSITE AUDIT SCORECARD — heading + the whole scorecard block
            wrapped together (the score-bar list is compact enough that
            splitting it mid-list would look worse than keeping it atomic —
            same reasoning ProposalDocument.tsx applies to its 2.4/2.5 grids). */}
        <View wrap={false}>
          <SectionHead number="4" title="Website Audit Scorecard" />
          {auditScores ? (
            <View>
              <View style={s.scoreHeroRow}>
                <ScoreGauge score={auditScores.overall} size={60} sublabel="/ 100" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>Overall Website Score</Text>
                  <Text style={{ fontSize: TYPE.small, color: COLORS.sub, marginTop: 2 }}>{auditStatusLabel(auditScores.overall)} — based on 7 weighted categories below.</Text>
                </View>
              </View>
              {(
                [
                  ["Technical SEO", auditScores.technicalSeo],
                  ["On-Page SEO", auditScores.onPageSeo],
                  ["Content", auditScores.content],
                  ["UX & Conversion", auditScores.uxConversion],
                  ["Branding", auditScores.branding],
                  ["Local SEO", auditScores.localSeo],
                  ["Performance", auditScores.performance],
                ] as [string, number][]
              ).map(([label, score]) => (
                <View key={label} style={s.scoreCategoryRow}>
                  <View style={s.scoreCategoryHead}>
                    <Text style={s.scoreCategoryLabel}>{label}</Text>
                    <Text style={s.scoreCategoryValue}>
                      {score}/100 — {auditStatusLabel(score)}
                    </Text>
                  </View>
                  <View style={s.scoreBarTrack}>
                    <View style={[s.scoreBarFill, { width: `${score}%`, backgroundColor: scoreColor(score) }]} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: TYPE.small, color: COLORS.sub }}>Data unavailable – requires external tool/account access.</Text>
          )}
        </View>

        {/* 5. COMPETITOR INSIGHTS — heading wrapped with the comparison
            table (can't split a table mid-row across a page break). */}
        <View>
          {competitorRows.length > 0 ? (
            <View wrap={false}>
              <SectionHead number="5" title="Competitor Insights" subtitle="Live research on each competitor's own site — no estimated or sample data." />
              <View style={s.table}>
                <View style={s.theadRow}>
                  <Text style={[s.thCell, s.thCellFirst]}>Site</Text>
                  <Text style={s.thCell}>Words</Text>
                  <Text style={s.thCell}>Blog</Text>
                  <Text style={s.thCell}>Schema</Text>
                  <Text style={s.thCell}>Mobile</Text>
                  <Text style={s.thCell}>HTTPS</Text>
                  <Text style={[s.thCell, s.thCellLast]}>Platform</Text>
                </View>
                {competitorRows.map((c, idx) => (
                  <View style={[s.tr, idx % 2 === 1 ? s.trAlt : undefined]} key={c.hostname + idx}>
                    <Text style={[s.tdCell, s.tdCellFirst]}>
                      {idx === 0 && competitorSites?.client ? "Your client" : c.hostname}
                    </Text>
                    {c.fetchedOk ? (
                      <>
                        <Text style={s.tdCell}>{c.wordCount}</Text>
                        <Text style={s.tdCell}>{c.hasBlog ? "Yes" : "No"}</Text>
                        <Text style={s.tdCell}>{c.hasSchema ? "Yes" : "No"}</Text>
                        <Text style={s.tdCell}>{c.hasViewport ? "Yes" : "No"}</Text>
                        <Text style={s.tdCell}>{c.https ? "Yes" : "No"}</Text>
                        <Text style={[s.tdCell, s.tdCellLast]}>{c.techPlatform}</Text>
                      </>
                    ) : (
                      <Text style={[s.tdCell, { width: "66%" }]}>Not reachable</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <SectionHead number="5" title="Competitor Insights" subtitle="Live research on each competitor's own site — no estimated or sample data." />
          )}

          <Text style={[s.subSectionLabel, { marginTop: 14 }]}>Insights &amp; Recommendations</Text>
          {competitorInsights.length > 0 ? (
            <BulletList text={competitorInsights.join("\n")} />
          ) : (
            <Text style={{ fontSize: TYPE.small, color: COLORS.sub }}>Competitor data unavailable — no competitor URLs were analyzed.</Text>
          )}
        </View>

        {/* 6. TARGET AUDIENCE, PLATFORMS & SAMPLE ADS — heading wrapped with
            the target-audience paragraph (first block); platform lists and
            the sample-ad card grid flow after. */}
        <View>
          <View wrap={false}>
            <SectionHead number="6" title="Target Audience, Platforms &amp; Sample Ads" />
            <Text style={s.subSectionLabel}>Target Audience</Text>
            <Text style={s.bodyText}>{audiencePlatform.targetAudience}</Text>
          </View>

          {audiencePlatform.platforms.length > 0 && (
            <View wrap={false}>
              <Text style={s.subSectionLabel}>Recommended Platforms &amp; Ad Types</Text>
              {audiencePlatform.platforms.map((p, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: TYPE.body, fontWeight: 700, color: COLORS.ink }}>
                    {p.platform}
                    {p.adType ? ` — ${p.adType}` : ""}
                  </Text>
                  {p.expectedResult ? <Text style={{ fontSize: TYPE.small, color: COLORS.sub }}>Expected result: {p.expectedResult}</Text> : null}
                </View>
              ))}
            </View>
          )}

          {audiencePlatform.platforms.some((p) => p.budgetAllocation || p.estimatedResult) && (
            <View wrap={false}>
              <Text style={s.subSectionLabel}>Suggested Campaign Budget Allocation</Text>
              {audiencePlatform.platforms.map((p, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <Text style={{ fontSize: TYPE.body, fontWeight: 700, color: COLORS.ink }}>{p.platform}</Text>
                  {p.budgetAllocation ? <Text style={{ fontSize: TYPE.small, color: COLORS.sub }}>Suggested budget: {p.budgetAllocation}</Text> : null}
                  {p.estimatedResult ? <Text style={{ fontSize: TYPE.small, color: COLORS.sub }}>At this spend: {p.estimatedResult}</Text> : null}
                </View>
              ))}
            </View>
          )}

          <Text style={[s.subSectionLabel, { marginTop: 4 }]}>Sample Ad Concepts</Text>
          <Text style={{ fontSize: TYPE.small, color: COLORS.sub, marginBottom: 8 }}>Based on {business.businessName}&apos;s actual products/services.</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {sampleAds.map((ad, i) => (
              <View key={i} style={s.adCard} wrap={false}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                  <Text style={s.chip}>{ad.platform}</Text>
                  {ad.format ? <Text style={{ fontSize: 7, color: COLORS.sub, marginLeft: 6 }}>{ad.format}</Text> : null}
                </View>
                {ad.adType ? <Text style={{ fontSize: 7, color: COLORS.faint, marginBottom: 4 }}>{ad.adType}</Text> : null}
                {ad.imageDataUrl ? (
                  // eslint-disable-next-line jsx-a11y/alt-text -- this is @react-pdf/renderer's Image, not an HTML <img>
                  <Image src={ad.imageDataUrl} style={{ width: "100%", borderRadius: 6, marginBottom: 6 }} />
                ) : ad.referenceImageUrl ? (
                  <View style={{ marginBottom: 6 }}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text -- this is @react-pdf/renderer's Image, not an HTML <img> */}
                    <Image src={ad.referenceImageUrl} style={{ width: "100%", borderRadius: 6 }} />
                    <Text style={{ fontSize: 6, color: COLORS.faint, marginTop: 2 }}>Reference photo from {ad.referenceImageSource} — for visual inspiration only.</Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.ink, marginBottom: 4 }}>{ad.headline}</Text>
                {ad.benefit ? <Text style={{ fontSize: TYPE.small, color: COLORS.sub, marginBottom: 6 }}>{ad.benefit}</Text> : null}
                {ad.videoScript ? (
                  <View style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 7, color: COLORS.sub, marginBottom: 2 }}>
                      <Text style={{ fontWeight: 700 }}>Hook: </Text>
                      {ad.videoScript.hook}
                    </Text>
                    <Text style={{ fontSize: 7, color: COLORS.sub, marginBottom: 2 }}>
                      <Text style={{ fontWeight: 700 }}>Story: </Text>
                      {ad.videoScript.story}
                    </Text>
                    <Text style={{ fontSize: 7, color: COLORS.sub }}>
                      <Text style={{ fontWeight: 700 }}>Closing: </Text>
                      {ad.videoScript.cta}
                    </Text>
                  </View>
                ) : null}
                <Text style={{ fontSize: TYPE.small, color: COLORS.primary, fontWeight: 700 }}>{ad.cta} →</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 7. AD COPY & EXTENSIONS (optional — full field-level ad copy) */}
        {hasAdCopyPage && (
          <View>
            <View wrap={false}>
              <SectionHead number={nAdCopy} title="Ad Copy &amp; Extensions" subtitle="Full field-level ad copy, matching each platform's actual ad structure — ready to paste into Ads Manager / Google Ads." />
            </View>

            {sampleAds.map((ad, i) => {
              if (!ad.searchAd && !ad.displayAd && !ad.socialAd && !ad.videoAd) return null;
              return (
                <View key={i} style={s.adCopyCard} wrap={false}>
                  <Text style={s.adCopyHead}>
                    {ad.platform} — {ad.format}
                  </Text>

                  {ad.searchAd && (
                    <View>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Headlines: </Text>
                        {ad.searchAd.headlines.filter(Boolean).join(" | ")}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Descriptions: </Text>
                        {ad.searchAd.descriptions.filter(Boolean).join(" | ")}
                      </Text>
                      {ad.searchAd.displayPath.filter(Boolean).length > 0 && (
                        <Text style={s.adCopyLine}>
                          <Text style={{ fontWeight: 700 }}>Display Path: </Text>/{ad.searchAd.displayPath.filter(Boolean).join("/")}
                        </Text>
                      )}
                      {ad.searchAd.sitelinks.filter((sl) => sl.text).length > 0 && (
                        <Text style={s.adCopyLine}>
                          <Text style={{ fontWeight: 700 }}>Sitelinks: </Text>
                          {ad.searchAd.sitelinks.filter((sl) => sl.text).map((sl) => `${sl.text} (${sl.description})`).join("  •  ")}
                        </Text>
                      )}
                      {ad.searchAd.callouts.filter(Boolean).length > 0 && (
                        <Text style={s.adCopyLine}>
                          <Text style={{ fontWeight: 700 }}>Callouts: </Text>
                          {ad.searchAd.callouts.filter(Boolean).join(" | ")}
                        </Text>
                      )}
                      {ad.searchAd.structuredSnippetValues.filter(Boolean).length > 0 && (
                        <Text style={s.adCopyLine}>
                          <Text style={{ fontWeight: 700 }}>{ad.searchAd.structuredSnippetHeader}: </Text>
                          {ad.searchAd.structuredSnippetValues.filter(Boolean).join(", ")}
                        </Text>
                      )}
                    </View>
                  )}

                  {ad.displayAd && (
                    <View>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Short Headlines: </Text>
                        {ad.displayAd.headlines.filter(Boolean).join(" | ")}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Long Headline: </Text>
                        {ad.displayAd.longHeadline}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Descriptions: </Text>
                        {ad.displayAd.descriptions.filter(Boolean).join(" | ")}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Business Name: </Text>
                        {ad.displayAd.businessName}
                      </Text>
                    </View>
                  )}

                  {ad.socialAd && (
                    <View>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Primary Text: </Text>
                        {ad.socialAd.primaryText}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Headline: </Text>
                        {ad.socialAd.headline}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Description: </Text>
                        {ad.socialAd.description}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>CTA Button: </Text>
                        {ad.socialAd.ctaButton}
                      </Text>
                    </View>
                  )}

                  {ad.videoAd && (
                    <View>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Companion Banner Headline: </Text>
                        {ad.videoAd.companionHeadline}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>Companion Banner Description: </Text>
                        {ad.videoAd.companionDescription}
                      </Text>
                      <Text style={s.adCopyLine}>
                        <Text style={{ fontWeight: 700 }}>CTA Button: </Text>
                        {ad.videoAd.ctaButton}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* BUDGET & SCENARIO PROJECTIONS — heading + scenario-card row
            wrapped together (can't split a flex-wrap row mid-row). */}
        <View>
          <View wrap={false}>
            <SectionHead number={nBudget} title="Budget &amp; Scenario Projections" subtitle="Three ways this could play out on the same monthly budget." />
            <View style={s.scenarioCardsRow}>
              {orderedScenarios.map((sc, i) => {
                const barPct = Math.max(4, Math.round((sc.revenue / maxRevenue) * 100));
                return (
                  <View key={sc.label} style={[s.scenarioCard, i === orderedScenarios.length - 1 ? s.scenarioCardLast : undefined]}>
                    <View style={s.scenarioCardHead}>
                      <Text style={s.scenarioCardLabel}>{sc.label}</Text>
                    </View>
                    <View style={s.scenarioCardBody}>
                      <Text style={s.scenarioBigLabel}>Monthly Revenue</Text>
                      <Text style={s.scenarioBigValue}>{formatCurrency(Math.round(sc.revenue), consultant.currency)}</Text>
                      <View style={s.scoreBarTrack}>
                        <View style={[s.scoreBarFill, { width: `${barPct}%`, backgroundColor: COLORS.primary }]} />
                      </View>
                      <View style={s.scenarioSubGrid}>
                        <View style={s.scenarioSubItem}>
                          <Text style={s.scenarioSubLabel}>Customers/mo</Text>
                          <Text style={s.scenarioSubValue}>{formatNumber(Math.round(sc.customers))}</Text>
                        </View>
                        <View style={s.scenarioSubItem}>
                          <Text style={s.scenarioSubLabel}>ROAS</Text>
                          <Text style={s.scenarioSubValue}>{sc.roas.toFixed(2)}X</Text>
                        </View>
                        <View style={s.scenarioSubItem}>
                          <Text style={s.scenarioSubLabel}>ROI</Text>
                          <Text style={s.scenarioSubValue}>{sc.roi.toFixed(0)}%</Text>
                        </View>
                        <View style={s.scenarioSubItem}>
                          <Text style={s.scenarioSubLabel}>Cost/Customer</Text>
                          <Text style={s.scenarioSubValue}>{formatCurrency(sc.cac, consultant.currency)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <Text style={[s.subSectionLabel, { marginTop: 14 }]}>Full Metric Breakdown</Text>
          <View style={s.table} wrap={false}>
            <View style={s.theadRow}>
              <Text style={[s.metricThCell, s.metricThCellFirst]}>Metric</Text>
              {scenarios.map((sc) => (
                <Text style={s.metricThCell} key={sc.label}>
                  {sc.label}
                </Text>
              ))}
            </View>
            {(
              [
                ["Budget", (sc: (typeof scenarios)[number]) => formatCurrency(sc.budget, consultant.currency)],
                ["Traffic/Clicks", (sc: (typeof scenarios)[number]) => Math.round(sc.traffic).toLocaleString()],
                ["Leads", (sc: (typeof scenarios)[number]) => Math.round(sc.leads).toLocaleString()],
                ["Qualified Leads", (sc: (typeof scenarios)[number]) => Math.round(sc.qualifiedLeads).toLocaleString()],
                ["Customers", (sc: (typeof scenarios)[number]) => Math.round(sc.customers).toLocaleString()],
                ["Revenue", (sc: (typeof scenarios)[number]) => formatCurrency(Math.round(sc.revenue), consultant.currency)],
                ["CPL", (sc: (typeof scenarios)[number]) => formatCurrency(sc.cpl, consultant.currency)],
                ["CAC", (sc: (typeof scenarios)[number]) => formatCurrency(sc.cac, consultant.currency)],
                ["ROAS", (sc: (typeof scenarios)[number]) => `${sc.roas.toFixed(2)}X`],
                ["ROI", (sc: (typeof scenarios)[number]) => `${sc.roi.toFixed(0)}%`],
              ] as [string, (sc: (typeof scenarios)[number]) => string][]
            ).map(([label, fmt], idx) => (
              <View style={[s.tr, idx % 2 === 1 ? s.trAlt : undefined]} key={label}>
                <Text style={[s.metricTdCell, s.metricTdCellFirst]}>{label}</Text>
                {scenarios.map((sc) => (
                  <Text style={s.metricTdCell} key={sc.label + label}>
                    {fmt(sc)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          <Text style={{ fontSize: TYPE.small, color: COLORS.sub, marginTop: 10 }}>These are scenario-based estimates. Actual results may vary.</Text>
          <Text style={{ fontSize: 7, color: COLORS.faint, marginTop: 4 }}>{data.benchmarkDisclaimer}</Text>
        </View>

        {/* 90-DAY GROWTH PLAN — heading + timeline row wrapped together. */}
        <View wrap={false}>
          <SectionHead number={nGrowthPlan} title="90-Day Growth Plan" subtitle={problemSolutionStory.execution} />
          <View style={s.timelineRow}>
            {growthPlan.map((phase, i) => (
              <View key={phase.phase} style={[s.timelineCol, i === growthPlan.length - 1 ? s.timelineColLast : undefined]}>
                <View style={s.timelineHeadWrap}>
                  <View style={s.timelineNumber}>
                    <Text style={s.timelineNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={s.timelinePhase}>{phase.phase}</Text>
                </View>
                <View style={s.timelineCard}>
                  {phase.items.map((item, j) => (
                    <View style={s.timelineBulletRow} key={j}>
                      <IconBadge icon="check" color={COLORS.primary} size={12} />
                      <Text style={s.timelineBulletText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* CLOSING / CALL TO ACTION */}
        <View>
          <View wrap={false}>
            <SectionHead number={nClosing} title={`Ready To Grow, ${business.businessName}?`} />
            <View style={[s.calloutCard, { backgroundColor: COLORS.primarySoft }]}>
              <IconBadge icon="flag" color={COLORS.primary} size={20} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.calloutLabel, { color: COLORS.primaryDark }]}>Our Approach</Text>
                <Text style={s.bodyText}>{problemSolutionStory.strategy}</Text>
              </View>
            </View>
          </View>

          {expectedScenario ? (
            <View style={s.resultStatsRow} wrap={false}>
              <View style={s.resultStatTile}>
                <Text style={s.resultStatLabel}>Expected Customers/mo</Text>
                <Text style={[s.resultStatValue, { color: COLORS.ink }]}>{formatNumber(Math.round(expectedScenario.customers))}</Text>
              </View>
              <View style={s.resultStatTile}>
                <Text style={s.resultStatLabel}>Expected Revenue/mo</Text>
                <Text style={[s.resultStatValue, { color: COLORS.ink }]}>{formatCurrency(Math.round(expectedScenario.revenue), consultant.currency)}</Text>
              </View>
              <View style={[s.resultStatTile, s.resultStatTileLast]}>
                <Text style={s.resultStatLabel}>Expected ROI</Text>
                <Text style={[s.resultStatValue, { color: COLORS.ink }]}>{Math.round(expectedScenario.roi)}%</Text>
              </View>
            </View>
          ) : null}

          <View style={s.ctaBlock} wrap={false}>
            <Text style={s.ctaText}>{consultant.ctaText}</Text>
            <View style={s.contactBlock}>
              <Text style={s.contactName}>{consultant.consultantName}</Text>
              <Text style={s.contactLine}>{consultant.companyName}</Text>
              {consultant.phone ? <Text style={s.contactLine}>{consultant.phone}</Text> : null}
              {consultant.whatsapp ? <Text style={s.contactLine}>WhatsApp: {consultant.whatsapp}</Text> : null}
              {consultant.email ? <Text style={s.contactLine}>{consultant.email}</Text> : null}
              {consultant.website ? <Text style={s.contactLine}>{consultant.website}</Text> : null}
              {consultant.linkedin ? <Text style={s.contactLine}>{consultant.linkedin}</Text> : null}
            </View>
          </View>
        </View>

        <Footer consultant={consultant} />
      </Page>
    </Document>
  );
}
