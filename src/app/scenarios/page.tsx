"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Button, Spinner, EmptyState, LinkButton, Badge } from "@/components/ui";
import { formatCurrency, formatRoas, formatPercent, formatNumber } from "@/lib/calculations";
import { Trash2, Copy } from "lucide-react";

interface ScenarioRow {
  id: string;
  leadId: string;
  name: string;
  tier: string;
  adBudget: number;
  results: string;
  createdAt: string;
  updatedAt: string;
  businessName?: string;
  customerId?: string;
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
      <ScenariosInner />
    </Suspense>
  );
}

function ScenariosInner() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [scenarios, setScenarios] = useState<ScenarioRow[] | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const load = useCallback(() => {
    const url = leadId ? `/api/scenarios?leadId=${leadId}` : "/api/scenarios";
    api.get<ScenarioRow[]>(url).then(setScenarios);
  }, [leadId]);

  useEffect(() => load(), [load]);

  async function duplicate(s: ScenarioRow) {
    const parsed = JSON.parse(s.results);
    const paid = parsed.paid ?? parsed;
    await api.post("/api/scenarios", {
      leadId: s.leadId,
      name: `${s.name} (Copy)`,
      tier: "CUSTOM",
      adBudget: s.adBudget,
      cpc: paid.cpc ? s.adBudget / (paid.traffic || 1) : 1,
      leadConversionRate: 0,
      salesConversionRate: 0,
      avgSellingPrice: 0,
      profitMarginPct: 0,
    });
    load();
  }

  async function remove(id: string) {
    await api.del(`/api/scenarios/${id}`);
    load();
  }

  function toggleCompare(id: string) {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < 4 ? [...ids, id] : ids));
  }

  if (!scenarios) return <div className="flex justify-center py-20"><Spinner /></div>;

  const compareRows = scenarios.filter((s) => compareIds.includes(s.id));

  return (
    <div>
      <PageHeading title="Scenarios" subtitle="Manage budget and forecast scenarios. Select up to 4 to compare." />

      {scenarios.length === 0 ? (
        <EmptyState title="No scenarios yet" subtitle="Scenarios are created automatically when you run a New Assessment, or save one from a lead's forecast." action={<LinkButton href="/assessment/new">Run New Assessment</LinkButton>} />
      ) : (
        <>
          {compareRows.length > 0 && (
            <Card className="mb-6 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-sm font-semibold">Comparison — &quot;How could changing the marketing investment affect the forecast?&quot;</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2">Metric</th>
                      {compareRows.map((s) => <th key={s.id} className="text-left px-3 py-2">{s.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <CompareRow label="Budget" rows={compareRows} pick={(r) => formatCurrency(r.adBudget)} />
                    <CompareRow label="Traffic/Clicks" rows={compareRows} pick={(r) => formatNumber(JSON.parse(r.results).paid?.traffic ?? 0)} />
                    <CompareRow label="Leads" rows={compareRows} pick={(r) => formatNumber(JSON.parse(r.results).paid?.leads ?? 0)} />
                    <CompareRow label="Qualified Leads" rows={compareRows} pick={(r) => formatNumber(JSON.parse(r.results).paid?.qualifiedLeads ?? 0)} />
                    <CompareRow label="Customers" rows={compareRows} pick={(r) => formatNumber(JSON.parse(r.results).paid?.customers ?? 0)} />
                    <CompareRow label="Revenue" rows={compareRows} pick={(r) => formatCurrency(JSON.parse(r.results).paid?.revenue ?? 0)} />
                    <CompareRow label="CPL" rows={compareRows} pick={(r) => formatCurrency(JSON.parse(r.results).paid?.cpl ?? 0)} />
                    <CompareRow label="CAC" rows={compareRows} pick={(r) => formatCurrency(JSON.parse(r.results).paid?.cac ?? 0)} />
                    <CompareRow label="ROAS" rows={compareRows} pick={(r) => formatRoas(JSON.parse(r.results).paid?.roas ?? 0)} />
                    <CompareRow label="ROI" rows={compareRows} pick={(r) => formatPercent(JSON.parse(r.results).paid?.roi ?? 0)} />
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((s) => {
              const parsed = JSON.parse(s.results);
              const paid = parsed.paid ?? parsed;
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{s.name}</p>
                      {s.businessName && <p className="text-xs text-slate-400 truncate">{s.businessName}</p>}
                    </div>
                    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{s.tier}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-3 text-slate-500">
                    <span>Budget: {formatCurrency(s.adBudget)}</span>
                    <span>ROAS: {formatRoas(paid.roas ?? 0)}</span>
                    <span>Revenue: {formatCurrency(paid.revenue ?? 0)}</span>
                    <span>ROI: {formatPercent(paid.roi ?? 0)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input type="checkbox" checked={compareIds.includes(s.id)} onChange={() => toggleCompare(s.id)} />
                      Compare
                    </label>
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" onClick={() => duplicate(s)}><Copy size={13} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)}><Trash2 size={13} className="text-red-500" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CompareRow({ label, rows, pick }: { label: string; rows: ScenarioRow[]; pick: (r: ScenarioRow) => string }) {
  return (
    <tr>
      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{label}</td>
      {rows.map((r) => <td key={r.id} className="px-3 py-2 tabular-nums">{pick(r)}</td>)}
    </tr>
  );
}
