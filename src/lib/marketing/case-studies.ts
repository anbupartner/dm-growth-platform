// Public site — case studies shown on /casestudy/[industry]/[slug].
//
// IMPORTANT — non-fabrication rule (same principle this app already follows
// throughout src/lib/constants.ts: never invent a specific claimed result
// for a specific business). CASE_STUDIES below intentionally ships with
// exactly one entry, marked `isSample: true`, using clearly placeholder
// copy and no invented numbers. Every other industry page correctly shows
// an honest "no case studies published yet" state instead of a fabricated
// one — see the isSample-gated empty state in the industry/case-study pages.
//
// To add a REAL case study: copy the shape below, set isSample to false (or
// remove it), and fill every field with your own actual client details,
// real metrics and real testimonial — only ever what you can stand behind.

export interface CaseStudyResult {
  label: string; // e.g. "Qualified leads / month"
  value: string; // e.g. "+65%" — a real, specific figure you can back up
}

export interface CaseStudy {
  slug: string;
  industrySlug: string;
  isSample?: boolean;
  clientName: string; // real client name, or an anonymized description they've approved (e.g. "A regional dental group")
  clientLocation?: string;
  challenge: string;
  approach: string[];
  results: CaseStudyResult[];
  testimonial?: { quote: string; attribution: string };
  // Paths under /public to real screenshots/proof. Left empty until real
  // assets exist — the UI shows a clean placeholder frame instead of a
  // broken image when this is empty.
  proofScreenshots: string[];
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "sample-dental-case-study",
    industrySlug: "dental",
    isSample: true,
    clientName: "[Add your client's name or an approved anonymized description]",
    clientLocation: "[City / Region]",
    challenge:
      "[Describe the real problem this client came to you with — e.g. low-quality enquiries, high Google Ads CPL, weak local visibility.]",
    approach: [
      "[Step 1 — what you actually did, e.g. rebuilt Local SEO / Google Business Profile]",
      "[Step 2 — e.g. restructured the Google Ads account and landing pages]",
      "[Step 3 — e.g. added lead tracking and a review-generation system]",
    ],
    results: [
      { label: "[Metric, e.g. Qualified leads / month]", value: "[Real value]" },
      { label: "[Metric, e.g. Cost per lead]", value: "[Real value]" },
    ],
    testimonial: {
      quote: "[A real quote from the client, with their permission to publish it.]",
      attribution: "[Name, Title, Business — with permission]",
    },
    proofScreenshots: [],
  },
];

export function getCaseStudiesForIndustry(industrySlug: string): CaseStudy[] {
  return CASE_STUDIES.filter((c) => c.industrySlug === industrySlug);
}

export function getCaseStudy(industrySlug: string, slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.industrySlug === industrySlug && c.slug === slug);
}
