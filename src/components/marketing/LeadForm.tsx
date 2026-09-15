"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { CTAButton } from "./ui";
import { INDUSTRIES } from "@/lib/marketing/industries";
import { MARKETING_GOALS, BUDGET_RANGES } from "@/lib/marketing/lead-schema";
import { getAttributionSnapshot } from "@/lib/marketing/attribution";
import { useSelectedIndustry } from "./IndustryContext";
import { submitLead, type SubmitLeadResult } from "@/app/actions/submit-lead";

interface FormState {
  name: string;
  company: string;
  industry: string;
  businessGoal: string;
  budget: string;
  message: string;
  email: string;
  phone: string;
  website: string;
  honeypot: string;
}

const STEPS = ["About you", "Industry", "Goal", "Budget", "Challenge", "Contact"];

function emptyState(initialIndustry: string): FormState {
  return {
    name: "",
    company: "",
    industry: initialIndustry,
    businessGoal: "",
    budget: "",
    message: "",
    email: "",
    phone: "",
    website: "",
    honeypot: "",
  };
}

export function LeadForm({ initialIndustryName }: { initialIndustryName?: string }) {
  const { selectedIndustry } = useSelectedIndustry();
  const prefillIndustry = initialIndustryName ?? INDUSTRIES.find((i) => i.slug === selectedIndustry)?.name ?? "";

  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormState>(() => emptyState(prefillIndustry));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitLeadResult | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    if (step === 0 && values.name.trim().length < 2) e.name = "Enter your name.";
    if (step === 1 && !values.industry) e.industry = "Select your industry.";
    if (step === 2 && !values.businessGoal) e.businessGoal = "Select what you're looking to improve.";
    if (step === 5 && !/^\S+@\S+\.\S+$/.test(values.email)) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleSubmit() {
    if (!validateStep()) return;
    const attribution = getAttributionSnapshot();
    startTransition(async () => {
      const res = await submitLead({
        ...values,
        landingPage: attribution.landingPage,
        caseStudyViewed: attribution.caseStudyViewed,
        industryViewed: attribution.industryViewed,
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        utmTerm: attribution.utmTerm,
        utmContent: attribution.utmContent,
      });
      if (!res.ok && res.fieldErrors) setErrors(res.fieldErrors);
      setResult(res);
    });
  }

  if (result?.ok) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center">
        <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
        <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Thanks — let&apos;s explore the opportunity.
        </h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-md mx-auto">
          Your requirements have been received. I&apos;ll review the details and get back to you shortly.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <CTAButton href="/industries">Explore Case Studies →</CTAButton>
          <CTAButton href="/services" variant="secondary">
            View Services →
          </CTAButton>
          <CTAButton href="/" variant="ghost">
            Back to Home
          </CTAButton>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-10">
      <div className="flex items-center gap-1.5 mb-8">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-slate-800"}`}
          />
        ))}
      </div>

      {/* Honeypot — visually hidden from real visitors (clipped to nothing,
          not `display:none`/`hidden`, since some spam bots skip fields
          they can detect as display:none) without expanding the page's
          scrollable area the way an off-screen absolute position would. */}
      <div
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" }}
        aria-hidden="true"
      >
        <label>
          Leave this field blank
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.honeypot}
            onChange={(e) => update("honeypot", e.target.value)}
          />
        </label>
      </div>

      {step === 0 && (
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">What is your name?</h3>
          <input
            autoFocus
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Your name"
            className="mt-4 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-base focus:border-slate-900 dark:focus:border-white focus:outline-none"
          />
          {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name}</p>}
          <p className="mt-6 text-sm font-medium text-slate-500 dark:text-slate-400">What company do you represent?</p>
          <input
            value={values.company}
            onChange={(e) => update("company", e.target.value)}
            placeholder="Company (optional)"
            className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-base focus:border-slate-900 dark:focus:border-white focus:outline-none"
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Which industry are you in?</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...INDUSTRIES.map((i) => i.name), "Other"].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => update("industry", name)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  values.industry === name
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {errors.industry && <p className="mt-2 text-sm text-red-500">{errors.industry}</p>}
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">What are you looking to improve?</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {MARKETING_GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => update("businessGoal", goal)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  values.businessGoal === goal
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white"
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
          {errors.businessGoal && <p className="mt-2 text-sm text-red-500">{errors.businessGoal}</p>}
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">What&apos;s your approximate monthly marketing budget?</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {BUDGET_RANGES.map((budget) => (
              <button
                key={budget}
                type="button"
                onClick={() => update("budget", budget)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  values.budget === budget
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white"
                }`}
              >
                {budget}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">Optional — helps me suggest something realistic.</p>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Tell me about your challenge</h3>
          <textarea
            value={values.message}
            onChange={(e) => update("message", e.target.value)}
            placeholder="What's not working right now, or what are you hoping to achieve?"
            rows={5}
            className="mt-4 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-base focus:border-slate-900 dark:focus:border-white focus:outline-none"
          />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">How can I reach you?</h3>
          <div>
            <input
              type="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-base focus:border-slate-900 dark:focus:border-white focus:outline-none"
            />
            {errors.email && <p className="mt-1.5 text-sm text-red-500">{errors.email}</p>}
          </div>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="Phone (optional)"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-base focus:border-slate-900 dark:focus:border-white focus:outline-none"
          />
          {errors.phone && <p className="-mt-3 text-sm text-red-500">{errors.phone}</p>}
          <input
            type="text"
            value={values.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="Website (optional)"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-3 text-base focus:border-slate-900 dark:focus:border-white focus:outline-none"
          />
          {errors.website && <p className="-mt-3 text-sm text-red-500">{errors.website}</p>}
          {result && !result.ok && !result.fieldErrors && <p className="text-sm text-red-500">{result.error}</p>}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <span />
        )}

        {step < STEPS.length - 1 ? (
          <CTAButton onClick={next}>
            Continue <ArrowRight size={16} />
          </CTAButton>
        ) : (
          <CTAButton onClick={handleSubmit} className={pending ? "opacity-60 pointer-events-none" : ""}>
            {pending ? "Sending…" : "Start a Conversation →"}
          </CTAButton>
        )}
      </div>
    </div>
  );
}
