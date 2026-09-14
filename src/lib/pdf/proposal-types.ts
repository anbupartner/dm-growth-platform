import type { ReportConsultant } from "./types";

// One priced package on the Proposal PDF — normally seeded 1:1 from a report
// version's Conservative/Expected/Growth Opportunity scenarios, but
// label/description/price are all consultant-editable before sending, and a
// package doesn't strictly need a backing scenario (a flat custom package is
// fine too).
export interface ProposalPackage {
  key: string;
  label: string;
  description?: string;
  price: number;
  currency: string;
  scenarioLabel?: string; // which report scenario this was seeded from, if any
  recommended?: boolean;
  // NOTE: this package used to also carry the backing scenario's projected
  // Customers/mo, Revenue/mo and ROI figures, shown as a small stat row on
  // the package card in the "4.1 Pricing packages" builder. Removed
  // entirely — the consultant asked for it to go, and it was never rendered
  // on the actual Proposal PDF (confirmed via grep — ProposalDocument.tsx
  // never read these 3 fields), so this was pure builder-side clutter with
  // no PDF-visible content to preserve. Old saved proposals' package JSON
  // may still carry these 3 keys from before this change — harmless, simply
  // no longer read or written.
  // NOTE: Monthly/One-Time Deliverables used to live here, one copy per
  // package — but the outline treats "Deliverables" (section 3) as a single
  // whole-engagement list, not one that varies by pricing tier, and having
  // it per-package meant the exact same text got typed 3 times (confirmed
  // from a real proposal's screenshots showing identical Monthly/One-Time
  // Deliverables text repeated across all 3 package cards). Moved to
  // `ProposalData.monthlyDeliverablesText`/`oneTimeDeliverablesText` (one
  // shared field for the whole proposal) below. Old saved proposals' package
  // JSON may still carry these two keys from before this change — harmless,
  // simply no longer read.
  // NOTE: this package used to also carry KPI & Measurement Framework
  // numbers (Traffic/Leads per month, CPL, CAC, ROAS), seeded from the same
  // report scenario this package was built from. Removed entirely — the
  // consultant clarified that "2.5 KPI & Measurement Framework" isn't about
  // projected figures at all, it's a simple list of which platforms are in
  // use and the important metrics that will be tracked for each (no
  // numbers), and isn't tied to any one pricing package. See
  // `ProposalData.kpiPlatforms` and `ProposalKpiCard` below/in
  // ProposalBuilderFields.tsx. Old saved proposals' package JSON may still
  // carry these 5 keys from before this change — harmless, simply no longer
  // read or written.
  // NOTE: this package used to also carry its own "Upfront-Commitment
  // Discount Tiers" text (one consultant-typed schedule per pricing tier).
  // The consultant clarified that a discount schedule isn't tied to which
  // package the customer picks — whichever package they choose, the SAME
  // discount schedule applies (only the resulting dollar amount differs,
  // since it's computed off each package's own price). Moved to
  // `ProposalData.discountAvailable`/`discountTiersText` (one shared
  // checkbox + schedule for the whole proposal) below. Old saved proposals'
  // package JSON may still carry this key from before this change —
  // harmless, simply no longer read or written.
  // Which individual services (from Settings' Service Packages master list,
  // see ServicePackagesConfig below) this package includes — set via the
  // "Services Included" checklist in the package editor. Stored as the
  // service KEYS at the time this package was built, so a proposal keeps
  // showing exactly what was selected even if the consultant later edits
  // the master service list or a tier's own definition in Settings. Purely
  // a builder convenience (drives the checklist UI and the tier-match
  // suggestion) — the actual PDF still only ever shows what's already in
  // `description`/`deliverablesText`, nothing new is rendered from this
  // field alone.
  selectedServiceKeys?: string[] | null;
  // Human-readable labels for the keys above, resolved and frozen at the
  // moment the package was built (not looked up again from Settings at PDF
  // render time) — same "snapshot, not a live reference" principle this app
  // uses for a report's consultant block. Rendered as a small chip row on
  // the Commercial Terms page (alongside this package's price), when present.
  selectedServiceLabels?: string[] | null;
}

