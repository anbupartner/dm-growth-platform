import type { SiteSignals } from "@/lib/competitor-analysis";
import type { BusinessType, SocialPlatformKey } from "@/lib/constants";
import type { SocialCheckResult } from "@/lib/social-audit";

export interface WizardData {
  // Step 1 — Customer details
  leadId: string | null;
  customerName: string;
  businessName: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  state: string;
  country: string;
  businessVertical: string;
  businessDescription: string;
  productsServices: string;
  websiteUrl: string;
  competitorUrls: string;
  // Local / physical store(s) this business also wants promoted, alongside
  // its website — e.g. a Google Business Profile or Maps listing per
  // location. First entry is treated as the main store throughout.
  hasLocalStore: boolean;
  storeLocations: string[];
  localPresenceNotes: string;
  minOrderValue: string;
  avgOrderValue: string;
  maxOrderValue: string;
  profitMarginPct: string;
  monthlyBudget: string;
  // Country the marketing is targeting (not necessarily the business's own
  // address country, e.g. an India-based agency running a Gulf campaign) —
  // drives the auto-suggested target audience toward real, general digital-
  // behavior patterns for that market. Defaults to India.
  targetCountry: string;
  // Optional finer-grained city/region within targetCountry, used verbatim
  // in "Serving {targetLocation}" ad copy. Leave blank to target nationally.
  targetLocation: string;
  targetAudience: string;
  businessGoal: string;
  leadSource: string;

  // Step 2
  hasWebsite: "YES" | "NO" | "";

  // Step 3 — audit (Workflow A) or recommendation (Workflow B)
  auditChecks: Array<{ key: string; label: string; status: string; detail: string }>;
  auditScores: {
    technicalSeo: number;
    onPageSeo: number;
    content: number;
    uxConversion: number;
    branding: number;
    localSeo: number;
    performance: number;
    overall: number;
  };
  topProblems: string[];
  recommendedImprovements: string[];
  websiteType: string;
  websitePages: string[];
  // A real image already on the client's own site (its og:image), captured
  // when the audit runs — used only as a visual reference in Sample Ads.
  websiteOgImageUrl: string;

  // No-website path only: what kind of business this is (what they sell),
  // separate from Business Vertical (which sector). Drives which website
  // types are suggested (BUSINESS_TYPE_WEBSITE_TYPES) and what to suggest
  // for online presence while there's no website yet (below).
  businessType: BusinessType | "";
  // Editable starting list from ONLINE_PRESENCE_SUGGESTIONS for the chosen
  // Business Type — real platforms to use in the meantime, before a website
  // exists. Empty until the consultant clicks "Use suggested channels".
  onlinePresenceChannels: string[];

  // Off-page / link-building / traffic snapshot — consultant-provided from
  // their own SEO tools (Ahrefs, SEMrush, Moz, Google Search Console /
  // Analytics). Never fetched or guessed by the app itself.
  domainAuthority: string;
  totalBacklinks: string;
  referringDomains: string;
  estimatedOrganicTraffic: string;
  offPageSource: string;

  // Step 4 — organic & PPC strategy (consultant chooses which apply)
  includeOrganic: boolean;
  organicGoals: string[];
  currentOrganicTraffic: string;

  includePpc: boolean;
  ppcObjectives: string[];

  includeWhatsappMarketing: boolean;
  whatsappGoals: string[];

  // Organic social profile links — Facebook, Instagram, LinkedIn, YouTube.
  // All optional; only the ones filled in are saved/shown on the report.
  socialFacebook: string;
  socialInstagram: string;
  socialLinkedin: string;
  socialYoutube: string;

  // Per-platform live reachability check (Audit step, only for platforms
  // with a link above) — reports only what a plain fetch can honestly
  // verify, never a fabricated follower/engagement number. Populated when
  // the consultant clicks "Check Page"; absent until then.
  socialChecks: Partial<Record<SocialPlatformKey, SocialCheckResult>>;
  // Real metrics pasted in by the consultant from each platform's own
  // Insights/Analytics — the only source of real follower/engagement
  // numbers, since those can't be honestly scraped. Saved with the rest of
  // the social data and shown on the report when present.
  socialMetrics: Partial<Record<SocialPlatformKey, string>>;

  // Step 6 — audience & platform
  platforms: string[];

