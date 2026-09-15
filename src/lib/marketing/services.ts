// Public site — services list (spec section 2 & 22). Kept as its own small
// data file, same pattern as industries.ts, so the Home, Services and
// industry pages all render from one source instead of duplicating labels.

import type { ServiceKey } from "./industries";

export interface Service {
  key: ServiceKey;
  name: string;
  shortLabel: string; // used in tight spaces (hero strip, industry "how I can help")
  description: string;
  whatItIncludes: string[];
}

export const SERVICES: Service[] = [
  {
    key: "seo",
    name: "SEO & Local Search",
    shortLabel: "Local SEO",
    description: "Technical, on-page and local SEO to grow qualified organic visibility and rankings that actually convert.",
    whatItIncludes: [
      "Technical SEO audit & fixes",
      "On-page and content strategy",
      "Local SEO / Google Business Profile optimization",
      "Keyword & competitor research",
    ],
  },
  {
    key: "performance-marketing",
    name: "Performance Marketing",
    shortLabel: "Google Ads",
    description: "Google, Meta and other paid channels planned around a target CPL/CAC, not just impressions.",
    whatItIncludes: [
      "Google Search / Display / YouTube Ads",
      "Meta & Instagram Ads",
      "LinkedIn Ads (B2B)",
      "Budget allocation & bidding strategy",
    ],
  },
  {
    key: "lead-generation",
    name: "Lead Generation",
    shortLabel: "Lead Gen",
    description: "End-to-end systems — landing pages, forms and follow-up — built to turn traffic into qualified enquiries.",
    whatItIncludes: [
      "Landing page strategy",
      "Lead capture & qualification flows",
      "Multi-channel campaign planning",
      "Lead tracking & attribution",
    ],
  },
  {
    key: "cro",
    name: "Conversion Rate Optimization",
    shortLabel: "CRO",
    description: "Structured testing and UX improvements so existing traffic converts at a meaningfully higher rate.",
    whatItIncludes: [
      "Landing page & funnel audits",
      "A/B and multivariate testing",
      "UX / conversion-path improvements",
      "Heatmap & behavior analysis",
    ],
  },
  {
    key: "marketing-strategy",
    name: "Marketing Strategy",
    shortLabel: "Strategy",
    description: "A prioritized, budget-aware growth plan tying channels, messaging and goals together.",
    whatItIncludes: [
      "Growth strategy & channel planning",
      "Positioning & messaging",
      "Competitor & market analysis",
      "90-day growth roadmap",
    ],
  },
  {
    key: "analytics",
    name: "Analytics & Tracking",
    shortLabel: "GA4 / GTM",
    description: "Clean, trustworthy measurement — GA4, GTM and conversion tracking that the rest of the strategy relies on.",
    whatItIncludes: [
      "GA4 & Google Tag Manager setup",
      "Conversion & goal tracking",
      "Dashboards & reporting",
      "Attribution modeling",
    ],
  },
  {
    key: "crm-automation",
    name: "CRM & Marketing Automation",
    shortLabel: "CRM Automation",
    description: "Follow-up, nurture and lead-management systems so no enquiry goes cold from lack of process.",
    whatItIncludes: [
      "CRM setup & lead pipeline design",
      "Automated follow-up sequences",
      "WhatsApp / email nurture flows",
      "Sales & marketing handoff process",
    ],
  },
];

export function getServiceByKey(key: ServiceKey): Service | undefined {
  return SERVICES.find((s) => s.key === key);
}
