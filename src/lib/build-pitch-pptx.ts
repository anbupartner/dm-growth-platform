import type { MasterSlide, IconKey } from "@/lib/pitch-slides";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/pitch-slides";

// Exports the same deck shown in the in-app slideshow popup as a real,
// editable PowerPoint (.pptx) file — built client-side with pptxgenjs, so
// the consultant can open it in PowerPoint/Google Slides/Keynote, tweak it,
// and present without this app open at all.
//
// This is the app's "Master Client Presentation Template" (DM Consultant
// project doc of the same name): a fixed 12-slide skeleton, fixed visual
// identity — charcoal + professional green, Cambria/Calibri, a feather-
// icon-in-a-circle motif, a dark opening/closing "sandwich" — reused
// unchanged across every client so two decks are instantly recognizable as
// coming from the same agency. Every constant/helper below is a direct
// port of the reference implementation (the approved Balwaan deck's
// generate.js) — content comes from MasterSlide, nothing here is invented.
//
// Icons ship as pre-rendered PNGs under public/pitch-icons/ (one file per
// icon+color, built once via react-icons/fi + sharp — see the master
// template doc's "icon rendering gotcha" note) so this can addImage() them
// by URL in the browser without a raster step at export time.

const C = {
  ink: "1c2126",
  inkSoft: "3d454d",
  sub: "69727b",
  faint: "9aa2ab",
  line: "e2e6e9",
  white: "ffffff",
  surface: "f6f7f6",
  surfaceAlt: "eceeec",
  green: "0e6b4c",
  greenDark: "0a5039",
  greenSoft: "e6f2ec",
  bronze: "8a6a35",
  bronzeSoft: "f3ede0",
  darkMuted: "8a9199",
  darkBody: "c7cdd2",
  darkLine: "3d454d",
};

const FONT_HEAD = "Cambria";
const FONT_BODY = "Calibri";

const PW = 13.33;
const PH = 7.5;
const MARGIN = 0.6;

function iconPath(name: IconKey, color: "white" | "sub" | "ink" | "green"): string {
  return `/pitch-icons/${name}-${color}.png`;
}

type Slide = import("pptxgenjs").default.Slide;
type Pptx = import("pptxgenjs").default;

function pageNum(slide: Slide, n: number, total: number) {
  slide.addText(`${String(n).padStart(2, "0")} / ${total}`, {
    x: PW - 1.4,
    y: PH - 0.45,
    w: 1.0,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 9,
    color: C.faint,
    align: "right",
    isTextBox: true,
    margin: 0,
  });
}

function brandTag(slide: Slide, businessName: string) {
  slide.addText(`${businessName.toUpperCase()} · GROWTH STRATEGY`, {
    x: MARGIN,
    y: PH - 0.45,
    w: 7,
    h: 0.3,
    fontFace: FONT_BODY,
    fontSize: 8.5,
    color: C.faint,
    charSpacing: 1.2,
    isTextBox: true,
    margin: 0,
  });
}

function circleIcon(
  slide: Slide,
  { x, y, d = 0.62, iconName, iconColor = "white", bg = C.green }: { x: number; y: number; d?: number; iconName: IconKey; iconColor?: "white" | "sub" | "ink" | "green"; bg?: string }
) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: bg }, line: { type: "none" } });
  const pad = d * 0.26;
  slide.addImage({ path: iconPath(iconName, iconColor), x: x + pad / 2, y: y + pad / 2, w: d - pad, h: d - pad });
}

function slideTitle(slide: Slide, kicker: string, title: string, opts: { dark?: boolean; titleW?: number; titleSize?: number } = {}) {
  const dark = !!opts.dark;
  slide.addText(kicker.toUpperCase(), {
    x: MARGIN,
    y: 0.55,
    w: 10,
    h: 0.32,
    fontFace: FONT_BODY,
    fontSize: 12,
    bold: true,
    color: C.green,
    charSpacing: 1.6,
    isTextBox: true,
    margin: 0,
  });
  slide.addText(title, {
    x: MARGIN,
    y: 0.86,
    w: opts.titleW || 11.4,
    h: 0.75,
    fontFace: FONT_HEAD,
    fontSize: opts.titleSize || 30,
    bold: true,
    color: dark ? C.white : C.ink,
    isTextBox: true,
    margin: 0,
  });
}