  // Step 7 — competitor. competitorInsights is the consultant's own manual
  // notes; the rest is populated by the live competitor-site analysis (real
  // fetched data — never fabricated) and kept so it survives step navigation.
  competitorInsights: string;
  competitorAnalysisRan: boolean;
  competitorClientSignals: SiteSignals | null;
  competitorSiteResults: SiteSignals[];
  competitorAutoInsights: string[];

  // Step 8 — sample ads
  sampleAds: Array<{
    platform: string;
    headline: string;
    benefit: string;
    cta: string;
    adType?: string;
    format: "Search Ad" | "Image Ad" | "Video Ad";

    // Image Ad — visualDescription is the editable prompt; imageDataUrl is
    // only populated once the consultant explicitly generates a real image.
    visualDescription?: string;
    imageDataUrl?: string;
    imageError?: string;
    // Real photo already on the client's own or a competitor's site — shown
    // only when no AI image has been generated, clearly labeled as a visual
    // reference (not finished ad creative), sourced from ogImageUrl already
    // fetched in the Audit / Competitor Analysis steps. Never fabricated.
    referenceImageUrl?: string;
    referenceImageSource?: string;

    // Video Ad — a text script/storyboard. Real AI video generation isn't
    // practical here (cost, latency), so this stays a written concept.
    videoScript?: { hook: string; story: string; cta: string };

    // Platform ad-component fields (headlines, descriptions, primary text,
    // extensions) matching how each platform actually structures an ad.
    // Built only from the consultant's own entered business data — never
    // invented claims (no fake "20+ years experience" etc.) — and always
    // editable before use.
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
  }>;

  // Step 9 — budget & forecast
  cpc: string;
  leadConversionRate: string;
  qualificationRate: string;
  salesConversionRate: string;
  avgSellingPrice: string;
  additionalMarketingCost: string;
  organicTrafficGrowth: string;
  organicLeadConversionRate: string;

  // Step 10 — problem/solution story
  problem: string;
  solution: string;
  strategy: string;
  execution: string;
  expectedResult: string;
}

export const initialWizardData: WizardData = {
  leadId: null,
  customerName: "",
  businessName: "",
  email: "",
  phone: "",
  whatsapp: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  businessVertical: "",
  businessDescription: "",
  productsServices: "",
  websiteUrl: "",
  competitorUrls: "",
  hasLocalStore: false,
  storeLocations: [],
  localPresenceNotes: "",
  minOrderValue: "",
  avgOrderValue: "",
  maxOrderValue: "",
  profitMarginPct: "",
  monthlyBudget: "",
  targetCountry: "India",
  targetLocation: "",
  targetAudience: "",
  businessGoal: "",
  leadSource: "OTHER",

  hasWebsite: "",

  auditChecks: [],
  auditScores: {
    technicalSeo: 0,
    onPageSeo: 0,
    content: 0,
    uxConversion: 0,
    branding: 0,
    localSeo: 0,
    performance: 0,
    overall: 0,
  },
  topProblems: [],
  recommendedImprovements: [],
  websiteType: "Lead-generation website",
  websitePages: ["Home", "About", "Services", "Contact"],
  websiteOgImageUrl: "",

  businessType: "",
  onlinePresenceChannels: [],

  domainAuthority: "",
  totalBacklinks: "",
  referringDomains: "",
  estimatedOrganicTraffic: "",
  offPageSource: "",

  includeOrganic: true,
  organicGoals: [],
  currentOrganicTraffic: "",

  includePpc: true,
  ppcObjectives: [],

  includeWhatsappMarketing: false,
  whatsappGoals: [],

  socialFacebook: "",
  socialInstagram: "",
  socialLinkedin: "",
  socialYoutube: "",
  socialChecks: {},
  socialMetrics: {},

  platforms: [],

  competitorInsights: "",
  competitorAnalysisRan: false,
  competitorClientSignals: null,
  competitorSiteResults: [],
  competitorAutoInsights: [],

  sampleAds: [],

  cpc: "1.5",
  leadConversionRate: "5",
  qualificationRate: "85",
  salesConversionRate: "20",
  avgSellingPrice: "",
  additionalMarketingCost: "0",
  organicTrafficGrowth: "10",
  organicLeadConversionRate: "3",

  problem: "",
  solution: "",
  strategy: "",
  execution: "",
  expectedResult: "",
};
