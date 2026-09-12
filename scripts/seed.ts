import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import { benchmarks, consultantSettings, leads, followUps } from "../src/lib/db/schema";
import { eq, count } from "drizzle-orm";

const BENCHMARK_FILES = [
  "google_ads.json",
  "meta_ads.json",
  "linkedin_ads.json",
  "youtube_ads.json",
  "instagram_ads.json",
  "microsoft_ads.json",
  "whatsapp_ads.json",
  "industry_benchmarks.json",
];

async function seedBenchmarks() {
  const [{ value: existing }] = await db.select({ value: count() }).from(benchmarks);
  if (existing > 0) {
    console.log(`Benchmarks already seeded (${existing} rows), skipping.`);
    return;
  }

  const dir = path.join(process.cwd(), "data", "benchmarks");
  let total = 0;
  for (const file of BENCHMARK_FILES) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, "utf-8");
    const rows: Array<Record<string, unknown>> = JSON.parse(raw);
    for (const row of rows) {
      await db.insert(benchmarks).values({
        platform: String(row.platform),
        industry: String(row.industry),
        metric: String(row.metric),
        campaignType: (row.campaignType as string) ?? null,
        value: Number(row.value),
        unit: String(row.unit),
        currency: (row.currency as string) ?? "USD",
        region: (row.region as string) ?? "Global",
        source: (row.source as string) ?? null,
        sourceUrl: (row.sourceUrl as string) ?? null,
        benchmarkYear: (row.benchmarkYear as string) ?? null,
        status: (row.status as string) ?? "active",
        notes: (row.notes as string) ?? null,
      });
      total++;
    }
  }
  console.log(`Seeded ${total} benchmark rows from /data/benchmarks/*.json`);
}

async function seedSettings() {
  const existing = await db
    .select()
    .from(consultantSettings)
    .where(eq(consultantSettings.id, "default"));
  if (existing.length > 0) {
    console.log("Consultant settings already present, skipping.");
    return;
  }
  await db.insert(consultantSettings).values({
    id: "default",
    consultantName: "Your Name",
    companyName: "Your Consultancy",
    phone: "",
    whatsapp: "",
    email: "you@example.com",
    website: "",
    linkedin: "",
    ctaText: "Let's discuss how we can build your digital growth strategy.",
    currency: "USD",
    defaultQualificationRate: 85,
  });
  console.log("Consultant settings ready (edit under Settings in the app).");
}

async function seedDemoLead() {
  const existing = await db.select().from(leads).where(eq(leads.customerId, "LEAD-0001"));
  if (existing.length > 0) {
    console.log("Demo lead already exists, skipping.");
    return;
  }

  const [lead] = await db
    .insert(leads)
    .values({
      customerId: "LEAD-0001",
      customerName: "Priya Sharma",
      businessName: "Sharma Home Interiors",
      email: "priya@sharmainteriors.example",
      phone: "+91 98765 43210",
      whatsapp: "+91 98765 43210",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      businessVertical: "Home Goods",
      businessDescription:
        "Custom furniture and home interior design studio serving residential clients.",
      productsServices: "Custom furniture, modular kitchens, interior design consultations",
      websiteUrl: "https://example-sharmainteriors.com",
      competitorUrls: "https://competitor-a.example, https://competitor-b.example",
      minOrderValue: 25000,
      avgOrderValue: 85000,
      maxOrderValue: 450000,
      profitMarginPct: 28,
      monthlyBudget: 50000,
      targetLocation: "Pune, Mumbai",
      targetAudience: "Homeowners aged 28-55, mid-to-high income, planning renovation",
      businessGoal: "Increase qualified leads",
      marketingChannels: "Instagram, referrals",
      leadSource: "WEBSITE",
      status: "NEW_LEAD",
      hasWebsite: "YES",
      notes: "Sample demo lead — seeded automatically so you can explore the app immediately.",
    })
    .returning();

  await db.insert(followUps).values({
    leadId: lead.id,
    type: "Note",
    note: "Demo lead created automatically on first run.",
    completed: true,
  });

  await db.insert(followUps).values({
    leadId: lead.id,
    type: "Call",
    note: "Introductory call to walk through audit findings.",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    completed: false,
  });

  console.log(`Seeded demo lead ${lead.customerId} — ${lead.businessName}`);
}

async function main() {
  await seedBenchmarks();
  await seedSettings();
  await seedDemoLead();
  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