const SLIDE_KICKERS: Record<Exclude<MasterSlide["kind"], "opening" | "closing">, [string, string]> = {
  execInsight: ["What We See", "The Big Picture, Before The Detail"],
  digitalHealth: ["Your Digital Health Today", "Where Does Your Website Stand?"],
  businessProblem: ["The Business Problem", "The Gap Isn't Just The Website — It's The Journey"],
  discovered: ["What We Discovered", "Key Digital Opportunities"],
  customerInsight: ["Customer & Market Insight", "Who Are We Trying To Win?"],
  competitor: ["Competitor / Market Insight", "Where The Competition Creates Pressure"],
  strategicApproach: ["Our Strategic Approach", "How We Will Approach The Growth"],
  channelInvestment: ["Channel Strategy & Investment", "Where We Will Focus"],
  actionPlan: ["90-Day Action Plan", "From Foundation To Growth"],
  outcomes: ["Expected Outcomes & Success Measurement", "What Success Should Look Like"],
};

export async function buildPitchPptx(slides: MasterSlide[], fileName: string): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5in
  pptx.author = "Growth Platform";
  pptx.title = fileName.replace(/\.pptx$/i, "");

  const businessName = slides.find((s): s is Extract<MasterSlide, { kind: "opening" }> => s.kind === "opening")?.businessName ?? "";
  const total = slides.length;

  slides.forEach((slide, i) => {
    const n = i + 1;
    const s = pptx.addSlide();
    s.background = { color: C.white };
    switch (slide.kind) {
      case "opening":
        renderOpening(s, slide);
        pageNum(s, n, total);
        return;
      case "closing":
        renderClosing(pptx, s, slide, n, total);
        return;
      default: {
        const [kicker, title] = SLIDE_KICKERS[slide.kind];
        slideTitle(s, kicker, title);
        renderContent(pptx, s, slide);
        brandTag(s, businessName);
        pageNum(s, n, total);
      }
    }
  });

  await pptx.writeFile({ fileName });
}

function renderContent(pptx: Pptx, s: Slide, slide: MasterSlide) {
  switch (slide.kind) {
    case "execInsight":
      return renderExecInsight(s, slide);
    case "digitalHealth":
      return renderDigitalHealth(pptx, s, slide);
    case "businessProblem":
      return renderBusinessProblem(s, slide);
    case "discovered":
      return renderDiscovered(s, slide);
    case "customerInsight":
      return renderCustomerInsight(s, slide);
    case "competitor":
      return renderCompetitor(s, slide);
    case "strategicApproach":
      return renderStrategicApproach(s, slide);
    case "channelInvestment":
      return renderChannelInvestment(pptx, s, slide);
    case "actionPlan":
      return renderActionPlan(s, slide);
    case "outcomes":
      return renderOutcomes(s, slide);
  }
}

// ---------------------------------------------------------------- Slide 1

function renderOpening(s: Slide, slide: Extract<MasterSlide, { kind: "opening" }>) {
  s.background = { color: C.ink };
  circleIcon(s, { x: PW - 2.0, y: 0.7, d: 1.0, iconName: "trending-up" });

  s.addText("DIGITAL GROWTH AUDIT & STRATEGY", {
    x: MARGIN, y: 2.15, w: 10, h: 0.4,
    fontFace: FONT_BODY, fontSize: 14, bold: true, color: C.green, charSpacing: 2.2,
    isTextBox: true, margin: 0,
  });
  s.addText(slide.businessName, {
    x: MARGIN, y: 2.6, w: 12.1, h: 1.5,
    fontFace: FONT_HEAD, fontSize: slide.businessName.length > 22 ? 44 : 66, bold: true, color: C.white,
    isTextBox: true, margin: 0,
  });
  s.addText("Understanding where you are today — and where your digital growth can go next.", {
    x: MARGIN, y: 4.05, w: 9.2, h: 0.6,
    fontFace: FONT_BODY, fontSize: 16, color: C.darkBody,
    isTextBox: true, margin: 0,
  });

  s.addText("PREPARED FOR", {
    x: MARGIN, y: 6.0, w: 4, h: 0.28,
    fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.darkMuted, charSpacing: 1.4,
    isTextBox: true, margin: 0,
  });
  s.addText(slide.customerName, {
    x: MARGIN, y: 6.27, w: 8, h: 0.32,
    fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.white,
    isTextBox: true, margin: 0,
  });
  s.addText("PREPARED BY", {
    x: MARGIN, y: 6.7, w: 4, h: 0.28,
    fontFace: FONT_BODY, fontSize: 9, bold: true, color: C.darkMuted, charSpacing: 1.4,
    isTextBox: true, margin: 0,
  });
  s.addText([slide.companyName, slide.generatedDate].filter(Boolean).join("  ·  "), {
    x: MARGIN, y: 6.97, w: 9, h: 0.32,
    fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.white,
    isTextBox: true, margin: 0,
  });
}

