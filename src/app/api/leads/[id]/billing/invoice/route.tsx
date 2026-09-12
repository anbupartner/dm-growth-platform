import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, leadBilling, billingPayments, consultantSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf/BillingDocument";
import { buildBalanceDueInvoiceData, buildCustomInvoiceData, yyyymmdd } from "@/lib/pdf/build-billing-data";

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

async function loadSettings() {
  return (await db.query.consultantSettings.findFirst({ where: eq(consultantSettings.id, "default") })) ?? DEFAULT_SETTINGS;
}

// GET — the default "balance due" invoice: agreed one-time amounts minus
// what's already been logged against them. Not persisted (no invoices
// table) — this always reflects the *current* billing profile and payment
// ledger, which is the correct behaviour for a running balance (unlike a
// Report/Proposal, a balance-due invoice re-downloaded tomorrow after a new
// payment is logged SHOULD show a different number).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/leads/[id]/billing/invoice">) {
  try {
    const { id } = await ctx.params;
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const [billing, payments, settings] = await Promise.all([
      db.query.leadBilling.findFirst({ where: eq(leadBilling.leadId, id) }),
      db.select().from(billingPayments).where(eq(billingPayments.leadId, id)),
      loadSettings(),
    ]);

    const now = new Date();
    const invoiceData = buildBalanceDueInvoiceData({
      lead,
      settings,
      billing: billing ?? {
        advanceAmount: null,
        monthlyFeeAmount: null,
        projectFeeAmount: null,
        currency: null,
        billingNotes: null,
        taxExempt: false,
      },
      payments,
      defaultCurrency: settings.currency,
      invoiceNumber: `INV-${lead.customerId}-${yyyymmdd(now)}`,
      invoiceDate: now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
    });

    const buffer = await renderToBuffer(<InvoiceDocument data={invoiceData} />);
    const fileName = `${lead.customerId}-${lead.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-invoice-${yyyymmdd(now)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "GET /api/leads/[id]/billing/invoice");
  }
}

// POST — a one-off custom invoice for a specific typed description/amount,
// independent of the billing profile's agreed totals. Same "not persisted"
// tradeoff as the balance-due invoice above.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/leads/[id]/billing/invoice">) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const amount = Number(body.amount);

    if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });
    if (!amount || amount <= 0) return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });

    const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const [billing, settings] = await Promise.all([db.query.leadBilling.findFirst({ where: eq(leadBilling.leadId, id) }), loadSettings()]);

    const now = new Date();
    const invoiceData = buildCustomInvoiceData({
      lead,
      settings,
      description,
      amount,
      currency: (typeof body.currency === "string" && body.currency) || billing?.currency || settings.currency,
      invoiceNumber: `INV-${lead.customerId}-${yyyymmdd(now)}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`,
      invoiceDate: now.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      billingNotes: billing?.billingNotes ?? null,
      taxExempt: billing?.taxExempt ?? false,
    });

    const buffer = await renderToBuffer(<InvoiceDocument data={invoiceData} />);
    const fileName = `${lead.customerId}-${lead.businessName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-custom-invoice-${yyyymmdd(now)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err, "POST /api/leads/[id]/billing/invoice");
  }
}
