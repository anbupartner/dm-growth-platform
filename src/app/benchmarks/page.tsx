"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Input, Select, Button, Spinner, Badge, Field } from "@/components/ui";
import { BENCHMARK_DISCLAIMER } from "@/lib/constants";
import { Download, Upload, Plus, Ban, CheckCircle } from "lucide-react";

interface Benchmark {
  id: string;
  platform: string;
  industry: string;
  metric: string;
  campaignType?: string | null;
  value: number;
  unit: string;
  currency: string;
  region: string;
  source?: string | null;
  benchmarkYear?: string | null;
  version: number;
  status: string;
}

const EMPTY_FORM = { platform: "", industry: "", metric: "", campaignType: "", value: "", unit: "USD", currency: "USD", region: "Global", source: "", benchmarkYear: "" };

export default function BenchmarksPage() {
  const [rows, setRows] = useState<Benchmark[] | null>(null);
  const [filters, setFilters] = useState({ platform: "", industry: "", metric: "", status: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [importing, setImporting] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    api.get<Benchmark[]>(`/api/benchmarks?${params.toString()}`).then(setRows);
  }, [filters]);

  useEffect(() => load(), [load]);

  const platforms = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.platform))).sort(), [rows]);
  const industries = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.industry))).sort(), [rows]);
  const metrics = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.metric))).sort(), [rows]);

  async function addBenchmark(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/benchmarks", { ...form, value: Number(form.value) });
    setForm(EMPTY_FORM);
    setShowForm(false);
    load();
  }

  async function toggleStatus(b: Benchmark) {
    await api.patch(`/api/benchmarks/${b.id}`, { status: b.status === "active" ? "disabled" : "active" });
    load();
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    await fetch("/api/benchmarks/import", { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
    setImporting(false);
    load();
    e.target.value = "";
  }

  return (
    <div>
      <PageHeading
        title="Benchmark Database"
        subtitle="Externally managed reference data — never hard-coded into the calculation engine."
        action={
          <div className="flex flex-wrap gap-2">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this downloads a file attachment, not a page navigation */}
            <a href="/api/benchmarks/export">
              <Button variant="secondary" size="sm"><Download size={14} /> Export CSV</Button>
            </a>
            <label>
              <Button variant="secondary" size="sm" type="button" disabled={importing} onClick={() => document.getElementById("import-input")?.click()}>
                <Upload size={14} /> {importing ? "Importing…" : "Import"}
              </Button>
              <input id="import-input" type="file" accept=".csv,.json" className="hidden" onChange={handleImport} />
            </label>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}><Plus size={14} /> Add Benchmark</Button>
          </div>
        }
      />

      {showForm && (
        <Card className="p-4 mb-4">
          <form onSubmit={addBenchmark} className="grid sm:grid-cols-4 gap-3">
            <Field label="Platform"><Input required value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} /></Field>
            <Field label="Industry"><Input required value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} /></Field>
            <Field label="Metric"><Input required value={form.metric} onChange={(e) => setForm((f) => ({ ...f, metric: e.target.value }))} placeholder="CPC, CTR, CVR, CPA…" /></Field>
            <Field label="Campaign Type"><Input value={form.campaignType} onChange={(e) => setForm((f) => ({ ...f, campaignType: e.target.value }))} /></Field>
            <Field label="Value"><Input required type="number" step="0.01" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} /></Field>
            <Field label="Unit"><Input required value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} /></Field>
            <Field label="Currency"><Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} /></Field>
            <Field label="Region"><Input value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} /></Field>
            <Field label="Source"><Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} /></Field>
            <Field label="Benchmark Year"><Input value={form.benchmarkYear} onChange={(e) => setForm((f) => ({ ...f, benchmarkYear: e.target.value }))} /></Field>
            <div className="sm:col-span-4">
              <Button type="submit" size="sm">Save Benchmark</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filters.platform} onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))} className="w-auto">
          <option value="">All Platforms</option>
          {platforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={filters.industry} onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))} className="w-auto">
          <option value="">All Industries</option>
          {industries.map((i) => <option key={i} value={i}>{i}</option>)}
        </Select>
        <Select value={filters.metric} onChange={(e) => setFilters((f) => ({ ...f, metric: e.target.value }))} className="w-auto">
          <option value="">All Metrics</option>
          {metrics.map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="w-auto">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="superseded">Superseded</option>
        </Select>
      </div>

      {!rows ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Platform</th>
                  <th className="px-3 py-2 font-medium">Industry</th>
                  <th className="px-3 py-2 font-medium">Metric</th>
                  <th className="px-3 py-2 font-medium hidden sm:table-cell">Type</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium hidden md:table-cell">Region</th>
                  <th className="px-3 py-2 font-medium hidden lg:table-cell">Version</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2">{b.platform}</td>
                    <td className="px-3 py-2">{b.industry}</td>
                    <td className="px-3 py-2">{b.metric}</td>
                    <td className="px-3 py-2 hidden sm:table-cell text-slate-400">{b.campaignType ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{b.value} {b.unit}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-slate-400">{b.region}</td>
                    <td className="px-3 py-2 hidden lg:table-cell text-slate-400">v{b.version}</td>
                    <td className="px-3 py-2">
                      <Badge className={b.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>{b.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="ghost" onClick={() => toggleStatus(b)}>
                        {b.status === "active" ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-400 mt-4">{BENCHMARK_DISCLAIMER}</p>
    </div>
  );
}