export interface ProposalData {
  consultant: ReportConsultant;
  business: {
    businessName: string;
    customerName: string;
  };
  // Executive Summary ("What We Understand" / "The Opportunity" / "What We
  // Recommend" / "Our Approach") — seeded from the report snapshot's own
  // data (executiveSummary.currentSituation/biggestOpportunity/
  // recommendedDirection/problems, problemSolutionStory.strategy) when a
  // proposal is first built, then a fully editable, consultant-owned field
  // from that point on ("each subsection want editable" — no longer a live
  // pass-through of the report). Required (never fabricated blank) because
  // build-proposal-data.ts always falls back to the report's own non-empty
  // default text when nothing has been seeded yet; summaryProblemsText is
  // the one optional part (a bullet list that can be genuinely empty).
  summaryCurrentSituationText: string;
  summaryOpportunityText: string;
  summaryRecommendedDirectionText: string;
  summaryApproachText: string;
  summaryProblemsText?: string | null; // one bullet per line
  // "Challenges & Opportunities" section — demonstrates understanding of the
  // client's business using data the report already gathered (website audit
  // problems, competitor findings). Same seeded-then-editable pattern as
  // Executive Summary above; optional (omitted from the PDF when both blank).
  challengesTopProblemsText?: string | null; // one bullet per line
  challengesCompetitorInsightsText?: string | null; // one bullet per line
  // "90-Day Growth Roadmap" — phase title + bullet items per phase. Seeded
  // from the report's own growthPlan (real phase names/items only, never
  // invented) when a proposal is first built, then a fully editable list —
  // the consultant can rewrite any phase, add one, or remove one.
  roadmapPhases: { title: string; itemsText: string }[];
  // "2.5 KPI & Measurement Framework" — a dynamic list of which
  // platforms/channels are in use and the important metrics that will be
  // tracked for each (e.g. { platform: "SEO", metricsText: "Organic
  // traffic, Referral, CTR, Impressions, Clicks, Backlinks" }) — no
  // projected numbers, just what's being measured. Same dynamic add/remove
  // list shape as roadmapPhases above; one shared list for the whole
  // proposal, not per pricing package (the platforms/metrics tracked don't
  // vary by which tier the client picks). A platform with a blank name is
  // simply not rendered. Replaces the per-package Traffic/Leads/CPL/CAC/ROAS
  // figures that used to live on ProposalPackage (see the note there).
  kpiPlatforms: { platform: string; metricsText: string }[];
  packages: ProposalPackage[];
  // Deliverables (section 3 of the outline: 3.1 Monthly Deliverable / 3.2
  // One-Time Deliverable) — ONE shared list for the whole engagement, not
  // per pricing package (moved here from ProposalPackage; see the note on
  // that interface above). Each is optional itemized text, one "Item:
  // details" pair per line, rendered as its own real Item/Details table when
  // provided; omitted entirely when blank. Free text the consultant types —
  // never auto-generated. Shown pre-filled with a generic default in the
  // builder UI (same pattern as Next Steps/Terms) since it describes a
  // typical engagement's deliverables, not client-specific data.
  monthlyDeliverablesText?: string | null;
  oneTimeDeliverablesText?: string | null;
  // "4.2 Project Fee Discounts" — ONE shared discount schedule for the whole
  // proposal, gated behind an explicit on/off checkbox rather than the usual
  // "leave the text blank to omit" convention: the consultant asked for the
  // whole section to disappear when discounts simply aren't being offered,
  // driven by a single toggle rather than remembering to clear a field.
  // `discountAvailable` false always omits the section from the PDF
  // regardless of `discountTiersText`'s content. When true and
  // `discountTiersText` parses as a strict "N months: X%" schedule (see
  // parseDiscountTiers in ProposalDocument.tsx), the PDF computes each
  // pricing package's own discounted monthly amount from that package's own
  // price — the schedule is shared/uniform across packages, but the
  // resulting dollar figure naturally still varies by package price. Used to
  // be one separate field per ProposalPackage (see the note on that
  // interface above) — moved here since the discount schedule itself isn't
  // package-specific, only its computed dollar result is.
  discountAvailable: boolean;
  discountTiersText?: string | null;
  termsText: string;
  // Whole-engagement policy sections, shared across every package rather
  // than repeated per-tier — each is optional free text, one bullet per
  // line, rendered only when non-empty. Never auto-generated.
  // NOTE: this used to also carry pointOfContactText ("Communication") — the
  // consultant's 5.1-5.4 "Policies & Terms" outline has no slot for it and
  // asked for it to be removed from the proposal entirely. Removed here;
  // proposals.pointOfContactText in the DB is left in place but no longer
  // read or written.
  revisionPolicyText?: string | null;
  clientResponsibilitiesText?: string | null;
  notIncludedText?: string | null;
  // Stage 1 additions — "Requirements" and the 4 "Digital Growth Strategy"
  // stages (Attract → Engage → Convert → Retain). Optional free text, one
  // bullet per line, omitted from the PDF entirely when blank. No existing
  // report field captures these, so — per the "reuse existing data where
  // possible, else a new field" rule this project has followed throughout —
  // these are new consultant-entered fields, same non-fabrication pattern
  // as the policy sections above (nothing pre-filled or invented).
  requirementsText?: string | null;
  strategyAttractText?: string | null;
  strategyEngageText?: string | null;
  strategyConvertText?: string | null;
  strategyRetainText?: string | null;
  // "2.2 Recommended Services & Scope" — a single consultant recommendation
  // write-up: the client's stated requirement/goal, and what services/
  // approach are recommended to achieve it (e.g. "wants more website
  // visits -> recommend technical SEO + targeted paid search"). Optional
  // free text, one point per line, omitted from the PDF entirely when
  // blank — same non-fabrication pattern as Requirements/strategy above.
  // NOT tied to the priced packages below — see ProposalPackage's own notes
  // and ProposalRecommendedServicesCard for why this was split out.
  recommendedServicesText?: string | null;
  // Remaining full-flow sections. "Tools & Resource Plan" (platforms, tools,
  // team/resources required) sits under "Scope of the project"; "Next
  // Steps" is the document's closing section (Approval -> Kickoff ->
  // Onboarding -> Access -> Execution). Both optional free text, one bullet
  // per line, omitted from the PDF entirely when blank — same
  // non-fabrication pattern as every other optional field above. Unlike
  // toolsResourcePlanText, Next Steps is shown pre-filled with a generic
  // default in the builder UI (see ProposalBuilderFields.tsx) since it
  // describes a universal process, not client-specific data — the
  // consultant can edit or clear it freely.
  toolsResourcePlanText?: string | null;
  // Optional context alongside `kpiPlatforms` above (e.g. "Reported monthly
  // via a shared dashboard") — one bullet per line, omitted when blank.
  kpiFrameworkNotesText?: string | null;
  nextStepsText?: string | null;
  validUntil?: string | null;
  generatedDate: string;
  version: number;
}

