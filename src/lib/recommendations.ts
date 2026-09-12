// Rule-based starting-point suggestions — NOT fabricated performance data.
// Two things live here, both feeding the "has website" (Workflow A) path of
// the assessment wizard:
//
// 1. Audit → Growth Recommendations: buckets the live, honest audit checks
//    (see website-audit.ts) into Traffic / Branding / Reach, each with a
//    concrete next action, instead of one flat problem list.
// 2. Target Audience & Platform suggestion by business vertical: every
//    string here is editable by the consultant before it reaches a client,
//    and expected-result text is deliberately directional ("captures",
//    "builds") rather than a number or guarantee — consistent with the
//    app's rule of never presenting invented figures as fact.

import type { AD_PLATFORMS } from "./constants";
import { PLATFORM_BENCHMARK_KEY } from "./constants";
import { resolveBenchmarkMetric, type BenchmarkRow } from "./calculations";

export type AdPlatform = (typeof AD_PLATFORMS)[number];

// ---------------------------------------------------------------------------
// 1. Audit recommendations, grouped by growth lever
// ---------------------------------------------------------------------------

export interface GrowthRecommendations {
  traffic: string[];
  branding: string[];
  reach: string[];
}

type Bucket = "traffic" | "branding" | "reach";

const CHECK_BUCKET: Record<string, Bucket> = {
  title: "traffic",
  meta_description: "traffic",
  h1: "traffic",
  canonical: "traffic",
  schema: "traffic",
  robots_txt: "traffic",
  sitemap_xml: "traffic",
  content_depth: "traffic",
  lang_attribute: "traffic",
  local_business_schema: "traffic",
  nap_consistency: "traffic",
  https: "branding",
  image_alt: "branding",
  og_tags: "branding",
  favicon: "branding",
  viewport: "reach",
  core_web_vitals: "reach",
  broken_links: "reach",
  fetch: "reach",
  social_profile_links: "reach",
  server_response_time: "reach",
};

const CHECK_ADVICE: Record<string, string> = {
  title: "Rewrite the page title to include the core service/product and location — this is a primary click-through driver in search results.",
  meta_description: "Write a compelling 50–160 character meta description with a clear reason to click — search engines and social shares both use this.",
  h1: "Use exactly one clear, keyword-relevant H1 per page so search engines understand what the page is about.",
  canonical: "Add a canonical tag so search engines consolidate ranking signals to the right URL instead of splitting them.",
  schema: "Add structured data (JSON-LD) for the business/product/service — this unlocks rich search results (star ratings, FAQs, etc.) that improve click-through.",
  robots_txt: "Publish a robots.txt file so search engines can crawl the site efficiently.",
  sitemap_xml: "Publish an XML sitemap and submit it in Google Search Console to speed up indexing of new/updated pages.",
  content_depth: "Expand thin pages with more useful, specific content — shallow pages rank and convert worse than pages that fully answer the visitor's question.",
  https: "Move the site to HTTPS — this is both a trust signal for visitors and a confirmed Google ranking factor.",
  image_alt: "Add descriptive ALT text to images — this supports accessibility and reinforces brand/product context to search engines.",
  viewport: "Add a responsive viewport meta tag — without it, mobile visitors (often the majority of traffic) get a broken layout, which hurts both reach and conversion.",
  core_web_vitals: "Run a Core Web Vitals check (Google PageSpeed Insights) — slow-loading pages lose visitors before they ever see the offer.",
  broken_links: "Run a full-site broken-link crawl — broken internal/external links quietly cap both organic reach and user trust.",
  fetch: "The page couldn't be reached during this audit — confirm the URL is correct and the site is live; nothing else here could be checked until it is.",
  lang_attribute: "Add a lang attribute to the <html> tag so search engines and screen readers serve the page to the right audience.",
  local_business_schema: "Add LocalBusiness structured data with the business's name, address and phone — this is what lets Google show a map pin, hours and address directly in search results, a major driver of local search traffic.",
  nap_consistency: "Make sure the business's Name, Address and Phone (NAP) appear clearly on the page and match Google Business Profile and directory listings exactly — inconsistent NAP is one of the most common local-SEO ranking blockers.",
  og_tags: "Add Open Graph title and image tags — without them, links shared on WhatsApp, Facebook or LinkedIn show a generic, unbranded preview instead of the business's own image and headline.",
  favicon: "Add a favicon — a small polish detail, but it reinforces brand recall in browser tabs, bookmarks and search suggestions.",
  social_profile_links: "Link the business's active social profiles (Facebook, Instagram, LinkedIn, etc.) from the site — this extends reach across channels and is a trust signal both to visitors and to search engines.",
  server_response_time: "Server response time is slow — every extra second before the page starts loading measurably increases how many visitors leave before they ever see the offer. Consider a faster host, caching, or a CDN.",
};

// Evergreen strategic recommendations a consultant would pitch regardless of
// what a single-page audit can technically verify — off-page authority,
// link building and content strategy. Shown as a distinct "Strategic Next
// Steps" group so it reads as expert judgement, not another audit finding.
export const STRATEGIC_RECOMMENDATIONS: string[] = [
  "Build backlinks from relevant, reputable sites in this industry — guest posts, supplier/partner directories, local business associations and press mentions all compound over time.",
  "Claim and fully complete the Google Business Profile (categories, hours, photos, services, posts) — this is often the single highest-leverage local SEO action available.",
  "Publish a regular cadence of content (blog, case studies, FAQs) targeting the questions this business's customers actually search for — this is what compounds organic traffic month over month, unlike paid traffic which stops the day spend stops.",
  "List the business consistently across relevant directories and review platforms (Google, industry-specific directories, review sites) — both for referral traffic and as an off-page trust signal.",
];

