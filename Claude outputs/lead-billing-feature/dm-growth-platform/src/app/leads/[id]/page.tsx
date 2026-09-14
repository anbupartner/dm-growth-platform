"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeading, Card, CardHeader, Badge, Select, Button, Spinner, Input, LinkButton, Textarea, Modal, Field } from "@/components/ui";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, CURRENCIES, type LeadStatus } from "@/lib/constants";
import { formatCurrency, formatRoas } from "@/lib/calculations";
import { CheckCircle2, Circle, Plus, Trash2, Pencil, PauseCircle, PlayCircle } from "lucide-react";

interface Lead {
  id: string;
  customerId: string;
  customerName: string;
  businessName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  websiteUrl?: string | null;
  businessVertical?: string | null;
  status: string;
  quoteValue?: number | null;
  notes?: string | null;
  hasWebsite?: string | null;
}

interface FollowUp {
  id: string;
  type: string;
  note?: string | null;
  dueDate?: string | null;
  completed: boolean;
  createdAt: string;
}

interface Scenario {
  id: string;
  name: string;
  tier: string;
  adBudget: number;
  results: string;
  createdAt: string;
}

interface ReportRow {
  id: string;
  version: number;
  createdAt: string;
  pdfFileName?: string | null;
  hasReportData: boolean;
}

interface ProposalRow {
  id: string;
  version: number;
  createdAt: string;
  pdfFileName?: string | null;
}

type BillingStatus = "ACTIVE" | "CANCELED";
type PaymentType = "ADVANCE" | "MONTHLY_FEE" | "PROJECT_FEE" | "PPC_AD_SPEND" | "OTHER";

interface BillingProfile {
  leadId: string;
  status: BillingStatus;
  advanceAmount: number | null;
  monthlyFeeAmount: number | null;
  projectFeeAmount: number | null;
  currency: string | null;
  billingNotes: string | null;
  canceledAt?: string | null;
  resumedAt?: string | null;
}

interface Payment {
  id: string;
  type: PaymentType;
  amount: number;
  paymentDate: string;
  note?: string | null;
  createdAt: string;
}

