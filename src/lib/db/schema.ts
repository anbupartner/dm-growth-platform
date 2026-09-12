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
  socialMedia: text("social_media"), // JSON: { facebook, instagram, linkedin, youtube } — organic social profile links
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
  // Base64-encoded PDF bytes — the actual source of truth for downloads (see
  // src/lib/pdf-storage.ts). Nullable because rows from before this column
  // existed only have a copy on local disk (or, for rows imported from the
  // pre-Turso production export, no PDF at all — those regenerate fresh).
  pdfData: text("pdf_data"),
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
  packages: text("packages").notNull(), // JSON: [{ key, label, description, price, currency, scenarioLabel, customers, revenue, roi, trafficPerMonth, leadsPerMonth, cpl, cac, roas, monthlyDeliverablesText, oneTimeDeliverablesText, discountTiersText, selectedServiceKeys, selectedServiceLabels }]
  termsText: text("terms_text"), // payment terms / what's included, free text
  validUntil: integer("valid_until", { mode: "timestamp" }),
  pdfFileName: text("pdf_file_name"),
  // Base64-encoded PDF bytes — the actual source of truth for downloads (see
  // src/lib/pdf-storage.ts). Nullable for the same reason as
  // reportSnapshots.pdfData above.
  pdfData: text("pdf_data"),
  // Optional per-proposal override of the "prepared by" identity shown on
  // the PDF's cover page, header/footer and closing CTA (consultant name,
  // company, phone, WhatsApp, email, website) — JSON, only the fields the
  // consultant actually typed something into; a field left blank there
  // falls back to the report snapshot's own frozen consultant details
  // (which in turn came from Settings at the time the underlying report
  // was generated). Exists because a report snapshot's consultant block is
  // frozen forever once generated, so a later Settings correction (or a
  // one-off "send this specific proposal from a different rep") would
  // otherwise have no way to reach an already-generated proposal without
  // regenerating the whole report. Null/absent means "use the snapshot as-is",
  // the same behavior every proposal had before this column existed.
  consultantOverride: text("consultant_override"),
  // Whole-engagement policy sections shared across every package on this
  // proposal (not repeated per tier) — free text, one bullet per line,
  // shown on the PDF only when non-empty. Modeled on a real reference SOW
  // the consultant sent (Deevita) which included these as standard
  // sections; kept as plain optional text fields, never auto-generated.
  revisionPolicyText: text("revision_policy_text"),
  clientResponsibilitiesText: text("client_responsibilities_text"),
  notIncludedText: text("not_included_text"),
  // DEPRECATED — the "Communication" field. The consultant's confirmed
  // "5. Policies & Terms" outline (5.1 Revision / 5.2 Client Responsibilities
  // / 5.3 Not Included / 5.4 Terms & conditions) has no slot for it and asked
  // for it to be removed from the proposal entirely rather than folded into
  // one of those 4 items. Column left in place (never dropped by the
  // self-healing migration) for old rows, but no longer read or written by
  // the builder, API routes, build-proposal-data.ts or ProposalDocument.tsx.
  pointOfContactText: text("point_of_contact_text"),
  // Stage 1 of the full proposal-flow restructure (UNDERSTAND → STRATEGIZE →
  // EXECUTE → MEASURE → GROW → INVEST), modeled on a consultant-provided
  // section outline. Requirements confirms what the client needs; the 4
  // Strategy fields are the Attract/Engage/Convert/Retain stages of the
  // "Digital Growth Strategy" section. All optional free text, one bullet
  // per line, shown on the PDF only when non-empty — same non-fabrication
  // pattern as revisionPolicyText etc. above.
  requirementsText: text("requirements_text"),
  strategyAttractText: text("strategy_attract_text"),
  strategyEngageText: text("strategy_engage_text"),
  strategyConvertText: text("strategy_convert_text"),
  strategyRetainText: text("strategy_retain_text"),
  // "2.2 Recommended Services & Scope" — a single consultant recommendation
  // write-up (client's requirement/goal, then the services/approach
  // recommended to achieve it), NOT the priced packages below. This section
  // was originally rendered from the `packages` JSON (name/price/services-
  // included chips) — the consultant clarified that was the wrong content
  // for "Recommended Services & Scope": pricing belongs under Commercial
  // Terms, this is the strategic recommendation itself. Optional free text,
  // one point per line, shown on the PDF only when non-empty.
  recommendedServicesText: text("recommended_services_text"),
  // Full-flow restructure, remaining sections (Scope of the project's Tools
  // & Resource Plan and KPI & Measurement Framework's notes; Next Steps).
  // All optional free text, one bullet per line, shown on the PDF only when
  // non-empty — same pattern as the Stage 1 fields above. The KPI numbers
  // themselves (Traffic/Leads/CPL/CAC/ROAS) are NOT here — they live per
  // package inside the `packages` JSON column below (seeded from the
  // report's own scenario data, editable), since they vary by package/tier;
  // this column is only for an optional framework/methodology note shown
  // once for the whole proposal.
  toolsResourcePlanText: text("tools_resource_plan_text"),
  kpiFrameworkNotesText: text("kpi_framework_notes_text"),
  nextStepsText: text("next_steps_text"),
  // Deliverables (outline section 3: Monthly / One-Time) — ONE shared list
  // for the whole proposal, not repeated per package. Used to live inside
  // each package's own JSON blob (packages column) — moved here because a
  // real proposal's screenshots showed the exact same Monthly/One-Time
  // Deliverables text typed 3 times over, once per pricing tier, when every
  // tier actually covers identical scope of work. Optional free text, one
  // "Item: details" pair per line, shown on the PDF only when non-empty.
  monthlyDeliverablesText: text("monthly_deliverables_text"),
  oneTimeDeliverablesText: text("one_time_deliverables_text"),
  // "4.2 Project Fee Discounts" — ONE shared discount schedule for the whole
  // proposal, gated by an explicit on/off checkbox rather than the usual
  // "clear the text to omit" convention, so the whole section disappears
  // from the PDF whenever discounts simply aren't being offered on this
  // proposal. Used to live per-package inside the `packages` JSON blob (one
  // discountTiersText per pricing tier) — moved here because the discount
  // schedule itself isn't package-specific (whichever package the client
  // picks, the same schedule applies; only the computed dollar amount
  // differs, from that package's own price). Old saved proposals' package
  // JSON may still carry a per-package discountTiersText key from before
  // this change — harmless, simply no longer read or written.
  discountAvailable: integer("discount_available", { mode: "boolean" }).notNull().default(false),
  discountTiersText: text("discount_tiers_text"),
  // Executive Summary, Challenges & Opportunities, and the 90-Day Growth
  // Roadmap used to be computed live from the report snapshot every time —
  // never independently editable on the proposal itself. Per the consultant's
  // explicit "each subsection want editable" instruction, these are now their
  // own proposal-level fields: seeded from the report snapshot's data when a
  // report version is first selected in the builder (same "reuse existing
  // data, but make it editable" pattern already used for the KPI numbers on
  // each package), then freely rewritable, and frozen from that point on —
  // editing the underlying report/assessment afterward never changes an
  // already-built proposal. Null means "never seeded" (an older proposal from
  // before this column existed) — build-proposal-data.ts falls back to
  // computing the value from the report snapshot in that case only, so old
  // proposals keep rendering exactly as they did before. An explicit empty
  // string means the consultant deliberately cleared it, and that sub-block
  // is correctly omitted rather than silently refilled from the report.
  summaryCurrentSituationText: text("summary_current_situation_text"),
  summaryOpportunityText: text("summary_opportunity_text"),
  summaryRecommendedDirectionText: text("summary_recommended_direction_text"),
  summaryApproachText: text("summary_approach_text"),
  summaryProblemsText: text("summary_problems_text"), // one bullet per line
  challengesTopProblemsText: text("challenges_top_problems_text"), // one bullet per line
  challengesCompetitorInsightsText: text("challenges_competitor_insights_text"), // one bullet per line
  // 90-Day Growth Roadmap phases — JSON: [{ title, itemsText }], itemsText
  // one bullet per line. Seeded from the report's own growthPlan (phase +
  // items) at builder time, then a fully editable list — the consultant can
  // rewrite any phase's title/items, add a phase, or remove one. Null means
  // "never seeded" (same old-proposal fallback as the text fields above).
  roadmapPhasesJson: text("roadmap_phases_json"),
  // "2.5 KPI & Measurement Framework" — JSON: [{ platform, metricsText }],
  // a dynamic list of platforms/channels in use and the important metrics
  // tracked for each (no projected numbers). Same shape/pattern as
  // roadmapPhasesJson above. Replaces the per-package Traffic/Leads/CPL/
  // CAC/ROAS figures that used to live inside the `packages` JSON blob —
  // those keys may still be present on old saved packages, harmless and no
  // longer read. Null means "never seeded" (same old-proposal fallback).
  kpiPlatformsJson: text("kpi_platforms_json"),
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
  // Per-lead override — excludes just this lead from GST/Tax on its
  // Invoice/Receipt PDFs even when tax is enabled globally in Settings
  // (e.g. an export client, or a negotiated tax-exempt deal). Has no effect
  // the other way around: tax disabled globally still means no tax anywhere,
  // regardless of this flag.
  taxExempt: integer("tax_exempt", { mode: "boolean" }).notNull().default(false),
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
  // Default currency for a brand-new install, before the consultant has
  // touched Settings — INR, not USD, since this app's other India-specific
  // defaults already assume an Indian consultancy by default (the Assessment
  // wizard's Target Country starts on "India", for instance). A lead's own
  // Target Country still takes priority over this whenever it's set — see
  // the comment on `currency` in build-report-data.ts.
  currency: text("currency").notNull().default("INR"),
  defaultQualificationRate: real("default_qualification_rate").notNull().default(85),
  // Tax / GST — one flat rate, on/off for the whole app. When taxEnabled is
  // true and taxRate is set, Invoice PDFs add this tax on top of the amount
  // currently being invoiced (tax-exclusive: the invoiced figure is treated
  // as the base, tax is added to get the total due). Payment Receipt PDFs
  // work the other way — the amount actually received is a fixed historical
  // fact that can't retroactively gain a tax component on top of it, so
  // receipts instead show what portion of that received amount corresponds
  // to tax (a tax-inclusive breakdown), purely informational. See
  // build-billing-data.ts for the exact math on each side.
  taxEnabled: integer("tax_enabled", { mode: "boolean" }).notNull().default(false),
  taxLabel: text("tax_label").notNull().default("GST"),
  taxRate: real("tax_rate"), // percent, e.g. 18 for 18% — null/0 means not set
  taxRegistrationNumber: text("tax_registration_number"), // GSTIN or equivalent, printed under your details on invoices
  // Optional — powers real AI-generated Image Ad concepts in the assessment
  // wizard (Sample Ads step). Left blank, image generation is simply
  // unavailable there; nothing is faked in its place.
  aiImageApiKey: text("ai_image_api_key"),
  // Desktop notification toggle (Settings > Desktop Notifications). When
  // true — and only once the browser has actually granted the Notification
  // permission, requested at the moment this is turned on in Settings — the
  // app fires a real browser desktop notification for each follow-up that
  // becomes overdue or due today, for as long as a tab of this app stays
  // open. See src/hooks/useFollowUpAlerts.ts for the polling/dedupe logic;
  // this column only stores the consultant's own preference.
  desktopNotificationsEnabled: integer("desktop_notifications_enabled", { mode: "boolean" }).notNull().default(false),
  // Reusable "Recommended Services & Scope" configuration for the proposal
  // builder — a master list of individual digital-marketing services plus
  // named pricing tiers (each tier: name, monthly price, which services it
  // includes, and an optional description override for a tier that isn't
  // just a services list, e.g. "Small business / focused execution"). JSON:
  // { services: {key,label}[], tiers: {key,name,price,serviceKeys[],descriptionOverride?}[] }.
  // Edited in Settings; the proposal builder reads the current value at
  // generation time, so changing a tier's price/services here doesn't alter
  // any already-generated proposal (which stored its own snapshot of
  // selected services and price on the package itself). Null until the
  // consultant first saves this section — the builder falls back to a
  // built-in starter template (Foundation/Growth/Performance) until then.
  servicePackagesJson: text("service_packages_json"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});