/** Buckets failing/warning checks into Traffic / Branding / Reach with a concrete next action per item. */
export function categorizeGrowthRecommendations(checks: Array<{ key: string; status: string }>): GrowthRecommendations {
  const out: GrowthRecommendations = { traffic: [], branding: [], reach: [] };
  for (const check of checks) {
    if (check.status !== "warn" && check.status !== "fail") continue;
    const bucket = CHECK_BUCKET[check.key];
    const advice = CHECK_ADVICE[check.key];
    if (!bucket || !advice) continue;
    out[bucket].push(advice);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Target audience & platform-wise ad type suggestion, by business vertical
// ---------------------------------------------------------------------------

export interface PlatformAdSuggestion {
  platform: AdPlatform;
  adType: string;
  expectedResult: string;
}

export interface AudiencePlatformSuggestion {
  audience: string;
  platforms: PlatformAdSuggestion[];
}

// Structured detail behind each vertical's suggestion — a general, widely
// known customer-profile pattern for that category (buyer type, typical
// demographic, online interests/behavior, and one concrete example persona).
// This is generic industry knowledge a media planner would already use as a
// starting point, never a specific claim about any one business — always
// editable, and combined into one readable block for the Target Audience
// field rather than shown as separate inputs.
interface DetailedAudience {
  audience: string;
  buyerType: string;
  demographic: string;
  interestsBehavior: string;
  example: string;
  platforms: PlatformAdSuggestion[];
}

function formatAudience(d: DetailedAudience): string {
  return [
    d.audience,
    "",
    `Buyer type: ${d.buyerType}`,
    `Demographic: ${d.demographic}`,
    `Interests & online behaviour: ${d.interestsBehavior}`,
    `Example target customer: ${d.example}`,
  ].join("\n");
}

const DEFAULT_DETAIL: DetailedAudience = {
  audience: "Adults in the target location who match the business's typical customer profile.",
  buyerType: "To be confirmed — select a Business Vertical on Step 1 for a tailored, industry-specific suggestion.",
  demographic: "General adult population matching this business's typical customer — refine using what you already know about existing customers.",
  interestsBehavior: "Searches for this product/service when the need arises; add specifics once a vertical is set or based on real customer data.",
  example: "Add a concrete example customer once the business vertical is set, or based on this business's actual customer data.",
  platforms: [
    { platform: "Google Search", adType: "Search ads on high-intent keywords", expectedResult: "Captures people already looking for this product or service." },
    { platform: "Facebook", adType: "Lead-generation / awareness ads", expectedResult: "Builds awareness and generates enquiries from a targeted local or interest-based audience." },
    { platform: "Instagram", adType: "Story / Reels awareness ads", expectedResult: "Reaches a visually engaged audience earlier in their decision process." },
  ],
};

const BY_INDUSTRY: Record<string, DetailedAudience> = {
  "Advocacy": {
    audience: "Issue-motivated adults aged 25–55 in the target region who engage with news, causes or community groups.",
    buyerType: "Supporter / donor acquisition — not a product buyer.",
    demographic: "Adults 25–55, civically engaged, already following news or cause-related content; skews toward people who've supported similar causes before.",
    interestsBehavior: "Follows news and cause pages, shares petitions or campaign content, responds to emotive video/storytelling, active on Facebook and Instagram.",
    example: "A 34-year-old who follows environmental or community-cause pages and has signed an online petition before.",
    platforms: [
      { platform: "Facebook", adType: "Awareness & engagement ads (video/carousel)", expectedResult: "Builds cause awareness and grows a supporter or follower base." },
      { platform: "Google Search", adType: "Search ads on cause/issue keywords", expectedResult: "Captures people actively searching for this cause or organisation." },
      { platform: "Instagram", adType: "Story/Reels awareness ads", expectedResult: "Reaches a younger, socially engaged supporter base." },
    ],
  },
  "Agriculture": {
    audience: "Farm owners, agribusiness operators and agri-input buyers in the target region.",
    buyerType: "B2B input/equipment buyer or B2C farm-to-table consumer, depending on this business's offering.",
    demographic: "Farm owners and operators 35–65, or agribusiness procurement roles at co-ops/agri-suppliers, primarily rural/semi-rural.",
    interestsBehavior: "Researches equipment/input suppliers via Google search and trade shows, relies heavily on word-of-mouth/dealer relationships, seasonal buying patterns tied to planting/harvest cycles.",
    example: "A 45-year-old farm operator comparing irrigation equipment suppliers ahead of the planting season.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on equipment/service-intent keywords", expectedResult: "Captures buyers actively researching a supplier ahead of a seasonal purchase window." },
      { platform: "Facebook", adType: "Local/regional awareness ads", expectedResult: "Builds visibility with a rural/semi-rural audience through community-group reach." },
      { platform: "YouTube", adType: "Equipment demo video ads", expectedResult: "Builds trust and understanding for a considered equipment purchase." },
    ],
  },
  "Apparel": {
    audience: "Style-conscious shoppers aged 18–45 who follow fashion trends and shop online.",
    buyerType: "D2C / e-commerce shopper (B2C).",
    demographic: "18–45, fashion-conscious, urban and semi-urban, gender mix depends on the specific product line (menswear, womenswear, unisex).",
    interestsBehavior: "Follows fashion influencers, browses Instagram/Pinterest for outfit inspiration, price-compares before buying, responsive to limited-time drops and user-generated content.",
    example: "A 24-year-old who follows fashion influencers on Instagram and buys clothing online every 4–6 weeks.",
    platforms: [
      { platform: "Instagram", adType: "Shopping / collection ads (carousel, Reels)", expectedResult: "Drives product discovery and direct purchases from visual browsing." },
      { platform: "Facebook", adType: "Catalogue & retargeting ads", expectedResult: "Recovers cart abandoners and repeat buyers." },
      { platform: "Google Search", adType: "Shopping ads on product-intent keywords", expectedResult: "Captures high-intent 'buy now' searches." },
    ],
  },
  "Auto": {
    audience: "In-market car buyers and vehicle owners within the dealership's service radius.",
    buyerType: "High-consideration B2C buyer (vehicle purchase) or B2C service customer.",
    demographic: "25–55, household income sufficient for vehicle ownership, local to the dealership's service area.",
    interestsBehavior: "Researches models and reviews on YouTube/Google before visiting, cross-shops dealer pricing, revisits research multiple times before buying; service customers search 'near me' when a need arises.",
    example: "A 32-year-old comparing SUV models on YouTube and Google before booking a test drive.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on model/dealer-intent keywords", expectedResult: "Captures high-intent buyers close to purchase." },
      { platform: "Facebook", adType: "Local awareness + lead-form ads", expectedResult: "Generates test-drive and service bookings from nearby audiences." },
      { platform: "YouTube", adType: "Vehicle showcase video ads", expectedResult: "Builds consideration with in-market auto shoppers." },
    ],
  },
  "Automobile": {
    audience: "In-market vehicle buyers researching a specific make/model or dealership within the target area.",
    buyerType: "High-consideration B2C buyer — a vehicle purchase specifically (new/used sales), distinct from a general auto-service customer.",
    demographic: "25–60, household income sufficient for a vehicle purchase, local to the dealership/showroom's catchment area.",
    interestsBehavior: "Compares models, prices and reviews across multiple sites over days/weeks before visiting a showroom, cross-shops financing offers, often researches on mobile then finalizes on desktop.",
    example: "A 38-year-old comparing SUV trims and financing offers online before booking a showroom visit.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on model/dealer-intent keywords", expectedResult: "Captures high-intent buyers close to a showroom visit." },
      { platform: "YouTube", adType: "Vehicle walkaround/showcase video ads", expectedResult: "Builds consideration with in-market shoppers still comparing models." },
      { platform: "Facebook", adType: "Local showroom event + lead-form ads", expectedResult: "Generates test-drive bookings and financing enquiries." },
    ],
  },
  "B2B": {
    audience: "Decision-makers and procurement roles at target-sized companies in the relevant industry.",
    buyerType: "B2B decision-maker or buying-committee member.",
    demographic: "Working professionals 28–55, mid-to-senior titles (Manager, Director, VP, Owner) at companies matching the target industry and company size.",
    interestsBehavior: "Researches vendors via Google and LinkedIn, reads case studies and peer reviews, engages with thought-leadership content, longer cycle often involving multiple stakeholders.",
    example: "An Operations Director at a 50–200 employee company researching vendors on LinkedIn and Google before requesting a demo.",
    platforms: [
      { platform: "LinkedIn", adType: "Sponsored content + lead-gen forms", expectedResult: "Reaches by job title/company and captures qualified B2B leads." },
      { platform: "Google Search", adType: "Search ads on solution-intent keywords", expectedResult: "Captures buyers actively researching a solution." },
      { platform: "Google Display", adType: "Retargeting to site visitors", expectedResult: "Keeps the brand top-of-mind through a longer B2B sales cycle." },
    ],
  },
  "Beauty": {
    audience: "Beauty and personal-care shoppers aged 18–45 with high engagement on visual/social content.",
    buyerType: "D2C / e-commerce or in-store beauty shopper (B2C).",
    demographic: "18–45, urban and semi-urban; product-line-dependent gender mix (many beauty categories skew female, but grooming lines skew male).",
    interestsBehavior: "Follows beauty influencers and tutorials, high engagement with Reels and UGC, reads ingredient/review content before buying, price- and results-conscious.",
    example: "A 27-year-old who watches skincare tutorials on Instagram Reels and buys products online after seeing reviews.",
    platforms: [
      { platform: "Instagram", adType: "Reels / product showcase ads", expectedResult: "Drives discovery and trial through visual, trend-led content." },
      { platform: "Facebook", adType: "Retargeting / catalogue ads", expectedResult: "Converts browsers who viewed products but didn't buy." },
      { platform: "Google Search", adType: "Shopping/search ads on product keywords", expectedResult: "Captures ready-to-buy searches." },
    ],
  },
  "Construction": {
    audience: "Property owners, developers or general contractors planning a build or renovation project needing this trade/service.",
    buyerType: "B2C homeowner project customer or B2B general contractor/developer, depending on the business's typical job size.",
    demographic: "30–65 property owners planning a project, or procurement/project-manager roles at development and contracting firms for larger commercial work.",
    interestsBehavior: "Requests multiple quotes before deciding, checks licensing/reviews/portfolio photos closely, longer decision cycle for larger jobs, seasonal demand patterns.",
    example: "A property developer requesting quotes from three contractors for a multi-unit build.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on project/service-intent keywords", expectedResult: "Captures buyers actively planning or quoting a project." },
      { platform: "Facebook", adType: "Local lead-gen ads with project photos", expectedResult: "Generates quote requests from local property owners and developers." },
      { platform: "Google Display", adType: "Retargeting", expectedResult: "Keeps the business visible through a multi-quote decision window." },
    ],
  },
  "Consumer Services": {
    audience: "Local households and individuals actively searching for this service.",
    buyerType: "Local B2C service customer.",
    demographic: "Adults 25–60, homeowners/renters or individuals within the service's local trade area.",
    interestsBehavior: "Searches 'near me' the moment a need arises, compares reviews/ratings before booking, often converts by phone or WhatsApp after finding the business online.",
    example: "A homeowner searching 'plumber near me' right after noticing a leak.",
    platforms: [
      { platform: "Google Search", adType: "Local search ads with call/booking extensions", expectedResult: "Captures high-intent 'near me' searches." },
      { platform: "Facebook", adType: "Local lead-generation ads", expectedResult: "Generates enquiries from the local service area." },
      { platform: "Google Display", adType: "Local remarketing", expectedResult: "Keeps the business visible to past site visitors." },
    ],
  },
  "Dating & Personals": {
    audience: "Singles in the target age range and region open to online dating or matchmaking.",
    buyerType: "Consumer app/service sign-up (B2C, often freemium or subscription).",
    demographic: "Singles 22–40; specific age range, orientation and relationship goals vary by how the platform positions itself.",
    interestsBehavior: "Compares dating apps/services, influenced by app-store reviews and peer recommendations, high mobile usage, engages with relatable or humorous social content.",
    example: "A 29-year-old single professional comparing dating apps after a friend's recommendation.",
    platforms: [
      { platform: "Facebook", adType: "Sign-up / registration ads", expectedResult: "Drives new member sign-ups." },
      { platform: "Instagram", adType: "Story/Reels awareness ads", expectedResult: "Builds brand awareness among younger singles." },
      { platform: "Google Search", adType: "Branded + category search ads", expectedResult: "Captures people already comparing dating platforms." },
    ],
  },
  "E-Commerce": {
    audience: "Online shoppers matching the product category, with retargeting for cart abandoners.",
    buyerType: "D2C online shopper (B2C).",
    demographic: "Varies by product category — typically 18–45, matching the specific product's buyer (e.g. parents for baby products, students for stationery, professionals for gadgets).",
    interestsBehavior: "Browses product categories online, price-compares across sites, frequently abandons carts (recoverable via retargeting), responsive to free shipping and time-limited discounts.",
    example: "A shopper who added a product to their cart on the website but didn't complete checkout.",
    platforms: [
      { platform: "Google Search", adType: "Shopping ads on product-intent keywords", expectedResult: "Captures high-intent purchase searches." },
      { platform: "Facebook", adType: "Catalogue + dynamic retargeting ads", expectedResult: "Recovers abandoned carts and drives repeat purchases." },
      { platform: "Instagram", adType: "Shopping / product discovery ads", expectedResult: "Builds awareness for new product lines." },
    ],
  },
  "Education": {
    audience: "Prospective students or parents researching courses or institutions in the target region.",
    buyerType: "B2C (adult student) or B2B2C (parent as decision-maker for a school-age child).",
    demographic: "Prospective students 16–30, or parents 35–55 researching on behalf of a school-age child, in the target region.",
    interestsBehavior: "Compares institutions/courses via Google search and reviews, attends webinars or open days, weighs fees against career/academic outcomes before committing.",
    example: "A parent comparing schools or coaching institutes for their child, weighing fees and results online.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on course/program keywords", expectedResult: "Captures active enrolment research." },
      { platform: "Facebook", adType: "Lead-generation ads (info requests)", expectedResult: "Generates enquiry and application leads." },
      { platform: "YouTube", adType: "Campus/program showcase video", expectedResult: "Builds trust and consideration before enrolling." },
    ],
  },
  "Employment & Job Training": {
    audience: "Job seekers and career-changers matching the program's target skill level.",
    buyerType: "B2C learner / career-changer.",
    demographic: "18–45, job seekers or career-changers; profile varies by program level (entry-level skills vs. professional certification).",
    interestsBehavior: "Searches for courses/certifications matching a specific skill gap, compares cost and job-placement claims, active on LinkedIn and Google Search.",
    example: "A 26-year-old searching for a digital marketing certification to change careers.",
    platforms: [
      { platform: "Facebook", adType: "Lead-generation ads", expectedResult: "Generates enrolment enquiries for training programs." },
      { platform: "Google Search", adType: "Search ads on course/certification keywords", expectedResult: "Captures people actively searching for training." },
      { platform: "LinkedIn", adType: "Sponsored content", expectedResult: "Reaches career-focused professionals." },
    ],
  },
  "Employment Services": {
    audience: "Employers hiring for the roles this service places, and candidates seeking placement.",
    buyerType: "B2B (employer client) and B2C (candidate) — a two-sided marketplace.",
    demographic: "Employers: HR/hiring managers at companies with open roles. Candidates: job seekers whose skills match the roles this service places.",
    interestsBehavior: "Employers search for staffing help when facing a hiring gap; candidates actively browse job boards and LinkedIn and respond to relevant openings.",
    example: "An HR manager searching for a staffing agency after struggling to fill an open role.",
    platforms: [
      { platform: "LinkedIn", adType: "Sponsored content + InMail", expectedResult: "Reaches hiring managers and active job seekers." },
      { platform: "Google Search", adType: "Search ads on hiring/staffing keywords", expectedResult: "Captures employers actively searching for staffing help." },
      { platform: "Facebook", adType: "Local lead-generation ads", expectedResult: "Generates candidate sign-ups locally." },
    ],
  },
  "Energy & Utilities": {
    audience: "Homeowners or businesses evaluating an energy upgrade (solar, efficiency) or comparing utility/energy providers in the target area.",
    buyerType: "B2C homeowner (residential solar/efficiency) or B2B facilities/procurement buyer (commercial energy), depending on this business's offering.",
    demographic: "Homeowners 35–65 with sufficient property/income for an energy investment, or facilities-management roles at commercial properties.",
    interestsBehavior: "Researches payback period/incentives and compares multiple installer or provider quotes, influenced by government rebate/incentive news, longer consideration for large capital projects.",
    example: "A homeowner comparing solar installer quotes after researching available rebates.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on installer/provider-intent keywords", expectedResult: "Captures buyers actively comparing quotes." },
      { platform: "Facebook", adType: "Local lead-gen ads with savings-calculator hooks", expectedResult: "Generates quote requests from homeowners evaluating an upgrade." },
      { platform: "YouTube", adType: "Explainer/case-study video ads", expectedResult: "Builds understanding and trust for a large, considered purchase." },
    ],
  },
  "Finance & Insurance": {
    audience: "Adults in a relevant life stage (home-buying, family, retirement) needing this financial product.",
    buyerType: "B2C (retail financial product) or B2B (business financial services).",
    demographic: "Adults 25–60 in a life stage matching the specific product — first-time home buyers, new parents, or pre-retirees, for example.",
    interestsBehavior: "Compares products/rates via search and comparison sites, research-heavy and cautious decision process, responsive to clear quote/eligibility tools (compliance permitting).",
    example: "A 35-year-old comparing home-loan or insurance quotes online before choosing a provider.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on product-intent keywords", expectedResult: "Captures high-intent comparison shoppers (compliance permitting)." },
      { platform: "Facebook", adType: "Lead-generation ads with quote forms", expectedResult: "Generates quote requests from a targeted audience." },
      { platform: "LinkedIn", adType: "Sponsored content (for B2B financial services)", expectedResult: "Reaches business decision-makers." },
    ],
  },
  "Fitness": {
    audience: "Health-conscious adults within the gym/studio's local radius, or nationally for digital programs.",
    buyerType: "Local B2C membership/service customer, or D2C digital-program buyer.",
    demographic: "18–50, health-conscious, local to the gym/studio (or nationwide for digital/online programs).",
    interestsBehavior: "Follows fitness influencers, motivated by transformation/before-after content, responsive to trial offers and social proof, searches 'gym near me' when motivated to start.",
    example: "A 28-year-old who follows fitness influencers on Instagram and is looking for a local gym with a trial offer.",
    platforms: [
      { platform: "Facebook", adType: "Local lead-generation ads (trial offers)", expectedResult: "Drives trial sign-ups and membership enquiries." },
      { platform: "Google Search", adType: "Local search ads", expectedResult: "Captures 'gym near me' intent searches." },
      { platform: "Instagram", adType: "Reels / transformation content ads", expectedResult: "Builds social proof and motivation-led engagement." },
    ],
  },
  "Health & Medical": {
    audience: "Patients or caregivers in the practice's service area searching for this type of care.",
    buyerType: "Local B2C patient or caregiver.",
    demographic: "Varies by specialty — general adult population or a specific age/condition group, within the practice's service area.",
    interestsBehavior: "Searches for symptoms/specialists plus 'near me' and appointment availability, reads reviews before booking, values credential and trust signals.",
    example: "A patient searching for a dentist or specialist near them with same-week availability.",
    platforms: [
      { platform: "Google Search", adType: "Local search ads with call/booking extensions", expectedResult: "Captures active appointment-seeking searches (compliance permitting)." },
      { platform: "Facebook", adType: "Local awareness + lead-generation ads", expectedResult: "Builds awareness of services offered locally." },
      { platform: "Google Display", adType: "Local remarketing", expectedResult: "Stays visible to past visitors researching care options." },
    ],
  },
  "Healthcare": {
    audience: "Patients, caregivers or referring providers in the service network's coverage area.",
    buyerType: "Local B2C patient/caregiver, or B2B2C via referring providers.",
    demographic: "General adult population or a condition-specific group within the network's coverage area.",
    interestsBehavior: "Searches for care options and reads reviews before deciding, values credentials and proximity; referring providers typically research via professional networks.",
    example: "A caregiver searching for a specialist for a family member, comparing reviews and locations.",
    platforms: [
      { platform: "Google Search", adType: "Local/branded search ads with call/booking extensions", expectedResult: "Captures active appointment-seeking searches (compliance permitting)." },
      { platform: "Facebook", adType: "Local awareness + lead-generation ads", expectedResult: "Builds awareness of services offered locally." },
      { platform: "Google Display", adType: "Local remarketing", expectedResult: "Stays visible to past visitors researching care options." },
    ],
  },
  "Home Goods": {
    audience: "Homeowners or renters shopping for furnishing or décor, browsing primarily by visuals.",
    buyerType: "D2C / e-commerce or in-store shopper (B2C).",
    demographic: "25–55, homeowners or renters furnishing or decorating a space.",
    interestsBehavior: "Browses Pinterest/Instagram for inspiration, compares styles and prices, purchase is often triggered by a life event (moving house, renovating).",
    example: "Someone who recently moved and is browsing furniture and décor online for their new home.",
    platforms: [
      { platform: "Instagram", adType: "Catalogue / carousel ads", expectedResult: "Drives product discovery through visual browsing." },
      { platform: "Google Search", adType: "Shopping ads on product keywords", expectedResult: "Captures ready-to-buy product searches." },
      { platform: "Facebook", adType: "Retargeting ads", expectedResult: "Converts browsers into buyers." },
    ],
  },
  "Home Improvement": {
    audience: "Local homeowners planning a renovation or repair project.",
    buyerType: "Local B2C project customer.",
    demographic: "30–65, homeowners planning a renovation or repair, within the contractor's local service area.",
    interestsBehavior: "Searches for local contractors and compares before/after photos and reviews, typically requests 2–3 quotes before deciding.",
    example: "A homeowner planning a kitchen renovation, requesting quotes from a few local contractors.",
    platforms: [
      { platform: "Google Search", adType: "Local search ads", expectedResult: "Captures 'near me' and project-intent searches." },
      { platform: "Facebook", adType: "Local lead-gen ads with before/after visuals", expectedResult: "Generates quote requests from local homeowners." },
      { platform: "YouTube", adType: "Project showcase video ads", expectedResult: "Builds trust through visible past work." },
    ],
  },
  "Industrial Services": {
    audience: "Procurement and operations decision-makers at businesses needing this industrial service.",
    buyerType: "B2B decision-maker (procurement/operations).",
    demographic: "Working professionals 30–55, procurement, operations or plant-manager titles at businesses needing this industrial service.",
    interestsBehavior: "Evaluates suppliers via Google search and industry directories, weighs reliability/certifications alongside price, longer B2B evaluation cycle.",
    example: "A plant manager at a mid-sized manufacturer searching for a new industrial maintenance supplier.",
    platforms: [
      { platform: "LinkedIn", adType: "Sponsored content", expectedResult: "Reaches B2B decision-makers by industry/role." },
      { platform: "Google Search", adType: "Search ads on service-intent keywords", expectedResult: "Captures businesses actively searching for a supplier." },
      { platform: "Google Display", adType: "Retargeting", expectedResult: "Keeps the business visible through a longer B2B evaluation cycle." },
    ],
  },
  "Legal": {
    audience: "People in the local area currently facing the legal issue this practice handles.",
    buyerType: "Local B2C client (or B2B for a business-law-focused practice).",
    demographic: "Adults facing the specific legal issue this practice handles — the profile varies widely by practice area (e.g. family law vs. business/commercial law).",
    interestsBehavior: "Searches with urgency once the legal issue arises, compares reviews and consultation offers, values responsiveness and clear next steps.",
    example: "Someone who just received a legal notice and is searching for a lawyer who handles that specific issue.",
    platforms: [
      { platform: "Google Search", adType: "Local search ads (compliance permitting)", expectedResult: "Captures high-intent 'need a lawyer' searches." },
      { platform: "Facebook", adType: "Local lead-generation ads", expectedResult: "Generates consultation enquiries." },
      { platform: "Google Display", adType: "Remarketing", expectedResult: "Stays visible to past visitors still deciding." },
    ],
  },
  "Logistics & Transportation": {
    audience: "Procurement/operations decision-makers at businesses needing freight, fleet or delivery services.",
    buyerType: "B2B decision-maker (logistics/operations/procurement).",
    demographic: "Working professionals 30–55, logistics/operations/supply-chain titles at businesses needing freight, fleet or delivery services.",
    interestsBehavior: "Evaluates providers on reliability/coverage/pricing via Google search and industry directories, values track record and SLAs, often a multi-stakeholder B2B evaluation.",
    example: "A supply-chain manager comparing regional freight providers ahead of a contract renewal.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on service-intent keywords", expectedResult: "Captures businesses actively researching a provider." },
      { platform: "LinkedIn", adType: "Sponsored content to logistics/operations roles", expectedResult: "Reaches B2B decision-makers by role and company." },
      { platform: "Google Display", adType: "Retargeting", expectedResult: "Keeps the business visible through a longer B2B evaluation cycle." },
    ],
  },
  "Manufacturing": {
    audience: "Procurement, engineering or operations decision-makers at businesses sourcing this manufacturer's products or components.",
    buyerType: "B2B decision-maker (procurement/engineering) or B2B distributor/reseller, depending on the business's go-to-market.",
    demographic: "Working professionals 30–55, procurement/engineering/operations titles at companies matching the manufacturer's target buyer profile.",
    interestsBehavior: "Researches suppliers/spec sheets via Google search and trade directories, weighs certifications/capacity/lead times alongside price, longer B2B evaluation and RFQ cycle.",
    example: "A procurement manager requesting quotes from three manufacturers for a component RFQ.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on spec/RFQ-intent keywords", expectedResult: "Captures buyers actively sourcing a supplier." },
      { platform: "LinkedIn", adType: "Sponsored content to procurement/engineering roles", expectedResult: "Reaches B2B decision-makers by role and company." },
      { platform: "Google Display", adType: "Retargeting", expectedResult: "Keeps the business visible through the RFQ evaluation cycle." },
    ],
  },
  "Media & Entertainment": {
    audience: "Consumers or advertisers matching this media/entertainment brand's audience or content niche.",
    buyerType: "B2C subscriber/attendee/viewer, or B2B advertiser/sponsor, depending on this business's revenue model.",
    demographic: "Varies widely by content niche/format — skews toward the specific age/interest group this brand's content targets.",
    interestsBehavior: "Discovers content/events through social feeds and word-of-mouth, influenced heavily by trailers/previews/social proof, decision often impulse-driven for lower-cost items and considered for tickets/subscriptions.",
    example: "A 27-year-old discovering an event or show through a Reels/Stories ad and buying a ticket the same day.",
    platforms: [
      { platform: "Instagram", adType: "Reels/Stories awareness + ticketing/subscription ads", expectedResult: "Drives discovery and same-session conversion for lower-commitment purchases." },
      { platform: "YouTube", adType: "Trailer/preview video ads", expectedResult: "Builds anticipation and consideration ahead of a launch or event." },
      { platform: "Facebook", adType: "Event awareness + retargeting ads", expectedResult: "Reaches a broader audience and re-engages people who showed interest." },
    ],
  },
  "Pet Services": {
    audience: "Local pet owners needing grooming, boarding, training or veterinary-adjacent services.",
    buyerType: "Local B2C recurring customer.",
    demographic: "Pet owners 25–55 within the business's local service area, household income sufficient for regular pet-care spend.",
    interestsBehavior: "Searches \"near me\" when a need arises, relies heavily on reviews and photos/videos of the facility or groomers, often becomes a loyal repeat customer once trust is established.",
    example: "A pet owner searching for a highly-rated local groomer or boarding facility for an upcoming trip.",
    platforms: [
      { platform: "Google Search", adType: "Local search ads on \"near me\" intent keywords", expectedResult: "Captures pet owners actively looking for a provider right now." },
      { platform: "Facebook", adType: "Local lead-gen ads with review highlights", expectedResult: "Builds trust and generates bookings from nearby pet owners." },
      { platform: "Instagram", adType: "Photo/video content ads of pets and the facility", expectedResult: "Builds an engaged, shareable local following." },
    ],
  },
  "Photography & Events": {
    audience: "Individuals or businesses planning an event (wedding, corporate, portrait session) needing photography/videography or event services.",
    buyerType: "Local B2C project customer (weddings/portraits) or B2B corporate-event customer, depending on this business's focus.",
    demographic: "25–45 for personal events (engaged couples, families), or event/marketing coordinators 28–50 for corporate work.",
    interestsBehavior: "Browses portfolios/reviews extensively before booking, often books months in advance for weddings/events, heavily influenced by visual portfolio quality.",
    example: "An engaged couple browsing wedding photographers' Instagram portfolios before requesting availability and pricing.",
    platforms: [
      { platform: "Instagram", adType: "Portfolio showcase + Story/Reels ads", expectedResult: "Drives discovery and enquiries from visual portfolio browsing." },
      { platform: "Google Search", adType: "Search ads on event/service-intent keywords", expectedResult: "Captures people actively searching for and booking a provider." },
      { platform: "Facebook", adType: "Local lead-gen ads with portfolio galleries", expectedResult: "Generates availability/pricing enquiries from local prospects." },
    ],
  },
  "Real Estate": {
    audience: "Active home buyers, sellers or renters in the target neighbourhoods and price range.",
    buyerType: "B2C buyer, seller or renter.",
    demographic: "25–55, active home buyers, sellers or renters matching the target neighbourhoods and price range.",
    interestsBehavior: "Browses listings frequently, saves/favourites properties, compares neighbourhoods and price trends, engages well with virtual tours and video walkthroughs.",
    example: "A couple browsing listings in a specific neighbourhood, saving favourites before contacting an agent.",
    platforms: [
      { platform: "Facebook", adType: "Listing carousel + lead-gen ads", expectedResult: "Generates buyer/seller enquiries from local audiences." },
      { platform: "Google Search", adType: "Search ads on area + property-type keywords", expectedResult: "Captures active property searches." },
      { platform: "YouTube", adType: "Property/neighbourhood video tours", expectedResult: "Builds consideration for higher-value listings." },
    ],
  },
  "Restaurants & Food Service": {
    audience: "Local diners and food-delivery/catering customers within the restaurant's service area.",
    buyerType: "Local B2C diner (dine-in/takeout/delivery) or B2B catering customer, depending on this business's focus.",
    demographic: "Adults 18–55 within delivery/visiting distance of the restaurant, household income matching the restaurant's price point.",
    interestsBehavior: "Discovers new spots through food photography on Instagram and delivery-app browsing, influenced heavily by reviews/ratings, frequent repeat-visit potential once a favorite is found.",
    example: "A 29-year-old discovering a new restaurant through an Instagram Reel and booking a table that weekend.",
    platforms: [
      { platform: "Instagram", adType: "Food photography/Reels awareness ads", expectedResult: "Drives discovery from a visually engaged local audience." },
      { platform: "Facebook", adType: "Local awareness + offer/event promotion ads", expectedResult: "Builds visibility and drives bookings for offers or events." },
      { platform: "Google Search", adType: "Search ads on \"near me\" and delivery-intent keywords", expectedResult: "Captures high-intent diners ready to book or order now." },
    ],
  },
  "Retail": {
    audience: "Shoppers in the store's local trade area, plus online shoppers matching the product mix.",
    buyerType: "Local B2C shopper and/or online shopper.",
    demographic: "Broad — matches the store's product mix and the local trade area's demographics.",
    interestsBehavior: "Searches 'near me' to check in-store availability, also price-compares online, responsive to promotions and local events.",
    example: "A local shopper checking if a product is in stock nearby before visiting the store.",
    platforms: [
      { platform: "Google Search", adType: "Local + shopping ads", expectedResult: "Captures both 'near me' and online purchase intent." },
      { platform: "Facebook", adType: "Local awareness + catalogue ads", expectedResult: "Drives footfall and online sales." },
      { platform: "Google Display", adType: "Remarketing", expectedResult: "Recovers site visitors who didn't purchase." },
    ],
  },
  "Technology": {
    audience: "Business or consumer users matching the product's ideal customer profile (industry, company size or use-case).",
    buyerType: "B2B (business software/hardware) or B2C (consumer tech product) — depends on this business's product.",
    demographic: "B2B: IT/technical decision-makers 28–50 at companies matching the ideal customer profile. B2C: tech-interested consumers matching the product's use-case.",
    interestsBehavior: "B2B buyers research via review sites (e.g. G2, Capterra) and case studies over a longer evaluation cycle; B2C buyers compare specs/reviews and are influenced by tech reviewers and demos.",
    example: "An IT manager researching software solutions via review sites and requesting a demo.",
    platforms: [
      { platform: "LinkedIn", adType: "Sponsored content (for B2B products)", expectedResult: "Captures active product/solution research from the right roles." },
      { platform: "Google Display", adType: "Retargeting", expectedResult: "Nurtures the often-longer tech buying cycle." },
      { platform: "YouTube", adType: "Product demo video ads", expectedResult: "Builds understanding of a less-visual or technical product." },
    ],
  },
  "Telecommunications": {
    audience: "Consumers or businesses in the target area comparing mobile, internet or communication service providers.",
    buyerType: "B2C consumer subscriber or B2B business-services buyer, depending on this business's offering.",
    demographic: "B2C: broad adult population comparing plans/pricing in the service area. B2B: IT/operations decision-makers evaluating business connectivity or communication services.",
    interestsBehavior: "Compares plans/pricing/coverage across providers before switching, price- and reliability-sensitive, B2B buyers weigh SLAs and support alongside cost.",
    example: "A household comparing broadband providers' plans and pricing before switching.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on plan/provider-comparison keywords", expectedResult: "Captures people actively comparing providers." },
      { platform: "Facebook", adType: "Local offer / switch-and-save ads", expectedResult: "Prompts switching with a targeted value offer." },
      { platform: "Google Display", adType: "Retargeting", expectedResult: "Keeps the provider visible through the comparison window." },
    ],
  },
  "Travel & Hospitality": {
    audience: "Travellers planning trips to this destination or type of experience, by season and interest.",
    buyerType: "B2C traveller/guest.",
    demographic: "25–55, profile varies by trip type — leisure families, solo travellers, or couples — and by season.",
    interestsBehavior: "Browses destination inspiration on Instagram/Pinterest, price-compares across booking sites, books close to travel dates for short trips or well ahead for major holidays.",
    example: "A couple browsing destination photos on Instagram before comparing hotel prices for a trip.",
    platforms: [
      { platform: "Google Search", adType: "Search ads on destination/property keywords", expectedResult: "Captures active trip-planning searches." },
      { platform: "Instagram", adType: "Visual inspiration ads (Reels/carousel)", expectedResult: "Builds desire and destination awareness." },
      { platform: "Facebook", adType: "Retargeting to past site visitors", expectedResult: "Recovers travellers who browsed but didn't book." },
    ],
  },
};

