// Flat data contracts consumed by BillingDocument.tsx (InvoiceDocument /
// ReceiptDocument) — same "pure data in, PDF out" shape as ReportData /
// ProposalData, so the renderer never has to know about the DB or the
// wizard, just this interface.

export interface BillingConsultant {
  consultantName: string;
  companyName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  // Data: URI, same convention as ReportConsultant.logoUrl — PNG/JPEG only.
  logoUrl?: string | null;
  // GSTIN or equivalent tax registration number — printed under the
  // consultant's details in the "From" / "Received By" block when set.
  taxRegistrationNumber?: string | null;
}

export interface BillingClient {
  customerName: string;
  businessName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null; // city/state/country joined, or null if none set
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

// A tax line shown on a document. Tax-exclusive throughout: `amount` is
// added on top of the pre-tax base (an invoice's subtotal, or a receipt's
// totalReceived) to arrive at the bottom-line total (totalDue / totalWithTax).
export interface TaxInfo {
  label: string; // e.g. "GST"
  rate: number; // percent, e.g. 18
  amount: number;
}

export interface InvoiceData {
  consultant: BillingConsultant;
  client: BillingClient;
  invoiceNumber: string;
  invoiceDate: string;
  currency: string;
  kind: "BALANCE_DUE" | "CUSTOM";
  lineItems: InvoiceLineItem[];
  // Balance-due invoices only — payments already received against the
  // one-time components (Advance / Project Fee), shown as deductions so the
  // math from "agreed" to "still owed" is fully visible on the document.
  paymentsApplied?: InvoiceLineItem[];
  // Pre-tax amount currently being invoiced (lineItems total, minus
  // paymentsApplied, floored at 0 for BALANCE_DUE — see build-billing-data.ts).
  subtotal: number;
  // Present only when tax is enabled in Settings and there's a nonzero
  // subtotal to tax.
  tax?: TaxInfo | null;
  // subtotal + (tax?.amount ?? 0) — the figure printed as the bottom-line total.
  totalDue: number;
  // Set when payments received exceed the one-time agreed amount — shown as
  // a credit note rather than a negative balance due.
  overpaidNote?: string | null;
  billingNotes?: string | null;
  // Explains why a recurring Monthly Fee isn't folded into the one-time
  // balance-due total, when one is agreed.
  recurringNote?: string | null;
}

export interface ReceiptPaymentRow {
  type: string;
  typeLabel: string;
  amount: number;
  date: string;
  note?: string | null;
}

export interface ReceiptData {
  consultant: BillingConsultant;
  client: BillingClient;
  receiptNumber: string;
  receiptDate: string;
  currency: string;
  kind: "SINGLE" | "COMBINED";
  payments: ReceiptPaymentRow[];
  // Amount actually received (sum of the payments above) — treated as the
  // pre-tax base, same as an invoice's subtotal.
  totalReceived: number;
  // Present only when tax is enabled in Settings and there's a nonzero
  // totalReceived to tax. Added on top of totalReceived, never subtracted
  // out of it.
  tax?: TaxInfo | null;
  // totalReceived + (tax?.amount ?? 0) — the bottom-line "Total Amount"
  // printed on the receipt. Equal to totalReceived when tax doesn't apply.
  totalWithTax: number;
}