// ---------------------------------------------------------------- Slide 2

function renderExecInsight(s: Slide, slide: Extract<MasterSlide, { kind: "execInsight" }>) {
  const gx = [MARGIN, MARGIN + 5.95];
  const gy = [1.95, 4.35];
  const cw = 5.75;
  const ch = 2.15;

  slide.cards.slice(0, 4).forEach((c, i) => {
    const x = gx[i % 2];
    const y = gy[Math.floor(i / 2)];
    s.addShape("roundRect", { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: C.surface }, line: { type: "none" } });
    circleIcon(s, { x: x + 0.3, y: y + 0.3, d: 0.55, iconName: c.icon });
    s.addText(c.n, {
      x: x + cw - 1.1, y: y + 0.22, w: 0.9, h: 0.5,
      fontFace: FONT_HEAD, fontSize: 26, bold: true, color: C.line,
      align: "right", isTextBox: true, margin: 0,
    });
    s.addText(c.head, {
      x: x + 0.3, y: y + 1.0, w: cw - 0.6, h: 0.34,
      fontFace: FONT_BODY, fontSize: 14.5, bold: true, color: C.ink,
      isTextBox: true, margin: 0,
    });
    s.addText(c.body, {
      x: x + 0.3, y: y + 1.35, w: cw - 0.6, h: 0.7,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.inkSoft, lineSpacingMultiple: 1.2,
      isTextBox: true, margin: 0,
    });
  });
}

// ---------------------------------------------------------------- Slide 3

function renderDigitalHealth(pptx: Pptx, s: Slide, slide: Extract<MasterSlide, { kind: "digitalHealth" }>) {
  s.addShape("roundRect", { x: MARGIN, y: 1.95, w: 3.9, h: 4.55, rectRadius: 0.08, fill: { color: C.ink }, line: { type: "none" } });
  s.addText("OVERALL AUDIT SCORE", {
    x: MARGIN + 0.35, y: 2.35, w: 3.2, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.darkMuted, charSpacing: 1.2,
    isTextBox: true, margin: 0,
  });
  s.addText(String(Math.round(slide.overall)), {
    x: MARGIN + 0.3, y: 2.6, w: 3.3, h: 1.4,
    fontFace: FONT_HEAD, fontSize: 90, bold: true, color: C.white,
    isTextBox: true, margin: 0,
  });
  s.addText("out of 100", {
    x: MARGIN + 0.35, y: 3.95, w: 3.2, h: 0.35,
    fontFace: FONT_BODY, fontSize: 13, color: C.darkMuted,
    isTextBox: true, margin: 0,
  });
  s.addText(slide.note, {
    x: MARGIN + 0.35, y: 5.4, w: 3.2, h: 1.0,
    fontFace: FONT_BODY, fontSize: 12.5, italic: true, color: C.darkBody, lineSpacingMultiple: 1.25,
    isTextBox: true, margin: 0,
  });

  s.addChart(
    pptx.ChartType.bar,
    [{ name: "Score", labels: slide.scores.map((sc) => sc.label), values: slide.scores.map((sc) => Math.round(sc.value)) }],
    {
      x: MARGIN + 4.25, y: 1.95, w: 7.5, h: 4.55,
      barDir: "bar",
      chartColors: [C.green],
      showTitle: false,
      showLegend: false,
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelColor: C.ink,
      dataLabelFontSize: 11,
      dataLabelFontBold: true,
      catAxisLabelColor: C.inkSoft,
      catAxisLabelFontSize: 11.5,
      valAxisHidden: true,
      valAxisMinVal: 0,
      valAxisMaxVal: 110,
      catAxisLineShow: false,
      valGridLine: { style: "none" },
      barGapWidthPct: 40,
      plotArea: { fill: { color: C.white } },
    }
  );
}

// ---------------------------------------------------------------- Slide 4

