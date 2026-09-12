import { Document, Page, Text, View, StyleSheet, Svg, Path, Image, Font } from "@react-pdf/renderer";
import path from "node:path";
import type { ProposalData } from "./proposal-types";
import { formatCurrency } from "@/lib/calculations";

// --- Design system -----------------------------------------------------
// This document follows the house "Proposal Documentation" design system:
// a restrained professional palette (dark charcoal + a professional green
// accent, on white/very-light-neutral), one primary typeface (Inter) at
// three weights, generous print-safe margins, and a small library of
// reusable card/table components rather than walls of plain paragraphs —
// see the numbered component notes below for how each maps to a page.
//
// Font: Inter, embedded from local .woff files (see src/lib/pdf/fonts/) —
// the FULL glyph set variant, not the "latin" subset, specifically because
// the latin subset silently drops ₹ (Indian Rupee), → , ★ and other glyphs
// this document actually uses. Verified by rendering a test PDF with every
// glyph this file references before committing to this font. Unlike the
// built-in Helvetica core font used elsewhere in this app (WinAnsi-only —
// see formatCurrency's own comment on why INR still renders as "INR 50,000"
// rather than "₹50,000" in generated PDFs), an embedded font can render
// real Unicode — but formatCurrency() is shared with ReportDocument.tsx and
// deliberately left untouched here, so a client who receives both an
// audit report and a proposal for the same engagement sees the identical
// currency style in both, rather than one PDF suddenly switching symbols.
Font.register({
  family: "Inter",
  fonts: [
    // process.cwd() is this project's existing convention for runtime fs
    // paths (see src/lib/db/index.ts, the reports/proposals PDF directories,
    // etc.) — turbopackIgnore tells the bundler not to try to statically
    // resolve this dynamic path.
    { src: path.join(process.cwd(), /* turbopackIgnore: true */ "src/lib/pdf/fonts/Inter-Regular.woff"), fontWeight: 400 },
    { src: path.join(process.cwd(), /* turbopackIgnore: true */ "src/lib/pdf/fonts/Inter-SemiBold.woff"), fontWeight: 600 },
    { src: path.join(process.cwd(), /* turbopackIgnore: true */ "src/lib/pdf/fonts/Inter-Bold.woff"), fontWeight: 700 },
  ],
});

// react-pdf auto-hyphenates long words to fit narrow columns by default
// (e.g. a discount-table header wrapping "(15%)" as "(-" / "15%)"), which
// reads as a typo/broken-character in a client-facing document. Disabling
// it (returning the word as a single unbreakable chunk) means a too-narrow
// column simply wraps at the next space instead — never inserts a hyphen
// that wasn't actually typed.
Font.registerHyphenationCallback((word) => [word]);

const COLORS = {
  ink: "#1c2126", // dark charcoal — headings, primary text
  body: "#3d454d", // dark neutral — paragraph copy
  sub: "#69727b", // secondary/meta text
  faint: "#9aa2ab", // tertiary text — footer, captions
  line: "#e2e6e9", // hairline borders
  lineStrong: "#c7cdd2",
  white: "#ffffff",
  surface: "#f6f7f6", // very light neutral — card/table backgrounds
  surfaceAlt: "#eceeec", // alternating row shade

  green: "#0e6b4c", // professional green — the document's one accent color
  greenDark: "#0a5039",
  greenSoft: "#e6f2ec", // light green tint for soft callouts/badges/chips

  accent: "#8a6a35", // muted supporting color — used sparingly for variety (roadmap tags)
  accentSoft: "#f3ede0",
};

// Typographic scale, matching the design system's recommended pt ranges.
const TYPE = {
  coverTitle: 34,
  pageTitle: 21,
  subheading: 13.5,
  body: 10,
  small: 8.5,
  table: 9,
};

const PAGE_PADDING = 54; // ~19mm — within the spec's 18–22mm margin range

