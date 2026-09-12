import type { ReportData, ReportScenarioRow, ReportCompetitorSite } from "./types";
import { BENCHMARK_DISCLAIMER, currencyForCountry, WEBSITE_TYPE_DETAILS } from "@/lib/constants";

function toReportSite(s: unknown): ReportCompetitorSite | null {
  if (!s || typeof s !== "object") return null;
  const site = s as Record<string, unknown>;
  return {
    hostname: typeof site.hostname === "string" ? site.hostname : String(site.url ?? "unknown"),
    fetchedOk: Boolean(site.fetchedOk),
    fetchError: typeof site.fetchError === "string" ? site.fetchError : undefined,
    wordCount: typeof site.wordCount === "number" ? site.wordCount : 0,
    hasBlog: Boolean(site.hasBlog),
    hasSchema: Boolean(site.hasSchema),
    hasViewport: Boolean(site.hasViewport),
    https: Boolean(site.https),
    socialLinks: Array.isArray(site.socialLinks) ? (site.socialLinks as string[]) : [],
    techPlatform: typeof site.techPlatform === "string" ? site.techPlatform : "Unknown",
    responseTimeMs: typeof site.responseTimeMs === "number" ? site.responseTimeMs : undefined,
  };
}

// Builds the flat ReportData contract the PDF renderer consumes, from the
// lead / assessment / scenario / settings rows pulled out of the DB (or, for
// a historical re-download, from a previously saved snapshot). Keeping this
// as one pure function means "render live" and "render from snapshot" call
// the exact same code path.

export interface BuildReportDataArgs {
  lead: {
    businessName: string;
    customerName: string;
    businessDescription?: string | null;
    websiteUrl?: string | null;
    hasWebsite?: "YES" | "NO" | null;
    businessVertical?: string | null;
    targetCountry?: string | null;
    storeLocations?: string | null;
  };
  settings: {
    consultantName: string;
    companyName: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    linkedin?: string | null;
    ctaText: string;
    currency: string;
    logoUrl?: string | null;
  };
  assessment?: {
    auditScores?: Record<string, number> | null;
    websiteAudit?: {
      topProblems?: string[];
      recommendedImprovements?: string[];
      growthRecommendations?: { traffic?: string[]; branding?: string[]; reach?: string[] } | null;
      strategicRecommendations?: string[];
      offPageMetrics?: {
        domainAuthority?: string;
        totalBacklinks?: string;
        referringDomains?: string;
        estimatedOrganicTraffic?: string;
        source?: string;
      } | null;
      localPresence?: { storeLocations?: string[]; notes?: string; recommendations?: string[] } | null;
    } | null;
    websiteRecommendation?: { type?: string; pages?: string[]; businessType?: string; onlinePresenceChannels?: string[] } | null;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
      metrics?: { facebook?: string; instagram?: string; linkedin?: string; youtube?: string };
    } | null;
    competitorAnalysis?: { insights?: string[]; client?: unknown; competitors?: unknown[] } | null;
    sampleAds?: Array<{
      platform: string;
      headline: string;
      benefit?: string;
      cta: string;
      adType?: string;
      format?: "Search Ad" | "Image Ad" | "Video Ad";
      visualDescription?: string;
      imageDataUrl?: string;
      referenceImageUrl?: string;
      referenceImageSource?: string;
      videoScript?: { hook: string; story: string; cta: string };
      searchAd?: {
        headlines: string[];
        descriptions: string[];
        displayPath: string[];
        sitelinks: Array<{ text: string; description: string }>;
        callouts: string[];
        structuredSnippetHeader: string;
        structuredSnippetValues: string[];
      };
      displayAd?: { headlines: string[]; longHeadline: string; descriptions: string[]; businessName: string };
      socialAd?: { primaryText: string; headline: string; description: string; ctaButton: string };
      videoAd?: { companionHeadline: string; companionDescription: string; ctaButton: string };
    }> | null;
    growthPlan?: Array<{ phase: string; items: string[] }> | null;
    problemSolution?: { problem?: string; solution?: string; strategy?: string; execution?: string; expectedResult?: string } | null;
    executiveSummary?: { currentSituation?: string; problems?: string[]; biggestOpportunity?: string; recommendedDirection?: string } | null;
    audienceRecommendation?: { targetAudience?: string; suggestedAudience?: string } | null;
    platformRecommendation?: {
      platforms?: string[];
      details?: Array<{ platform: string; adType: string; expectedResult: string; budgetAllocation?: string; estimatedResult?: string }>;
    } | null;
  } | null;
  scenarioRows: Array<{
    name: string;
    tier: string;
    adBudget: number;
    results: string; // JSON string of ForecastResults
  }>;
}