// ---------------------------------------------------------------------------
// 3. Country-level digital-behavior notes — general, widely-known patterns a
// digital marketer would already factor in for a given market (device mix,
// dominant channels, language, price sensitivity). These are NOT specific
// claims about any one business, never a statistic presented as fact, and
// always phrased as "expect"/"validate" starting points — consistent with
// the rest of this file's "starting point, not a guarantee" rule. Countries
// not listed fall back to a generic prompt to validate local digital habits.
// ---------------------------------------------------------------------------

const COUNTRY_AUDIENCE_NOTES: Record<string, string> = {
  "India": "In India, expect heavy mobile-first browsing, high WhatsApp usage for enquiries, and strong reach on YouTube and Instagram — price-value framing and, where relevant, vernacular-language creative often lift response.",
  "United States": "In the United States, expect a near-even iOS/Android split, strong intent-driven Google Search behaviour, and audience fragmentation across Facebook, Instagram, TikTok and Pinterest depending on age group.",
  "United Kingdom": "In the United Kingdom, expect high-intent Google Search usage, solid Facebook/Instagram reach, and a comparison-shopping, review-conscious buyer.",
  "United Arab Emirates": "In the UAE, expect a highly mobile, multicultural, bilingual (Arabic/English) audience with strong Instagram and Snapchat usage, and WhatsApp Business commonly used for direct enquiries.",
  "Saudi Arabia": "In Saudi Arabia, expect very high mobile and social usage (X/Twitter, Instagram, Snapchat), a young population, and Arabic-first creative with WhatsApp Business enquiries often outperforming form fills.",
  "Qatar": "In Qatar, expect a mobile-first, bilingual (Arabic/English) audience with high Instagram and WhatsApp usage similar to other Gulf markets.",
  "Kuwait": "In Kuwait, expect a mobile-first, bilingual (Arabic/English) audience with strong Instagram and Snapchat engagement.",
  "Canada": "In Canada, expect broadly similar digital habits to the US, with bilingual (English/French) creative worth considering for Quebec-facing campaigns.",
  "Australia": "In Australia, expect high mobile usage, strong Facebook/Instagram reach, and a search-savvy audience that compares options before buying.",
  "Singapore": "In Singapore, expect a highly connected, mobile-first, multilingual audience with strong Instagram, Facebook and Google Search usage in a compact, competitive market.",
  "Pakistan": "In Pakistan, expect a mobile-first, price-sensitive audience with heavy Facebook and WhatsApp usage for enquiries.",
  "Bangladesh": "In Bangladesh, expect a mobile-first, price-sensitive audience with heavy Facebook usage and WhatsApp for direct enquiries.",
  "Nigeria": "In Nigeria, expect a mobile-first, predominantly Android audience with strong Facebook and WhatsApp usage and high price sensitivity.",
  "South Africa": "In South Africa, expect a mobile-first, data-cost-conscious audience with strong Facebook and WhatsApp usage.",
  "Germany": "In Germany, expect a privacy-conscious audience, strong Google Search intent, and more caution around personalised social ads than in other Western markets.",
  "Malaysia": "In Malaysia, expect a mobile-first, multilingual audience with strong Facebook, Instagram and WhatsApp usage.",
  "Indonesia": "In Indonesia, expect a very mobile-first audience with heavy Instagram, Facebook and WhatsApp usage and high price sensitivity.",
  "Philippines": "In the Philippines, expect very high social media time-spent (Facebook especially) and strong response to WhatsApp/Messenger-based enquiries.",
};

