// Public site — industry content used by the homepage industry picker and
// the /casestudy/[industry] landing pages (see PORTFOLIO → BUSINESS
// DEVELOPMENT LEAD GENERATION SYSTEM spec, section 19-20).
//
// "Common Challenges" and "Relevant Solutions" below are genuine, general
// industry patterns (the same kind of defensible, non-fabricated guidance
// already used elsewhere in this app — see LOCAL_BRANDING_RECOMMENDATIONS
// and SOCIAL_MEDIA_PLAYBOOK in src/lib/constants.ts). They are NOT a claim
// about any specific client's results — those only ever come from real,
// individually-authored case studies (see case-studies.ts).

export type ServiceKey =
  | "seo"
  | "performance-marketing"
  | "lead-generation"
  | "cro"
  | "marketing-strategy"
  | "analytics"
  | "crm-automation";

export interface Industry {
  slug: string;
  name: string;
  // Short label shown on the industry-selection popup/chips.
  popupLabel: string;
  headline: string;
  intro: string;
  commonChallenges: string[];
  relevantServices: ServiceKey[];
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "dental",
    name: "Dental",
    popupLabel: "Dental",
    headline: "Dental Marketing Experience",
    intro: "Helping dental practices turn local search and paid visibility into booked appointments, not just clicks.",
    commonChallenges: [
      "Low-quality enquiries that don't convert into booked appointments",
      "High Google Ads cost-per-lead",
      "Low visibility in the local (Maps) pack",
      "Weak Google review volume/rating",
      "Poor landing-page conversion for treatment-specific searches",
    ],
    relevantServices: ["seo", "performance-marketing", "cro", "analytics"],
  },
  {
    slug: "education",
    name: "Education & Training",
    popupLabel: "Education",
    headline: "Education & Training Marketing Experience",
    intro: "Helping schools, colleges and training providers fill seats with qualified enquiries and enrollments.",
    commonChallenges: [
      "Low enrollment enquiry volume ahead of admission deadlines",
      "High cost-per-enquiry on paid campaigns",
      "Weak differentiation from nearby competing institutions",
      "Low trust signals — testimonials, outcomes, placements",
      "Enquiry forms that don't convert into applications",
    ],
    relevantServices: ["lead-generation", "performance-marketing", "cro", "marketing-strategy"],
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    popupLabel: "Healthcare",
    headline: "Healthcare Marketing Experience",
    intro: "Helping clinics and healthcare providers build trust online and convert search visibility into patient bookings.",
    commonChallenges: [
      "Low visibility for condition/treatment-specific searches",
      "Compliance-safe content that still builds trust",
      "Weak online reputation / review management",
      "High no-show rate from low-intent enquiries",
      "Fragmented tracking across call, WhatsApp and form bookings",
    ],
    relevantServices: ["seo", "cro", "analytics", "marketing-strategy"],
  },
  {
    slug: "saas-technology",
    name: "SaaS / Technology",
    popupLabel: "SaaS / Technology",
    headline: "SaaS & Technology Marketing Experience",
    intro: "Helping SaaS and technology companies build a predictable pipeline of qualified demos and trials.",
    commonChallenges: [
      "High customer acquisition cost relative to LTV",
      "Long, unclear conversion path from visitor to demo/trial",
      "Weak organic visibility against established competitors",
      "Low-quality trial signups that never activate",
      "Attribution gaps between marketing spend and closed revenue",
    ],
    relevantServices: ["performance-marketing", "cro", "analytics", "marketing-strategy"],
  },
  {
    slug: "it-services",
    name: "IT Services",
    popupLabel: "IT Services",
    headline: "IT Services Marketing Experience",
    intro: "Helping IT services and consulting firms generate qualified B2B enquiries instead of unfiltered contact-form noise.",
    commonChallenges: [
      "Generic enquiries that don't match target project size/budget",
      "Weak LinkedIn and search presence versus larger competitors",
      "Long B2B sales cycles with little mid-funnel nurturing",
      "Low-converting service pages without clear proof or case studies",
      "No consistent lead-scoring or follow-up process",
    ],
    relevantServices: ["lead-generation", "seo", "crm-automation", "marketing-strategy"],
  },
  {
    slug: "ecommerce",
    name: "E-commerce",
    popupLabel: "E-commerce",
    headline: "E-commerce Marketing Experience",
    intro: "Helping online stores grow profitable traffic and improve the store's own conversion rate, not just ad spend.",
    commonChallenges: [
      "Rising paid acquisition cost eating into margin",
      "High cart abandonment / low checkout completion",
      "Weak repeat-purchase and retention marketing",
      "Underperforming product pages and category structure",
      "Inconsistent tracking across ad platforms and the store",
    ],
    relevantServices: ["performance-marketing", "cro", "analytics", "crm-automation"],
  },
  {
    slug: "agriculture",
    name: "Agriculture",
    popupLabel: "Agriculture",
    headline: "Agriculture & Agribusiness Marketing Experience",
    intro: "Helping agribusinesses reach buyers, distributors and B2B customers who mostly aren't searching on generic terms.",
    commonChallenges: [
      "Low digital presence relative to the business's actual scale",
      "B2B buyers/distributors hard to reach through generic ads",
      "Seasonal demand that's difficult to plan campaigns around",
      "Little differentiation in a commodity-feeling category",
      "No structured way to capture and follow up bulk enquiries",
    ],
    relevantServices: ["lead-generation", "seo", "marketing-strategy", "crm-automation"],
  },
  {
    slug: "automotive",
    name: "Automotive",
    popupLabel: "Automotive",
    headline: "Automotive Marketing Experience",
    intro: "Helping dealerships and auto service businesses turn local search into showroom visits and service bookings.",
    commonChallenges: [
      "Weak local visibility versus larger dealership groups",
      "Low-quality leads that never show up",
      "Inconsistent Google Business Profile and review management",
      "High cost-per-lead on paid search for competitive models",
      "No retention marketing for service/maintenance customers",
    ],
    relevantServices: ["seo", "performance-marketing", "cro", "crm-automation"],
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    popupLabel: "Real Estate",
    headline: "Real Estate Marketing Experience",
    intro: "Helping developers, brokers and agents generate serious buyer/renter enquiries, not tyre-kickers.",
    commonChallenges: [
      "High volume of low-intent enquiries from generic portals",
      "Weak differentiation between competing listings/projects",
      "Long consideration cycles with little structured follow-up",
      "Underused video/virtual-tour content",
      "No clear tracking of which channel actually produces site visits",
    ],
    relevantServices: ["lead-generation", "performance-marketing", "crm-automation", "marketing-strategy"],
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    popupLabel: "Professional Services",
    headline: "Professional Services Marketing Experience",
    intro: "Helping law firms, accountants, consultants and agencies turn expertise into a steady stream of qualified enquiries.",
    commonChallenges: [
      "Referral-dependent pipeline with no scalable digital channel",
      "Compliance-aware messaging that still builds authority",
      "Weak search visibility for high-intent, high-value queries",
      "Enquiry forms that attract the wrong kind of client",
      "No consistent nurture process for long-consideration prospects",
    ],
    relevantServices: ["seo", "lead-generation", "marketing-strategy", "crm-automation"],
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    popupLabel: "Manufacturing",
    headline: "Manufacturing Marketing Experience",
    intro: "Helping manufacturers generate and qualify B2B enquiries from procurement teams and distributors.",
    commonChallenges: [
      "Almost no digital presence for a business that's otherwise well-established",
      "Procurement-driven buyers who research before ever making contact",
      "Weak capability/capacity storytelling online",
      "Enquiries from the wrong geography or order size",
      "No lead qualification process before sales gets involved",
    ],
    relevantServices: ["lead-generation", "seo", "marketing-strategy", "crm-automation"],
  },
  {
    slug: "b2b",
    name: "B2B",
    popupLabel: "B2B",
    headline: "B2B Marketing Experience",
    intro: "Helping B2B businesses build a predictable pipeline instead of relying purely on referrals and outbound.",
    commonChallenges: [
      "Pipeline concentrated in a handful of unpredictable referral sources",
      "Long sales cycles with weak marketing-to-sales handoff",
      "Low-intent leads that sales has to filter manually",
      "Underused LinkedIn and account-based marketing",
      "No shared visibility between marketing spend and closed revenue",
    ],
    relevantServices: ["lead-generation", "marketing-strategy", "crm-automation", "analytics"],
  },
  {
    slug: "b2c",
    name: "B2C",
    popupLabel: "B2C",
    headline: "B2C Marketing Experience",
    intro: "Helping consumer brands grow reach and convert attention into purchases at a sustainable cost.",
    commonChallenges: [
      "Rising paid acquisition costs across every major platform",
      "Weak brand recall beyond the moment an ad is shown",
      "Low repeat-purchase / customer lifetime value",
      "Inconsistent creative testing and channel mix",
      "Fragmented data across ad platforms, site and CRM",
    ],
    relevantServices: ["performance-marketing", "cro", "analytics", "crm-automation"],
  },
  {
    slug: "d2c",
    name: "D2C",
    popupLabel: "D2C",
    headline: "D2C Marketing Experience",
    intro: "Helping direct-to-consumer brands scale acquisition while protecting margin and building repeat customers.",
    commonChallenges: [
      "Blended CAC creeping above sustainable levels",
      "Over-reliance on a single ad platform for growth",
      "Weak post-purchase/retention marketing (email, WhatsApp, loyalty)",
      "Low average order value / underused upsell and bundling",
      "Creative fatigue with no structured testing cadence",
    ],
    relevantServices: ["performance-marketing", "cro", "crm-automation", "analytics"],
  },
];

export function getIndustryBySlug(slug: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}
