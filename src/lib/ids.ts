import { db } from "./db";
import { leads, websiteLeads } from "./db/schema";
import { count } from "drizzle-orm";

export async function nextCustomerId(): Promise<string> {
  const [{ value }] = await db.select({ value: count() }).from(leads);
  let n = value + 1;
  // Guard against unlikely collisions if leads were deleted.
  for (let attempts = 0; attempts < 1000; attempts++) {
    const candidate = `LEAD-${String(n).padStart(4, "0")}`;
    const existing = await db.query.leads.findFirst({ where: (l, { eq }) => eq(l.customerId, candidate) });
    if (!existing) return candidate;
    n++;
  }
  return `LEAD-${Date.now()}`;
}

// Public-site website lead IDs — "L0001" format per the lead-gen spec
// (never the visitor's email). Same collision-guard approach as
// nextCustomerId above, own counter/prefix since website enquiries and the
// internal CRM's leads are separate tables.
export async function nextWebsiteLeadId(): Promise<string> {
  const [{ value }] = await db.select({ value: count() }).from(websiteLeads);
  let n = value + 1;
  for (let attempts = 0; attempts < 1000; attempts++) {
    const candidate = `L${String(n).padStart(4, "0")}`;
    const existing = await db.query.websiteLeads.findFirst({ where: (l, { eq }) => eq(l.leadId, candidate) });
    if (!existing) return candidate;
    n++;
  }
  return `L${Date.now()}`;
}