// --- Recommended Services & Scope: reusable service-tier configuration ----
// Configured once in Settings (see ServicePackagesCard there), then read by
// every proposal's package editor. Lets the consultant define a master list
// of individual services (e.g. SEO, Social, Paid) and named pricing tiers
// (Foundation/Growth/Performance) built from combinations of those services,
// so building a proposal becomes "check the services this client needs" with
// a live suggestion of which configured tier matches, rather than retyping
// name/price/description from scratch every time. A tier's price/services
// here are just the current template — once a package is built from them,
// the package stores its own frozen copy (price, selectedServiceKeys), so
// editing a tier in Settings later never changes an already-sent proposal.
//
// Categorized master list: every individual service belongs to one named
// category (e.g. "SEO Services"), and every category belongs to one of a
// handful of broad groups (Organic / In-Organic / Tracking & Reporting) used
// purely to section the Settings UI. A category is a first-class entity
// (not just an implied grouping) so it can exist — and be added to — before
// it has any services in it.
export interface ServiceCategory {
  key: string;
  label: string;
  group: string;
}

export interface ServiceOption {
  key: string;
  label: string;
  categoryKey: string;
}

export interface ServiceTierConfig {
  key: string;
  name: string;
  price: number;
  serviceKeys: string[];
  // For a tier that isn't just a list of services (e.g. "Small business /
  // focused execution") — shown instead of the auto-joined service labels
  // when applying this tier's preset. Optional; falls back to the joined
  // service list when blank.
  descriptionOverride?: string | null;
}

export interface ServicePackagesConfig {
  categories: ServiceCategory[];
  services: ServiceOption[];
  tiers: ServiceTierConfig[];
}

// Every category not in this list (a consultant's own custom group name)
// sorts after these, alphabetically. "Other" is always last — it's the
// catch-all group for the always-present uncategorized bucket below.
const GROUP_ORDER = ["Organic", "In-Organic", "Tracking & Reporting", "Other"];

// A service's categoryKey always resolves to a real category — a service
// loaded from older/malformed saved JSON with no (or an unrecognized)
// categoryKey falls back to this always-present bucket instead of vanishing
// or crashing the Settings page.
export const UNCATEGORIZED_CATEGORY_KEY = "uncategorized";
const UNCATEGORIZED_CATEGORY: ServiceCategory = { key: UNCATEGORIZED_CATEGORY_KEY, label: "Other Services", group: "Other" };

