"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, Button, Field, Input, Textarea } from "@/components/ui";

// Quick upfront dialog shown from the "+ Business Audit" button on the
// dashboard. Asks the one question that determines the whole assessment
// workflow (spec section 2) before dropping into the full wizard, so the
// consultant never has to click through customer-detail fields just to
// answer Yes/No — and doesn't have to re-answer it once they get there.
export function BusinessAuditDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [choice, setChoice] = useState<"YES" | "NO" | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  function close() {
    setChoice(null);
    setWebsiteUrl("");
    setBusinessDescription("");
    onClose();
  }

  function go(hasWebsite: "YES" | "NO") {
    const params = new URLSearchParams({ hasWebsite });
    if (hasWebsite === "YES" && websiteUrl.trim()) params.set("websiteUrl", websiteUrl.trim());
    if (hasWebsite === "NO" && businessDescription.trim()) params.set("businessDescription", businessDescription.trim());
    router.push(`/assessment/new?${params.toString()}`);
    close();
  }

  return (
    <Modal open={open} onClose={close}>
      <div className="p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Business Audit</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Does this business already have a website?</p>

        {choice === null && (
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setChoice("YES")}
              className="flex-1 rounded-xl border-2 border-slate-200 p-4 text-left transition-colors hover:border-indigo-400 dark:border-slate-700"
            >
              <p className="font-semibold text-slate-900 dark:text-white">Yes</p>
              <p className="mt-0.5 text-xs text-slate-500">They have a website</p>
            </button>
            <button
              type="button"
              onClick={() => setChoice("NO")}
              className="flex-1 rounded-xl border-2 border-slate-200 p-4 text-left transition-colors hover:border-indigo-400 dark:border-slate-700"
            >
              <p className="font-semibold text-slate-900 dark:text-white">No</p>
              <p className="mt-0.5 text-xs text-slate-500">No website yet</p>
            </button>
          </div>
        )}

        {choice === "YES" && (
          <div className="space-y-4 pt-4">
            <Field label="Website URL" hint="We'll run a live audit on this in the next step.">
              <Input
                autoFocus
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://"
              />
            </Field>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setChoice(null)}>Back</Button>
              <Button onClick={() => go("YES")}>Continue →</Button>
            </div>
          </div>
        )}

        {choice === "NO" && (
          <div className="space-y-4 pt-4">
            <Field
              label="Tell us a bit about the business"
              hint="What do they sell, and what's the main goal — more leads, more sales, more awareness? We'll use this to propose the right next step."
            >
              <Textarea
                autoFocus
                rows={4}
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
              />
            </Field>
            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setChoice(null)}>Back</Button>
              <Button onClick={() => go("NO")}>Continue →</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
