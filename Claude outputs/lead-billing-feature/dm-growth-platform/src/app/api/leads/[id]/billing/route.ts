import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadBilling } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// A lead has no billing row until the consultant first saves one — GET
// returns a default, unsaved-looking shape (status ACTIVE, every amount
// null) rather than 404, so the UI can always render the Billing card the
// same way whether or not a profile has been created yet.
function defaultBilling(leadId: string) {
  return {
    leadId,
    status: "ACTIVE" as const,
    advanceAmount: null,
    monthlyFeeAmount: null,
    projectFeeAmount: null,
    currency: null,
    billingNotes: null,
    canceledAt: null,
    resumedAt: null,
  };
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/billing">) {
  const { id } = await ctx.params;
  const row = await db.query.leadBilling.findFirst({ where: eq(leadBilling.leadId, id) });
  return NextResponse.json(row ?? defaultBilling(id));
}

// Upserts the billing profile — most leads won't have a row yet the first
// time this is called (either editing the agreed amounts, or clicking
// Cancel/Resume), so this creates one on first save rather than requiring a
// separate "set up billing" step.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/billing">) {
  const { id } = await ctx.params;
  const body = await req.json();

  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const existing = await db.query.leadBilling.findFirst({ where: eq(leadBilling.leadId, id) });

  const patch: Record<string, unknown> = {};
  if ("advanceAmount" in body) patch.advanceAmount = body.advanceAmount === "" || body.advanceAmount == null ? null : Number(body.advanceAmount);
  if ("monthlyFeeAmount" in body) patch.monthlyFeeAmount = body.monthlyFeeAmount === "" || body.monthlyFeeAmount == null ? null : Number(body.monthlyFeeAmount);
  if ("projectFeeAmount" in body) patch.projectFeeAmount = body.projectFeeAmount === "" || body.projectFeeAmount == null ? null : Number(body.projectFeeAmount);
  if ("currency" in body) patch.currency = body.currency || null;
  if ("billingNotes" in body) patch.billingNotes = body.billingNotes || null;

  if ("status" in body && (body.status === "ACTIVE" || body.status === "CANCELED")) {
    patch.status = body.status;
    if (body.status === "CANCELED") patch.canceledAt = new Date();
    if (body.status === "ACTIVE" && existing?.status === "CANCELED") patch.resumedAt = new Date();
  }

  if (existing) {
    const [updated] = await db.update(leadBilling).set(patch).where(eq(leadBilling.leadId, id)).returning();
    return NextResponse.json(updated);
  }

  const [created] = await db
    .insert(leadBilling)
    .values({ leadId: id, status: "ACTIVE", ...patch })
    .returning();
  return NextResponse.json(created, { status: 201 });
}
