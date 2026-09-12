"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { buildPitchSlides, formatNumber, type IconKey, type MasterSlide } from "@/lib/pitch-slides";
import { buildPitchPptx } from "@/lib/build-pitch-pptx";
import type { ReportData } from "@/lib/pdf/types";
import { Spinner } from "@/components/ui";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Download,
  Loader2,
  X,
  Target,
  Zap,
  TrendingUp,
  Compass,
  Search,
  MessageCircle,
  Image as ImageIcon,
  FileText,
  Shield,
  MapPin,
  Star,
  Phone,
  MessageSquare,
  ThumbsUp,
  Users,
  Monitor,
  Award,
  Layers,
  Send,
  Link2,
  Globe,
  CheckCircle,
  Activity,
  Calendar,
  Clock,
  Repeat,
  DollarSign,
  PieChart as PieChartIcon,
  BarChart2,
  ArrowRight,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

interface ReportSnapshotRow {
  id: string;
  pdfFileName?: string | null;
  reportData?: string | null;
}

// The app's "Master Client Presentation Template" (see the DM Consultant
// project doc of the same name) — charcoal + professional green, Cambria/
// Calibri, a feather-icon-in-a-circle motif, a dark opening/closing
// "sandwich" around white/surface content slides. This on-screen preview
// mirrors the real .pptx export (build-pitch-pptx.ts) as closely as HTML/
// CSS allows — same palette, same fonts, same icon motif, same slide
// content (both read from the identical MasterSlide[] built by
// buildPitchSlides) — so what a consultant previews here is what they get
// when they download the deck.
const C = {
  ink: "#1c2126",
  inkSoft: "#3d454d",
  sub: "#69727b",
  faint: "#9aa2ab",
  line: "#e2e6e9",
  white: "#ffffff",
  surface: "#f6f7f6",
  surfaceAlt: "#eceeec",
  green: "#0e6b4c",
  greenDark: "#0a5039",
  greenSoft: "#e6f2ec",
  bronze: "#8a6a35",
  darkMuted: "#8a9199",
  darkBody: "#c7cdd2",
  darkLine: "#3d454d",
};

const FONT_HEAD = "Cambria, Georgia, 'Times New Roman', serif";
const FONT_BODY = "Calibri, 'Segoe UI', ui-sans-serif, system-ui, sans-serif";

const DONUT_COLORS = [C.green, C.bronze, C.inkSoft, C.faint];

const ICON_MAP: Record<IconKey, LucideIcon> = {
  target: Target,
  zap: Zap,
  "trending-up": TrendingUp,
  compass: Compass,
  search: Search,
  "message-circle": MessageCircle,
  image: ImageIcon,
  "file-text": FileText,
  shield: Shield,
  "map-pin": MapPin,
  star: Star,
  phone: Phone,
  "message-square": MessageSquare,
  "thumbs-up": ThumbsUp,
  users: Users,
  monitor: Monitor,
  award: Award,
  layers: Layers,
  send: Send,
  link: Link2,
  globe: Globe,
  "check-circle": CheckCircle,
  activity: Activity,
  calendar: Calendar,
  clock: Clock,
  repeat: Repeat,
  "dollar-sign": DollarSign,
  "pie-chart": PieChartIcon,
  "bar-chart": BarChart2,
  "arrow-right": ArrowRight,
  "arrow-down": ArrowDown,
};

