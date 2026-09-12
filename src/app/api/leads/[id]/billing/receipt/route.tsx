import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadBilling, billingPayments, consultantSettings } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument } from "@/lib/pdf/BillingDocument";
import { buildReceiptData, yyyymmdd } from "@/lib/pdf/build-billing-data";

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

// Combined receipt — every payment logged for this lead to date, in one
// document. Like the balance-due invoice, this is generated fresh each
// time rather than persisted, so it always reflects the current ledger.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/billing/receipt">) {
  try {
    const { id } = await ctx.params;
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const [billing, payments, settings] = await Promise.all([
      db.query.leadBilling.findFirst({ where: eq(leadBilling.leadId, id) }),
      db.select().from(billingPayments).where(eq(billingPayments.leadId, id)).orderBy(asc(billingPayments.paymentDate)),
      (await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") })) ?? DEFAULT_SETTINGS,
    ]);

    if (payments.length === 0) {
      return NextResponse.json({ error: "No payments logged for this lead yet." }, { status: 400 });
    }

    const now = new Date();
    const receiptData = buildReceiptData({
      lead,
      settings,
      currency: billing?.currency || settings.currency,
      receiptNumber: `RCT-${lead.customerId}-${yyyymmdd(now)}`,
      receiptDate: now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      kind: "COMBINED",
      payments,
      taxExempt: billing?.taxExempt ?? false,
    });

    const buffer = await renderToBuffer(<ReceiptDocument data={receiptData} />);
    const fileName = `${lead.customerId}-${lead.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-receipt-${yyyymmdd(now)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads/[id]/billing/receipt");
  }
}
