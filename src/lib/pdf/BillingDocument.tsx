import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { InvoiceData, ReceiptData } from "./billing-types";
import { formatCurrency } from "@/lib/calculations";

// Same palette/typography as ReportDocument.tsx and ProposalDocument.tsx —
// invoices and receipts should read as the same document family as the
// report/proposal a client has already seen, not a bolted-on third style.
const COLORS = {
  ink: "#111827",
  sub: "#4b5563",
  faint: "#9ca3af",
  brand: "#4f46e5",
  brandSoft: "#eef2ff",
  line: "#e5e7eb",
  good: "#059669",
  goodSoft: "#ecfdf5",
  warn: "#b45309",
  warnSoft: "#fffbeb",
  slateSoft: "#f8fafc",
};

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: COLORS.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  brandTitle: { fontSize: 10, color: COLORS.brand, fontFamily: "Helvetica-Bold" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  pageTitle: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  docMetaBlock: { alignItems: "flex-end" },
  docMetaLabel: { fontSize: 8, color: COLORS.faint },
  docMetaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  partiesRow: { flexDirection: "row", marginBottom: 20 },
  partyCol: { flex: 1 },
  partyLabel: { fontSize: 8, color: COLORS.faint, marginBottom: 3, textTransform: "uppercase" },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  partyLine: { fontSize: 9, color: COLORS.sub, lineHeight: 1.4 },
  table: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 6, overflow: "hidden", marginBottom: 4 },
  tableHeadRow: { flexDirection: "row", backgroundColor: COLORS.slateSoft, paddingVertical: 7, paddingHorizontal: 10 },
  tableHeadCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: COLORS.sub, textTransform: "uppercase" },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  tableCell: { fontSize: 9.5, color: COLORS.ink },
  descCol: { flex: 3 },
  amountCol: { flex: 1, textAlign: "right" },
  deductionRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: COLORS.line },
  deductionText: { fontSize: 9, color: COLORS.good },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 2, borderTopColor: COLORS.ink },
  totalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", marginRight: 16 },
  totalValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: COLORS.brand },
  summaryRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingVertical: 3 },
  summaryLabel: { fontSize: 9, color: COLORS.sub, marginRight: 16 },
  summaryValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: COLORS.ink, minWidth: 70, textAlign: "right" },
  taxIncludedNote: { fontSize: 8, color: COLORS.sub, marginTop: 4 },
  noteCard: { borderRadius: 6, padding: 10, marginTop: 14 },
  noteText: { fontSize: 8.5, lineHeight: 1.5 },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: COLORS.faint, flexDirection: "row", justifyContent: "space-between" },
  bigAmountCard: { borderRadius: 8, padding: 20, alignItems: "center", marginBottom: 20 },
  bigAmountLabel: { fontSize: 9, color: COLORS.sub, marginBottom: 4 },
  bigAmountValue: { fontSize: 28, fontFamily: "Helvetica-Bold", color: COLORS.good },
});

function Header({ consultant }: { consultant: InvoiceData["consultant"] | ReceiptData["consultant"] }) {
  return (
    <View style={s.headerRow} fixed>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {consultant.logoUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML <img>
          <Image src={consultant.logoUrl} style={{ width: 20, height: 20, marginRight: 6, objectFit: "contain" }} />
        )}
        <Text style={s.brandTitle}>{consultant.companyName}</Text>
      </View>
      <Text style={{ fontSize: 8, color: COLORS.faint }}>{consultant.consultantName}</Text>
    </View>
  );
}

function Footer({ consultant }: { consultant: InvoiceData["consultant"] | ReceiptData["consultant"] }) {
  return (
    <View style={s.footer} fixed>
      <Text>
        {consultant.companyName} · {consultant.website ?? consultant.email ?? consultant.phone ?? ""}
      </Text>
      <Text>Page 1 of 1</Text>
    </View>
  );
}