// The kicker + title shown at the top of every content slide (2-11) — a
// fixed pairing per slide kind, same on every deck.
const SLIDE_TITLES: Record<Exclude<MasterSlide["kind"], "opening" | "closing">, [string, string]> = {
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

const SLIDE_CANVAS_WIDTH = 1024;
const SLIDE_CANVAS_HEIGHT = 576;

// A visual, client-facing slideshow view of a report — meant to be popped
// open in front of a client and presented slide by slide, rather than
// reading the dense PDF together. Pulls its content from the same
// ReportData the PDF was generated from (see reportSnapshots.reportData);
// older report versions saved before that field existed don't have it, so
// this shows a plain explanation instead of a broken/empty deck.
export function ReportSlideshowModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const [row, setRow] = useState<ReportSnapshotRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setScale(Math.min(width / SLIDE_CANVAS_WIDTH, height / SLIDE_CANVAS_HEIGHT));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ReportSnapshotRow>(`/api/reports/${reportId}`)
      .then((r) => {
        if (!cancelled) setRow(r);
      })
      .catch((e) => {
        if (!cancelled) setLoadError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  const reportData = useMemo<ReportData | null>(() => {
    if (!row?.reportData) return null;
    try {
      return JSON.parse(row.reportData) as ReportData;
    } catch {
      return null;
    }
  }, [row]);

  const slides = useMemo<MasterSlide[]>(() => (reportData ? buildPitchSlides(reportData) : []), [reportData]);

  const goNext = () => setIndex((i) => Math.min(i + 1, slides.length - 1));
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape" && !document.fullscreenElement) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [slides.length, onClose]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  }

  // The Download button exports this same slide deck as a real .pptx —
  // not the audit PDF (that's still available from the report row's own
  // Download button outside this popup) — so it needs actual slide content
  // to export from.
  async function handleDownloadPptx() {
    if (slides.length === 0 || exporting) return;
    setExporting(true);
    try {
      const base = (row?.pdfFileName ?? "presentation").replace(/\.pdf$/i, "");
      await buildPitchPptx(slides, `${base}-presentation.pptx`);
    } finally {
      setExporting(false);
    }
  }

  const slide = slides[index];
  const dark = slide ? slide.kind === "opening" || slide.kind === "closing" : true;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 ${
        isFullscreen ? "bg-black" : "bg-black/70"
      }`}
    >
      <div
        className={`relative flex w-full flex-col overflow-hidden rounded-xl shadow-2xl ${
          isFullscreen ? "h-full" : "max-w-5xl"
        }`}
        style={{ backgroundColor: dark ? C.ink : C.white }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
          style={{ borderColor: dark ? C.darkLine : C.line }}
        >
          <p className="truncate text-xs font-medium" style={{ color: dark ? C.darkMuted : C.sub }}>
            {row?.pdfFileName ?? "Report presentation"}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {slides.length > 0 && (
              <span className="mr-1.5 text-xs tabular-nums" style={{ color: dark ? C.faint : C.faint }}>
                {index + 1} / {slides.length}
              </span>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit full screen" : "Full screen"}
              className="rounded-md p-1.5 hover:bg-black/10"
              style={{ color: dark ? C.darkMuted : C.sub }}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
            <button
              type="button"
              onClick={handleDownloadPptx}
              disabled={slides.length === 0 || exporting}
              title={slides.length === 0 ? "No slides to export yet" : "Download presentation (.pptx)"}
              className="rounded-md p-1.5 hover:bg-black/10 disabled:opacity-40 disabled:pointer-events-none"
              style={{ color: dark ? C.darkMuted : C.sub }}
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="rounded-md p-1.5 hover:bg-black/10"
              style={{ color: dark ? C.darkMuted : C.sub }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Slide surface */}
        <div
          ref={surfaceRef}
          className={`relative flex w-full items-center justify-center overflow-hidden ${
            isFullscreen ? "min-h-0 flex-1" : "aspect-video"
          }`}
          style={{ backgroundColor: dark ? C.ink : C.white }}
        >
          <div className="relative shrink-0" style={{ width: SLIDE_CANVAS_WIDTH * scale, height: SLIDE_CANVAS_HEIGHT * scale }}>
            <div
              className="absolute left-0 top-0 origin-top-left overflow-y-auto"
              style={{ width: SLIDE_CANVAS_WIDTH, height: SLIDE_CANVAS_HEIGHT, transform: `scale(${scale})`, fontFamily: FONT_BODY }}
            >
              {!row && !loadError && (
                <div className="flex h-full items-center justify-center">
                  <Spinner />
                </div>
              )}
              {loadError && (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-8 text-center">
                  <p className="text-sm font-medium text-slate-200">Couldn&apos;t load this report</p>
                  <p className="text-xs" style={{ color: C.faint }}>{loadError}</p>
                </div>
              )}
              {row && !loadError && !reportData && (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-8 text-center">
                  <p className="text-sm font-medium text-slate-200">
                    Presentation view isn&apos;t available for this report version
                  </p>
                  <p className="max-w-sm text-xs" style={{ color: C.faint }}>
                    This version was generated before slide data was saved with reports. Close this and use the
                    Download button on the report list for the PDF instead, or regenerate the report to get a
                    version you can present from.
                  </p>
                </div>
              )}
              {slide && <SlideView slide={slide} index={index} total={slides.length} businessName={slides[0]?.kind === "opening" ? slides[0].businessName : ""} />}
            </div>
          </div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                disabled={index === 0}
                aria-label="Previous slide"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-600 shadow disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={index === slides.length - 1}
                aria-label="Next slide"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-600 shadow disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Slide dots */}
        {slides.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 border-t py-2.5" style={{ borderColor: dark ? C.darkLine : C.line }}>
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === index ? 20 : 6, backgroundColor: i === index ? C.green : dark ? C.darkLine : C.line }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Shell

function CircleIcon({ icon, size = 40, bg = C.green, iconColor = "#fff" }: { icon: IconKey; size?: number; bg?: string; iconColor?: string }) {
  const Icon = ICON_MAP[icon];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full" style={{ width: size, height: size, backgroundColor: bg }}>
      <Icon size={size * 0.48} color={iconColor} strokeWidth={1.8} />
    </span>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase" style={{ color: C.green, letterSpacing: "0.12em" }}>
      {children}
    </p>
  );
}

function SlideTitle({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <h2
      className="mt-1.5 text-[26px] font-bold leading-tight"
      style={{ fontFamily: FONT_HEAD, color: dark ? C.white : C.ink }}
    >
      {children}
    </h2>
  );
}

function Footer({ businessName, index, total, dark }: { businessName: string; index: number; total: number; dark: boolean }) {
  return (
    <div className="absolute inset-x-8 bottom-3 flex items-center justify-between text-[10px]" style={{ color: dark ? C.darkMuted : C.faint, letterSpacing: "0.08em" }}>
      <span className="uppercase">{businessName} · GROWTH STRATEGY</span>
      <span className="tabular-nums">{String(index + 1).padStart(2, "0")} / {total}</span>
    </div>
  );
}

// The content area between the title and footer centers whatever a slide
// hands it as a single block (align with how the Opening/Closing slides
// already work) instead of stretching it to fill the full height. Most
// slides' real content — a couple of cards, a short list — is naturally
// shorter than the fixed 16:9 canvas; without this, CSS's default
// flex/grid "stretch" sizing inflates a slide's own containers to fill
// the leftover height while the content inside them stays put, leaving a
// large dead area between the content and the footer. A slide that
// genuinely needs the full height (e.g. the audit-score bar chart, which
// requires a definite pixel height to render at all) still gets it —
// centering an item that already fills its container has no visible
// effect, so this is safe for every slide, not just the short ones.
function ContentShell({ kind, businessName, index, total, children }: { kind: Exclude<MasterSlide["kind"], "opening" | "closing">; businessName: string; index: number; total: number; children: React.ReactNode }) {
  const [kicker, title] = SLIDE_TITLES[kind];
  return (
    <div className="relative flex h-full w-full flex-col px-9 pb-10 pt-7" style={{ backgroundColor: C.white }}>
      <Kicker>{kicker}</Kicker>
      <SlideTitle>{title}</SlideTitle>
      <div className="relative mt-4 flex flex-1 flex-col justify-center overflow-hidden">{children}</div>
      <Footer businessName={businessName} index={index} total={total} dark={false} />
    </div>
  );
}

// ---------------------------------------------------------------- Router

function SlideView({ slide, index, total, businessName }: { slide: MasterSlide; index: number; total: number; businessName: string }) {
  switch (slide.kind) {
    case "opening":
      return <OpeningSlide slide={slide} index={index} total={total} />;
    case "closing":
      return <ClosingSlide slide={slide} index={index} total={total} />;
    case "execInsight":
      return (
        <ContentShell kind="execInsight" businessName={businessName} index={index} total={total}>
          <ExecInsight slide={slide} />
        </ContentShell>
      );
    case "digitalHealth":
      return (
        <ContentShell kind="digitalHealth" businessName={businessName} index={index} total={total}>
          <DigitalHealth slide={slide} />
        </ContentShell>
      );
    case "businessProblem":
      return (
        <ContentShell kind="businessProblem" businessName={businessName} index={index} total={total}>
          <BusinessProblem slide={slide} />
        </ContentShell>
      );
    case "discovered":
      return (
        <ContentShell kind="discovered" businessName={businessName} index={index} total={total}>
          <Discovered slide={slide} />
        </ContentShell>
      );
    case "customerInsight":
      return (
        <ContentShell kind="customerInsight" businessName={businessName} index={index} total={total}>
          <CustomerInsight slide={slide} />
        </ContentShell>
      );
    case "competitor":
      return (
        <ContentShell kind="competitor" businessName={businessName} index={index} total={total}>
          <Competitor slide={slide} />
        </ContentShell>
      );
    case "strategicApproach":
      return (
        <ContentShell kind="strategicApproach" businessName={businessName} index={index} total={total}>
          <StrategicApproach slide={slide} />
        </ContentShell>
      );
    case "channelInvestment":
      return (
        <ContentShell kind="channelInvestment" businessName={businessName} index={index} total={total}>
          <ChannelInvestment slide={slide} />
        </ContentShell>
      );
    case "actionPlan":
      return (
        <ContentShell kind="actionPlan" businessName={businessName} index={index} total={total}>
          <ActionPlan slide={slide} />
        </ContentShell>
      );
    case "outcomes":
      return (
        <ContentShell kind="outcomes" businessName={businessName} index={index} total={total}>
          <Outcomes slide={slide} />
        </ContentShell>
      );
  }
}

// ---------------------------------------------------------------- Slide 1

function OpeningSlide({ slide, index, total }: { slide: Extract<MasterSlide, { kind: "opening" }>; index: number; total: number }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-center px-10" style={{ backgroundColor: C.ink }}>
      <div className="absolute right-9 top-7">
        <CircleIcon icon="trending-up" size={52} />
      </div>
      <p className="text-[13px] font-bold" style={{ color: C.green, letterSpacing: "0.16em" }}>
        DIGITAL GROWTH AUDIT &amp; STRATEGY
      </p>
      <h1 className="mt-3 max-w-2xl text-5xl font-bold leading-tight text-white" style={{ fontFamily: FONT_HEAD }}>
        {slide.businessName}
      </h1>
      <p className="mt-4 max-w-xl text-base" style={{ color: C.darkBody }}>
        Understanding where you are today — and where your digital growth can go next.
      </p>
      <div className="mt-10 flex gap-10">
        <div>
          <p className="text-[10px] font-bold" style={{ color: C.darkMuted, letterSpacing: "0.12em" }}>PREPARED FOR</p>
          <p className="mt-1 text-sm font-semibold text-white">{slide.customerName}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold" style={{ color: C.darkMuted, letterSpacing: "0.12em" }}>PREPARED BY</p>
          <p className="mt-1 text-sm font-semibold text-white">{[slide.companyName, slide.generatedDate].filter(Boolean).join("  ·  ")}</p>
        </div>
      </div>
      <Footer businessName={slide.businessName} index={index} total={total} dark />
    </div>
  );
}

// ---------------------------------------------------------------- Slide 2

function ExecInsight({ slide }: { slide: Extract<MasterSlide, { kind: "execInsight" }> }) {
  const cards = slide.cards.slice(0, 4);
  const oddLast = cards.length % 2 === 1;
  return (
    <div className="grid grid-cols-2 items-start gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className="relative rounded-lg p-5"
          style={{ backgroundColor: C.surface, gridColumn: oddLast && i === cards.length - 1 ? "span 2" : undefined }}
        >
          <div className="flex items-start justify-between">
            <CircleIcon icon={c.icon} size={34} />
            <span className="text-2xl font-bold" style={{ fontFamily: FONT_HEAD, color: C.line }}>{c.n}</span>
          </div>
          <p className="mt-2.5 text-sm font-bold" style={{ color: C.ink }}>{c.head}</p>
          <p className="mt-1 text-[12px] leading-snug" style={{ color: C.inkSoft }}>{c.body}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Slide 3

function DigitalHealth({ slide }: { slide: Extract<MasterSlide, { kind: "digitalHealth" }> }) {
  return (
    <div className="flex h-full gap-4">
      <div className="flex w-52 shrink-0 flex-col justify-between rounded-lg p-5" style={{ backgroundColor: C.ink }}>
        <div>
          <p className="text-[9px] font-bold" style={{ color: C.darkMuted, letterSpacing: "0.1em" }}>OVERALL AUDIT SCORE</p>
          <p className="mt-1 text-6xl font-bold text-white" style={{ fontFamily: FONT_HEAD }}>{Math.round(slide.overall)}</p>
          <p className="text-xs" style={{ color: C.darkMuted }}>out of 100</p>
        </div>
        <p className="text-[11px] italic leading-snug" style={{ color: C.darkBody }}>{slide.note}</p>
      </div>
      <div className="h-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={slide.scores} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barCategoryGap={14}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={false} tickLine={false} />
            <Bar dataKey="value" fill={C.green} radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11, fill: C.ink, fontWeight: 700 }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Slide 4

function BusinessProblem({ slide }: { slide: Extract<MasterSlide, { kind: "businessProblem" }> }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1.5">
        {slide.stages.map((label, i) => (
          <div key={i} className="flex flex-1 items-center gap-1.5">
            <div className="flex-1 rounded-md px-2 py-2.5 text-center text-[12px] font-bold" style={{ backgroundColor: C.green, color: C.white }}>
              {label}
            </div>
            {i < slide.stages.length - 1 && <ArrowRight size={13} style={{ color: C.sub }} className="shrink-0" />}
          </div>
        ))}
      </div>
      <div>
        <p className="text-[13px] font-bold" style={{ color: C.ink }}>Where the opportunity actually sits:</p>
        <div className="mt-3 grid items-start gap-4" style={{ gridTemplateColumns: `repeat(${slide.columns.length}, minmax(0,1fr))` }}>
          {slide.columns.map((c, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <CircleIcon icon={c.icon} size={30} />
                <p className="text-[13px] font-bold" style={{ color: C.ink }}>{c.head}</p>
              </div>
              <p className="mt-2 text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Slide 5

function Discovered({ slide }: { slide: Extract<MasterSlide, { kind: "discovered" }> }) {
  const cards = slide.cards.slice(0, 4);
  const oddLast = cards.length % 2 === 1;
  return (
    <div className="grid grid-cols-2 items-start gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          className="rounded-lg p-5"
          style={{ backgroundColor: C.surface, gridColumn: oddLast && i === cards.length - 1 ? "span 2" : undefined }}
        >
          <div className="flex items-center gap-2.5">
            <CircleIcon icon={c.icon} size={30} />
            <p className="text-[13px] font-bold" style={{ color: C.ink }}>{c.head}</p>
          </div>
          <p className="mt-2.5 text-[10.5px] leading-snug">
            <span className="font-bold" style={{ color: C.green }}>FINDING&nbsp; </span>
            <span style={{ color: C.inkSoft }}>{c.finding}</span>
          </p>
          {c.opportunity && (
            <p className="mt-1.5 text-[10.5px] leading-snug">
              <span className="font-bold" style={{ color: C.green }}>OPPORTUNITY&nbsp; </span>
              <span style={{ color: C.inkSoft }}>{c.opportunity}</span>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Slide 6

function CustomerInsight({ slide }: { slide: Extract<MasterSlide, { kind: "customerInsight" }> }) {
  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <div className="space-y-4 rounded-lg p-5" style={{ backgroundColor: C.surface }}>
        {slide.profile.slice(0, 4).map((r, i) => (
          <div key={i}>
            <p className="text-[10px] font-bold uppercase" style={{ color: C.green, letterSpacing: "0.08em" }}>{r.label}</p>
            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: C.inkSoft }}>{r.text}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase" style={{ color: C.sub, letterSpacing: "0.08em" }}>The Path To A Customer</p>
        <div className="mt-4 space-y-4">
          {slide.journey.map((st, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <CircleIcon icon={st.icon} size={28} />
              <p className="text-[12.5px] font-bold" style={{ color: C.ink }}>{st.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Slide 7

const COMPETITOR_METRIC_ROWS: [string, keyof (Extract<MasterSlide, { kind: "competitor" }>["sites"])[number]][] = [
  ["Homepage Content", "wordCount"],
  ["Blog / Resources", "blog"],
  ["Schema Markup", "schema"],
  ["Mobile-Ready", "mobile"],
  ["HTTPS Secure", "https"],
  ["Response Time", "speed"],
];

function Competitor({ slide }: { slide: Extract<MasterSlide, { kind: "competitor" }> }) {
  if (slide.sites.length === 0) {
    return (
      <p className="text-sm italic" style={{ color: C.sub }}>
        Competitor data unavailable — no competitor URLs were analyzed for this report.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-start gap-3" style={{ gridTemplateColumns: `repeat(${slide.sites.length}, minmax(0,1fr))` }}>
        {slide.sites.map((site, i) => (
          <div key={i} className="rounded-lg p-4" style={{ backgroundColor: site.featured ? C.ink : C.surface }}>
            <p className="text-[10px] font-bold uppercase" style={{ color: C.green, letterSpacing: "0.05em" }}>{site.name}</p>
            <p className="mt-0.5 text-[10.5px] truncate" style={{ color: site.featured ? C.darkBody : C.sub }}>{site.host}</p>
            {!site.reachable ? (
              <p className="mt-3 text-xs italic" style={{ color: site.featured ? C.darkMuted : C.faint }}>Not reachable</p>
            ) : (
              <div className="mt-3 space-y-2.5">
                {COMPETITOR_METRIC_ROWS.map(([label, key]) => (
                  <div key={key}>
                    <p className="text-[8.5px]" style={{ color: site.featured ? C.darkMuted : C.faint }}>{label}</p>
                    <p className="text-[12.5px] font-bold" style={{ color: site.featured ? C.white : C.ink }}>{String(site[key])}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {slide.insights.length > 0 && (
        <div>
          <p className="text-[9.5px] font-bold uppercase" style={{ color: C.sub, letterSpacing: "0.06em" }}>Initial Competitor Observations</p>
          <p className="mt-1 text-[11px] italic" style={{ color: C.inkSoft }}>{slide.insights.join("  ·  ")}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Slide 8

function StrategicApproach({ slide }: { slide: Extract<MasterSlide, { kind: "strategicApproach" }> }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-2">
        {slide.stages.map((st, i) => (
          <div key={i} className="flex flex-1 items-start gap-2">
            <div className="flex flex-1 flex-col items-center text-center">
              <CircleIcon icon={st.icon} size={44} />
              <span className="mt-1.5 text-sm font-bold" style={{ fontFamily: FONT_HEAD, color: C.line }}>{String(i + 1).padStart(2, "0")}</span>
              <p className="text-[12px] font-bold" style={{ color: C.ink }}>{st.head}</p>
              <ul className="mt-1.5 space-y-0.5">
                {st.items.map((it, k) => (
                  <li key={k} className="text-[10px]" style={{ color: C.inkSoft }}>{it}</li>
                ))}
              </ul>
            </div>
            {i < slide.stages.length - 1 && <ArrowRight size={12} style={{ color: C.sub }} className="mt-5 shrink-0" />}
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] italic" style={{ color: C.sub }}>
        The client should be able to see the entire strategy in ten seconds.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Slide 9

function ChannelInvestment({ slide }: { slide: Extract<MasterSlide, { kind: "channelInvestment" }> }) {
  const chartData = slide.channels.map((c) => ({ name: c.head, value: c.pct }));
  return (
    // No flex-1/h-full here — the row is sized to its own content
    // (items-center, not the default stretch) and the whole block is
    // centered by ContentShell, so a short channel list no longer leaves
    // a dead area below it.
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-6">
        {/* A fixed pixel height, not h-full/flex-1 — recharts'
            ResponsiveContainer measures its parent via ResizeObserver on
            mount, and inside several layers of nested flex percentage
            sizing it was intermittently measuring 0 and rendering nothing
            (no error, just an empty chart). A concrete height sidesteps
            that entirely. */}
        <div style={{ width: 300, height: 300 }} className="shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {slide.channels.map((c, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <CircleIcon icon={c.icon} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase" style={{ color: C.ink }}>{c.head}</p>
                <p className="truncate text-[10px]" style={{ color: C.inkSoft }}>{c.body}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold" style={{ fontFamily: FONT_HEAD, color: C.green }}>{Math.round(c.pct)}%</p>
                {c.amount && <p className="text-[9px]" style={{ color: C.sub }}>{c.amount}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {slide.totalLabel && (
        <div className="rounded-md px-4 py-2.5" style={{ backgroundColor: C.surface }}>
          <span className="text-[10.5px] font-bold" style={{ color: C.sub, letterSpacing: "0.04em" }}>TOTAL MONTHLY INVESTMENT&nbsp;&nbsp;</span>
          <span className="text-sm font-bold" style={{ color: C.ink }}>{slide.totalLabel}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Slide 10

function ActionPlan({ slide }: { slide: Extract<MasterSlide, { kind: "actionPlan" }> }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: `repeat(${slide.phases.length}, minmax(0,1fr))` }}>
        {slide.phases.map((p, i) => (
          <div key={i} className="rounded-lg p-5" style={{ backgroundColor: C.surface }}>
            <CircleIcon icon={p.icon} size={30} />
            <p className="mt-3 text-[10px] font-bold" style={{ color: C.green, letterSpacing: "0.08em" }}>{p.tag}</p>
            <p className="text-lg font-bold" style={{ fontFamily: FONT_HEAD, color: C.ink }}>{p.head}</p>
            <ul className="mt-3 space-y-2">
              {p.items.map((it, k) => (
                <li key={k} className="flex items-start gap-1.5 text-[11px]" style={{ color: C.inkSoft }}>
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: C.green }} />
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] italic" style={{ color: C.sub }}>Fix  →  Launch  →  Optimise  →  Scale</p>
    </div>
  );
}

// ---------------------------------------------------------------- Slide 11

function Outcomes({ slide }: { slide: Extract<MasterSlide, { kind: "outcomes" }> }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid items-start gap-4" style={{ gridTemplateColumns: `repeat(${slide.scenarios.length}, minmax(0,1fr))` }}>
        {slide.scenarios.map((sc, i) => (
          <div key={i} className="rounded-lg p-5" style={{ backgroundColor: sc.featured ? C.ink : C.surface }}>
            <div className="flex items-center gap-2">
              <CircleIcon icon={sc.featured ? "trending-up" : "target"} size={28} />
              <p className="text-[11px] font-bold uppercase" style={{ color: sc.featured ? C.white : C.ink }}>{sc.label}</p>
            </div>
            <p className="mt-3 text-2xl font-bold" style={{ fontFamily: FONT_HEAD, color: sc.featured ? C.white : C.ink }}>
              {formatNumber(sc.customers)} / mo
            </p>
            <p className="mt-1 text-[10px]" style={{ color: sc.featured ? C.darkBody : C.sub }}>
              {formatNumber(sc.customers)} customers · {sc.roas.toFixed(1)}× ROAS · {formatNumber(sc.leads)} leads/mo
            </p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase" style={{ color: C.sub, letterSpacing: "0.08em" }}>KPIs We Will Monitor</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {slide.kpis.map((k) => (
            <span key={k} className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: C.greenSoft, color: C.greenDark }}>
              {k}
            </span>
          ))}
        </div>
      </div>
      <p className="text-center text-[10px] italic" style={{ color: C.faint }}>{slide.disclaimer}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Slide 12

function ClosingSlide({ slide, index, total }: { slide: Extract<MasterSlide, { kind: "closing" }>; index: number; total: number }) {
  // Centered as one block, same as the Opening slide it bookends — not
  // top-anchored with the closing line pinned to the bottom via mt-auto,
  // which left a large dead gap whenever the contact list was short (or,
  // as here, the report has no consultant contact details saved yet).
  return (
    <div className="relative flex h-full w-full flex-col justify-center px-10 pb-10 pt-7" style={{ backgroundColor: C.ink }}>
      <p className="text-[12px] font-bold" style={{ color: C.green, letterSpacing: "0.16em" }}>NEXT STEP</p>
      <h2 className="mt-1.5 max-w-2xl text-2xl font-bold leading-tight text-white" style={{ fontFamily: FONT_HEAD }}>
        Let&apos;s Build The Right Growth Plan For {slide.businessName}
      </h2>

      <div className="mt-6 grid grid-cols-3 items-start gap-4">
        {slide.steps.map((st, i) => (
          <div key={i}>
            <span className="text-2xl font-bold" style={{ fontFamily: FONT_HEAD, color: C.green }}>{st.n}</span>
            <p className="mt-1 text-[12px] font-bold uppercase text-white" style={{ letterSpacing: "0.04em" }}>{st.head}</p>
            <p className="mt-1 text-[10.5px] leading-snug" style={{ color: C.darkBody }}>{st.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] italic" style={{ color: C.darkBody }}>{slide.blurb}</p>

      {slide.contacts.length > 0 && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: C.darkLine }}>
          <div className="flex flex-wrap gap-6">
            {slide.contacts.slice(0, 3).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <CircleIcon icon={c.icon} size={26} bg="#2b3238" />
                <span className="text-[11px] text-white">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 max-w-2xl text-sm font-bold italic leading-snug text-white" style={{ fontFamily: FONT_HEAD }}>
        {slide.closingLine}
      </p>

      <div className="absolute right-9 top-7 text-right text-[10px]" style={{ color: C.darkMuted }}>
        {[slide.consultantName, slide.companyName].filter(Boolean).join("  ·  ")}
      </div>
      <span className="absolute bottom-3 right-9 text-[9px] tabular-nums" style={{ color: C.darkLine }}>
        {String(index + 1).padStart(2, "0")} / {total}
      </span>
    </div>
  );
}
