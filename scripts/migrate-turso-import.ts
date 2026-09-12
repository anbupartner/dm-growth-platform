// One-off import: re-inserts the production data captured from the old
// (Netlify, read-only-filesystem) deployment into the new Turso database.
//
// Source: JSON snapshots pulled from the live site on 2026-09-12, before the
// Turso migration, saved alongside this script in migration-data/*.json. The
// full original export (including proposals.json/reports.json/scenarios.json,
// which this script deliberately does NOT re-insert — see note below) is at
// backups/netlify-production-data-export-20260912.zip.
//
// Run once, after `npm run db:push` has created the schema in Turso:
//   npx tsx scripts/migrate-turso-import.ts
// (or: npm run db:migrate-import)
//
// Safe to re-run: every insert is onConflictDoNothing (or, for the single
// settings row, onConflictDoUpdate), so re-running after a partial failure
// won't duplicate rows.
//
// What this restores: leads, follow-ups (CRM activity history), lead
// billing + payment records, and consultant settings — everything except the
// company logo image (re-upload that once on the Settings page; it was a
// 128,095-character base64 string that wasn't worth extracting byte-by-byte
// through the export's browser bridge — see settings.json's _note_logoUrl).
//
// What this deliberately SKIPS: proposals, report snapshots, and forecast
// scenarios. The live site's list APIs only ever returned metadata for
// these (id, version, PDF filename, timestamps, and — for scenarios — the
// computed `results` but not the input assumptions) — never the actual
// packages/termsText/scenarioResults/benchmarksUsed/clientInputs/assumptions
// content those tables require (several of those columns are NOT NULL in
// the schema). Fabricating placeholder values for them would create
// misleading rows. That metadata trail is preserved as-is in the backup zip
// for reference; going forward, every migrated lead's reports/proposals/
// scenarios simply regenerate fresh from its (now-restored) lead data.

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import {
  leads,
  followUps,
  leadBilling,
  billingPayments,
  consultantSettings,
} from "../src/lib/db/schema";

const dataDir = path.join(process.cwd(), "scripts", "migration-data");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf-8"));
}

function toDate(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null;
}

async function migrateLeads() {
  const rows = readJson<Record<string, unknown>[]>("leads.json");
  for (const r of rows) {
    await db
      .insert(leads)
      .values({
        id: r.id as string,
        customerId: r.customerId as string,
        customerName: r.customerName as string,
        businessName: r.businessName as string,
        email: r.email as string | null,
        phone: r.phone as string | null,
        whatsapp: r.whatsapp as string | null,
        address: r.address as string | null,
        city: r.city as string | null,
        state: r.state as string | null,
        country: r.country as string | null,
        businessVertical: r.businessVertical as string | null,
        businessDescription: r.businessDescription as string | null,
        productsServices: r.productsServices as string | null,
        websiteUrl: r.websiteUrl as string | null,
        competitorUrls: r.competitorUrls as string | null,
        storeLocations: r.storeLocations as string | null,
        minOrderValue: r.minOrderValue as number | null,
        avgOrderValue: r.avgOrderValue as number | null,
        maxOrderValue: r.maxOrderValue as number | null,
        profitMarginPct: r.profitMarginPct as number | null,
        monthlyBudget: r.monthlyBudget as number | null,
        targetCountry: r.targetCountry as string | null,
        targetLocation: r.targetLocation as string | null,
        targetAudience: r.targetAudience as string | null,
        businessGoal: r.businessGoal as string | null,
        marketingChannels: r.marketingChannels as string | null,
        leadSource: r.leadSource as string,
        status: r.status as string,
        hasWebsite: r.hasWebsite as string | null,
        quoteValue: r.quoteValue as number | null,
        notes: r.notes as string | null,
        nextFollowUpDate: toDate(r.nextFollowUpDate as string | null),
        createdAt: new Date(r.createdAt as string),
        updatedAt: new Date(r.updatedAt as string),
      })
      .onConflictDoNothing();
  }
  console.log(`Leads: processed ${rows.length} rows.`);
}

async function migrateFollowUps() {
  const rows = readJson<Record<string, unknown>[]>("follow-ups.json");
  for (const r of rows) {
    await db
      .insert(followUps)
      .values({
        id: r.id as string,
        leadId: r.leadId as string,
        type: r.type as string,
        note: r.note as string | null,
        dueDate: toDate(r.dueDate as string | null),
        completed: Boolean(r.completed),
        createdAt: new Date(r.createdAt as string),
      })
      .onConflictDoNothing();
  }
  console.log(`Follow-ups: processed ${rows.length} rows.`);
}

async function migrateBilling() {
  const data = readJson<{ leadBilling: Record<string, unknown>[] }>("billing.json");
  let paymentCount = 0;
  for (const b of data.leadBilling) {
    await db
      .insert(leadBilling)
      .values({
        leadId: b.leadId as string,
        status: b.status as string,
        advanceAmount: b.advanceAmount as number | null,
        monthlyFeeAmount: b.monthlyFeeAmount as number | null,
        projectFeeAmount: b.projectFeeAmount as number | null,
        currency: b.currency as string | null,
        billingNotes: b.billingNotes as string | null,
        canceledAt: toDate(b.canceledAt as string | null),
        resumedAt: toDate(b.resumedAt as string | null),
        taxExempt: Boolean(b.taxExempt),
        createdAt: new Date(b.createdAt as string),
        updatedAt: new Date(b.updatedAt as string),
      })
      .onConflictDoNothing();

    const payments = (b.payments as Record<string, unknown>[] | undefined) ?? [];
    for (const p of payments) {
      await db
        .insert(billingPayments)
        .values({
          id: p.id as string,
          leadId: p.leadId as string,
          type: p.type as string,
          amount: p.amount as number,
          paymentDate: new Date(p.paymentDate as string),
          note: p.note as string | null,
          createdAt: new Date(p.createdAt as string),
        })
        .onConflictDoNothing();
      paymentCount++;
    }
  }
  console.log(
    `Billing: processed ${data.leadBilling.length} lead billing profiles, ${paymentCount} payments.`
  );
}

async function migrateSettings() {
  const s = readJson<Record<string, unknown>>("settings.json");
  const values = {
    consultantName: s.consultantName as string,
    companyName: s.companyName as string,
    // logoUrl intentionally omitted — re-upload on the Settings page.
    phone: s.phone as string | null,
    whatsapp: s.whatsapp as string | null,
    email: s.email as string | null,
    website: s.website as string | null,
    linkedin: s.linkedin as string | null,
    address: s.address as string | null,
    reportFooter: s.reportFooter as string | null,
    ctaText: s.ctaText as string,
    currency: s.currency as string,
    defaultQualificationRate: s.defaultQualificationRate as number,
    taxEnabled: Boolean(s.taxEnabled),
    taxLabel: s.taxLabel as string,
    taxRate: s.taxRate as number | null,
    taxRegistrationNumber: s.taxRegistrationNumber as string | null,
    aiImageApiKey: s.aiImageApiKey as string | null,
    desktopNotificationsEnabled: Boolean(s.desktopNotificationsEnabled),
    servicePackagesJson: s.servicePackagesJson as string | null,
    updatedAt: new Date(s.updatedAt as string),
  };
  await db
    .insert(consultantSettings)
    .values({ id: (s.id as string) ?? "default", ...values })
    .onConflictDoUpdate({ target: consultantSettings.id, set: values });
  console.log(
    "Consultant settings restored (logoUrl not included — re-upload on the Settings page)."
  );
}

async function main() {
  await migrateLeads();
  await migrateFollowUps();
  await migrateBilling();
  await migrateSettings();
  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
