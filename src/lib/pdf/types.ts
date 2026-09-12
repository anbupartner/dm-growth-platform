export interface ReportConsultant {
  consultantName: string;
  companyName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  linkedin?: string | null;
  ctaText: string;
  currency: string;
  // Optional brand/company logo, stored as a data: URI (see Settings ->
  // Brand Logo) — shown next to the company name in the PDF header on every
  // page when set. PNG/JPEG only (@react-pdf/renderer's <Image> renders
  // raster formats, not SVG).
  logoUrl?: string | null;
}

export interface ReportAuditScores {
  technicalSeo: number;
  onPageSeo: number;
  content: number;
  uxConversion: number;
  branding: number;
  localSeo: number;
  performance: number;
  overall: number;
}

export interface ReportScenarioRow {
  label: string;
  assumptionNote: string;
  traffic: number;
  leads: number;
  qualifiedLeads: number;
  customers: number;
  revenue: number;
  cpl: number;
  cac: number;
  roas: number;
  roi: number;
  budget: number;
}

export interface ReportSampleAd {
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
  displayAd?: {
    headlines: string[];
    longHeadline: string;
    descriptions: string[];
    businessName: string;
  };
  socialAd?: {
    primaryText: string;
    headline: string;
    description: string;
    ctaButton: string;
  };
  videoAd?: {
    companionHeadline: string;
    companionDescription: string;
    ctaButton: string;
  };
}

export interface ReportGrowthPlanItem {
  phase: string;
  items: string[];
}

export interface ReportCompetitorSite {
  hostname: string;
  fetchedOk: boolean;
  fetchError?: string;
  wordCount: number;
  hasBlog: boolean;
  hasSchema: boolean;
  hasViewport: boolean;
  https: boolean;
  socialLinks: string[];
  techPlatform: string;
  responseTimeMs?: number;
}

export interface ReportData {
  consultant: ReportConsultant;
  business: {
    businessName: string;
    customerName: string;
    businessDescription?: string | null;
    websiteUrl?: string | null;
    hasWebsite: "YES" | "NO" | null;
    industry?: string | null;
  };
  executiveSummary: {
    currentSituation: string;
    problems: string[];
    biggestOpportunity: string;
    recommendedDirection: string;
  };
  websiteRecommendations: {
    hasWebsite: boolean;
    topProblems: string[];
    recommendedImprovements: string[];
    recommendedWebsiteType?: string;
    recommendedWebsiteTypeDescription?: string;
    recommendedPages?: string[];
    businessType?: string;
    onlinePresenceChannels?: string[];
    growthRecommendations?: { traffic: string[]; branding: string[]; reach: string[] } | null;
    strategicRecommendations?: string[];
    offPageMetrics?: {
      domainAuthority?: string;
      totalBacklinks?: string;
      referringDomains?: string;
      estimatedOrganicTraffic?: string;
      source?: string;
    } | null;
    localPresence?: {
      storeLocations: string[];
      notes?: string;
      recommendations?: string[];
    } | null;
    socialPresence?: {
      facebook?: string;
      instagram?: string;
      linkedin?: string;
      youtube?: string;
      metrics?: { facebook?: string; instagram?: string; linkedin?: string; youtube?: string };
    } | null;
  };
  audiencePlatform: {
    targetAudience: string;
    platforms: Array<{ platform: string; adType: string; expectedResult: string; budgetAllocation?: string; estimatedResult?: string }>;
  };
  auditScores?: ReportAuditScores | null;
  competitorInsights: string[];
  competitorSites?: { client: ReportCompetitorSite | null; competitors: ReportCompetitorSite[] } | null;
  sampleAds: ReportSampleAd[];
  scenarios: ReportScenarioRow[];
  growthPlan: ReportGrowthPlanItem[];
  problemSolutionStory: {
    problem: string;
    solution: string;
    strategy: string;
    execution: string;
    expectedResult: string;
  };
  generatedDate: string;
  benchmarkDisclaimer: string;
}
