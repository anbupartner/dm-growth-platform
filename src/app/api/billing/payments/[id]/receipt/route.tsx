import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadBilling, billingPayments, consultantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument } from "@/lib/pdf/BillingDocument";
import { buildReceiptData } from "@/lib/pdf/build-billing-data";

import { apiErrorResponse } from "@/lib/api-handler";

const DEFAULT_SETTINGS = {
  consultantName: "Your Name",
  companyName: "Your Consultancy",
  ctaText: "Let's discuss how we can build your digital growth strategy.",
  currency: "INR", // matches consultantSettings' own default — see schema.ts
  phone: null,
  whatsapp: null,
  email: null,
  website: null,
  address: null,
  logoUrl: null,
  taxEnabled: false,
  taxLabel: "GST",
  taxRate: null,
  taxRegistrationNumber: null,
};

// Per-payment receipt — proof of one specific payment (date, type, amount,
// note), downloadable straight from that payment's row in the Billing
// card's payment log.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/billing/payments/[id]/receipt">) {
  try {
    const { id } = await ctx.params;
    const payment = await db.query.billingPayments.findFirst({ where: eq(billingPayments.id, id) });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    const [lead, billing, settings] = await Promise.all([
      db.query.leads.findFirst({ where: eq(leads.id, payment.leadId) }),
      db.query.leadBilling.findFirst({ where: eq(leadBilling.leadId, payment.leadId) }),
      (await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") })) ?? DEFAULT_SETTINGS,
    ]);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const receiptData = buildReceiptData({
      lead,
      settings,
      currency: billing?.currency || settings.currency,
      receiptNumber: `RCT-${payment.id.slice(0, 8).toUpperCase()}`,
      receiptDate: new Date(payment.paymentDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      kind: "SINGLE",
      payments: [payment],
      taxExempt: billing?.taxExempt ?? false,
    });

    const buffer = await renderToBuffer(<ReceiptDocument data={receiptData} />);
    const fileName = `${lead.customerId}-receipt-${payment.id.slice(0, 8)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/billing/payments/[id]/receipt");
  }
}