function PartyBlock({ label, name, lines }: { label: string; name: string; lines: Array<string | null | undefined> }) {
  return (
    <View style={s.partyCol}>
      <Text style={s.partyLabel}>{label}</Text>
      <Text style={s.partyName}>{name}</Text>
      {lines.filter(Boolean).map((l, i) => (
        <Text key={i} style={s.partyLine}>{l}</Text>
      ))}
    </View>
  );
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const { consultant, client, invoiceNumber, invoiceDate, currency, lineItems, paymentsApplied, subtotal, tax, totalDue, overpaidNote, billingNotes, recurringNote } = data;

  return (
    <Document title={`${client.businessName} — Invoice ${invoiceNumber}`} author={consultant.companyName}>
      <Page size="A4" style={s.page}>
        <Header consultant={consultant} />

        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Invoice</Text>
          <View style={s.docMetaBlock}>
            <Text style={s.docMetaLabel}>Invoice #</Text>
            <Text style={s.docMetaValue}>{invoiceNumber}</Text>
            <Text style={s.docMetaLabel}>Date</Text>
            <Text style={s.docMetaValue}>{invoiceDate}</Text>
          </View>
        </View>

        <View style={s.partiesRow}>
          <PartyBlock
            label="From"
            name={consultant.companyName}
            lines={[
              consultant.consultantName,
              consultant.address,
              consultant.phone,
              consultant.email,
              consultant.website,
              consultant.taxRegistrationNumber ? `GSTIN: ${consultant.taxRegistrationNumber}` : null,
            ]}
          />
          <PartyBlock
            label="Bill To"
            name={client.businessName}
            lines={[client.customerName, client.address, client.phone, client.email]}
          />
        </View>

        <View style={s.table}>
          <View style={s.tableHeadRow}>
            <Text style={[s.tableHeadCell, s.descCol]}>Description</Text>
            <Text style={[s.tableHeadCell, s.amountCol]}>Amount</Text>
          </View>
          {lineItems.map((item, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, s.descCol]}>{item.description}</Text>
              <Text style={[s.tableCell, s.amountCol]}>{formatCurrency(item.amount, currency)}</Text>
            </View>
          ))}
          {(paymentsApplied ?? []).map((item, i) => (
            <View key={`p${i}`} style={s.deductionRow}>
              <Text style={[s.deductionText, s.descCol]}>{item.description}</Text>
              <Text style={[s.deductionText, s.amountCol]}>{formatCurrency(item.amount, currency)}</Text>
            </View>
          ))}
        </View>

        {tax && (
          <View style={{ marginTop: 4 }}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>{formatCurrency(subtotal, currency)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>{tax.label} ({tax.rate}%)</Text>
              <Text style={s.summaryValue}>{formatCurrency(tax.amount, currency)}</Text>
            </View>
          </View>
        )}

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>{tax ? "Total Due (incl. tax)" : "Balance Due"}</Text>
          <Text style={s.totalValue}>{formatCurrency(totalDue, currency)}</Text>
        </View>

        {overpaidNote && (
          <View style={[s.noteCard, { backgroundColor: COLORS.goodSoft }]}>
            <Text style={[s.noteText, { color: COLORS.good }]}>{overpaidNote}</Text>
          </View>
        )}
        {recurringNote && (
          <View style={[s.noteCard, { backgroundColor: COLORS.warnSoft }]}>
            <Text style={[s.noteText, { color: COLORS.warn }]}>{recurringNote}</Text>
          </View>
        )}
        {billingNotes && (
          <View style={[s.noteCard, { backgroundColor: COLORS.slateSoft }]}>
            <Text style={[s.noteText, { color: COLORS.sub }]}>{billingNotes}</Text>
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 8.5, color: COLORS.faint }}>
            Please reach out to {consultant.consultantName}
            {consultant.whatsapp ? ` on WhatsApp (${consultant.whatsapp})` : consultant.phone ? ` at ${consultant.phone}` : ""}
            {consultant.email ? ` or ${consultant.email}` : ""} with any questions about this invoice.
          </Text>
        </View>

        <Footer consultant={consultant} />
      </Page>
    </Document>
  );
}

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const { consultant, client, receiptNumber, receiptDate, currency, kind, payments, totalReceived, tax, totalWithTax } = data;

  return (
    <Document title={`${client.businessName} — Payment Receipt ${receiptNumber}`} author={consultant.companyName}>
      <Page size="A4" style={s.page}>
        <Header consultant={consultant} />

        <View style={s.titleRow}>
          <Text style={s.pageTitle}>Payment Receipt</Text>
          <View style={s.docMetaBlock}>
            <Text style={s.docMetaLabel}>Receipt #</Text>
            <Text style={s.docMetaValue}>{receiptNumber}</Text>
            <Text style={s.docMetaLabel}>Date</Text>
            <Text style={s.docMetaValue}>{receiptDate}</Text>
          </View>
        </View>

        <View style={s.partiesRow}>
          <PartyBlock
            label="Received By"
            name={consultant.companyName}
            lines={[
              consultant.consultantName,
              consultant.address,
              consultant.phone,
              consultant.email,
              consultant.taxRegistrationNumber ? `GSTIN: ${consultant.taxRegistrationNumber}` : null,
            ]}
          />
          <PartyBlock
            label="Received From"
            name={client.businessName}
            lines={[client.customerName, client.address, client.phone, client.email]}
          />
        </View>

        <View style={s.bigAmountCard}>
          <Text style={s.bigAmountLabel}>{kind === "SINGLE" ? "Amount Received" : "Total Amount Received"}</Text>
          <Text style={s.bigAmountValue}>{formatCurrency(totalReceived, currency)}</Text>
        </View>

        {tax && (
          <View style={{ marginTop: 4 }}>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>{tax.label} ({tax.rate}%)</Text>
              <Text style={s.summaryValue}>{formatCurrency(tax.amount, currency)}</Text>
            </View>
          </View>
        )}

        {tax && (
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalValue}>{formatCurrency(totalWithTax, currency)}</Text>
          </View>
        )}

        <View style={s.table}>
          <View style={s.tableHeadRow}>
            <Text style={[s.tableHeadCell, { flex: 1.4 }]}>Date</Text>
            <Text style={[s.tableHeadCell, { flex: 1.4 }]}>Type</Text>
            <Text style={[s.tableHeadCell, { flex: 2 }]}>Note</Text>
            <Text style={[s.tableHeadCell, s.amountCol]}>Amount</Text>
          </View>
          {payments.map((p, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={[s.tableCell, { flex: 1.4 }]}>{p.date}</Text>
              <Text style={[s.tableCell, { flex: 1.4 }]}>{p.typeLabel}</Text>
              <Text style={[s.tableCell, { flex: 2, color: COLORS.sub }]}>{p.note || "—"}</Text>
              <Text style={[s.tableCell, s.amountCol]}>{formatCurrency(p.amount, currency)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 8.5, color: COLORS.faint }}>
            Thank you for your payment. This receipt confirms funds received as of {receiptDate} — it does not represent a final
            account balance; see the Invoice for what remains due, if anything.
          </Text>
        </View>

        <Footer consultant={consultant} />
      </Page>
    </Document>
  );
}