interface LeadDetail {
  lead: Lead;
  followUps: FollowUp[];
  assessments: Array<{ id: string; createdAt: string }>;
  scenarios: Scenario[];
  reports: ReportRow[];
  proposals: ProposalRow[];
  billing: BillingProfile;
  payments: Payment[];
}

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  ADVANCE: "Advance",
  MONTHLY_FEE: "Monthly Fee",
  PROJECT_FEE: "Project Fee",
  PPC_AD_SPEND: "PPC Ad Spend",
  OTHER: "Other",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<LeadDetail | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ type: "Call", note: "", dueDate: "" });
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "report" | "proposal" | "lead" | "payment"; id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [billingDraft, setBillingDraft] = useState({ currency: "USD", advanceAmount: "", monthlyFeeAmount: "", projectFeeAmount: "" });
  const [savingBilling, setSavingBilling] = useState(false);
  const [billingSaved, setBillingSaved] = useState(false);
  const [billingStatusBusy, setBillingStatusBusy] = useState(false);
  const [newPayment, setNewPayment] = useState({ type: "ADVANCE" as PaymentType, amount: "", paymentDate: new Date().toISOString().slice(0, 10), note: "" });
  const [addingPayment, setAddingPayment] = useState(false);

  const load = useCallback(() => {
    api.get<LeadDetail>(`/api/leads/${id}`).then((d) => {
      setData(d);
      setNotesDraft(d.lead.notes ?? "");
      setBillingDraft({
        currency: d.billing.currency ?? "USD",
        advanceAmount: d.billing.advanceAmount != null ? String(d.billing.advanceAmount) : "",
        monthlyFeeAmount: d.billing.monthlyFeeAmount != null ? String(d.billing.monthlyFeeAmount) : "",
        projectFeeAmount: d.billing.projectFeeAmount != null ? String(d.billing.projectFeeAmount) : "",
      });
    });
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;
  const { lead, followUps, scenarios, reports, proposals, billing, payments } = data;
  const sortedReports = [...reports].sort((a, b) => b.version - a.version);
  const latestVersion = sortedReports[0]?.version;

  async function updateStatus(status: string) {
    setSavingStatus(true);
    await api.patch(`/api/leads/${id}`, { status });
    await load();
    setSavingStatus(false);
  }

  async function saveNotes() {
    setSavingNotes(true);
    await api.patch(`/api/leads/${id}`, { notes: notesDraft });
    setSavingNotes(false);
  }

  async function addFollowUp(e: React.FormEvent) {
    e.preventDefault();
    setAddingFollowUp(true);
    await api.post(`/api/leads/${id}/follow-ups`, {
      type: newFollowUp.type,
      note: newFollowUp.note || undefined,
      dueDate: newFollowUp.dueDate || undefined,
    });
    setNewFollowUp({ type: "Call", note: "", dueDate: "" });
    setAddingFollowUp(false);
    await load();
  }

  async function toggleFollowUp(fu: FollowUp) {
    await api.patch(`/api/follow-ups/${fu.id}`, { completed: !fu.completed });
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const url =
      deleteTarget.kind === "report"
        ? `/api/reports/${deleteTarget.id}`
        : deleteTarget.kind === "proposal"
          ? `/api/proposals/${deleteTarget.id}`
          : deleteTarget.kind === "payment"
            ? `/api/billing/payments/${deleteTarget.id}`
            : `/api/leads/${deleteTarget.id}`;
    await api.del(url);
    if (deleteTarget.kind === "lead") {
      router.push("/leads");
      return;
    }
    setDeleting(false);
    setDeleteTarget(null);
    await load();
  }

  async function saveBilling() {
    setSavingBilling(true);
    await api.patch(`/api/leads/${id}/billing`, {
      currency: billingDraft.currency,
      advanceAmount: billingDraft.advanceAmount === "" ? null : Number(billingDraft.advanceAmount),
      monthlyFeeAmount: billingDraft.monthlyFeeAmount === "" ? null : Number(billingDraft.monthlyFeeAmount),
      projectFeeAmount: billingDraft.projectFeeAmount === "" ? null : Number(billingDraft.projectFeeAmount),
    });
    setSavingBilling(false);
    setBillingSaved(true);
    await load();
  }

  async function toggleBillingStatus() {
    setBillingStatusBusy(true);
    await api.patch(`/api/leads/${id}/billing`, { status: billing.status === "ACTIVE" ? "CANCELED" : "ACTIVE" });
    setBillingStatusBusy(false);
    await load();
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!newPayment.amount || Number(newPayment.amount) <= 0) return;
    setAddingPayment(true);
    await api.post(`/api/leads/${id}/billing/payments`, {
      type: newPayment.type,
      amount: Number(newPayment.amount),
      paymentDate: newPayment.paymentDate,
      note: newPayment.note || undefined,
    });
    setNewPayment({ type: "ADVANCE", amount: "", paymentDate: new Date().toISOString().slice(0, 10), note: "" });
    setAddingPayment(false);
    await load();
  }

  const now = new Date();
  const sortedFollowUps = [...followUps].sort((a, b) => {
    const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    return ad - bd;
  });

  return (
    <div>
      <PageHeading
        title={lead.businessName}
        subtitle={`${lead.customerId} · ${lead.customerName}`}
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/assessment/new?leadId=${id}`} variant="secondary" size="sm">Run Assessment</LinkButton>
            <LinkButton href={`/scenarios?leadId=${id}`} variant="secondary" size="sm">Scenarios</LinkButton>
            <LinkButton href={`/leads/${id}/edit`} variant="secondary" size="sm">
              <Pencil size={13} /> Edit
            </LinkButton>
            <Button
              variant="secondary"
              size="sm"
              title="Delete this lead"
              onClick={() => setDeleteTarget({ kind: "lead", id, label: lead.businessName })}
            >
              <Trash2 size={13} className="text-red-500" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <Badge className={LEAD_STATUS_COLORS[lead.status as LeadStatus]}>
                {LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
              </Badge>
              <Select
                value={lead.status}
                disabled={savingStatus}
                onChange={(e) => updateStatus(e.target.value)}
                className="w-auto"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                ))}
              </Select>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Email" value={lead.email} />
              <Info label="Phone" value={lead.phone} />
              <Info label="WhatsApp" value={lead.whatsapp} />
              <Info label="Website" value={lead.websiteUrl} />
              <Info label="Location" value={[lead.city, lead.state, lead.country].filter(Boolean).join(", ")} />
              <Info label="Industry" value={lead.businessVertical} />
              <Info label="Has Website" value={lead.hasWebsite === "YES" ? "Yes" : lead.hasWebsite === "NO" ? "No" : undefined} />
              <Info label="Quote Value" value={lead.quoteValue ? formatCurrency(lead.quoteValue) : undefined} />
            </dl>
          </Card>

          <BillingCard
            billing={billing}
            payments={payments}
            billingDraft={billingDraft}
            setBillingDraft={(updater) => {
              setBillingSaved(false);
              setBillingDraft(updater);
            }}
            savingBilling={savingBilling}
            billingSaved={billingSaved}
            billingStatusBusy={billingStatusBusy}
            saveBilling={saveBilling}
            toggleBillingStatus={toggleBillingStatus}
            newPayment={newPayment}
            setNewPayment={setNewPayment}
            addingPayment={addingPayment}
            addPayment={addPayment}
            onDeletePayment={(p) => setDeleteTarget({ kind: "payment", id: p.id, label: `${PAYMENT_TYPE_LABELS[p.type]} payment of ${formatCurrency(p.amount, billing.currency ?? undefined)}` })}
          />

          <Card>
            <CardHeader title="Notes" />
            <div className="p-4 space-y-3">
              <Textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={4} />
              <Button size="sm" onClick={saveNotes} disabled={savingNotes}>{savingNotes ? "Saving…" : "Save Notes"}</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Follow-up Timeline" />
            <div className="p-4 space-y-3">
              {sortedFollowUps.length === 0 && <p className="text-sm text-slate-400">No follow-ups yet.</p>}
              {sortedFollowUps.map((fu) => {
                const overdue = fu.dueDate && !fu.completed && new Date(fu.dueDate) < now;
                return (
                  <div key={fu.id} className="flex items-start gap-3">
                    <button onClick={() => toggleFollowUp(fu)} className="mt-0.5 text-indigo-600 shrink-0">
                      {fu.completed ? <CheckCircle2 size={18} /> : <Circle size={18} className={overdue ? "text-red-500" : "text-slate-300"} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-medium ${fu.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                          {fu.type}
                        </span>
                        {fu.dueDate && (
                          <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
                            {overdue ? "Overdue: " : "Due "}
                            {new Date(fu.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {fu.note && <p className="text-xs text-slate-500 mt-0.5">{fu.note}</p>}
                    </div>
                  </div>
                );
              })}

              <form onSubmit={addFollowUp} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
                <Select
                  value={newFollowUp.type}
                  onChange={(e) => setNewFollowUp((f) => ({ ...f, type: e.target.value }))}
                  className="sm:w-40"
                >
                  {["Call", "WhatsApp", "Email", "Meeting", "Note", "Proposal", "Quote"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>
                <Input
                  placeholder="Note (optional)"
                  value={newFollowUp.note}
                  onChange={(e) => setNewFollowUp((f) => ({ ...f, note: e.target.value }))}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={newFollowUp.dueDate}
                  onChange={(e) => setNewFollowUp((f) => ({ ...f, dueDate: e.target.value }))}
                  className="sm:w-40"
                />
                <Button type="submit" size="sm" disabled={addingFollowUp}>
                  <Plus size={14} /> Add
                </Button>
              </form>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Scenarios" action={<LinkButton href={`/scenarios?leadId=${id}`} variant="ghost" size="sm">Manage →</LinkButton>} />
            <div className="p-4 space-y-2">
              {scenarios.length === 0 && <p className="text-sm text-slate-400">No scenarios saved yet.</p>}
              {scenarios.slice(0, 4).map((sc) => {
                const r = JSON.parse(sc.results);
                const paid = r.paid ?? r;
                return (
                  <div key={sc.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300 truncate">{sc.name}</span>
                    <span className="text-slate-400 text-xs">{formatRoas(paid.roas ?? 0)} ROAS</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Reports" subtitle="View to understand the client, edit if needed — every save keeps its own version." />
            <div className="p-4 space-y-3">
              {sortedReports.length === 0 && <p className="text-sm text-slate-400">No reports generated yet.</p>}
              {sortedReports.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-200">v{r.version}</span>
                      {r.version === latestVersion && <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">Current</Badge>}
                    </div>
                    <div className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {r.hasReportData && (
                      <LinkButton href={`/leads/${id}/report/${r.id}/edit`} size="sm" variant="secondary">
                        View / Edit
                      </LinkButton>
                    )}
                    <a href={`/api/reports/${r.id}/pdf`}>
                      <Button size="sm" variant="ghost">PDF</Button>
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Delete this report version"
                      onClick={() => setDeleteTarget({ kind: "report", id: r.id, label: `report v${r.version}` })}
                    >
                      <Trash2 size={13} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <LinkButton href={`/assessment/new?leadId=${id}`} size="sm" variant="secondary" className="mt-2 w-full">
                Generate New Report
              </LinkButton>
            </div>
          </Card>

          <Card>
            <CardHeader title="Proposals" subtitle="Client-facing, priced — ready to download and send to close the deal." />
            <div className="p-4 space-y-3">
              {proposals.length === 0 && <p className="text-sm text-slate-400">No proposals generated yet.</p>}
              {proposals.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium text-slate-700 dark:text-slate-200">v{p.version}</span>
                    <div className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <a href={`/api/proposals/${p.id}/pdf`}>
                      <Button size="sm" variant="ghost">PDF</Button>
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Delete this proposal version"
                      onClick={() => setDeleteTarget({ kind: "proposal", id: p.id, label: `proposal v${p.version}` })}
                    >
                      <Trash2 size={13} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              <LinkButton href={`/leads/${id}/proposal/new`} size="sm" variant="secondary" className="mt-2 w-full">
                Generate Proposal
              </LinkButton>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={!!deleteTarget} onClose={() => (deleting ? null : setDeleteTarget(null))}>
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {deleteTarget?.kind === "lead" ? <>Delete lead &ldquo;{deleteTarget.label}&rdquo;?</> : <>Delete {deleteTarget?.label}?</>}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {deleteTarget?.kind === "lead"
              ? "This permanently deletes this lead and everything attached to it — notes, follow-ups, assessments, scenarios, every report and proposal version, billing and payment history, and their PDFs. This can't be undone."
              : deleteTarget?.kind === "payment"
                ? "This permanently deletes this payment entry from the billing history. This can't be undone."
                : "This permanently deletes this version and its PDF. This can't be undone."}
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-slate-800 dark:text-slate-200">{value || "—"}</dd>
    </div>
  );
}

interface BillingDraft {
  currency: string;
  advanceAmount: string;
  monthlyFeeAmount: string;
  projectFeeAmount: string;
}

interface NewPaymentDraft {
  type: PaymentType;
  amount: string;
  paymentDate: string;
  note: string;
}

// Its own component (rather than inlined in the page) mainly to keep the
// page's main render function from growing any further — this card is
// self-contained: the agreed amounts (Advance / Monthly Fee / Project Fee),
// the overall Cancel/Resume status for the billing engagement, and the full
// payment ledger including PPC ad-spend payments, all in one place on the
// lead's page since that's where a consultant already is when following up
// on money for a specific client.
function BillingCard({
  billing,
  payments,
  billingDraft,
  setBillingDraft,
  savingBilling,
  billingSaved,
  billingStatusBusy,
  saveBilling,
  toggleBillingStatus,
  newPayment,
  setNewPayment,
  addingPayment,
  addPayment,
  onDeletePayment,
}: {
  billing: BillingProfile;
  payments: Payment[];
  billingDraft: BillingDraft;
  setBillingDraft: React.Dispatch<React.SetStateAction<BillingDraft>>;
  savingBilling: boolean;
  billingSaved: boolean;
  billingStatusBusy: boolean;
  saveBilling: () => void;
  toggleBillingStatus: () => void;
  newPayment: NewPaymentDraft;
  setNewPayment: React.Dispatch<React.SetStateAction<NewPaymentDraft>>;
  addingPayment: boolean;
  addPayment: (e: React.FormEvent) => void;
  onDeletePayment: (p: Payment) => void;
}) {
  const currency = billing.currency ?? billingDraft.currency;
  const totalsByType = payments.reduce<Record<PaymentType, number>>(
    (acc, p) => ({ ...acc, [p.type]: (acc[p.type] ?? 0) + p.amount }),
    { ADVANCE: 0, MONTHLY_FEE: 0, PROJECT_FEE: 0, PPC_AD_SPEND: 0, OTHER: 0 }
  );
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card>
      <CardHeader
        title="Billing"
        subtitle="Advance, monthly recurring fee, project fee and PPC ad-spend payments for this engagement."
        action={
          <div className="flex items-center gap-2">
            <Badge className={billing.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}>
              {billing.status === "ACTIVE" ? "Active" : "Canceled"}
            </Badge>
            <Button size="sm" variant="secondary" onClick={toggleBillingStatus} disabled={billingStatusBusy}>
              {billing.status === "ACTIVE" ? (
                <>
                  <PauseCircle size={13} /> Cancel Billing
                </>
              ) : (
                <>
                  <PlayCircle size={13} /> Resume Billing
                </>
              )}
            </Button>
          </div>
        }
      />
      <div className="p-4 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Currency">
            <Select value={billingDraft.currency} onChange={(e) => setBillingDraft((d) => ({ ...d, currency: e.target.value }))}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div />
          <Field label="Advance Paid" hint={`Total logged so far: ${formatCurrency(totalsByType.ADVANCE, currency)}`}>
            <Input
              type="number"
              value={billingDraft.advanceAmount}
              onChange={(e) => setBillingDraft((d) => ({ ...d, advanceAmount: e.target.value }))}
              placeholder="Agreed advance amount"
            />
          </Field>
          <Field label="Monthly Recurring Fee" hint={`Total logged so far: ${formatCurrency(totalsByType.MONTHLY_FEE, currency)}`}>
            <Input
              type="number"
              value={billingDraft.monthlyFeeAmount}
              onChange={(e) => setBillingDraft((d) => ({ ...d, monthlyFeeAmount: e.target.value }))}
              placeholder="Agreed monthly amount"
            />
          </Field>
          <Field label="Project Fee" hint={`Total logged so far: ${formatCurrency(totalsByType.PROJECT_FEE, currency)}`}>
            <Input
              type="number"
              value={billingDraft.projectFeeAmount}
              onChange={(e) => setBillingDraft((d) => ({ ...d, projectFeeAmount: e.target.value }))}
              placeholder="Agreed one-time project fee"
            />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={saveBilling} disabled={savingBilling}>{savingBilling ? "Saving…" : "Save Billing Details"}</Button>
          {billingSaved && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Payments</p>
            <p className="text-xs text-slate-400">Total received: {formatCurrency(totalReceived, currency)}</p>
          </div>

          {payments.length === 0 && <p className="text-sm text-slate-400 mb-3">No payments logged yet.</p>}
          {payments.length > 0 && (
            <div className="space-y-2 mb-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-50 dark:border-slate-800/60 pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{PAYMENT_TYPE_LABELS[p.type]}</span>
                      <span className="text-slate-500 dark:text-slate-400">{formatCurrency(p.amount, currency)}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(p.paymentDate).toLocaleDateString()}
                      {p.note ? ` · ${p.note}` : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" title="Delete this payment" onClick={() => onDeletePayment(p)}>
                    <Trash2 size={13} className="text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={addPayment} className="pt-2 flex flex-col sm:flex-row gap-2">
            <Select
              value={newPayment.type}
              onChange={(e) => setNewPayment((p) => ({ ...p, type: e.target.value as PaymentType }))}
              className="sm:w-40"
            >
              {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]).map((t) => (
                <option key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</option>
              ))}
            </Select>
            <Input
              type="number"
              placeholder="Amount"
              value={newPayment.amount}
              onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))}
              className="sm:w-32"
            />
            <Input
              type="date"
              value={newPayment.paymentDate}
              onChange={(e) => setNewPayment((p) => ({ ...p, paymentDate: e.target.value }))}
              className="sm:w-40"
            />
            <Input
              placeholder="Note (optional) — e.g. which platform for PPC"
              value={newPayment.note}
              onChange={(e) => setNewPayment((p) => ({ ...p, note: e.target.value }))}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={addingPayment}>
              <Plus size={14} /> Add Payment
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}