const s = StyleSheet.create({
  page: { padding: PAGE_PADDING, paddingBottom: 46, fontSize: TYPE.body, color: COLORS.body, fontFamily: "Inter", fontWeight: 400 },

  // Subtle running header/footer (design system §8) — quiet on every page
  // except the cover, which has its own layout below.
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

  // Page title block — used at the top of every content page.
  pageTitleRow: { marginBottom: 18 },
  pageTitle: { fontSize: TYPE.pageTitle, fontWeight: 700, color: COLORS.ink, marginBottom: 3 },
  pageSubtitle: { fontSize: TYPE.small, color: COLORS.sub },

  sectionHeadRow: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 10 },
  sectionHeadNumber: { fontSize: TYPE.subheading, fontWeight: 700, color: COLORS.green, marginRight: 7 },
  // Title text uses the same green as the number and every other
  // heading/sub-heading label (miniSectionLabel, majorHeadTitle below) so
  // the whole "N Title" line reads as one uniform accent color, not
  // number-green + title-black — per the user's explicit ask (2026-09-07).
  sectionHeadTitle: { fontSize: TYPE.subheading, fontWeight: 700, color: COLORS.green },
  sectionHeadRule: { flex: 1, height: 1, backgroundColor: COLORS.line, marginLeft: 10 },

  // Major section head — same idea as sectionHeadRow, one step larger. Used
  // for the top-level numbered sections (1.2, 1.3, 2.1…2.5, 3, 5, 6) now
  // that they no longer each get their own dedicated page (see the
  // continuous-flow rework in the main component below): a notch below the
  // "Growth Proposal" / "4. Commercial Terms" page titles, but clearly
  // heavier than a 4.1/4.2 sub-head, so the numbering hierarchy still reads
  // correctly when several sections sit on the same page back to back.
  majorHeadRow: { flexDirection: "row", alignItems: "center", marginTop: 22, marginBottom: 12 },
  majorHeadNumber: { fontSize: 15, fontWeight: 700, color: COLORS.green, marginRight: 8 },
  // Same reasoning as sectionHeadTitle above — title matches the number's
  // green rather than sitting in ink, so "3 Deliverables" reads as one
  // uniform green line matching its own "3.1"/"3.2" green sub-labels.
  majorHeadTitle: { fontSize: 15, fontWeight: 700, color: COLORS.green },
  majorHeadRule: { flex: 1, height: 1, backgroundColor: COLORS.line, marginLeft: 10 },
  majorHeadSub: { fontSize: TYPE.small, color: COLORS.sub, marginTop: 2 },

  bodyText: { fontSize: TYPE.body, color: COLORS.body, lineHeight: 1.55 },

  bulletRow: { flexDirection: "row", marginBottom: 5, paddingRight: 4 },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.green, marginTop: 5, marginRight: 8 },
  bulletText: { fontSize: TYPE.body, color: COLORS.body, lineHeight: 1.5, flex: 1 },

  // --- Cover page ----------------------------------------------------
  coverEyebrowBlock: { marginBottom: 46 },
  coverEyebrow: { fontSize: 10.5, fontWeight: 700, color: COLORS.green, letterSpacing: 2.5 },
  coverEyebrow2: { fontSize: 10.5, fontWeight: 700, color: COLORS.ink, letterSpacing: 2.5 },
  coverTitle: { fontSize: TYPE.coverTitle, fontWeight: 700, color: COLORS.ink, marginBottom: 8, maxWidth: 440, lineHeight: 1.15 },
  coverSubtitle: { fontSize: 12.5, color: COLORS.sub, marginBottom: 54 },
  coverRule: { height: 3, width: 46, backgroundColor: COLORS.green, marginBottom: 54 },
  coverBlocksRow: { flexDirection: "row" },
  coverBlock: { flex: 1, paddingRight: 20 },
  coverBlockLabel: { fontSize: 8, fontWeight: 700, color: COLORS.faint, letterSpacing: 1.4, marginBottom: 7 },
  coverBlockName: { fontSize: 13, fontWeight: 700, color: COLORS.ink, marginBottom: 2 },
  coverBlockSub: { fontSize: 9.5, color: COLORS.sub, marginBottom: 1.5 },
  coverMetaBlock: { position: "absolute", left: PAGE_PADDING, right: PAGE_PADDING, bottom: 64 },
  coverMetaRule: { height: 1, backgroundColor: COLORS.line, marginBottom: 12 },
  coverMeta: { fontSize: 8.5, color: COLORS.faint },

  // --- Info card (Requirements) --------------------------------------
  cardGrid: { flexDirection: "row", flexWrap: "wrap" },
  infoCard: {
    width: "48.5%",
    marginRight: "3%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 13,
  },
  infoCardEven: { marginRight: 0 },
  infoCardFull: { width: "100%", marginRight: 0 },
  numberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  numberBadgeText: { fontSize: 9, fontWeight: 700, color: COLORS.green },
  infoCardTitle: { fontSize: 10.5, fontWeight: 700, color: COLORS.ink, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  infoCardBody: { fontSize: TYPE.small, color: COLORS.sub, lineHeight: 1.45 },

  // Numbered process/requirement list — the fallback rendering whenever the
  // consultant's free text isn't written as "Label: detail" pairs (so a
  // numbered-card grid isn't available), used for Requirements and Next
  // Steps alike. Still visually "a numbered process," just one line per
  // item instead of a card.
  numberedRow: { flexDirection: "row", marginBottom: 9, alignItems: "flex-start" },
  numberedBadge: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    marginTop: 0.5,
  },
  numberedBadgeText: { fontSize: 7.5, fontWeight: 700, color: COLORS.white },
  numberedText: { fontSize: TYPE.body, color: COLORS.body, lineHeight: 1.5, flex: 1 },

  // --- Callout cards (Executive Summary) ------------------------------
  calloutCard: { borderRadius: 8, padding: 14, marginBottom: 12 },
  calloutLabel: { fontSize: 9.5, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.4 },
  execBlock: { marginBottom: 16 },
  execBlockLabel: { fontSize: 11, fontWeight: 700, color: COLORS.ink, marginBottom: 6 },
  subSectionLabel: { fontSize: 9.5, fontWeight: 700, color: COLORS.sub, marginTop: 12, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.4 },

  // --- Findings table (Challenges & Opportunities) --------------------
  findingsTable: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: "hidden", marginBottom: 6 },
  findingsRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line, backgroundColor: COLORS.white },
  findingsRowAlt: { backgroundColor: COLORS.surface },
  findingsRowLast: { borderBottomWidth: 0 },
  findingsLabel: { fontSize: TYPE.table, fontWeight: 700, color: COLORS.ink, width: "34%", paddingRight: 8 },
  findingsDetail: { fontSize: TYPE.table, color: COLORS.body, flex: 1, lineHeight: 1.4 },

  // --- Strategy flow (Attract -> Engage -> Convert -> Retain) ---------
  flowStage: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 13 },
  flowStageHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  flowStageNum: { fontSize: 9, fontWeight: 700, color: COLORS.green, marginRight: 7 },
  flowStageLabel: { fontSize: 11.5, fontWeight: 700, color: COLORS.ink, textTransform: "uppercase", letterSpacing: 0.6 },
  flowArrowRow: { alignItems: "center", paddingVertical: 4 },

  // --- Tools & Resource Plan -------------------------------------------
  toolsBlock: { marginBottom: 8 },

  // --- Roadmap columns ---------------------------------------------------
  roadmapRow: { flexDirection: "row", flexWrap: "wrap" },
  roadmapCard: {
    width: "31.3%",
    marginRight: "3%",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    padding: 12,
  },
  roadmapCardLast: { marginRight: 0 },
  roadmapTag: { fontSize: 7.5, fontWeight: 700, color: COLORS.accent, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 },
  roadmapTitle: { fontSize: 10.5, fontWeight: 700, color: COLORS.ink, marginBottom: 7, lineHeight: 1.25 },

  // --- KPI cards -----------------------------------------------------
  kpiCard: { width: "48.5%", marginRight: "3%", marginBottom: 12, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 12 },
  kpiCardEven: { marginRight: 0 },
  kpiCardLabel: { fontSize: 10.5, fontWeight: 700, color: COLORS.ink, marginBottom: 8 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { fontSize: 7.5, fontWeight: 700, color: COLORS.green, backgroundColor: COLORS.greenSoft, borderRadius: 9, paddingVertical: 3, paddingHorizontal: 7, marginRight: 5, marginBottom: 5 },

  // --- Deliverables tables ---------------------------------------------
  deliverablesPkgBlock: { marginBottom: 16 },
  miniSectionLabel: { fontSize: TYPE.small, fontWeight: 700, color: COLORS.green, marginTop: 4, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 },
  itemTable: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: "hidden", marginBottom: 4 },
  itemRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line, backgroundColor: COLORS.white },
  itemRowAlt: { backgroundColor: COLORS.surface },
  itemRowLast: { borderBottomWidth: 0 },
  itemLabel: { fontSize: TYPE.table, fontWeight: 700, color: COLORS.ink, width: "36%", paddingRight: 8 },
  itemDetail: { fontSize: TYPE.table, color: COLORS.body, flex: 1, lineHeight: 1.4 },

  // --- Commercial Terms — pricing cards ---------------------------------
  packagesRow: { flexDirection: "row" },
  pricingCard: { flex: 1, borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, marginRight: 10, overflow: "hidden" },
  pricingCardLast: { marginRight: 0 },
  pricingCardRecommended: { borderColor: COLORS.green, borderWidth: 1.6 },
  pricingRibbon: { backgroundColor: COLORS.green, paddingVertical: 4, alignItems: "center" },
  pricingRibbonText: { fontSize: 7.5, fontWeight: 700, color: COLORS.white, letterSpacing: 0.6 },
  pricingHead: { padding: 13, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  pricingLabel: { fontSize: 11.5, fontWeight: 700, color: COLORS.ink, marginBottom: 7 },
  pricingValue: { fontSize: 19, fontWeight: 700, color: COLORS.green },
  pricingBody: { padding: 13 },
  pricingDesc: { fontSize: TYPE.small, color: COLORS.sub, lineHeight: 1.4, marginBottom: 8 },

  breakupTable: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, overflow: "hidden", marginBottom: 4 },
  breakupRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.line, backgroundColor: COLORS.white },
  breakupRowAlt: { backgroundColor: COLORS.surface },
  breakupRowLast: { borderBottomWidth: 0 },
  breakupLabel: { fontSize: TYPE.small, color: COLORS.ink, flex: 1, paddingRight: 6 },
  breakupAmount: { fontSize: TYPE.small, fontWeight: 700, color: COLORS.ink },
  breakupCaption: { fontSize: 7, color: COLORS.faint, marginBottom: 8 },

  // --- Discount comparison table -----------------------------------------
  discountTable: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, overflow: "hidden" },
  discountHeadRow: { flexDirection: "row", backgroundColor: COLORS.ink },
  discountHeadCell: { flex: 1, padding: 9 },
  discountHeadCellFirst: { flex: 1.2 },
  discountHeadCellText: { fontSize: 8, fontWeight: 700, color: COLORS.white },
  discountHeadCellSub: { fontSize: 7.5, fontWeight: 400, color: "#c9d3ce", marginTop: 1 },
  discountRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLORS.line, backgroundColor: COLORS.white },
  discountRowAlt: { backgroundColor: COLORS.surface },
  discountCell: { flex: 1, padding: 9, fontSize: TYPE.table, color: COLORS.body },
  discountCellFirst: { flex: 1.2, fontWeight: 700, color: COLORS.ink },
  discountCellBest: { color: COLORS.green, fontWeight: 700 },

  // --- Policies & Terms ----------------------------------------------
  policyCard: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 13, marginBottom: 12 },
  policyHeadRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  policyBadge: { fontSize: 8, fontWeight: 700, color: COLORS.green, marginRight: 6 },
  policyTitle: { fontSize: 10, fontWeight: 700, color: COLORS.ink, textTransform: "uppercase", letterSpacing: 0.4 },
  termsBlock: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, padding: 15, backgroundColor: COLORS.surface },
  termsText: { fontSize: 9.5, lineHeight: 1.6, color: COLORS.body },

  // --- Next Steps / Approval -------------------------------------------
  nextStepsBlock: { marginBottom: 6 },
  ctaCard: { flexDirection: "row", borderRadius: 8, backgroundColor: COLORS.greenSoft, padding: 12, marginBottom: 18, alignItems: "center" },
  ctaText: { marginLeft: 10, fontSize: 9.5, color: COLORS.ink, flex: 1, lineHeight: 1.4 },
  approvalLineRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 16 },
  approvalLineLabel: { fontSize: 9, color: COLORS.sub, marginRight: 4 },
  approvalLineFill: { flex: 1, borderBottomWidth: 1, borderBottomColor: COLORS.lineStrong, height: 14 },
  authNote: { fontSize: 9.5, color: COLORS.body, lineHeight: 1.5, marginBottom: 6 },
  acceptRow: { flexDirection: "row", marginTop: 26 },
  acceptCol: { flex: 1, marginRight: 24 },
  acceptColLast: { marginRight: 0 },
  acceptLine: { borderBottomWidth: 1, borderBottomColor: COLORS.ink, height: 28 },
  acceptLabel: { fontSize: 8, color: COLORS.sub, marginTop: 4 },
});

