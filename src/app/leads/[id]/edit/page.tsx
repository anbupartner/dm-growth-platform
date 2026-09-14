"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Field, Input, Select, Textarea, Button, Spinner } from "@/components/ui";
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, BUSINESS_GOALS, INDUSTRIES, COUNTRIES, GENDERS, GENDER_LABELS } from "@/lib/constants";

// Edits the same fields the "Add Lead" form captures, plus Has Website and
// Quote Value since both are shown on the lead detail page's info card and
// are meaningful to correct by hand (rather than only through the
// assessment wizard or the Proposal Generator, which is the only other
// place quoteValue is normally set). Deeper assessment-only fields (business
// description, order values, target audience, growth plan, etc.) aren't
// editable here — those come from re-running the assessment wizard, which
// already has its own edit path (Report Editor / re-running Run Assessment).
interface LeadRecord {
  id: string;
  customerName: string;
  gender?: string | null;
  businessName: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  websiteUrl?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  businessVertical?: string | null;
  monthlyBudget?: number | null;
  businessGoal?: string | null;
  leadSource: string;
  hasWebsite?: string | null;
  quoteValue?: number | null;
  notes?: string | null;
}

export default function EditLeadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once the lead loads, below — reflects whether Phone/WhatsApp were
  // already the same (or WhatsApp was blank) vs. deliberately different.
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [form, setForm] = useState({
    customerName: "",
    gender: "",
    businessName: "",
    email: "",
    phone: "",
    whatsapp: "",
    websiteUrl: "",
    city: "",
    state: "",
    country: "India",
    businessVertical: "",
    monthlyBudget: "",
    businessGoal: "",
    leadSource: "OTHER",
    hasWebsite: "",
    quoteValue: "",
    notes: "",
  });

  useEffect(() => {
    if (!id) return;
    api.get<{ lead: LeadRecord }>(`/api/leads/${id}`).then(({ lead }) => {
      setForm({
        customerName: lead.customerName ?? "",
        gender: lead.gender ?? "",
        businessName: lead.businessName ?? "",
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        whatsapp: lead.whatsapp ?? "",
        websiteUrl: lead.websiteUrl ?? "",
        city: lead.city ?? "",
        state: lead.state ?? "",
        country: lead.country ?? "India",
        businessVertical: lead.businessVertical ?? "",
        monthlyBudget: lead.monthlyBudget != null ? String(lead.monthlyBudget) : "",
        businessGoal: lead.businessGoal ?? "",
        leadSource: lead.leadSource ?? "OTHER",
        hasWebsite: lead.hasWebsite ?? "",
        quoteValue: lead.quoteValue != null ? String(lead.quoteValue) : "",
        notes: lead.notes ?? "",
      });
      setWhatsappSameAsPhone((lead.whatsapp ?? "") === (lead.phone ?? "") || !lead.whatsapp);
      setLoading(false);
    });
  }, [id]);

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
      await api.patch(`/api/leads/${id}`, {
        ...form,
        hasWebsite: form.hasWebsite || null,
        monthlyBudget: form.monthlyBudget ? Number(form.monthlyBudget) : null,
        quoteValue: form.quoteValue ? Number(form.quoteValue) : null,
      });
      router.push(`/leads/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl">
      <PageHeading title="Edit Lead" subtitle={form.businessName || "Update this lead's details."} />
      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Customer Name *">
              <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} required />
            </Field>
            <Field label="Business Name *">
              <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} required />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="">Select…</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{GENDER_LABELS[g]}</option>
                ))}
              </Select>
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
                {/* Country used to be free text — an older lead may hold a value that
                    isn't an exact match in COUNTRIES (e.g. "USA" instead of "United
                    States"). Show it as its own option instead of silently swapping
                    it for whatever the <select> would otherwise default to, so
                    nothing changes until the consultant deliberately picks a real
                    entry from the list. */}
                {form.country && !(COUNTRIES as readonly string[]).includes(form.country) && (
                  <option value={form.country}>{form.country} (existing value — pick from list to update)</option>
                )}
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
            <Field label="Has Website">
              <Select value={form.hasWebsite} onChange={(e) => set("hasWebsite", e.target.value)}>
                <option value="">Unknown</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </Select>
            </Field>
            <Field label="Monthly Marketing Budget">
              <Input type="number" value={form.monthlyBudget} onChange={(e) => set("monthlyBudget", e.target.value)} />
            </Field>
            <Field label="Quote Value">
              <Input type="number" value={form.quoteValue} onChange={(e) => set("quoteValue", e.target.value)} />
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
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
            <Button type="button" variant="secondary" onClick={() => router.push(`/leads/${id}`)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