const DEFAULT_COUNTRY_NOTE = (country: string) =>
  `Validate the platform mix and creative language against ${country}'s local digital habits, device split (mobile vs. desktop) and language before scaling spend.`;

/**
 * Returns a starting-point audience + platform-wise ad type suggestion for a
 * business vertical, optionally sharpened with a country's general
 * digital-behavior pattern. The `audience` string is a multi-line, detailed
 * block — buyer type (B2B/B2C/D2C/local), demographic, online interests &
 * behavior, and one concrete example customer — not just a one-line
 * description, so a consultant gets a real starting draft to edit rather
 * than a vague sentence. Always editable — never a guarantee.
 */
export function getAudiencePlatformSuggestion(
  businessVertical: string | undefined | null,
  targetCountry?: string | null
): AudiencePlatformSuggestion {
  const detail = (businessVertical && BY_INDUSTRY[businessVertical]) || DEFAULT_DETAIL;
  let audience = formatAudience(detail);
  const country = (targetCountry ?? "").trim();
  if (country && country !== "Other") {
    const note = COUNTRY_AUDIENCE_NOTES[country] ?? DEFAULT_COUNTRY_NOTE(country);
    audience += `\n\n${note}`;
  }
  return { audience, platforms: detail.platforms };
}

// ---------------------------------------------------------------------------
// 3. Campaign budget allocation across the selected platforms, and an
//    estimated result at that spend level — added on top of the Ad
//    type/Expected result cards above per user request: "want add the
//    channel platform suggestion and expect result of the campaign
//    allocation budget".
// ---------------------------------------------------------------------------