function renderBusinessProblem(s: Slide, slide: Extract<MasterSlide, { kind: "businessProblem" }>) {
  const totalW = 12.13;
  const stepW = totalW / slide.stages.length;
  const y = 2.25;
  slide.stages.forEach((label, i) => {
    const x = MARGIN + i * stepW;
    s.addShape("roundRect", { x: x + 0.08, y, w: stepW - 0.5, h: 0.65, rectRadius: 0.06, fill: { color: C.green }, line: { type: "none" } });
    s.addText(label, {
      x: x + 0.08, y, w: stepW - 0.5, h: 0.65,
      fontFace: FONT_BODY, fontSize: 12.5, bold: true, color: C.white,
      align: "center", valign: "middle", isTextBox: true, margin: 0,
    });
    if (i < slide.stages.length - 1) {
      s.addImage({ path: iconPath("arrow-right", "sub"), x: x + stepW - 0.42, y: y + 0.2, w: 0.28, h: 0.28 });
    }
  });

  s.addText("Where the opportunity actually sits:", {
    x: MARGIN, y: 3.35, w: 8, h: 0.35,
    fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.ink,
    isTextBox: true, margin: 0,
  });

  const cw = (12.13 - (slide.columns.length - 1) * 0.2) / slide.columns.length;
  slide.columns.forEach((c, i) => {
    const x = MARGIN + i * (cw + 0.2);
    const y0 = 3.85;
    circleIcon(s, { x, y: y0, d: 0.5, iconName: c.icon });
    s.addText(c.head, {
      x: x + 0.65, y: y0 + 0.02, w: cw - 0.65, h: 0.35,
      fontFace: FONT_BODY, fontSize: 13.5, bold: true, color: C.ink,
      valign: "middle", isTextBox: true, margin: 0,
    });
    s.addText(c.body, {
      x, y: y0 + 0.65, w: cw, h: 1.9,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.inkSoft, lineSpacingMultiple: 1.25,
      isTextBox: true, margin: 0,
    });
  });
}

// ---------------------------------------------------------------- Slide 5

function renderDiscovered(s: Slide, slide: Extract<MasterSlide, { kind: "discovered" }>) {
  const gx = [MARGIN, MARGIN + 6.1];
  const gy = [1.95, 4.35];
  const cw = 5.9, ch = 2.15;
  slide.cards.slice(0, 4).forEach((c, i) => {
    const x = gx[i % 2];
    const y = gy[Math.floor(i / 2)];
    s.addShape("roundRect", { x, y, w: cw, h: ch, rectRadius: 0.08, fill: { color: C.surface }, line: { type: "none" } });
    circleIcon(s, { x: x + 0.28, y: y + 0.26, d: 0.5, iconName: c.icon });
    s.addText(c.head, {
      x: x + 0.9, y: y + 0.26, w: cw - 1.2, h: 0.5,
      fontFace: FONT_BODY, fontSize: 13.5, bold: true, color: C.ink,
      valign: "middle", isTextBox: true, margin: 0,
    });
    const runs = [
      { text: "FINDING  ", options: { bold: true, color: C.green, fontSize: 9.5 } },
      { text: c.finding, options: { color: C.inkSoft, fontSize: 10.5, breakLine: !!c.opportunity } },
      ...(c.opportunity
        ? [
            { text: "OPPORTUNITY  ", options: { bold: true, color: C.green, fontSize: 9.5 } },
            { text: c.opportunity, options: { color: C.inkSoft, fontSize: 10.5 } },
          ]
        : []),
    ];
    s.addText(runs, {
      x: x + 0.28, y: y + 0.85, w: cw - 0.56, h: 1.2,
      fontFace: FONT_BODY, lineSpacingMultiple: 1.2, isTextBox: true, margin: 0,
    });
  });
}

// ---------------------------------------------------------------- Slide 6

function renderCustomerInsight(s: Slide, slide: Extract<MasterSlide, { kind: "customerInsight" }>) {
  const lx = MARGIN, ly = 1.95, lw = 5.6, lh = 4.55;
  s.addShape("roundRect", { x: lx, y: ly, w: lw, h: lh, rectRadius: 0.08, fill: { color: C.surface }, line: { type: "none" } });
  const rows = slide.profile.slice(0, 4);
  const rowH = (lh - 0.6) / Math.max(rows.length, 1);
  rows.forEach((r, i) => {
    const ry = ly + 0.3 + i * rowH;
    s.addText(r.label.toUpperCase(), {
      x: lx + 0.35, y: ry, w: lw - 0.7, h: 0.28,
      fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.green, charSpacing: 1.1,
      isTextBox: true, margin: 0,
    });
    s.addText(r.text, {
      x: lx + 0.35, y: ry + 0.3, w: lw - 0.7, h: rowH - 0.35,
      fontFace: FONT_BODY, fontSize: 12, color: C.inkSoft, lineSpacingMultiple: 1.2,
      isTextBox: true, margin: 0,
    });
  });

  const rx = 6.5, rw = PW - MARGIN - rx;
  s.addText("THE PATH TO A CUSTOMER", {
    x: rx, y: ly - 0.02, w: rw, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.sub, charSpacing: 1.1,
    isTextBox: true, margin: 0,
  });
  const stepH = 0.68;
  slide.journey.forEach((st, i) => {
    const y = ly + 0.35 + i * stepH;
    circleIcon(s, { x: rx, y, d: 0.42, iconName: st.icon });
    s.addText(st.text, {
      x: rx + 0.58, y: y - 0.02, w: rw - 0.6, h: 0.46,
      fontFace: FONT_BODY, fontSize: 12.5, bold: true, color: C.ink,
      valign: "middle", isTextBox: true, margin: 0,
    });
  });
}

