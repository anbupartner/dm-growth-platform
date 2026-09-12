import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, billingPayments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

import { apiErrorResponse } from "@/lib/api-handler";

const PAYMENT_TYPES = ["ADVANCE", "MONTHLY_FEE", "PROJECT_FEE", "PPC_AD_SPEND", "OTHER"];

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/billing/payments">) {
  try {
    const { id } = await ctx.params;
    const rows = await db.select().from(billingPayments).where(eq(billingPayments.leadId, id)).orderBy(desc(billingPayments.paymentDate));
    return NextResponse.json(rows);
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads/[id]/billing/payments");
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/billing/payments">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (!PAYMENT_TYPES.includes(body.type)) {
      return NextResponse.json({ error: `type must be one of ${PAYMENT_TYPES.join(", ")}` }, { status: 400 });
    }
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const [row] = await db
      .insert(billingPayments)
      .values({
        leadId: id,
        type: body.type,
        amount,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        note: body.note || null,
      })
      .returning();

    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/leads/[id]/billing/payments");
  }
}
