import type { InvoiceData, ReceiptData, BillingConsultant, BillingClient, TaxInfo } from "./billing-types";
import { formatCurrency } from "@/lib/calculations";

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  ADVANCE: "Advance",
  MONTHLY_FEE: "Monthly Fee",
  PROJECT_FEE: "Project Fee",
  PPC_AD_SPEND: "PPC Ad Spend",
  OTHER: "Other",
};

export interface BillingPartyArgs {
  lead: {
    customerName: string;
    businessName: string;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  };
  settings: {
    consultantName: string;
    companyName: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
    logoUrl?: string | null;
    taxEnabled?: boolean | null;
    taxLabel?: string | null;
    taxRate?: number | null;
    taxRegistrationNumber?: string | null;
  };
}

function buildParties({ lead, settings }: BillingPartyArgs): { consultant: BillingConsultant; client: BillingClient } {
  return {
    consultant: {
      consultantName: settings.consultantName || "Your Name",
      companyName: settings.companyName || "Your Consultancy",
      phone: settings.phone,
      whatsapp: settings.whatsapp,
      email: settings.email,
      website: settings.website,
      address: settings.address,
      logoUrl: settings.logoUrl ?? null,
      // Gated on taxEnabled, same as the tax line itself — a registration
      // number printed on a document with no tax breakdown is confusing.
      taxRegistrationNumber: settings.taxEnabled ? (settings.taxRegistrationNumber ?? null) : null,
    },
    client: {
      customerName: lead.customerName,
      businessName: lead.businessName,
      email: lead.email,
      phone: lead.phone,
      address: [lead.city, lead.state, lead.country].filter(Boolean).join(", ") || null,
    },
  };
}

// Tax-exclusive: `base` (whatever's currently being invoiced) is treated as
// the pre-tax amount, and tax is added on top. Returns null when tax isn't
// enabled/configured, this specific lead is marked tax-exempt, or there's
// nothing to tax (base <= 0) — no fabricated zero-tax line cluttering a
// fully-paid invoice.
function computeExclusiveTax(settings: BillingPartyArgs["settings"], base: number, taxExempt: boolean | null | undefined): TaxInfo | null {
  if (taxExempt || !settings.taxEnabled || !settings.taxRate || base <= 0) return null;
  return {
    label: settings.taxLabel || "GST",
    rate: settings.taxRate,
    amount: base * (settings.taxRate / 100),
  };
}

// Zero-pads a Date to YYYYMMDD, used for deterministic same-day invoice/
// receipt numbers (no DB row backs these documents — see the route
// comments for why that's an acceptable tradeoff here).
export function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export interface BuildBalanceDueInvoiceArgs extends BillingPartyArgs {
  billing: {
    advanceAmount: number | null;
    monthlyFeeAmount: number | null;
    projectFeeAmount: number | null;
    currency: string | null;
    billingNotes?: string | null;
    taxExempt?: boolean | null;
  };
  payments: Array<{ type: string; amount: number }>;
  defaultCurrency: string;
  invoiceNumber: string;
  invoiceDate: string;
}

