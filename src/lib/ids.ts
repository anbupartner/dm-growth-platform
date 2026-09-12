import { db } from "./db";
import { leads } from "./db/schema";
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
