"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Field, Input, Select, Textarea, Button, Spinner } from "@/components/ui";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, BUSINESS_GOALS, INDUSTRIES, COUNTRIES } from "@/lib/constants";

export default function NewLeadPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
      <NewLeadPageInner />
    </Suspense>
  );
}

function NewLeadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Quick Proposal entry point (see the Proposals page's "+ Quick Proposal"
  // button): a brand-new customer who just wants a priced proposal, no
  // website/audit involved. Same form, same required fields — only where
  // "Save" sends the consultant afterward changes.
  const next = searchParams.get("next");
  const isQuickProposal = next === "proposal";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A blank new-lead form starts with "same as phone" checked — the common
  // case — and stays in sync as Phone is typed until unchecked.
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [form, setForm] = useState({
    customerName: "",
    businessName: "",
    email: "",
    phone: "",
    whatsapp: "",
    city: "",
    state: "",
    country: "India",
    businessVertical: "",
    websiteUrl: "",
    monthlyBudget: "",
    businessGoal: "",
    leadSource: "OTHER",
    notes: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName || !form.businessName) {
      setError("Customer name and business name are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const lead = await api.post<{ id: string }>("/api/leads", {
        ...form,
        monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : undefined,
      });
      router.push(isQuickProposal ? `/leads/${lead.id}/proposal/new` : `/leads/${lead.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeading
        title={isQuickProposal ? "Quick Proposal — New Customer" : "Add Lead"}
        subtitle={
          isQuickProposal
            ? "Just the basics — no website or audit needed. You'll go straight into building the priced proposal next."
            : "Capture a new prospect. You can run a full assessment afterwards."
        }
      />
      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Customer Name *">
              <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
            </Field>
            <Field label="Business Name *">
              <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => {
                  set("phone", e.target.value);
                  if (whatsappSameAsPhone) set("whatsapp", e.target.value);
                }}
              />
            </Field>
            <div className="block">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">WhatsApp</span>
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <input
                  type="checkbox"
                  checked={whatsappSameAsPhone}
                  onChange={(e) => {
                    setWhatsappSameAsPhone(e.target.checked);
                    if (e.target.checked) set("whatsapp", form.phone);
                  }}
                />
                Same as Phone
              </label>
              {whatsappSameAsPhone ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-2">{form.phone || "—"}</p>
              ) : (
                <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="Enter WhatsApp number" />
              )}
            </div>
            <Field label="Website URL">
              <Input value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://" />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State">
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="Country">
              <Select value={form.country} onChange={(e) => set("country", e.target.value)}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Business Vertical / Industry">
              <Select value={form.businessVertical} onChange={(e) => set("businessVertical", e.target.value)}>
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </Select>
            </Field>
            <Field label="Monthly Marketing Budget">
              <Input type="number" value={form.monthlyBudget} onChange={(e) => set("monthlyBudget", e.target.value)} />
            </Field>
            <Field label="Business Goal">
              <Select value={form.businessGoal} onChange={(e) => set("businessGoal", e.target.value)}>
                <option value="">Select…</option>
                {BUSINESS_GOALS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </Select>
            </Field>
            <Field label="Lead Source">
              <Select value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)}>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isQuickProposal ? "Save & Create Proposal" : "Save Lead"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