// --- Small drawn primitives ----------------------------------------------
// A check-mark badge and printed checkbox, drawn as SVG paths rather than
// relying on a font glyph — kept deliberately independent of font glyph
// coverage (the embedded Inter build above does include a ✓ glyph, but
// drawing it guarantees identical rendering regardless of font changes).
function CheckBadge({ color = COLORS.green, size = 16 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <Path d="M4 12 L10 18 L20 6" stroke="#fff" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

// A small downward-pointing connector arrow between two stacked flow
// stages. Drawn with the embedded font's own → /↓ glyphs (verified to
// render correctly with the full Inter build — see the font note above),
// not an SVG, since it's plain inline text sitting between two blocks.
function FlowArrow() {
  return (
    <View style={s.flowArrowRow} wrap={false}>
      <Text style={{ fontSize: 13, color: COLORS.green, fontWeight: 700 }}>↓</Text>
    </View>
  );
}

interface BreakupItem {
  label: string;
  amount: number;
}

// Detects a per-service cost breakup living INSIDE a package's own
// "Description" text — e.g. a consultant typing:
//   SEO: ₹15,000
//   Social Media Management: ₹10,000
//   Content & Creatives: ₹8,000
// — so the PDF can render a real "digital marketing services" line-item
// table instead of one paragraph, built only from numbers the consultant
// already entered in the existing package editor. Nothing here is a new
// field or a new screen: the Description textarea has always been free
// text; this only changes how the PDF reads it.
//
// Deliberately strict, and fails safe: every comma/semicolon/newline chunk
// of the description must match "Label: amount" for this to activate. A
// normal prose description ("SEO, social media and content, all in one
// plan focused on measurable growth.") won't match and simply falls back
// to the plain paragraph, exactly as the PDF has always rendered it — so
// this can never mis-parse ordinary text into fabricated numbers.
const BREAKUP_LINE_PATTERN =
  /^([A-Za-z][A-Za-z0-9 /&()'+.-]{1,45}?)\s*[:\-–]\s*(?:₹|Rs\.?|INR|USD|AED|SAR|GBP|EUR|\$)?\s*([\d][\d,]*(?:\.\d{1,2})?)\s*(?:\/\s*mo(?:nth)?)?\.?$/i;

function parseServiceBreakup(description: string | undefined | null): BreakupItem[] | null {
  if (!description) return null;
  const chunks = description
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (chunks.length < 2) return null;

  const items: BreakupItem[] = [];
  for (const chunk of chunks) {
    const m = chunk.match(BREAKUP_LINE_PATTERN);
    if (!m) return null; // any one non-matching chunk means this isn't a breakup — bail entirely, show it as prose instead
    items.push({ label: m[1].trim(), amount: Number(m[2].replace(/,/g, "")) });
  }
  return items;
}

interface LabelDetailItem {
  label: string;
  detail: string;
}

// Detects a "Label: Detail" list inside a block of free text — one pair per
// line. Used for the Deliverables tables (as before), and now reused for
// Requirements / Challenges & Opportunities / Next Steps too: when the
// consultant writes their text that way, it renders as a numbered card /
// table / titled process step; when they don't (plain one-per-line notes,
// no colon), every caller falls back to a plain numbered or bulleted list
// instead. Requires EVERY non-blank line to contain a label/detail split —
// a single line with no colon means this isn't structured that way, so
// nothing the consultant typed is ever dropped, and nothing is fabricated
// either way.
function parseLabelDetailList(text: string | undefined | null): LabelDetailItem[] | null {
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const items: LabelDetailItem[] = [];
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx <= 0 || idx === line.length - 1) return null; // no "label:" prefix, or nothing after it
    const label = line.slice(0, idx).trim();
    const detail = line.slice(idx + 1).trim();
    if (!label || !detail) return null;
    items.push({ label, detail });
  }
  return items;
}

interface DiscountTier {
  months: number;
  percent: number;
  discountedAmount: number;
}

// Detects upfront-commitment discount tiers inside the proposal's shared
// discount-schedule field — one "N months: X%" line per tier (e.g.
// "3 months: 5%"). The discounted monthly amount shown is computed here
// from a package's own real price and the consultant's own entered
// percentage (price * (1 - percent/100)) — plain arithmetic on numbers the
// consultant already entered, not a fabricated figure. Requires every
// non-blank line to match the strict pattern; any line that doesn't means
// this isn't structured that way, so the caller falls back to the raw text
// as a plain bullet list instead of computing anything from malformed input.
const DISCOUNT_TIER_PATTERN = /^(\d+)\s*months?\s*:\s*(\d+(?:\.\d+)?)\s*%$/i;

function parseDiscountTiers(text: string | undefined | null, price: number): DiscountTier[] | null {
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const tiers: DiscountTier[] = [];
  for (const line of lines) {
    const m = line.match(DISCOUNT_TIER_PATTERN);
    if (!m) return null;
    const months = Number(m[1]);
    const percent = Number(m[2]);
    tiers.push({ months, percent, discountedAmount: Math.round(price * (1 - percent / 100)) });
  }
  return tiers;
}

// Generic bullet list for free text the consultant typed — one bullet per
// non-blank line. The dot is a small drawn circle, not a typed bullet
// character, for guaranteed-consistent rendering.
function BulletList({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
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

// A numbered list — same idea as BulletList, but each line gets a small
// filled numbered circle instead of a dot. Used as the fallback rendering
// for Requirements / Next Steps whenever the text isn't structured as
// "Label: detail" pairs (see parseLabelDetailList) — still reads as a
// deliberate numbered process/checklist, just without a card per item.
function NumberedList({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <View>
      {lines.map((line, i) => (
        <View key={i} style={s.numberedRow} wrap={false}>
          <View style={s.numberedBadge}>
            <Text style={s.numberedBadgeText}>{String(i + 1).padStart(2, "0")}</Text>
          </View>
          <Text style={s.numberedText}>{line}</Text>
        </View>
      ))}
    </View>
  );
}

// Numbered info-card grid (Requirements design-system component) — used
// when the consultant's text parses into "Label: detail" pairs; two cards
// per row, wrapping to as many rows as needed.
function InfoCardGrid({ items }: { items: LabelDetailItem[] }) {
  return (
    <View style={s.cardGrid}>
      {items.map((item, i) => (
        <View key={i} style={[s.infoCard, i % 2 === 1 ? s.infoCardEven : undefined]} wrap={false}>
          <View style={s.numberBadge}>
            <Text style={s.numberBadgeText}>{String(i + 1).padStart(2, "0")}</Text>
          </View>
          <Text style={s.infoCardTitle}>{item.label}</Text>
          <Text style={s.infoCardBody}>{item.detail}</Text>
        </View>
      ))}
    </View>
  );
}

// A numbered "process step" list (Next Steps design-system component) —
// used when nextStepsText parses into "Label: detail" pairs; each item
// shows as a numbered badge with a bold title line and a detail line below,
// e.g. "01  APPROVAL — Proposal approval & sign-off."
function ProcessSteps({ items }: { items: LabelDetailItem[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.numberedRow} wrap={false}>
          <View style={s.numberedBadge}>
            <Text style={s.numberedBadgeText}>{String(i + 1).padStart(2, "0")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: TYPE.body, fontWeight: 700, color: COLORS.ink, marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.3 }}>{item.label}</Text>
            <Text style={s.numberedText}>{item.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// A consistent "N. Title ————" heading used for every numbered section,
// distinct from the page title at the very top of a page. `level="major"`
// (the top-level 1.2/1.3/2.x/3/5/6 sections) renders one step larger than
// the default `level="minor"` (sub-numbered heads like 4.1/4.2) — see the
// majorHead* styles above. `minPresenceAhead` reserves enough room below
// the heading for it to never render orphaned at the very bottom of a page
// with nothing underneath it — now that sections flow continuously instead
// of each starting a fresh page, an orphaned heading is the one layout bug
// that automatic pagination alone doesn't prevent.
function SectionHead({
  number,
  title,
  level = "minor",
  subtitle,
}: {
  number: string;
  title: string;
  level?: "minor" | "major";
  subtitle?: string;
}) {
  const major = level === "major";
  return (
    <View wrap={false} minPresenceAhead={major ? 70 : 40}>
      <View style={major ? s.majorHeadRow : s.sectionHeadRow}>
        <Text style={major ? s.majorHeadNumber : s.sectionHeadNumber}>{number}</Text>
        <Text style={major ? s.majorHeadTitle : s.sectionHeadTitle}>{title}</Text>
        <View style={major ? s.majorHeadRule : s.sectionHeadRule} />
      </View>
      {subtitle ? <Text style={s.majorHeadSub}>{subtitle}</Text> : null}
    </View>
  );
}

function Header({ consultant, docLabel }: { consultant: ProposalData["consultant"]; docLabel: string }) {
  return (
    <View style={s.headerRow} fixed>
      <View style={s.headerBrand}>
        {consultant.logoUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text -- this is @react-pdf/renderer's Image, not an HTML <img>
          <Image src={consultant.logoUrl} style={{ width: 16, height: 16, marginRight: 6, objectFit: "contain" }} />
        )}
        <Text style={s.headerBrandName}>{consultant.companyName}</Text>
        <Text style={s.headerDivider}>|</Text>
        <Text style={s.headerDocLabel}>{docLabel}</Text>
      </View>
      <Text style={s.headerConsultant}>{consultant.consultantName}</Text>
    </View>
  );
}

// Page numbers are computed by react-pdf itself via the `render` prop
// (pageNumber/totalPages reflect the ACTUAL rendered page count), rather
// than a hardcoded constant — optional content can legitimately push this
// document past its usual length, and a hardcoded "Page X of N" would then
// be wrong on every overflow page.
function Footer({ consultant }: { consultant: ProposalData["consultant"] }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {consultant.companyName} · {consultant.website || consultant.email || ""}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  );
}

export function ProposalDocument({ data }: { data: ProposalData }) {
  const {
    consultant,
    business,
    summaryCurrentSituationText,
    summaryOpportunityText,
    summaryRecommendedDirectionText,
    summaryApproachText,
    challengesTopProblemsText,
    challengesCompetitorInsightsText,
    roadmapPhases,
    packages,
    monthlyDeliverablesText,
    oneTimeDeliverablesText,
    discountAvailable,
    discountTiersText,
    termsText,
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
    validUntil,
    generatedDate,
    version,
  } = data;

  const hasExecutiveSummary =
    !!summaryCurrentSituationText || !!summaryOpportunityText || !!summaryRecommendedDirectionText || !!summaryApproachText;
  const hasRequirements = !!requirementsText;
  const requirementsCards = hasRequirements ? parseLabelDetailList(requirementsText) : null;
  const hasChallenges = !!challengesTopProblemsText || !!challengesCompetitorInsightsText;
  const strategyStages: Array<{ label: string; text: string | null | undefined }> = [
    { label: "Attract", text: strategyAttractText },
    { label: "Engage", text: strategyEngageText },
    { label: "Convert", text: strategyConvertText },
    { label: "Retain", text: strategyRetainText },
  ];
  const filledStrategyStages = strategyStages.filter((stage) => !!stage.text);
  const hasStrategy = filledStrategyStages.length > 0;
  const hasRecommendedServices = !!recommendedServicesText;
  // Platforms with a blank name are simply not rendered — same "leave a
  // field blank to omit it" convention as every other list/section here.
  const filledKpiPlatforms = kpiPlatforms.filter((p) => p.platform.trim());
  const hasKpiSection = filledKpiPlatforms.length > 0 || !!kpiFrameworkNotesText;
  const hasDeliverables = !!monthlyDeliverablesText || !!oneTimeDeliverablesText;
  // "4.2 Project Fee Discounts" now hinges on the explicit checkbox, not on
  // whether text happens to be present — a proposal with discountAvailable
  // false omits the section entirely even if discountTiersText still has
  // leftover text from before it was unchecked (deliberate on/off gate, not
  // the usual "blank omits it" convention — see ProposalFeeDiscountsCard).
  const hasDiscountTiers = !!discountAvailable && !!discountTiersText;
  // When the shared schedule parses as strict "N months: X%" tiers, every
  // package's tier list shares the same months/percent set (it's the same
  // schedule text applied to each package's own price) — so it can render
  // as one real comparison table (rows = packages, columns = Standard +
  // each tier), not just a duplicated bullet list per card.
  const sharedDiscountTiersByPackage = hasDiscountTiers
    ? packages.map((pkg) => parseDiscountTiers(discountTiersText, pkg.price))
    : [];
  const discountTiersAllParsed = hasDiscountTiers && sharedDiscountTiersByPackage.length > 0 && sharedDiscountTiersByPackage.every((t) => t !== null && t.length > 0);
  const discountColumns = discountTiersAllParsed ? sharedDiscountTiersByPackage[0]! : [];
  const nextStepsSteps = nextStepsText ? parseLabelDetailList(nextStepsText) : null;

  return (
    <Document title={`${business.businessName} — Growth Proposal v${version}`} author={consultant.companyName}>
      {/* PAGE 1 — COVER (design system §5) */}
      <Page size="A4" style={s.page}>
        <View style={{ marginTop: 60 }}>
          <View style={s.coverEyebrowBlock}>
            <Text style={s.coverEyebrow2}>DIGITAL MARKETING</Text>
            <Text style={s.coverEyebrow}>GROWTH PROPOSAL</Text>
          </View>

          <Text style={s.coverTitle}>{business.businessName}</Text>
          <Text style={s.coverSubtitle}>Digital Growth Engagement</Text>
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
          <Text style={s.coverMeta}>
            Prepared on {generatedDate}
            {validUntil ? ` · Valid until ${validUntil}` : ""} · Version {version}
          </Text>
        </View>
      </Page>

      {/* PAGE 2+ — THE WHOLE BODY, ONE CONTINUOUS FLOW (1.1 Executive
          Summary through 6. Next Steps). Every one of these used to be its
          own dedicated <Page> — including a hard break forced in front of
          4. Commercial Terms — which produced pages that were mostly empty
          followed by a wall of white space whenever a section was short,
          purely because a new numbered section began (an early version of
          this rework still forced that one break in front of Commercial
          Terms for "visual clarity"; visual QA caught that it reproduced
          the exact same white-space bug whenever 1.1–3 didn't happen to
          fill a page evenly, so it was removed — a forced break is only
          ever justified when NOT forcing it would look worse, and here it
          didn't). Now the whole body lives inside ONE <Page> and lets
          @react-pdf/renderer's own automatic pagination decide where
          content actually needs to spill onto a new physical page instead:
          Header/Footer are `fixed` so they repeat on every physical page
          this spans, every card/table/row inside each section keeps
          `wrap={false}` so nothing splits mid-element, and every SectionHead
          reserves `minPresenceAhead` so a heading can never render orphaned
          at the very bottom of a page with nothing under it. */}
      <Page size="A4" style={s.page}>
        <Header consultant={consultant} docLabel="Growth Proposal" />
        <View style={s.pageTitleRow}>
          <Text style={s.pageTitle}>Growth Proposal</Text>
          <Text style={s.pageSubtitle}>
            Prepared for {business.customerName} · {business.businessName} · {generatedDate}
            {validUntil ? ` · Valid until ${validUntil}` : ""}
            </Text>
          </View>

          {hasExecutiveSummary ? (
            <View>
              {/* Heading wrapped together with the FIRST block only (not the
                  whole section) — per the "keep a heading with at least its
                  first content block, let the rest flow" rule. */}
              <View wrap={false}>
                <SectionHead number="1.1" title="Executive Summary" level="major" />
                {summaryCurrentSituationText ? (
                  <View style={s.execBlock}>
                    <Text style={s.execBlockLabel}>What We Understand</Text>
                    <Text style={s.bodyText}>{summaryCurrentSituationText}</Text>
                  </View>
                ) : null}
              </View>

              {summaryOpportunityText ? (
                <View style={[s.calloutCard, { backgroundColor: COLORS.greenSoft }]} wrap={false}>
                  <Text style={[s.calloutLabel, { color: COLORS.greenDark }]}>The Opportunity</Text>
                  <Text style={s.bodyText}>{summaryOpportunityText}</Text>
                </View>
              ) : null}

              {summaryRecommendedDirectionText ? (
                <View style={s.execBlock} wrap={false}>
                  <Text style={s.execBlockLabel}>What We Recommend</Text>
                  <Text style={s.bodyText}>{summaryRecommendedDirectionText}</Text>
                </View>
              ) : null}

              {summaryApproachText ? (
                <View style={[s.calloutCard, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line }]} wrap={false}>
                  <Text style={[s.calloutLabel, { color: COLORS.ink }]}>Our Approach</Text>
                  <Text style={s.bodyText}>{summaryApproachText}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 1.2 REQUIREMENTS — numbered info cards when the consultant's
              text is written as "Label: detail" pairs, else a numbered list.
              The card-grid branch is wrapped together with its heading
              (wrap={false}) because @react-pdf/renderer can't split a
              flex-wrap grid mid-row across a page break — without this, a
              grid that doesn't fit in the room left on the current page
              moves to the next page ON ITS OWN, stranding the "1.2
              Requirements" heading alone at the bottom of the page above
              it (caught during this round's visual QA on the 2.4 Roadmap
              and 4.1 Pricing grids — same underlying cause, fixed the same
              way everywhere it applies). The plain NumberedList fallback
              doesn't have this problem (each line is already its own
              wrap={false} row, so it can split across pages fine) and is
              deliberately left free to flow. */}
          {hasRequirements ? (
            requirementsCards ? (
              <View wrap={false}>
                <SectionHead number="1.2" title="Requirements" level="major" />
                <InfoCardGrid items={requirementsCards} />
              </View>
            ) : (
              <View wrap={false}>
                <SectionHead number="1.2" title="Requirements" level="major" />
                <NumberedList text={requirementsText!} />
              </View>
            )
          ) : null}

          {/* 1.3 CHALLENGES & OPPORTUNITIES — each block renders as a real
              Item/Detail table when the consultant's text is written as
              "Label: detail" pairs, else a plain bullet list. Each
              sub-heading ("What We Found" / "Competitive Landscape") is
              wrapped wrap={false} together with its own table/list — a
              live-rendered test caught this exact sub-heading stranding
              alone at the bottom of a page with its content (a table row
              or two) pushed to the next page on its own, the same class of
              orphaned-heading bug as a top-level SectionHead. The outer "1.3"
              SectionHead is likewise wrapped with whichever of the two
              sub-blocks comes first, so IT can't be orphaned either. */}
          {hasChallenges
            ? (() => {
                const topProblemsBlock = challengesTopProblemsText ? (
                  <View style={{ marginBottom: 14 }} wrap={false}>
                    <Text style={s.subSectionLabel}>What We Found</Text>
                    {(() => {
                      const items = parseLabelDetailList(challengesTopProblemsText);
                      return items ? (
                        <View style={s.findingsTable}>
                          {items.map((item, idx) => (
                            <View key={idx} style={[s.findingsRow, idx % 2 === 1 ? s.findingsRowAlt : undefined, idx === items.length - 1 ? s.findingsRowLast : undefined]}>
                              <Text style={s.findingsLabel}>{item.label}</Text>
                              <Text style={s.findingsDetail}>{item.detail}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <BulletList text={challengesTopProblemsText} />
                      );
                    })()}
                  </View>
                ) : null;

                const competitorBlock = challengesCompetitorInsightsText ? (
                  <View wrap={false}>
                    <Text style={s.subSectionLabel}>Competitive Landscape</Text>
                    {(() => {
                      const items = parseLabelDetailList(challengesCompetitorInsightsText);
                      return items ? (
                        <View style={s.findingsTable}>
                          {items.map((item, idx) => (
                            <View key={idx} style={[s.findingsRow, idx % 2 === 1 ? s.findingsRowAlt : undefined, idx === items.length - 1 ? s.findingsRowLast : undefined]}>
                              <Text style={s.findingsLabel}>{item.label}</Text>
                              <Text style={s.findingsDetail}>{item.detail}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <BulletList text={challengesCompetitorInsightsText} />
                      );
                    })()}
                  </View>
                ) : null;

                const firstBlock = challengesTopProblemsText ? topProblemsBlock : competitorBlock;
                const restBlock = challengesTopProblemsText ? competitorBlock : null;

                return (
                  <View>
                    <View wrap={false}>
                      <SectionHead number="1.3" title="Challenges &amp; Opportunities" level="major" />
                      {firstBlock}
                    </View>
                    {restBlock}
                  </View>
                );
              })()
            : null}

          {/* 2.1 DIGITAL GROWTH STRATEGY — a vertical Attract -> Engage ->
              Convert -> Retain flow, each stage its own block connected by a
              real ↓ glyph (design system §12). A stage with nothing typed is
              simply omitted, never padded with invented copy. Heading is
              wrapped wrap={false} with the first stage card only (not the
              whole flow) — a stage card can be taller than the heading's own
              minPresenceAhead reservation, so this guarantees the heading
              never renders orphaned regardless of card height. */}
          {hasStrategy ? (
            <View>
              {filledStrategyStages.map((stage, i) => {
                const stageBlock = (
                  <View key={stage.label}>
                    <View style={s.flowStage} wrap={false}>
                      <View style={s.flowStageHead}>
                        <Text style={s.flowStageNum}>{String(i + 1).padStart(2, "0")}</Text>
                        <Text style={s.flowStageLabel}>{stage.label}</Text>
                      </View>
                      <BulletList text={stage.text!} />
                    </View>
                    {i < filledStrategyStages.length - 1 ? <FlowArrow /> : null}
                  </View>
                );
                return i === 0 ? (
                  <View wrap={false} key={`${stage.label}-head`}>
                    <SectionHead number="2.1" title="Digital Growth Strategy" level="major" subtitle="Attract → Engage → Convert → Retain" />
                    {stageBlock}
                  </View>
                ) : (
                  stageBlock
                );
              })}
            </View>
          ) : null}

          {/* 2.2 RECOMMENDED SERVICES & SCOPE: a single consultant
              recommendation write-up (client's requirement/goal, then what's
              recommended to achieve it) — NOT a services table. This is a
              deliberate divergence from the house design system's generic
              "Services & Scope" table pattern: the consultant explicitly
              corrected this section once already (see the project's own
              history) to be one prose write-up, not a table or the priced
              packages (those live on the Commercial Terms page instead). Per
              the design system's own "Source of Truth" rule — user-provided
              correction outranks a general design default — this stays a
              write-up, just restyled to match the rest of the document. */}
          {hasRecommendedServices ? (
            <View>
              <SectionHead number="2.2" title="Recommended Services &amp; Scope" level="major" />
              <BulletList text={recommendedServicesText!} />
            </View>
          ) : null}

          {/* 2.3 TOOLS & RESOURCE PLAN */}
          {toolsResourcePlanText ? (
            <View>
              <SectionHead number="2.3" title="Tools &amp; Resource Plan" level="major" />
              <View style={s.toolsBlock}>
                <BulletList text={toolsResourcePlanText} />
              </View>
            </View>
          ) : null}

          {/* 2.4 90-DAY GROWTH ROADMAP — equal-width columns, 3 per row
              (design system §15), wrapping to further rows for more than 3
              phases. "MONTH N" is just an honest sequence marker for
              whatever phase comes Nth — it never asserts a specific calendar
              duration the underlying phase data doesn't itself specify.
              Heading + grid are wrapped together (wrap={false}) — a
              flex-wrap grid can't be split mid-row across a page break, so
              without this a grid that doesn't fit the room left on the
              current page moves to the next page alone, stranding the
              heading (the bug this round's visual QA actually caught). */}
          {roadmapPhases.length > 0 ? (
            <View wrap={false}>
              <SectionHead number="2.4" title="90-Day Growth Roadmap" level="major" />
              <View style={s.roadmapRow}>
                {roadmapPhases.map((phase, i) => (
                  <View key={i} style={[s.roadmapCard, (i + 1) % 3 === 0 ? s.roadmapCardLast : undefined]} wrap={false}>
                    <Text style={s.roadmapTag}>Month {i + 1}</Text>
                    <Text style={s.roadmapTitle}>{phase.title}</Text>
                    <BulletList text={phase.itemsText} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* 2.5 KPI & MEASUREMENT FRAMEWORK — a 2-column card grid (one
              card per platform, name + a wrapped chip row of the metrics
              tracked for it). No projected numbers, not tied to any one
              pricing package. Heading + grid wrapped together for the same
              can't-split-a-flex-wrap-grid reason as 2.4 above; the
              Measurement Framework notes below the grid are a plain bullet
              list (each line its own wrap={false} row already) so they're
              deliberately left free to flow independently. */}
          {hasKpiSection ? (
            <View>
              <View wrap={false}>
                <SectionHead number="2.5" title="KPI &amp; Measurement Framework" level="major" />
                <View style={s.cardGrid}>
                {filledKpiPlatforms.map((p, i) => {
                  const metrics = p.metricsText
                    .split(/[\n,]+/)
                    .map((m) => m.trim())
                    .filter(Boolean);
                  return (
                    <View key={i} style={[s.kpiCard, i % 2 === 1 ? s.kpiCardEven : undefined]} wrap={false}>
                      <Text style={s.kpiCardLabel}>{p.platform}</Text>
                      {metrics.length > 0 ? (
                        <View style={s.chipsRow}>
                          {metrics.map((m, idx) => (
                            <Text key={idx} style={s.chip}>
                              {m}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
                </View>
              </View>

              {kpiFrameworkNotesText ? (
                <View style={{ marginTop: filledKpiPlatforms.length > 0 ? 4 : 0 }} wrap={false}>
                  <Text style={s.subSectionLabel}>Measurement Framework</Text>
                  <BulletList text={kpiFrameworkNotesText} />
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 3. DELIVERABLES: 3.1 Monthly / 3.2 One-Time, ONE shared list
              for the whole engagement (not per package — every pricing tier
              gets the same scope of work; only price/services differ, and
              those are covered on the Recommended Services & Commercial
              Terms sections). Each mini-label (3.1/3.2) is wrapped
              wrap={false} together with its own table/list — a live-rendered
              test proposal caught "3.2 One-Time Deliverable" stranded alone
              at the bottom of a page with its table pushed to the next page,
              a large gap left underneath the label. The outer "3" SectionHead
              is wrapped with whichever of 3.1/3.2 comes first, same reasoning
              as 1.3 above. */}
          {hasDeliverables
            ? (() => {
                const monthlyBlock = monthlyDeliverablesText ? (
                  <View style={s.deliverablesPkgBlock} wrap={false}>
                    <Text style={s.miniSectionLabel}>3.1 Monthly Deliverable</Text>
                    {(() => {
                      const items = parseLabelDetailList(monthlyDeliverablesText);
                      return items ? (
                        <View style={s.itemTable}>
                          {items.map((item, idx) => (
                            <View key={idx} style={[s.itemRow, idx % 2 === 1 ? s.itemRowAlt : undefined, idx === items.length - 1 ? s.itemRowLast : undefined]}>
                              <Text style={s.itemLabel}>{item.label}</Text>
                              <Text style={s.itemDetail}>{item.detail}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <BulletList text={monthlyDeliverablesText} />
                      );
                    })()}
                  </View>
                ) : null;

                const oneTimeBlock = oneTimeDeliverablesText ? (
                  <View style={s.deliverablesPkgBlock} wrap={false}>
                    <Text style={s.miniSectionLabel}>3.2 One-Time Deliverable</Text>
                    {(() => {
                      const items = parseLabelDetailList(oneTimeDeliverablesText);
                      return items ? (
                        <View style={s.itemTable}>
                          {items.map((item, idx) => (
                            <View key={idx} style={[s.itemRow, idx % 2 === 1 ? s.itemRowAlt : undefined, idx === items.length - 1 ? s.itemRowLast : undefined]}>
                              <Text style={s.itemLabel}>{item.label}</Text>
                              <Text style={s.itemDetail}>{item.detail}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <BulletList text={oneTimeDeliverablesText} />
                      );
                    })()}
                  </View>
                ) : null;

                const firstBlock = monthlyDeliverablesText ? monthlyBlock : oneTimeBlock;
                const restBlock = monthlyDeliverablesText ? oneTimeBlock : null;

                return (
                  <View>
                    <View wrap={false}>
                      <SectionHead number="3" title="Deliverables" level="major" />
                      {firstBlock}
                    </View>
                    {restBlock}
                  </View>
                );
              })()
            : null}

          {/* 4. COMMERCIAL TERMS: 4.1 Pricing packages, 4.2 Project Fee
              Discounts (now a real comparison table — Package / Standard /
              one column per parsed discount tier — rather than a bullet
              list repeated under each card, whenever the schedule parses
              cleanly). Pricing (and the description-embedded cost breakup,
              when a package's Description is written that way) lives here
              rather than on Recommended Services & Scope, per the
              full-flow order. Always present (packages are mandatory), and
              — per the continuous-flow note above — no longer forced onto
              its own fresh page; it only starts a new physical page if it
              genuinely doesn't fit under whatever came before it. */}
          <View>
            {/* "4. Commercial Terms" / "4.1 Pricing packages" / the pricing
                row all wrapped together in one wrap={false} block — same
                reasoning as the 1.2/2.4/2.5 grids above, one level up: with
                the row alone wrapped but the two headings left outside of
                it, the row (and its own heading) could still move to the
                next page as a unit while stranding "4. Commercial Terms"
                alone on the page above (caught during this round's second
                visual QA pass — the fix needed to include BOTH headings,
                not just the inner one). */}
            <View wrap={false}>
              <SectionHead
                number="4"
                title="Commercial Terms"
                level="major"
                subtitle={validUntil ? `Valid until ${validUntil}` : undefined}
              />
              <SectionHead number="4.1" title="Pricing packages" />
              <View style={s.packagesRow}>
                {packages.map((pkg, i) => {
            const breakup = parseServiceBreakup(pkg.description);
            return (
              <View
                key={pkg.key || i}
                style={[s.pricingCard, i === packages.length - 1 ? s.pricingCardLast : undefined, pkg.recommended ? s.pricingCardRecommended : undefined]}
              >
                {pkg.recommended ? (
                  <View style={s.pricingRibbon}>
                    <Text style={s.pricingRibbonText}>★ RECOMMENDED</Text>
                  </View>
                ) : null}
                <View style={s.pricingHead}>
                  <Text style={s.pricingLabel}>{pkg.label}</Text>
                  <Text style={s.pricingValue}>{formatCurrency(pkg.price, pkg.currency)}</Text>
                </View>
                <View style={s.pricingBody}>
                  {/* Plain-prose Description only shows here when it ISN'T an
                      itemized cost breakup (that case renders as the table
                      below instead) — otherwise the same text would appear
                      twice, once as prose and once broken into line items. */}
                  {!breakup && pkg.description ? <Text style={s.pricingDesc}>{pkg.description}</Text> : null}
                  {pkg.selectedServiceLabels && pkg.selectedServiceLabels.length > 0 ? (
                    <>
                      <Text style={s.miniSectionLabel}>Services Included</Text>
                      <View style={s.chipsRow}>
                        {pkg.selectedServiceLabels.map((label, idx) => (
                          <Text key={idx} style={s.chip}>
                            {label}
                          </Text>
                        ))}
                      </View>
                    </>
                  ) : null}
                  {breakup ? (
                    <>
                      <View style={s.breakupTable}>
                        {breakup.map((item, idx) => (
                          <View
                            key={idx}
                            style={[s.breakupRow, idx % 2 === 1 ? s.breakupRowAlt : undefined, idx === breakup.length - 1 ? s.breakupRowLast : undefined]}
                          >
                            <Text style={s.breakupLabel}>{item.label}</Text>
                            <Text style={s.breakupAmount}>{formatCurrency(item.amount, pkg.currency)}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={s.breakupCaption}>Itemized for reference — total investment shown above.</Text>
                    </>
                  ) : null}
                </View>
              </View>
            );
              })}
              </View>
            </View>

        {hasDiscountTiers ? (
          <View wrap={false} style={{ marginTop: 6 }}>
            <SectionHead number="4.2" title="Project Fee Discounts" />
            {discountTiersAllParsed ? (
              // One real comparison table — the same discount schedule
              // applies no matter which package the client picks; only the
              // computed dollar amount differs per row, since it's derived
              // from each package's own price.
              <View style={s.discountTable}>
                <View style={s.discountHeadRow}>
                  <View style={[s.discountHeadCell, s.discountHeadCellFirst]}>
                    <Text style={s.discountHeadCellText}>Package</Text>
                  </View>
                  <View style={s.discountHeadCell}>
                    <Text style={s.discountHeadCellText}>Standard</Text>
                  </View>
                  {discountColumns.map((tier, idx) => (
                    <View key={idx} style={s.discountHeadCell}>
                      <Text style={s.discountHeadCellText}>{tier.months}-Month Upfront</Text>
                      <Text style={s.discountHeadCellSub}>({tier.percent}% off)</Text>
                    </View>
                  ))}
                </View>
                {packages.map((pkg, i) => {
                  const tiers = sharedDiscountTiersByPackage[i] ?? [];
                  const bestIdx = tiers.length > 0 ? tiers.reduce((best, t, idx) => (t.percent > tiers[best].percent ? idx : best), 0) : -1;
                  return (
                    <View key={pkg.key || i} style={[s.discountRow, i % 2 === 1 ? s.discountRowAlt : undefined]}>
                      <Text style={[s.discountCell, s.discountCellFirst]}>{pkg.label}</Text>
                      <Text style={s.discountCell}>{formatCurrency(pkg.price, pkg.currency)}</Text>
                      {tiers.map((tier, idx) => (
                        <Text key={idx} style={[s.discountCell, idx === bestIdx ? s.discountCellBest : undefined]}>
                          {formatCurrency(tier.discountedAmount, pkg.currency)}
                        </Text>
                      ))}
                    </View>
                  );
                })}
              </View>
            ) : (
              // Free text that doesn't parse as strict "N months: X%" tiers
              // has nothing package-specific to compute, so it's shown once
              // rather than duplicated identically under every package card.
              <BulletList text={discountTiersText ?? ""} />
            )}
          </View>
        ) : null}
        </View>

        {/* 5. POLICIES & TERMS (5.1 Revision, 5.2 Client Responsibilities,
            5.3 Not Included, 5.4 Terms & conditions — this exact sub-order
            per the consultant's specified outline; no Approval/signature
            here, that lives in 6. Next Steps below). NOTE: this used to
            also render a "Communication" line (pointOfContactText) here —
            the consultant's outline has no slot for it and asked for it to
            be removed from the proposal entirely rather than folded into
            one of the 4 numbered items above; removed rather than
            relocated. */}
        {(() => {
          // Heading wrapped with whichever of 5.1/5.2/5.3/5.4 comes first —
          // 5.4 Terms & Conditions is always present (termsText is required),
          // so it's the guaranteed fallback "first block" when 5.1-5.3 are
          // all blank.
          const revisionBlock = revisionPolicyText ? (
            <View key="5.1" style={s.policyCard} wrap={false}>
              <View style={s.policyHeadRow}>
                <Text style={s.policyBadge}>5.1</Text>
                <Text style={s.policyTitle}>Revision</Text>
              </View>
              <BulletList text={revisionPolicyText} />
            </View>
          ) : null;

          const responsibilitiesBlock = clientResponsibilitiesText ? (
            <View key="5.2" style={s.policyCard} wrap={false}>
              <View style={s.policyHeadRow}>
                <Text style={s.policyBadge}>5.2</Text>
                <Text style={s.policyTitle}>Client Responsibilities</Text>
              </View>
              <BulletList text={clientResponsibilitiesText} />
            </View>
          ) : null;

          const notIncludedBlock = notIncludedText ? (
            <View key="5.3" style={s.policyCard} wrap={false}>
              <View style={s.policyHeadRow}>
                <Text style={s.policyBadge}>5.3</Text>
                <Text style={s.policyTitle}>Not Included</Text>
              </View>
              <BulletList text={notIncludedText} />
            </View>
          ) : null;

          const termsBlock = (
            <View key="5.4" wrap={false}>
              <View style={s.policyHeadRow}>
                <Text style={s.policyBadge}>5.4</Text>
                <Text style={s.policyTitle}>Terms &amp; Conditions</Text>
              </View>
              <View style={s.termsBlock}>
                <Text style={s.termsText}>{termsText}</Text>
              </View>
            </View>
          );

          const firstBlock = revisionBlock ?? responsibilitiesBlock ?? notIncludedBlock ?? termsBlock;
          const restBlocks = [revisionBlock, responsibilitiesBlock, notIncludedBlock, termsBlock].filter((b) => b && b !== firstBlock);

          return (
            <View>
              <View wrap={false}>
                <SectionHead number="5" title="Policies &amp; Terms" level="major" />
                {firstBlock}
              </View>
              {restBlocks}
            </View>
          );
        })()}

        {/* 6. NEXT STEPS (closing: numbered process — titled steps when
            nextStepsText parses as "Label: detail" pairs, else a plain
            numbered list — followed by the Approval/signature block and the
            closing CTA). */}
        <View>
          {/* Heading wrapped with the whole Next Steps process list when
              present — same "wrap heading + short whole list together"
              pattern as 1.2 Requirements/2.2/2.3 above (Next Steps is always
              a short, 3-5 item process, never long enough to need row-level
              flow). When nextStepsText is blank, the ctaCard right after is
              always present, so the heading is wrapped with that instead so
              it's never left orphaned by itself either way. */}
          {(() => {
            const ctaBlock = (
              <View style={s.ctaCard} wrap={false}>
                <CheckBadge />
                <Text style={s.ctaText}>
                  Pick a plan from the Commercial Terms section above and confirm by reply, call, or WhatsApp — work begins within 2 business days of a signed approval.
                </Text>
              </View>
            );
            return nextStepsText ? (
              <>
                <View wrap={false}>
                  <SectionHead number="6" title="Next Steps" level="major" />
                  <View style={s.nextStepsBlock}>{nextStepsSteps ? <ProcessSteps items={nextStepsSteps} /> : <NumberedList text={nextStepsText} />}</View>
                </View>
                {ctaBlock}
              </>
            ) : (
              <View wrap={false}>
                <SectionHead number="6" title="Next Steps" level="major" />
                {ctaBlock}
              </View>
            );
          })()}

          <View wrap={false}>
            <View style={s.sectionHeadRow}>
              <Text style={s.sectionHeadTitle}>Approval</Text>
              <View style={s.sectionHeadRule} />
            </View>
            <View style={s.approvalLineRow}>
              <Text style={s.approvalLineLabel}>Selected Plan:</Text>
              <View style={s.approvalLineFill} />
            </View>
          </View>

          <Text style={s.authNote}>
            By signing below, {business.customerName} authorizes {consultant.companyName} to proceed with the selected plan under the terms above.
          </Text>

          <View style={s.acceptRow} wrap={false}>
            <View style={s.acceptCol}>
              <View style={s.acceptLine} />
              <Text style={s.acceptLabel}>Client signature</Text>
            </View>
            <View style={[s.acceptCol, s.acceptColLast]}>
              <View style={s.acceptLine} />
              <Text style={s.acceptLabel}>Date</Text>
            </View>
          </View>

          <View style={{ marginTop: 36, alignItems: "center" }} wrap={false}>
            <Text style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink, textAlign: "center", marginBottom: 12 }}>{consultant.ctaText}</Text>
            <Text style={{ fontSize: 10, fontWeight: 700, color: COLORS.ink }}>{consultant.consultantName}</Text>
            <Text style={{ fontSize: 9, color: COLORS.sub }}>{consultant.companyName}</Text>
            {consultant.phone ? <Text style={{ fontSize: 9, color: COLORS.sub }}>{consultant.phone}</Text> : null}
            {consultant.whatsapp ? <Text style={{ fontSize: 9, color: COLORS.sub }}>WhatsApp: {consultant.whatsapp}</Text> : null}
            {consultant.email ? <Text style={{ fontSize: 9, color: COLORS.sub }}>{consultant.email}</Text> : null}
            {consultant.website ? <Text style={{ fontSize: 9, color: COLORS.sub }}>{consultant.website}</Text> : null}
          </View>
        </View>

        <Footer consultant={consultant} />
      </Page>
    </Document>
  );
}