/**
 * Suggests a starting split of the monthly ad budget across the selected
 * platforms. This is a simple, transparent media-planning heuristic, not a
 * performance claim: the platform ranked first in this business vertical's
 * suggested platform list (BY_INDUSTRY's array order, already written
 * primary-channel-first — see getAudiencePlatformSuggestion) gets the
 * largest share, decreasing evenly by rank; any platform the consultant
 * toggled on beyond the industry's suggested list (e.g. WhatsApp, or an
 * extra channel added manually) is treated as lowest priority and ranked
 * after all suggested ones, in the order it was selected. Percentages are
 * rounded to whole numbers and always sum to exactly 100.
 */
export function suggestBudgetAllocation(
  selectedPlatforms: string[],
  rankedPlatforms: string[]
): Record<string, number> {
  if (selectedPlatforms.length === 0) return {};
  const ranked = rankedPlatforms.filter((p) => selectedPlatforms.includes(p));
  const extra = selectedPlatforms.filter((p) => !ranked.includes(p));
  const ordered = [...ranked, ...extra];
  const n = ordered.length;
  const weights = ordered.map((_, i) => n - i); // n, n-1, ..., 1 — front-loads the top-ranked platform
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const rounded = weights.map((w) => Math.round((w / totalWeight) * 100));
  const drift = 100 - rounded.reduce((a, b) => a + b, 0);
  rounded[0] += drift; // absorb rounding drift into the top-ranked platform rather than leaving totals off 100
  const out: Record<string, number> = {};
  ordered.forEach((p, i) => {
    out[p] = rounded[i];
  });
  return out;
}