// Balance-due invoice: itemizes the agreed one-time amounts (Advance,
// Project Fee), subtracts what's already been logged against those two
// types, and shows what's currently owed. The Monthly Recurring Fee is
// listed for reference but deliberately excluded from the one-time balance
// total — it recurs every billing cycle rather than being a fixed amount
// owed once, so folding it in would misrepresent the balance. This mirrors
// the app's existing non-fabrication rule: show real agreed/received
// numbers, never a computed figure that implies more precision or coverage
// than the data actually supports.
export function buildBalanceDueInvoiceData(args: BuildBalanceDueInvoiceArgs): InvoiceData {
  const { consultant, client } = buildParties(args);
  const { billing, payments, defaultCurrency, invoiceNumber, invoiceDate } = args;
  const currency = billing.currency || defaultCurrency;

  const lineItems: InvoiceData["lineItems"] = [];
  if (billing.advanceAmount) lineItems.push({ description: "Advance", amount: billing.advanceAmount });
  if (billing.projectFeeAmount) lineItems.push({ description: "Project Fee (one-time)", amount: billing.projectFeeAmount });
  if (billing.monthlyFeeAmount) lineItems.push({ description: "Monthly Recurring Fee (per month, billed separately each cycle)", amount: billing.monthlyFeeAmount });

  const advancePaid = payments.filter((p) => p.type === "ADVANCE").reduce((sum, p) => sum + p.amount, 0);
  const projectPaid = payments.filter((p) => p.type === "PROJECT_FEE").reduce((sum, p) => sum + p.amount, 0);

  const paymentsApplied: InvoiceData["lineItems"] = [];
  if (advancePaid) paymentsApplied.push({ description: "Advance received", amount: -advancePaid });
  if (projectPaid) paymentsApplied.push({ description: "Project fee received", amount: -projectPaid });

  const oneTimeAgreed = (billing.advanceAmount ?? 0) + (billing.projectFeeAmount ?? 0);
  const oneTimePaid = advancePaid + projectPaid;
  const rawBalance = oneTimeAgreed - oneTimePaid;
  const subtotal = Math.max(0, rawBalance);
  const tax = computeExclusiveTax(args.settings, subtotal, billing.taxExempt);
  const totalDue = subtotal + (tax?.amount ?? 0);
  const overpaidNote =
    rawBalance < 0
      ? `Payments received exceed the agreed one-time amount by ${formatCurrency(-rawBalance, currency)} — carried forward as a credit toward future fees.`
      : null;

  return {
    consultant,
    client,
    invoiceNumber,
    invoiceDate,
    currency,
    kind: "BALANCE_DUE",
    lineItems,
    paymentsApplied,
    subtotal,
    tax,
    totalDue,
    overpaidNote,
    billingNotes: billing.billingNotes ?? null,
    recurringNote: billing.monthlyFeeAmount
      ? "The Monthly Recurring Fee above is billed each cycle and is not included in the one-time balance due — it's shown here for reference only."
      : null,
  };
}

export interface BuildCustomInvoiceArgs extends BillingPartyArgs {
  description: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  invoiceDate: string;
  billingNotes?: string | null;
  taxExempt?: boolean | null;
}

// A one-off invoice for a specific typed amount/description, independent of
// the billing profile's agreed totals — e.g. a bespoke charge that doesn't
// fit Advance/Monthly/Project Fee. Not persisted (no history/versioning
// requested for this) — re-download means re-generating with the same
// inputs, same tradeoff already accepted for the balance-due invoice below.
export function buildCustomInvoiceData(args: BuildCustomInvoiceArgs): InvoiceData {
  const { consultant, client } = buildParties(args);
  const { description, amount, currency, invoiceNumber, invoiceDate, billingNotes, taxExempt } = args;
  const tax = computeExclusiveTax(args.settings, amount, taxExempt);
  return {
    consultant,
    client,
    invoiceNumber,
    invoiceDate,
    currency,
    kind: "CUSTOM",
    lineItems: [{ description, amount }],
    subtotal: amount,
    tax,
    totalDue: amount + (tax?.amount ?? 0),
    billingNotes: billingNotes ?? null,
  };
}

export interface BuildReceiptArgs extends BillingPartyArgs {
  currency: string;
  receiptNumber: string;
  receiptDate: string;
  kind: "SINGLE" | "COMBINED";
  payments: Array<{ type: string; amount: number; paymentDate: string | Date; note?: string | null }>;
  taxExempt?: boolean | null;
}

export function buildReceiptData(args: BuildReceiptArgs): ReceiptData {
  const { consultant, client } = buildParties(args);
  const { currency, receiptNumber, receiptDate, kind, payments, taxExempt } = args;
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  // Same tax-exclusive model as invoices: the amount received is treated as
  // the base, and tax is added on top as a separate line, arriving at a
  // distinct Total Amount — not reverse-computed out of money already
  // received.
  const tax = computeExclusiveTax(args.settings, totalReceived, taxExempt);
  return {
    consultant,
    client,
    receiptNumber,
    receiptDate,
    currency,
    kind,
    payments: payments.map((p) => ({
      type: p.type,
      typeLabel: PAYMENT_TYPE_LABELS[p.type] ?? p.type,
      amount: p.amount,
      date: new Date(p.paymentDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }),
      note: p.note ?? null,
    })),
    totalReceived,
    tax,
    totalWithTax: totalReceived + (tax?.amount ?? 0),
  };
}