// ---------------------------------------------------------------- Slide 7

function renderCompetitor(s: Slide, slide: Extract<MasterSlide, { kind: "competitor" }>) {
  if (slide.sites.length === 0) {
    s.addText("Competitor data unavailable — no competitor URLs were analyzed for this report.", {
      x: MARGIN, y: 2.6, w: 11, h: 0.6,
      fontFace: FONT_BODY, fontSize: 14, italic: true, color: C.sub,
      isTextBox: true, margin: 0,
    });
  } else {
    const colW = (12.13 - (slide.sites.length - 1) * 0.3) / slide.sites.length;
    const metricRows: [string, keyof (typeof slide.sites)[number]][] = [
      ["Homepage Content", "wordCount"],
      ["Blog / Resources", "blog"],
      ["Schema Markup", "schema"],
      ["Mobile-Ready", "mobile"],
      ["HTTPS Secure", "https"],
      ["Response Time", "speed"],
    ];
    const y0 = 1.95;
    slide.sites.forEach((site, i) => {
      const x = MARGIN + i * (colW + 0.3);
      s.addShape("roundRect", { x, y: y0, w: colW, h: 4.35, rectRadius: 0.08, fill: { color: site.featured ? C.ink : C.surface }, line: { type: "none" } });
      s.addText(site.name.toUpperCase(), {
        x: x + 0.25, y: y0 + 0.22, w: colW - 0.5, h: 0.3,
        fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.green, charSpacing: 0.8,
        isTextBox: true, margin: 0,
      });
      s.addText(site.host, {
        x: x + 0.25, y: y0 + 0.5, w: colW - 0.5, h: 0.3,
        fontFace: FONT_BODY, fontSize: 10.5, color: site.featured ? C.darkBody : C.sub,
        isTextBox: true, margin: 0,
      });
      if (!site.reachable) {
        s.addText("Not reachable", {
          x: x + 0.25, y: y0 + 1.1, w: colW - 0.5, h: 0.4,
          fontFace: FONT_BODY, fontSize: 12, italic: true, color: site.featured ? C.darkMuted : C.faint,
          isTextBox: true, margin: 0,
        });
        return;
      }
      metricRows.forEach((mr, j) => {
        const ry = y0 + 1.05 + j * 0.52;
        s.addText(mr[0], {
          x: x + 0.25, y: ry, w: colW - 0.5, h: 0.24,
          fontFace: FONT_BODY, fontSize: 9, color: site.featured ? C.darkMuted : C.faint, charSpacing: 0.6,
          isTextBox: true, margin: 0,
        });
        s.addText(String(site[mr[1]]), {
          x: x + 0.25, y: ry + 0.22, w: colW - 0.5, h: 0.3,
          fontFace: FONT_BODY, fontSize: 13, bold: true, color: site.featured ? C.white : C.ink,
          isTextBox: true, margin: 0,
        });
      });
    });
  }

  if (slide.insights.length > 0) {
    s.addText("INITIAL COMPETITOR OBSERVATIONS", {
      x: MARGIN, y: 6.45, w: 6, h: 0.26,
      fontFace: FONT_BODY, fontSize: 9.5, bold: true, color: C.sub, charSpacing: 1,
      isTextBox: true, margin: 0,
    });
    s.addText(slide.insights.join("  ·  "), {
      x: MARGIN, y: 6.72, w: 12.13, h: 0.4,
      fontFace: FONT_BODY, fontSize: 11, italic: true, color: C.inkSoft,
      isTextBox: true, margin: 0,
    });
  }
}

// ---------------------------------------------------------------- Slide 8