// Repairs whatever comes back from JSON.parse(consultantSettings.servicePackagesJson)
// (including the pre-categories shape this app used to save) into the current
// ServicePackagesConfig shape: ensures the catch-all category always exists,
// and re-homes any service whose categoryKey doesn't match a real category
// into it. Never drops a service or a tier — only ever adds the fallback
// category and/or repoints a dangling categoryKey.
export function normalizeServicePackages(raw: unknown): ServicePackagesConfig {
  const cfg = (raw && typeof raw === "object" ? raw : {}) as Partial<ServicePackagesConfig>;
  const categories = Array.isArray(cfg.categories)
    ? cfg.categories.filter((c): c is ServiceCategory => !!c && typeof c.key === "string")
    : [];
  if (!categories.some((c) => c.key === UNCATEGORIZED_CATEGORY_KEY)) categories.push(UNCATEGORIZED_CATEGORY);
  const categoryKeys = new Set(categories.map((c) => c.key));

  const services = (Array.isArray(cfg.services) ? cfg.services : [])
    .filter((s): s is ServiceOption & { categoryKey?: string } => !!s && typeof s.key === "string")
    .map((s) => ({
      key: s.key,
      label: s.label ?? s.key,
      categoryKey: typeof s.categoryKey === "string" && categoryKeys.has(s.categoryKey) ? s.categoryKey : UNCATEGORIZED_CATEGORY_KEY,
    }));

  const tiers = Array.isArray(cfg.tiers) ? cfg.tiers : [];

  return { categories, services, tiers };
}

export interface ServiceCategoryView {
  category: ServiceCategory;
  services: ServiceOption[];
}

export interface ServiceGroupView {
  group: string;
  categories: ServiceCategoryView[];
}