export interface ChannelBudgetEstimate {
  spend: number;
  pct: number;
  spendMetric: "CPC" | "CPV";
  spendMetricValue: number | null;
  volume: number | null;
  volumeLabel: string;
  conversionRatePct: number | null;
  leads: number | null;
  benchmarkSource: string | null;
}

/**
 * Estimates what a platform's allocated monthly spend buys, using the real
 * seeded Benchmark Database (CPC/CPV + CVR by platform+industry — see
 * data/benchmarks/*.json) rather than an invented figure. Returns null when
 * this platform has no benchmark-key mapping at all (shouldn't happen for
 * anything in AD_PLATFORMS); returns an estimate with null volume/leads when
 * the mapped benchmark rows exist in principle but none are currently
 * active for this industry (e.g. a consultant disabled them), so the caller
 * can show "no benchmark available" rather than silently omitting the card.
 * `benchmarkRows` should already be filtered to the selected industry and
 * status=active (any platform — this function does its own platform+metric
 * filtering) so the same fetch can serve every selected channel.
 */
export function estimateChannelBudgetResult(
  platform: string,
  spend: number,
  pct: number,
  benchmarkRows: BenchmarkRow[]
): ChannelBudgetEstimate | null {
  const key = PLATFORM_BENCHMARK_KEY[platform];
  if (!key) return null;

  const spendRows = benchmarkRows.filter(
    (r) => r.platform === key.platform && r.metric === key.spendMetric && (r.campaignType ?? null) === key.campaignType
  );
  const spendResolved = resolveBenchmarkMetric({ industryBenchmarks: spendRows });

  const base: ChannelBudgetEstimate = {
    spend,
    pct,
    spendMetric: key.spendMetric,
    spendMetricValue: spendResolved.value,
    volume: null,
    volumeLabel: key.volumeLabel,
    conversionRatePct: null,
    leads: null,
    benchmarkSource: spendResolved.value != null ? spendResolved.source : null,
  };
  if (spendResolved.value == null || spendResolved.value <= 0) return base;

  const volume = spend / spendResolved.value;
  let conversionRatePct: number | null = null;
  let leads: number | null = null;
  if (key.conversionMetric) {
    const convRows = benchmarkRows.filter(
      (r) => r.platform === key.platform && r.metric === key.conversionMetric && (r.campaignType ?? null) === key.campaignType
    );
    const convResolved = resolveBenchmarkMetric({ industryBenchmarks: convRows });
    if (convResolved.value != null) {
      conversionRatePct = convResolved.value;
      leads = volume * (convResolved.value / 100);
    }
  }

  return { ...base, volume, conversionRatePct, leads };
}