function renderStrategicApproach(s: Slide, slide: Extract<MasterSlide, { kind: "strategicApproach" }>) {
  const gap = 0.28;
  const colW = (12.13 - 4 * gap) / 5;
  const y0 = 2.15;
  slide.stages.forEach((st, i) => {
    const x = MARGIN + i * (colW + gap);
    circleIcon(s, { x: x + colW / 2 - 0.31, y: y0, d: 0.62, iconName: st.icon });
    s.addText(String(i + 1).padStart(2, "0"), {
      x, y: y0 + 0.75, w: colW, h: 0.35,
      fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.line,
      align: "center", isTextBox: true, margin: 0,
    });
    s.addText(st.head.toUpperCase(), {
      x, y: y0 + 1.05, w: colW, h: 0.34,
      fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.ink,
      align: "center", isTextBox: true, margin: 0,
    });
    s.addText(
      st.items.map((it, k) => ({ text: it, options: { breakLine: k < st.items.length - 1 } })),
      {
        x: x + 0.05, y: y0 + 1.5, w: colW - 0.1, h: 1.7,
        fontFace: FONT_BODY, fontSize: 10.5, color: C.inkSoft, align: "center",
        lineSpacingMultiple: 1.35, isTextBox: true, margin: 0,
      }
    );
    if (i < slide.stages.length - 1) {
      s.addImage({ path: iconPath("arrow-right", "sub"), x: x + colW + gap / 2 - 0.09, y: y0 + 0.2, w: 0.18, h: 0.18 });
    }
  });

  s.addText("The client should be able to see the entire strategy in ten seconds.", {
    x: MARGIN, y: 6.5, w: 12.13, h: 0.35,
    fontFace: FONT_BODY, fontSize: 11.5, italic: true, color: C.sub,
    align: "center", isTextBox: true, margin: 0,
  });
}

// ---------------------------------------------------------------- Slide 9

function renderChannelInvestment(pptx: Pptx, s: Slide, slide: Extract<MasterSlide, { kind: "channelInvestment" }>) {
  const chartData = [{
    name: "Budget Split",
    labels: slide.channels.map((c) => c.head),
    values: slide.channels.map((c) => c.pct),
  }];
  s.addChart(pptx.ChartType.doughnut, chartData, {
    x: MARGIN - 0.1, y: 1.9, w: 5.5, h: 4.3,
    chartColors: [C.green, C.bronze, C.inkSoft, C.faint],
    showTitle: false,
    showLegend: true,
    legendPos: "b",
    legendColor: C.inkSoft,
    legendFontSize: 11,
    showValue: false,
    showPercent: true,
    dataLabelColor: C.white,
    dataLabelFontSize: 11,
    dataLabelFontBold: true,
    holeSize: 55,
  });

  const rx = 6.5, rw = PW - MARGIN - rx;
  slide.channels.forEach((c, i) => {
    const y = 1.9 + i * 1.05;
    circleIcon(s, { x: rx, y, d: 0.55, iconName: c.icon });
    s.addText(c.head.toUpperCase(), {
      x: rx + 0.75, y: y - 0.03, w: rw - 2.1, h: 0.3,
      fontFace: FONT_BODY, fontSize: 12, bold: true, color: C.ink, charSpacing: 0.6,
      isTextBox: true, margin: 0,
    });
    s.addText(c.body, {
      x: rx + 0.75, y: y + 0.26, w: rw - 2.1, h: 0.5,
      fontFace: FONT_BODY, fontSize: 10, color: C.inkSoft, lineSpacingMultiple: 1.15,
      isTextBox: true, margin: 0,
    });
    s.addText(`${Math.round(c.pct)}%`, {
      x: rx + rw - 1.35, y: y - 0.03, w: 1.35, h: 0.32,
      fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.green,
      align: "right", isTextBox: true, margin: 0,
    });
    if (c.amount) {
      s.addText(c.amount, {
        x: rx + rw - 1.35, y: y + 0.26, w: 1.35, h: 0.26,
        fontFace: FONT_BODY, fontSize: 9, color: C.sub,
        align: "right", isTextBox: true, margin: 0,
      });
    }
  });

  if (slide.totalLabel) {
    s.addShape("roundRect", { x: MARGIN, y: 6.35, w: 12.13, h: 0.55, rectRadius: 0.06, fill: { color: C.surface }, line: { type: "none" } });
    s.addText(
      [
        { text: "TOTAL MONTHLY INVESTMENT   ", options: { fontSize: 10.5, bold: true, color: C.sub, charSpacing: 1 } },
        { text: slide.totalLabel, options: { fontSize: 14, bold: true, color: C.ink } },
      ],
      { x: MARGIN + 0.3, y: 6.35, w: 11.5, h: 0.55, fontFace: FONT_BODY, valign: "middle", isTextBox: true, margin: 0 }
    );
  }
}

