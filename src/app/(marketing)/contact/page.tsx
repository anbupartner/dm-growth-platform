"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Container, Eyebrow } from "@/components/marketing/ui";
import { LeadForm } from "@/components/marketing/LeadForm";
import { getIndustryBySlug } from "@/lib/marketing/industries";

function ContactFormWithParams() {
  const searchParams = useSearchParams();
  const industrySlug = searchParams.get("industry") ?? undefined;
  const industryName = industrySlug ? getIndustryBySlug(industrySlug)?.name : undefined;
  return <LeadForm initialIndustryName={industryName} />;
}

export default function ContactPage() {
  return (
    <section className="pt-16 pb-24 sm:pt-24 sm:pb-32">
      <Container className="max-w-2xl">
        <Eyebrow>Get in Touch</Eyebrow>
        <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Let&apos;s Talk About Your Business
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Tell me a little about your business and your current growth challenge.
        </p>

        <div className="mt-10">
          <Suspense fallback={<div className="h-96 rounded-3xl border border-slate-200 dark:border-slate-800 animate-pulse" />}>
            <ContactFormWithParams />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