// ---------------------------------------------------------------------------
// 4. Suggested starting monthly budget, for when the consultant hasn't set
//    one yet (user follow-up: "Monthly Marketing Budget if empty or 0...
//    this indicate client don't have idea of budget, so the tool need to
//    suggest how much would need for the budget for best result").
//
//    Anchored to a real, precisely-documented figure rather than a vague
//    "X% of revenue" or "X clicks/day" rule of thumb — research for this
//    feature specifically checked those against multiple reputable sources
//    and found them to be uncorroborated single-blog opinions, so they were
//    deliberately NOT used. Google Ads' own Help Center documents exactly
//    how many conversions a campaign needs in a recent 30-day period for its
//    automated ("Smart") bidding strategies to have enough signal to
//    optimize effectively — Target CPA campaigns: "at least 30 conversions"
//    in the evaluation period (support.google.com/google-ads/answer/6268632),
//    the same figure repeated as the general rule of thumb on the Smart
//    Bidding overview page ("at least 30 conversions... such as a month or
//    longer" — support.google.com/google-ads/answer/7065882). That's the
//    number used here as TARGET_MONTHLY_CONVERSIONS: a real, citable
//    minimum-data threshold, not a performance promise.
//
//    Critically, the dollar split used here is the exact same rank-weighted
//    split suggestBudgetAllocation already produces for the Audience step's
//    "Suggested Campaign Budget Allocation" card — computed over the SAME
//    platform list (`platforms`, unfiltered) the caller passes to that card.
//    That's deliberate, not incidental: once a suggested total is applied
//    into the Monthly Marketing Budget field, that same card re-splits it by
//    rank-weighted percentage regardless of how the total was derived, so
//    the total here is solved backwards so that split, applied to THIS
//    total, is what actually delivers ~30 conversions — not a total sized
//    against some other, unrelated per-platform split that the allocation
//    card would then silently redistribute differently. (An earlier version
//    of this function split the 30-conversion TARGET by rank-weight and
//    priced each share independently — mathematically tidy in isolation,
//    but it summed to a total that, once run back through the allocation
//    card's own rank-weighted DOLLAR split, no longer delivered anything
//    close to 30 total conversions. Verified via a live Playwright run: a
//    2-platform Legal example showed 15 + 30 = 45 leads/mo, not ~30, from a
//    total explicitly advertised as "sized for ~30 conversions/mo" — this
//    rewrite fixes that by construction rather than by coincidence.)
//
//    A platform with no resolvable CPC+CVR benchmark for this industry —
//    YouTube always (its CPV/View Rate benchmark measures ad completion,
//    not conversion, the same reasoning estimateChannelBudgetResult already
//    uses to withhold a leads figure for it), or any platform this industry
//    simply has no active benchmark for yet — still gets its rank-weighted
//    dollar share in the total (matching what the allocation card will show
//    it), but contributes nothing toward the 30-conversion target and is
//    named in `excludedPlatforms` so the caller can say so.
//
//    Vertical-default fallback (bug found & fixed 2026-09-04, live
//    manual-check by the user across several verticals — "some vertical
//    showing the budget, some of not showing it"): before any platform has
//    been chosen yet (Business Details / Forecast steps), this falls back to
//    the vertical's own suggested platform list (getAudiencePlatformSuggestion
//    — see caller). For 5 of the 11 verticals added in the 23→34 expansion
//    (Automobile, Agriculture, Construction, Energy & Utilities,
//    Telecommunications), that suggested list happens to be Google
//    Search/Google Display/Facebook/YouTube — and Google Ads and Meta
//    benchmarks were deliberately never extended to those 11 new verticals
//    (both are real, sourced WordStream data with a fixed category list —
//    see that expansion's build-summary entry), so literally none of that
//    vertical's own suggested platforms have a resolvable CPC+CVR benchmark,
//    and the function returned null — no suggestion shown at all, with no
//    explanation, while an original-23 vertical like Advocacy (real Google
//    Ads/Meta data) worked fine right next to it. Every one of the 34
//    industries DOES have full LinkedIn/Instagram/Microsoft Ads/WhatsApp
//    coverage (verified programmatically against every data/benchmarks/*.json
//    file), so when the vertical's own suggested platforms are all
//    unpriceable, this widens the candidate set to every platform capable of
//    a lead-based benchmark at all (LEAD_CAPABLE_PLATFORMS, derived from
//    PLATFORM_BENCHMARK_KEY) and narrows it back down to just the ones that
//    actually have data for this industry — never silently returning nothing
//    when a real, priceable alternative exists. `usedFallbackAlternative` and
//    `verticalDefaultPlatforms` tell the caller this happened, so the UI can
//    say plainly that the vertical's usual channels aren't priceable yet and
//    name what's shown instead — never presenting the substitution as if it
//    were the vertical's normal recommendation.
// ---------------------------------------------------------------------------