// ---------------------------------------------------------------- Slide 10

function renderActionPlan(s: Slide, slide: Extract<MasterSlide, { kind: "actionPlan" }>) {
  const gap = 0.35;
  const colW = (12.13 - (slide.phases.length - 1) * gap) / slide.phases.length;
  const y0 = 2.1;
  slide.phases.forEach((p, i) => {
    const x = MARGIN + i * (colW + gap);
    s.addShape("roundRect", { x, y: y0, w: colW, h: 4.25, rectRadius: 0.08, fill: { color: C.surface }, line: { type: "none" } });
    circleIcon(s, { x: x + 0.3, y: y0 + 0.3, d: 0.55, iconName: p.icon });
    s.addText(p.tag, {
      x: x + 0.3, y: y0 + 1.0, w: colW - 0.6, h: 0.28,
      fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.green, charSpacing: 1.2,
      isTextBox: true, margin: 0,
    });
    s.addText(p.head, {
      x: x + 0.3, y: y0 + 1.3, w: colW - 0.6, h: 0.45,
      fontFace: FONT_HEAD, fontSize: 20, bold: true, color: C.ink,
      isTextBox: true, margin: 0,
    });
    s.addText(
      p.items.map((it, k) => ({ text: it, options: { bullet: { code: "25CF", indent: 14 }, breakLine: k < p.items.length - 1 } })),
      {
        x: x + 0.3, y: y0 + 1.95, w: colW - 0.6, h: 2.1,
        fontFace: FONT_BODY, fontSize: 12, color: C.inkSoft, lineSpacingMultiple: 1.3,
        paraSpaceAfter: 8, isTextBox: true, margin: 0,
      }
    );
  });

  s.addText("Fix  →  Launch  →  Optimise  →  Scale", {
    x: MARGIN, y: 6.5, w: 12.13, h: 0.35,
    fontFace: FONT_BODY, fontSize: 11.5, italic: true, color: C.sub,
    align: "center", isTextBox: true, margin: 0,
  });
}

// ---------------------------------------------------------------- Slide 11

function renderOutcomes(s: Slide, slide: Extract<MasterSlide, { kind: "outcomes" }>) {
  const gap = 0.3;
  const colW = (12.13 - (slide.scenarios.length - 1) * gap) / slide.scenarios.length;
  const y0 = 1.95;
  slide.scenarios.forEach((sc, i) => {
    const x = MARGIN + i * (colW + gap);
    s.addShape("roundRect", { x, y: y0, w: colW, h: 1.95, rectRadius: 0.08, fill: { color: sc.featured ? C.ink : C.surface }, line: { type: "none" } });
    circleIcon(s, { x: x + 0.3, y: y0 + 0.25, d: 0.5, iconName: sc.featured ? "trending-up" : "target" });
    s.addText(sc.label.toUpperCase(), {
      x: x + 0.95, y: y0 + 0.25, w: colW - 1.2, h: 0.5,
      fontFace: FONT_BODY, fontSize: 12, bold: true, color: sc.featured ? C.white : C.ink, charSpacing: 0.5,
      valign: "middle", isTextBox: true, margin: 0,
    });
    s.addText(
      [
        { text: `${formatNumber(sc.customers)} / mo`, options: { fontSize: 22, bold: true, color: sc.featured ? C.white : C.ink, fontFace: FONT_HEAD, breakLine: true } },
        { text: `${formatNumber(sc.customers)} customers  ·  ${sc.roas.toFixed(1)}× ROAS  ·  ${formatNumber(sc.leads)} leads/mo`, options: { fontSize: 10, color: sc.featured ? C.darkBody : C.sub } },
      ],
      { x: x + 0.3, y: y0 + 0.95, w: colW - 0.6, h: 0.9, fontFace: FONT_BODY, isTextBox: true, margin: 0 }
    );
  });

  s.addText("KPIS WE WILL MONITOR", {
    x: MARGIN, y: 4.25, w: 6, h: 0.28,
    fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.sub, charSpacing: 1.1,
    isTextBox: true, margin: 0,
  });
  let kx = MARGIN, ky = 4.62;
  const pillH = 0.42, pillGap = 0.14;
  slide.kpis.forEach((k) => {
    const pillW = 0.16 + k.length * 0.082;
    if (kx + pillW > PW - MARGIN) { kx = MARGIN; ky += pillH + pillGap; }
    s.addShape("roundRect", { x: kx, y: ky, w: pillW, h: pillH, rectRadius: 0.21, fill: { color: C.greenSoft }, line: { type: "none" } });
    s.addText(k, {
      x: kx, y: ky, w: pillW, h: pillH,
      fontFace: FONT_BODY, fontSize: 10, bold: true, color: C.greenDark,
      align: "center", valign: "middle", isTextBox: true, margin: 0,
    });
    kx += pillW + pillGap;
  });

  s.addText(slide.disclaimer, {
    x: MARGIN, y: 6.55, w: 12.13, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, italic: true, color: C.faint,
    align: "center", isTextBox: true, margin: 0,
  });
}

