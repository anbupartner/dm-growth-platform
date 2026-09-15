// Shared between the client form (src/components/marketing/LeadForm.tsx) and
// the server action that receives it (src/app/actions/submit-lead.ts) — spec
// sections 9 (form fields) and 15 (validation rules).

import { z } from "zod";

export const MARKETING_GOALS = [
  "Generate More Leads",
  "Improve SEO",
  "Increase Paid Ads Performance",
  "Improve Website Conversion",
  "Build Digital Strategy",
  "Improve Social Media",
  "Marketing Automation",
  "Analytics / GA4 / GTM",
  "Brand & Digital Presence",
  "Not Sure — Need Advice",
];

export const BUDGET_RANGES = ["Below ₹50K", "₹50K–₹1L", "₹1L–₹5L", "₹5L–₹10L", "₹10L+", "Not Sure"];

// Loose URL check — accepts "example.com", "www.example.com" or a full
// "https://example.com/path", since most visitors won't type a protocol.
const looseUrlPattern = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}([/?#][^\s]*)?$/i;
// Loose phone check — allows +, spaces, dashes, parentheses; requires at
// least 7 digits so a stray "ok" or "-" can't pass as a phone number.
const loosePhonePattern = /^[+()\-.\s\d]{7,20}$/;

export const leadFormSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(120),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  industry: z.string().trim().min(1, "Select your industry."),
  businessGoal: z.string().trim().min(1, "Select what you're looking to improve."),
  budget: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email.").max(200),
  phone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || loosePhonePattern.test(v), "Enter a valid phone number."),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || looseUrlPattern.test(v), "Enter a valid website URL."),
  // Honeypot — a real visitor never sees or fills this field (hidden via
  // CSS in LeadForm); any value here means a bot filled every field it
  // could find, so the submission is silently dropped.
  honeypot: z.string().max(0).optional().or(z.literal("")),
  // Attribution — populated from sessionStorage at submit time, never
  // user-typed. See src/lib/marketing/attribution.ts.
  landingPage: z.string().max(300).optional().or(z.literal("")),
  caseStudyViewed: z.string().max(200).optional().or(z.literal("")),
  industryViewed: z.string().max(200).optional().or(z.literal("")),
  utmSource: z.string().max(200).optional().or(z.literal("")),
  utmMedium: z.string().max(200).optional().or(z.literal("")),
  utmCampaign: z.string().max(200).optional().or(z.literal("")),
  utmTerm: z.string().max(200).optional().or(z.literal("")),
  utmContent: z.string().max(200).optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