export const TARGET_MONTHLY_CONVERSIONS = 30;

const LEAD_CAPABLE_PLATFORMS = Object.keys(PLATFORM_BENCHMARK_KEY).filter((p) => PLATFORM_BENCHMARK_KEY[p].conversionMetric);

export interface MonthlyBudgetSuggestion {
  totalUsd: number;
  targetConversions: number;
  perPlatform: Array<{ platform: string; spendUsd: number; pct: number; targetConversions: number | null }>;
  excludedPlatforms: string[];
  usedFallbackAlternative: boolean;
  verticalDefaultPlatforms: string[];
}

/** Prices a candidate platform list against this industry's benchmark rows —
 * shared by the primary pass and the vertical-default fallback pass below. */
function priceCandidates(
  candidates: string[],
  benchmarkRows: BenchmarkRow[]
): { eligible: string[]; excludedPlatforms: string[]; conversionsPerDollar: Record<string, number> } {
  const eligible: string[] = [];
  const excludedPlatforms: string[] = [];
  const conversionsPerDollar: Record<string, number> = {};
  for (const p of candidates) {
    const key = PLATFORM_BENCHMARK_KEY[p];
    if (!key || !key.conversionMetric) {
      excludedPlatforms.push(p);
      continue;
    }
    const spendRows = benchmarkRows.filter(
      (r) => r.platform === key.platform && r.metric === key.spendMetric && (r.campaignType ?? null) === key.campaignType
    );
    const spendResolved = resolveBenchmarkMetric({ industryBenchmarks: spendRows });
    const convRows = benchmarkRows.filter(
      (r) => r.platform === key.platform && r.metric === key.conversionMetric && (r.campaignType ?? null) === key.campaignType
    );
    const convResolved = resolveBenchmarkMetric({ industryBenchmarks: convRows });
    if (spendResolved.value == null || spendResolved.value <= 0 || convResolved.value == null || convResolved.value <= 0) {
      excludedPlatforms.push(p);
      continue;
    }
    eligible.push(p);
    conversionsPerDollar[p] = convResolved.value / 100 / spendResolved.value;
  }
  return { eligible, excludedPlatforms, conversionsPerDollar };
}

/**
 * `platforms` — the platforms actually in play (the Audience step's
 * selection); pass an empty array before any have been chosen yet (e.g. on
 * the Business Details step) to fall back to this vertical's full suggested
 * list. `benchmarkRows` should already be filtered to the selected industry
 * and status=active, same convention as estimateChannelBudgetResult. Returns
 * null only when nothing is priceable at all for this industry across every
 * lead-capable platform (shouldn't happen for any of the 34 seeded
 * verticals, but a consultant-disabled benchmark set could still produce it).
 */
export function suggestMonthlyBudget(
  platforms: string[],
  rankedPlatforms: string[],
  benchmarkRows: BenchmarkRow[]
): MonthlyBudgetSuggestion | null {
  const usingVerticalDefault = platforms.length === 0;
  let candidates = usingVerticalDefault ? rankedPlatforms : platforms;
  if (candidates.length === 0) return null;

  let { eligible, excludedPlatforms, conversionsPerDollar } = priceCandidates(candidates, benchmarkRows);
  let usedFallbackAlternative = false;

  // See the block comment above this function for why this only applies
  // before the consultant has actively chosen platforms themselves.
  if (eligible.length === 0 && usingVerticalDefault) {
    const retried = priceCandidates(LEAD_CAPABLE_PLATFORMS, benchmarkRows);
    if (retried.eligible.length > 0) {
      candidates = retried.eligible; // only the platforms we can actually price — never dilute with ones we can't
      eligible = retried.eligible;
      excludedPlatforms = [];
      conversionsPerDollar = retried.conversionsPerDollar;
      usedFallbackAlternative = true;
    }
  }
  if (eligible.length === 0) return null;

  // Same rank-weighted percentage split the allocation card computes over
  // this exact same platform list — see the block comment above for why
  // reusing it (rather than re-deriving weights from CPC/CVR) matters.
  const allocations = suggestBudgetAllocation(candidates, rankedPlatforms);

  // sum_p( weight_p * conversionsPerDollar_p ) — the fraction of every
  // total-budget dollar that converts, blended across the priceable
  // platforms at their rank-weighted share. Solving TARGET / this sum for
  // the total is what makes the 30-conversion target survive being re-split
  // by the allocation card afterward.
  let conversionsPerTotalDollar = 0;
  for (const p of candidates) {
    const perDollar = conversionsPerDollar[p];
    if (perDollar == null) continue;
    conversionsPerTotalDollar += ((allocations[p] ?? 0) / 100) * perDollar;
  }
  if (conversionsPerTotalDollar <= 0) return null;

  const totalUsd = TARGET_MONTHLY_CONVERSIONS / conversionsPerTotalDollar;
  const perPlatform: MonthlyBudgetSuggestion["perPlatform"] = candidates.map((p) => {
    const pct = allocations[p] ?? 0;
    const spendUsd = (totalUsd * pct) / 100;
    const perDollar = conversionsPerDollar[p];
    return { platform: p, spendUsd, pct, targetConversions: perDollar != null ? spendUsd * perDollar : null };
  });

  return {
    totalUsd,
    targetConversions: TARGET_MONTHLY_CONVERSIONS,
    perPlatform,
    excludedPlatforms,
    usedFallbackAlternative,
    verticalDefaultPlatforms: usedFallbackAlternative ? rankedPlatforms : [],
  };
}