// ---------------------------------------------------------------- Slide 12

function renderClosing(pptx: Pptx, s: Slide, slide: Extract<MasterSlide, { kind: "closing" }>, n: number, total: number) {
  s.background = { color: C.ink };

  s.addText("NEXT STEP", {
    x: MARGIN, y: 0.6, w: 6, h: 0.35,
    fontFace: FONT_BODY, fontSize: 13, bold: true, color: C.green, charSpacing: 2,
    isTextBox: true, margin: 0,
  });
  s.addText(`Let's Build The Right Growth Plan For ${slide.businessName}`, {
    x: MARGIN, y: 1.0, w: 11.3, h: 1.2,
    fontFace: FONT_HEAD, fontSize: slide.businessName.length > 18 ? 26 : 32, bold: true, color: C.white,
    isTextBox: true, margin: 0,
  });

  const gap = 0.35;
  const colW = (12.13 - 2 * gap) / 3;
  const y0 = 2.65;
  slide.steps.forEach((st, i) => {
    const x = MARGIN + i * (colW + gap);
    s.addText(st.n, {
      x, y: y0, w: colW, h: 0.55,
      fontFace: FONT_HEAD, fontSize: 30, bold: true, color: C.green,
      isTextBox: true, margin: 0,
    });
    s.addText(st.head.toUpperCase(), {
      x, y: y0 + 0.62, w: colW, h: 0.32,
      fontFace: FONT_BODY, fontSize: 13.5, bold: true, color: C.white, charSpacing: 1,
      isTextBox: true, margin: 0,
    });
    s.addText(st.body, {
      x, y: y0 + 0.98, w: colW - 0.2, h: 0.7,
      fontFace: FONT_BODY, fontSize: 11, color: C.darkBody, lineSpacingMultiple: 1.25,
      isTextBox: true, margin: 0,
    });
  });

  s.addText(slide.blurb, {
    x: MARGIN, y: 4.35, w: 11.3, h: 0.5,
    fontFace: FONT_BODY, fontSize: 12, italic: true, color: C.darkBody,
    isTextBox: true, margin: 0,
  });

  s.addShape("line", { x: MARGIN, y: 5.15, w: 12.13, h: 0, line: { color: C.darkLine, width: 1 } });
  const contactColW = slide.contacts.length > 0 ? 12.13 / Math.min(slide.contacts.length, 3) : 0;
  slide.contacts.slice(0, 3).forEach((c, i) => {
    const x = MARGIN + i * contactColW;
    circleIcon(s, { x, y: 5.45, d: 0.42, iconName: c.icon, bg: "2b3238" });
    s.addText(c.text, {
      x: x + 0.58, y: 5.45, w: contactColW - 0.6, h: 0.42,
      fontFace: FONT_BODY, fontSize: 11, color: C.white,
      valign: "middle", isTextBox: true, margin: 0,
    });
  });

  s.addText(slide.closingLine, {
    x: MARGIN, y: 6.35, w: 12.13, h: 0.7,
    fontFace: FONT_HEAD, fontSize: 15, bold: true, italic: true, color: C.white, lineSpacingMultiple: 1.2,
    isTextBox: true, margin: 0,
  });

  s.addText([slide.consultantName, slide.companyName].filter(Boolean).join("  ·  "), {
    x: PW - MARGIN - 4.5, y: 0.65, w: 4.5, h: 0.3,
    fontFace: FONT_BODY, fontSize: 10, color: C.darkMuted,
    align: "right", isTextBox: true, margin: 0,
  });
  s.addText(`${String(n).padStart(2, "0")} / ${total}`, {
    x: PW - 1.4, y: PH - 0.45, w: 1.0, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9, color: C.darkLine,
    align: "right", isTextBox: true, margin: 0,
  });
}

// Re-exported so callers that only need currency formatting from this
// module (none today, kept for parity with the data module) don't have to
// reach into pitch-slides.ts directly.
export { formatCurrency, formatPercent };