// Reshapes the flat categories/services arrays into Group → Category →
// Services for rendering (Settings' Master Services List, and the Included
// Services picker on proposal package cards) — both consumers just walk this
// once rather than re-deriving the grouping themselves.
export function groupServicesByCategory(config: ServicePackagesConfig): ServiceGroupView[] {
  const byCategory = new Map<string, ServiceCategoryView>();
  for (const category of config.categories) byCategory.set(category.key, { category, services: [] });
  for (const service of config.services) {
    byCategory.get(service.categoryKey)?.services.push(service);
  }

  const byGroup = new Map<string, ServiceCategoryView[]>();
  for (const entry of byCategory.values()) {
    const list = byGroup.get(entry.category.group) ?? [];
    list.push(entry);
    byGroup.set(entry.category.group, list);
  }

  return [...byGroup.entries()]
    .map(([group, categories]) => ({ group, categories }))
    .sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(a.group);
      const bi = GROUP_ORDER.indexOf(b.group);
      if (ai === -1 && bi === -1) return a.group.localeCompare(b.group);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Builds one category plus its services in one step, prefixing every service
// key with the category key (e.g. "website-cro__landing-pages") — several
// item names below legitimately repeat across categories (e.g. "Landing
// Pages" under both Website & CRO and Lead Generation), and the prefix keeps
// every key globally unique without hand-numbering anything.
function buildCategory(key: string, label: string, group: string, items: string[]): ServiceCategoryView {
  return {
    category: { key, label, group },
    services: items.map((item) => ({ key: `${key}__${slugify(item)}`, label: item, categoryKey: key })),
  };
}

// Starter template shown the first time a consultant opens the new "Service
// Packages" Settings section, before they've saved their own configuration —
// a full digital-marketing service catalogue organized into 16 categories
// across three groups (Organic / In-Organic / Tracking & Reporting), kept as
// an editable starting point rather than baked-in, uneditable business logic.
const DEFAULT_SERVICE_CATEGORIES: ServiceCategoryView[] = [
  buildCategory("seo-services", "SEO Services", "Organic", [
    "SEO Audit", "Keyword Research", "On-Page SEO", "Technical SEO", "Local SEO", "Off-Page SEO", "Link Building", "Content Optimization", "AEO/GEO",
  ]),
  buildCategory("website-cro", "Website & CRO", "Organic", [
    "Website Audit", "Landing Pages", "UX Optimization", "Conversion Optimization", "CTA Optimization", "A/B Testing", "CRO Recommendations",
  ]),
  buildCategory("content-marketing", "Content Marketing", "Organic", [
    "Blog Writing", "Case Studies", "SMO Post Content", "Website Content", "Landing Page Content", "SEO Content", "Infographics", "Video Content",
  ]),
  buildCategory("online-reputation", "Online Reputation", "Organic", [
    "Google Business Profile", "Review Management", "Rating Improvement", "Review Response", "Local Listings", "Reputation Monitoring",
  ]),
  buildCategory("branding-digital-presence", "Branding & Digital Presence", "Organic", [
    "Brand Positioning", "Digital Strategy", "Competitor Analysis", "Content Strategy", "Online Brand Visibility",
  ]),
  buildCategory("marketing-strategy-consulting", "Marketing Strategy & Consulting", "Organic", [
    "Digital Audit", "Marketing Roadmap", "Go-to-Market Strategy", "Funnel Strategy", "Budget Planning", "KPI Framework", "Monthly Consulting",
  ]),
  buildCategory("performance-marketing", "Performance Marketing", "In-Organic", [
    "Google Ads", "Meta Ads", "LinkedIn Ads", "Bing Ads", "Search Campaigns", "Display", "Remarketing", "Lead Generation Campaigns", "Campaign Optimization",
  ]),
  buildCategory("social-media-marketing", "Social Media Marketing", "In-Organic", [
    "Facebook", "Instagram", "LinkedIn", "YouTube", "Content Calendar", "Organic Posts", "Reels", "Community Management", "Social Analytics",
  ]),
  buildCategory("lead-generation", "Lead Generation", "In-Organic", [
    "B2B Lead Generation", "B2C Lead Generation", "Landing Pages", "Lead Forms", "Lead Magnets", "MQL Generation", "SQL Qualification", "Lead Nurturing",
  ]),
  buildCategory("email-marketing", "Email Marketing", "In-Organic", [
    "Newsletter", "Promotional Campaigns", "Drip Campaigns", "Lead Nurturing", "Customer Retention", "Email Automation",
  ]),
  buildCategory("influencer-creator-marketing", "Influencer / Creator Marketing", "In-Organic", [
    "Influencer Identification", "Collaboration", "Instagram Creators", "YouTube Creators", "Campaign Management", "Performance Tracking",
  ]),
  buildCategory("ooh-marketing", "OOH Marketing", "In-Organic", [
    "Billboards", "Bus Ads", "Auto/Cab Branding", "Metro Ads", "Railway Ads", "Brochures", "Flyers", "Pamphlets", "Catalogues", "Posters", "Standees",
  ]),
  buildCategory("event-activation-marketing", "Event & Activation Marketing", "In-Organic", [
    "Trade Shows", "Exhibitions", "Product Launches", "Roadshows", "Customer Meets", "Dealer Meets", "Vehicle Branding",
  ]),
  buildCategory("crm-marketing-automation", "CRM & Marketing Automation", "Tracking & Reporting", [
    "CRM Setup", "Lead Pipeline", "Lead Scoring", "Email Automation", "WhatsApp/Email Follow-up", "Segmentation", "Workflow Automation",
  ]),
  buildCategory("ga4-gtm-analytics", "GA4 & GTM Analytics", "Tracking & Reporting", [
    "GA4 Setup", "GTM Setup", "Event Tracking", "Conversion Tracking", "Data Validation", "GA4 Audit", "Dashboard", "Attribution & Reporting",
  ]),
  buildCategory("ooh-measurement", "OOH Measurement", "Tracking & Reporting", [
    "Reach", "Impressions", "Footfall", "QR Scans", "Leads", "Coupon/Promo Tracking",
  ]),
];

export const DEFAULT_SERVICE_PACKAGES: ServicePackagesConfig = normalizeServicePackages({
  categories: DEFAULT_SERVICE_CATEGORIES.map((c) => c.category),
  services: DEFAULT_SERVICE_CATEGORIES.flatMap((c) => c.services),
  // serviceKeys are left empty (rather than pointing at specific items from
  // the catalogue above) — with 100+ granular services across 16
  // categories, no small hand-picked subset represents "Growth" or
  // "Performance" better than the others, so each tier just carries a
  // written description instead until the consultant picks real services.
  tiers: [
    { key: "foundation", name: "Foundation", price: 30000, serviceKeys: [], descriptionOverride: "Small business / focused execution" },
    {
      key: "growth",
      name: "Growth",
      price: 50000,
      serviceKeys: [],
      descriptionOverride: "SEO, Social, Paid & Lead Generation essentials for scaling client acquisition",
    },
    {
      key: "performance",
      name: "Performance",
      price: 65000,
      serviceKeys: [],
      descriptionOverride: "Full-funnel strategy, paid media, CRO, CRM & analytics for sustained growth",
    },
  ],
});
