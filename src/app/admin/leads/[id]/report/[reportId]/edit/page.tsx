"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { PageHeading, Card, CardHeader, Field, Input, Textarea, Button, LinkButton, Spinner } from "@/components/ui";
import type { ReportData } from "@/lib/pdf/types";
import { Download, Plus, X as XIcon } from "lucide-react";

interface ReportSnapshotRow {
  id: string;
  leadId: string;
  version: number;
  pdfFileName?: string | null;
  createdAt: string;
  reportData: string | null;
}

// Editable structured fields only — the narrative/persuasion text a
// consultant is most likely to want to polish before sending. Numbers,
// scores, scenarios and sample ads are left as read-only, computed from the
// assessment/scenario engine rather than hand-edited here (re-running the
// assessment is the right way to change those) — this matches the
// "structured fields" scope decided for this feature.
function StringListEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</span>
      {hint && <span className="block text-[11px] text-slate-400 mb-2">{hint}</span>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-start">
            <Textarea
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              rows={2}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              title="Remove"
            >
              <XIcon size={14} />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => onChange([...items, ""])}>
        <Plus size={14} /> Add
      </Button>
    </div>
  );
}

export default function EditReportPage() {
  const params = useParams();
  const leadId = params.id as string;
  const reportId = params.reportId as string;

  const [row, setRow] = useState<ReportSnapshotRow | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState("");

  useEffect(() => {
    if (!reportId) return;
    api
      .get<ReportSnapshotRow>(`/api/reports/${reportId}`)
      .then((r) => {
        setRow(r);
        if (r.reportData) {
          setData(JSON.parse(r.reportData) as ReportData);
        } else {
          setLoadError("This report version predates editable/proposal support, so it has no saved editable content. Generate a new report to get an editable version.");
        }
      })
      .catch((e) => setLoadError((e as Error).message));
  }, [reportId]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function downloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = pdfFilename || "report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function save() {
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/reports/${reportId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: data }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Save failed.");
      }
      const version = res.headers.get("X-Report-Version");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfFilename(`${data.business.businessName || "report"}-v${version ?? ""}.pdf`);
      setSavedVersion(version ? Number(version) : null);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loadError && !data) {
    return (
      <div>
        <PageHeading title="Edit Report" />
        <Card className="p-5">
          <p className="text-sm text-amber-600">{loadError}</p>
          <LinkButton href={`/admin/leads/${leadId}`} variant="secondary" className="mt-4">
            ← Back to Lead
          </LinkButton>
        </Card>
      </div>
    );
  }

  if (!data || !row) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeading
        title={`Edit Report — v${row.version}`}
        subtitle={`${data.business.businessName} · ${data.business.customerName} · saving creates a new version, this one is untouched`}
        action={
          <LinkButton href={`/admin/leads/${leadId}`} variant="secondary" size="sm">
            ← Back to Lead
          </LinkButton>
        }
      />

      {savedVersion ? (
        <Card className="p-4 mb-4 border-emerald-300 dark:border-emerald-700">
          <p className="text-sm text-emerald-600 font-medium mb-3">
            Saved as v{savedVersion} — the PDF is ready to download. This new version is now what gets used for proposals.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={downloadPdf}>
              <Download size={16} /> Download PDF v{savedVersion}
            </Button>
            <LinkButton href={`/admin/leads/${leadId}/proposal/new`} variant="secondary">
              Generate Proposal from this version →
            </LinkButton>
            <LinkButton href={`/admin/leads/${leadId}`} variant="ghost">
              Go to Lead
            </LinkButton>
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        <Card>
          <CardHeader title="Executive Summary" subtitle="Shown on the report's cover page." />
          <div className="p-4 space-y-4">
            <Field label="Current Situation">
              <Textarea
                rows={3}
                value={data.executiveSummary.currentSituation}
                onChange={(e) => setData({ ...data, executiveSummary: { ...data.executiveSummary, currentSituation: e.target.value } })}
              />
            </Field>
            <StringListEditor
              label="Key Problems Affecting Growth"
              items={data.executiveSummary.problems}
              onChange={(problems) => setData({ ...data, executiveSummary: { ...data.executiveSummary, problems } })}
            />
            <Field label="Biggest Growth Opportunity">
              <Textarea
                rows={3}
                value={data.executiveSummary.biggestOpportunity}
                onChange={(e) => setData({ ...data, executiveSummary: { ...data.executiveSummary, biggestOpportunity: e.target.value } })}
              />
            </Field>
            <Field label="Recommended Direction">
              <Textarea
                rows={3}
                value={data.executiveSummary.recommendedDirection}
                onChange={(e) => setData({ ...data, executiveSummary: { ...data.executiveSummary, recommendedDirection: e.target.value } })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Problem -> Solution -> Result" subtitle="The persuasive narrative page, right after the cover." />
          <div className="p-4 space-y-4">
            <Field label="1 · The Problem">
              <Textarea
                rows={3}
                value={data.problemSolutionStory.problem}
                onChange={(e) => setData({ ...data, problemSolutionStory: { ...data.problemSolutionStory, problem: e.target.value } })}
              />
            </Field>
            <Field label="2 · The Solution">
              <Textarea
                rows={3}
                value={data.problemSolutionStory.solution}
                onChange={(e) => setData({ ...data, problemSolutionStory: { ...data.problemSolutionStory, solution: e.target.value } })}
              />
            </Field>
            <Field label="3 · The Result">
              <Textarea
                rows={3}
                value={data.problemSolutionStory.expectedResult}
                onChange={(e) => setData({ ...data, problemSolutionStory: { ...data.problemSolutionStory, expectedResult: e.target.value } })}
              />
            </Field>
            <Field label="Our Approach (shown on the closing page)">
              <Textarea
                rows={3}
                value={data.problemSolutionStory.strategy}
                onChange={(e) => setData({ ...data, problemSolutionStory: { ...data.problemSolutionStory, strategy: e.target.value } })}
              />
            </Field>
            <Field label="Growth Plan subtitle (shown above the 30/60/90 timeline)">
              <Textarea
                rows={2}
                value={data.problemSolutionStory.execution}
                onChange={(e) => setData({ ...data, problemSolutionStory: { ...data.problemSolutionStory, execution: e.target.value } })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="30 / 60 / 90-Day Growth Plan" />
          <div className="p-4 space-y-5">
            {data.growthPlan.map((phase, i) => (
              <div key={i}>
                <Field label={`Phase ${i + 1} name`}>
                  <Input
                    value={phase.phase}
                    onChange={(e) => {
                      const growthPlan = [...data.growthPlan];
                      growthPlan[i] = { ...growthPlan[i], phase: e.target.value };
                      setData({ ...data, growthPlan });
                    }}
                  />
                </Field>
                <div className="mt-2">
                  <StringListEditor
                    label="Tasks"
                    items={phase.items}
                    onChange={(items) => {
                      const growthPlan = [...data.growthPlan];
                      growthPlan[i] = { ...growthPlan[i], items };
                      setData({ ...data, growthPlan });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Competitor Insights" />
          <div className="p-4">
            <StringListEditor
              label="Insights & Recommendations"
              items={data.competitorInsights}
              onChange={(competitorInsights) => setData({ ...data, competitorInsights })}
            />
          </div>
        </Card>
      </div>

      {saveError && <p className="text-sm text-red-600 mt-4">{saveError}</p>}
      <div className="sticky bottom-4 mt-6 flex justify-end">
        <Button onClick={save} disabled={saving} size="md">
          {saving ? "Saving…" : "Save as New Version"}
        </Button>
      </div>
    </div>
  );
}
