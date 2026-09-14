// DM Consultant Growth Platform — database schema (Drizzle ORM, SQLite dialect).
//
// This runs against a local SQLite file out of the box (see src/lib/db/index.ts).
// To sync leads/scenarios/benchmarks across devices in production, point
// DATABASE_URL at a hosted Postgres instance and swap the driver — see the
// README section "Going to production: cross-device sync" for the exact steps.
// The table shapes below are intentionally simple (text/real/integer) so the
// same schema translates directly to Postgres with drizzle-orm/pg-core.

import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { randomUUID } from "node:crypto";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

// --- Leads / CRM ---------------------------------------------------------

export const leads = sqliteTable("leads", {
  id: id(),
  customerId: text("customer_id").notNull().unique(), // e.g. LEAD-0001
  customerName: text("customer_name").notNull(),
  businessName: text("business_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  businessVertical: text("business_vertical"),
  businessDescription: text("business_description"),
  productsServices: text("products_services"),
  websiteUrl: text("website_url"),
  competitorUrls: text("competitor_urls"), // comma separated
  storeLocations: text("store_locations"), // comma separated — Google Business Profile / Maps links for physical store(s), first = main store
  minOrderValue: real("min_order_value"),
  avgOrderValue: real("avg_order_value"),
  maxOrderValue: real("max_order_value"),
  profitMarginPct: real("profit_margin_pct"),
  monthlyBudget: real("monthly_budget"),
  targetCountry: text("target_country"),
  targetLocation: text("target_location"),
  targetAudience: text("target_audience"),
  businessGoal: text("business_goal"),
  marketingChannels: text("marketing_channels"),
  leadSource: text("lead_source").notNull().default("OTHER"),
  status: text("status").notNull().default("NEW_LEAD"),
  hasWebsite: text("has_website"), // 'YES' | 'NO' | null
  quoteValue: real("quote_value"),
  notes: text("notes"),
  nextFollowUpDate: integer("next_follow_up_date", { mode: "timestamp" }),
  ...timestamps,
});

export const followUps = sqliteTable("follow_ups", {
  id: id(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Call, WhatsApp, Email, Meeting, Note, Status Change, Audit Generated, Report Sent, Proposal, Quote
  note: text("note"),
  dueDate: integer("due_date", { mode: "timestamp" }),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: timestamps.createdAt,
});

// --- Assessments (the 16-step wizard payloads) ----------------------------

export const assessments = sqliteTable("assessments", {
  id: id(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  executiveSummary: text("executive_summary"), // JSON: { currentSituation, problems[], biggestOpportunity, recommendedDirection }
  websiteAudit: text("website_audit"), // JSON: { topProblems[], recommendedImprovements[], checks, notes }
  auditScores: text("audit_scores"), // JSON: { technicalSeo, onPageSeo, content, uxConversion, branding, localSeo, performance, overall }
  websiteRecommendation: text("website_recommendation"), // JSON (Workflow B)
  branding: text("branding"), // JSON: { positioning, messaging, valueProposition, trust, differentiation }
  organicStrategy: text("organic_strategy"), // JSON
  ppcStrategy: text("ppc_strategy"), // JSON
  whatsappStrategy: text("whatsapp_strategy"), // JSON: { included, goals[] } — WhatsApp marketing campaign goals
  audienceRecommendation: text("audience_recommendation"), // JSON
  platformRecommendation: text("platform_recommendation"), // JSON
  competitorAnalysis: text("competitor_analysis"), // JSON
  competitorAds: text("competitor_ads"), // JSON
  sampleAds: text("sample_ads"), // JSON
  growthPlan: text("growth_plan"), // JSON
  problemSolution: text("problem_solution"), // JSON
  ...timestamps,
});

// --- Forecast scenarios ----------------------------------------------------

export const scenarios = sqliteTable("scenarios", {
  id: id(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tier: text("tier").notNull().default("CUSTOM"), // CONSERVATIVE | EXPECTED | GROWTH_OPPORTUNITY | CUSTOM

  adBudget: real("ad_budget").notNull(),
  cpc: real("cpc").notNull(),
  leadConversionRate: real("lead_conversion_rate").notNull(), // %
  qualificationRate: real("qualification_rate").notNull().default(85), // %
  salesConversionRate: real("sales_conversion_rate").notNull(), // %
  avgSellingPrice: real("avg_selling_price").notNull(),
  profitMarginPct: real("profit_margin_pct").notNull(),
  additionalMarketingCost: real("additional_marketing_cost").notNull().default(0),
  organicTrafficGrowth: real("organic_traffic_growth").notNull().default(0), // %
  organicLeadConversionRate: real("organic_lead_conversion_rate").notNull().default(0), // %

  results: text("results").notNull(), // JSON cache of computed results
  ...timestamps,
});

// --- Benchmark database ----------------------------------------------------

export const benchmarks = sqliteTable("benchmarks", {
  id: id(),
  platform: text("platform").notNull(),
  industry: text("industry").notNull(),
  metric: text("metric").notNull(), // CPC, CTR, CVR, CPA, CPL, CPM, CPV, View Rate, Profit Margin
  campaignType: text("campaign_type"),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  currency: text("currency").notNull().default("USD"),
  region: text("region").notNull().default("Global"),
  source: text("source"),
  sourceUrl: text("source_url"),
  benchmarkYear: text("benchmark_year"),
  effectiveDate: integer("effective_date", { mode: "timestamp" }).$defaultFn(() => new Date()),
  reviewDate: integer("review_date", { mode: "timestamp" }),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("active"), // active | disabled
  notes: text("notes"),
  ...timestamps,
});

// --- Historical report snapshots -------------------------------------------

export const reportSnapshots = sqliteTable("report_snapshots", {
  id: id(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  scenarioResults: text("scenario_results").notNull(), // JSON
  benchmarksUsed: text("benchmarks_used").notNull(), // JSON
  clientInputs: text("client_inputs").notNull(), // JSON
  assumptions: text("assumptions").notNull(), // JSON
  // Sequential per-lead version number (v1, v2, ...) — every save (initial
  // generate, or a manual edit) creates a new row rather than overwriting an
  // existing one, so every version stays individually viewable/downloadable.
  version: integer("version").notNull().default(1),
  // The full ReportData JSON actually used to render this version's PDF —
  // lets the "View / Edit Report" screen load a version back into a form and
  // save edits as a new version, independent of whatever the live
  // assessment/scenarios say by then. Nullable because report snapshots
  // created before this field existed won't have it (those are still listed,
  // just not editable — regenerate to get an editable version).
  reportData: text("report_data"),
  pdfFileName: text("pdf_file_name"),
  createdAt: timestamps.createdAt,
});

// --- Client-facing pricing proposals ----------------------------------------
// Generated from a specific report version (reportSnapshotId) once a
// consultant is ready to quote — turns that report's Conservative/Expected/
// Growth Opportunity scenarios into priced packages the client can choose
// between, plus terms/validity, as its own short downloadable PDF separate
// from the full report. Same "keep every version" versioning as reports.
export const proposals = sqliteTable("proposals", {
  id: id(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  reportSnapshotId: text("report_snapshot_id"), // which report version this proposal's numbers/narrative came from
  version: integer("version").notNull().default(1),
  packages: text("packages").notNull(), // JSON: [{ key, label, description, price, currency, scenarioLabel, customers, revenue, roi }]
  termsText: text("terms_text"), // payment terms / what's included, free text
  validUntil: integer("valid_until", { mode: "timestamp" }),
  pdfFileName: text("pdf_file_name"),
  createdAt: timestamps.createdAt,
});

// --- Lead billing -----------------------------------------------------------
// One billing profile per lead — the agreed money side of the engagement,
// kept separate from `leads.quoteValue` (the pre-close proposal number).
// `status` is one overall Cancel/Resume switch for the whole billing
// engagement (Advance, Monthly Fee and Project Fee together), per how this
// was scoped — not a per-fee-type pause. Actual money received is never
// stored here; every payment (including PPC ad-spend payments) is its own
// row in billingPayments below, so "what's agreed" and "what's actually been
// paid" can never drift into the same field.
export const leadBilling = sqliteTable("lead_billing", {
  leadId: text("lead_id")
    .primaryKey()
    .references(() => leads.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | CANCELED
  advanceAmount: real("advance_amount"),
  monthlyFeeAmount: real("monthly_fee_amount"),
  projectFeeAmount: real("project_fee_amount"),
  currency: text("currency"),
  billingNotes: text("billing_notes"),
  canceledAt: integer("canceled_at", { mode: "timestamp" }),
  resumedAt: integer("resumed_at", { mode: "timestamp" }),
  ...timestamps,
});

// Payment ledger — every payment actually received against a lead, one row
// per payment, so there's a dated history (not just a running total) and a
// mistaken entry can be deleted individually rather than editing a single
// lump total. PPC_AD_SPEND is its own type since money a client sends
// specifically to fund/reimburse platform ad spend is meaningfully different
// from the consultant's own fees, and the consultant wants to see it
// tracked separately.
export const billingPayments = sqliteTable("billing_payments", {
  id: id(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // ADVANCE | MONTHLY_FEE | PROJECT_FEE | PPC_AD_SPEND | OTHER
  amount: real("amount").notNull(),
  paymentDate: integer("payment_date", { mode: "timestamp" }).notNull(),
  note: text("note"),
  createdAt: timestamps.createdAt,
});

// --- Consultant settings (single row) --------------------------------------

export const consultantSettings = sqliteTable("consultant_settings", {
  id: text("id").primaryKey().default("default"),
  consultantName: text("consultant_name").notNull().default(""),
  companyName: text("company_name").notNull().default(""),
  logoUrl: text("logo_url"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  website: text("website"),
  linkedin: text("linkedin"),
  address: text("address"),
  reportFooter: text("report_footer"),
  ctaText: text("cta_text").notNull().default("Let's discuss how we can build your digital growth strategy."),
  currency: text("currency").notNull().default("USD"),
  defaultQualificationRate: real("default_qualification_rate").notNull().default(85),
  // Optional — powers real AI-generated Image Ad concepts in the assessment
  // wizard (Sample Ads step). Left blank, image generation is simply
  // unavailable there; nothing is faked in its place.
  aiImageApiKey: text("ai_image_api_key"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