export function buildReportData(args: BuildReportDataArgs): ReportData {
  const { lead, settings, assessment, scenarioRows } = args;

  const scenarios: ReportScenarioRow[] = scenarioRows.map((row) => {
    const parsed = JSON.parse(row.results);
    const paid = parsed.paid ?? parsed;
    return {
      label: row.name,
      assumptionNote: "",
      budget: row.adBudget,
      traffic: paid.traffic ?? 0,
      leads: paid.leads ?? 0,
      qualifiedLeads: paid.qualifiedLeads ?? 0,
      customers: paid.customers ?? 0,
      revenue: paid.revenue ?? 0,
      cpl: paid.cpl ?? 0,
      cac: paid.cac ?? 0,
      roas: paid.roas ?? 0,
      roi: paid.roi ?? 0,
    };
  });

  const hasWebsite = lead.hasWebsite === "YES";
  const storeLocations = (lead.storeLocations ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Currency shown on the report: the client's Target Country (set on the
  // Business step) takes priority, since it's specific to this deal — the
  // consultant's Settings > Currency is only a fallback, for leads captured
  // before Target Country existed or where it was left unset.
  const currency = lead.targetCountry ? currencyForCountry(lead.targetCountry) : settings.currency;

  return {
    consultant: {
      consultantName: settings.consultantName || "Your Name",
      companyName: settings.companyName || "Your Consultancy",
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      website: settings.website,
      linkedin: settings.linkedin,
      ctaText: settings.ctaText,
      currency,
      logoUrl: settings.logoUrl ?? null,
    },
    business: {
      businessName: lead.businessName,
      customerName: lead.customerName,
      businessDescription: lead.businessDescription,
      websiteUrl: lead.websiteUrl,
      hasWebsite: lead.hasWebsite ?? null,
      industry: lead.businessVertical,
    },
    executiveSummary: {
      currentSituation:
        assessment?.executiveSummary?.currentSituation ??
        `${lead.businessName} is exploring how to grow qualified leads and revenue through a stronger digital presence.`,
      problems: assessment?.executiveSummary?.problems ?? assessment?.websiteAudit?.topProblems ?? [
        "Limited visibility into current digital performance gaps.",
      ],
      biggestOpportunity:
        assessment?.executiveSummary?.biggestOpportunity ??
        "Strengthening website conversion and search visibility to capture more of the demand already searching for this business.",
      recommendedDirection:
        assessment?.executiveSummary?.recommendedDirection ??
        "A combined SEO + paid acquisition strategy, sequenced over a 90-day plan, focused on qualified lead volume.",
    },
    websiteRecommendations: {
      hasWebsite,
      topProblems: assessment?.websiteAudit?.topProblems ?? [],
      recommendedImprovements: assessment?.websiteAudit?.recommendedImprovements ?? [],
      recommendedWebsiteType: assessment?.websiteRecommendation?.type,
      recommendedPages: assessment?.websiteRecommendation?.pages,
      recommendedWebsiteTypeDescription: assessment?.websiteRecommendation?.type
        ? WEBSITE_TYPE_DETAILS[assessment.websiteRecommendation.type]?.description
        : undefined,
      businessType: assessment?.websiteRecommendation?.businessType,
      onlinePresenceChannels: assessment?.websiteRecommendation?.onlinePresenceChannels ?? [],
      growthRecommendations: assessment?.websiteAudit?.growthRecommendations
        ? {
            traffic: assessment.websiteAudit.growthRecommendations.traffic ?? [],
            branding: assessment.websiteAudit.growthRecommendations.branding ?? [],
            reach: assessment.websiteAudit.growthRecommendations.reach ?? [],
          }
        : null,
      strategicRecommendations: assessment?.websiteAudit?.strategicRecommendations ?? [],
      offPageMetrics: assessment?.websiteAudit?.offPageMetrics ?? null,
      localPresence: storeLocations.length
        ? {
            storeLocations,
            notes: assessment?.websiteAudit?.localPresence?.notes ?? undefined,
            recommendations: assessment?.websiteAudit?.localPresence?.recommendations ?? undefined,
          }
        : null,
      socialPresence:
        assessment?.socialMedia &&
        (assessment.socialMedia.facebook || assessment.socialMedia.instagram || assessment.socialMedia.linkedin || assessment.socialMedia.youtube)
          ? {
              facebook: assessment.socialMedia.facebook || undefined,
              instagram: assessment.socialMedia.instagram || undefined,
              linkedin: assessment.socialMedia.linkedin || undefined,
              youtube: assessment.socialMedia.youtube || undefined,
              metrics: assessment.socialMedia.metrics
                ? {
                    facebook: assessment.socialMedia.metrics.facebook || undefined,
                    instagram: assessment.socialMedia.metrics.instagram || undefined,
                    linkedin: assessment.socialMedia.metrics.linkedin || undefined,
                    youtube: assessment.socialMedia.metrics.youtube || undefined,
                  }
                : undefined,
            }
          : null,
    },
    audiencePlatform: {
      targetAudience: assessment?.audienceRecommendation?.targetAudience || assessment?.audienceRecommendation?.suggestedAudience || "Not yet defined.",
      platforms: assessment?.platformRecommendation?.details ?? [],
    },
    auditScores: assessment?.auditScores
      ? {
          technicalSeo: assessment.auditScores.technicalSeo ?? 0,
          onPageSeo: assessment.auditScores.onPageSeo ?? 0,
          content: assessment.auditScores.content ?? 0,
          uxConversion: assessment.auditScores.uxConversion ?? 0,
          branding: assessment.auditScores.branding ?? 0,
          localSeo: assessment.auditScores.localSeo ?? 0,
          performance: assessment.auditScores.performance ?? 0,
          overall: assessment.auditScores.overall ?? 0,
        }
      : null,
    competitorInsights: assessment?.competitorAnalysis?.insights ?? [],
    competitorSites: assessment?.competitorAnalysis
      ? {
          client: toReportSite(assessment.competitorAnalysis.client),
          competitors: (assessment.competitorAnalysis.competitors ?? []).map(toReportSite).filter((s): s is ReportCompetitorSite => s !== null),
        }
      : null,
    sampleAds: assessment?.sampleAds ?? [],
    scenarios,
    growthPlan: assessment?.growthPlan ?? [
      { phase: "0–30 Days – Foundation", items: ["Website improvements", "Tracking setup", "Technical SEO", "Audience research", "Landing pages", "Campaign setup"] },
      { phase: "31–60 Days – Growth", items: ["SEO content", "Campaign optimisation", "Lead generation", "Remarketing", "Social campaigns", "Conversion optimisation"] },
      { phase: "61–90 Days – Scale", items: ["Scale successful campaigns", "Improve ROAS", "Expand keywords/audiences", "Increase qualified leads", "Improve conversion", "Build sustainable acquisition"] },
    ],
    problemSolutionStory: {
      problem: assessment?.problemSolution?.problem ?? "Low visibility and limited qualified enquiries.",
      solution: assessment?.problemSolution?.solution ?? "Improve website, SEO, landing pages and paid acquisition.",
      strategy: assessment?.problemSolution?.strategy ?? "SEO + Google Ads + Meta Ads + content + remarketing.",
      // "->" not "→": this default is rendered by react-pdf's built-in
      // Helvetica font (WinAnsi/CP1252 only) — see the ₹/≈/→ note in
      // ReportDocument.tsx for the full explanation of this bug class.
      execution: assessment?.problemSolution?.execution ?? "Technical SEO -> Landing pages -> Campaign setup -> Content -> Lead campaigns -> Retargeting -> Optimisation.",
      expectedResult: assessment?.problemSolution?.expectedResult ?? "Improved visibility -> More qualified traffic -> More enquiries -> More sales opportunities.",
    },
    generatedDate: new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    benchmarkDisclaimer: BENCHMARK_DISCLAIMER,
  };
}
