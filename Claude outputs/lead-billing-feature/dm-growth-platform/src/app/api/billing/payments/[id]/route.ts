import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingPayments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Deleting a single payment entry — e.g. to correct a mistaken amount/type —
// rather than editing it in place, matching how a wrong report/proposal
// version is corrected elsewhere in this app: delete and re-add, never a
// silent edit of money-related history.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/billing/payments/[id]">) {
  const { id } = await ctx.params;
  const row = await db.query.billingPayments.findFirst({ where: eq(billingPayments.id, id) });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(billingPayments).where(eq(billingPayments.id, id));
  return NextResponse.json({ ok: true });
}
