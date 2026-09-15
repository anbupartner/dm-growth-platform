import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Container, Eyebrow, SampleBadge, StatCard } from "@/components/marketing/ui";
import { CTASection } from "@/components/marketing/CTASection";
import { CASE_STUDIES, getCaseStudy } from "@/lib/marketing/case-studies";
import { getIndustryBySlug } from "@/lib/marketing/industries";
import { CaseStudyViewTracker } from "@/components/marketing/CaseStudyViewTracker";
import { IndustryViewTracker } from "@/components/marketing/IndustryViewTracker";

export function generateStaticParams() {
  return CASE_STUDIES.map((cs) => ({ industry: cs.industrySlug, caseSlug: cs.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string; caseSlug: string }>;
}): Promise<Metadata> {
  const { industry, caseSlug } = await params;
  const cs = getCaseStudy(industry, caseSlug);
  if (!cs) return {};
  return { title: cs.clientName, description: cs.challenge };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ industry: string; caseSlug: string }> }) {
  const { industry: industrySlug, caseSlug } = await params;
  const cs = getCaseStudy(industrySlug, caseSlug);
  const industry = getIndustryBySlug(industrySlug);
  if (!cs || !industry) notFound();

  return (
    <>
      <IndustryViewTracker industrySlug={industry.slug} industryName={industry.name} />
      <CaseStudyViewTracker clientName={cs.clientName} />

      <section className="pt-16 pb-10 sm:pt-24 sm:pb-12">
        <Container>
          <Eyebrow>{industry.name} Case Study</Eyebrow>
          {cs.isSample && (
            <div className="mt-3">
              <SampleBadge />
            </div>
          )}
          <h1 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white max-w-2xl">
            {cs.clientName}
          </h1>
          {cs.clientLocation && <p className="mt-2 text-slate-500 dark:text-slate-400">{cs.clientLocation}</p>}
        </Container>
      </section>

      {cs.results.length > 0 && (
        <section className="pb-14">
          <Container>
            <div className="grid sm:grid-cols-3 gap-4">
              {cs.results.map((r) => (
                <StatCard key={r.label} label={r.label} value={r.value} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="pb-16">
        <Container>
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                The Challenge
              </h2>
              <p className="mt-3 text-slate-700 dark:text-slate-200 leading-relaxed">{cs.challenge}</p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                The Approach
              </h2>
              <ol className="mt-3 space-y-3">
                {cs.approach.map((step, i) => (
                  <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-200">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </section>

      {cs.proofScreenshots.length > 0 ? (
        <section className="pb-16">
          <Container>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-4">
              Proof
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {cs.proofScreenshots.map((src) => (
                <div key={src} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <Image src={src} alt="Proof screenshot" width={800} height={600} className="w-full h-auto" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : (
        cs.isSample && (
          <section className="pb-16">
            <Container>
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-400">
                Add real proof screenshots to public/case-studies/ and list them in this case study&apos;s
                proofScreenshots array.
              </div>
            </Container>
          </section>
        )
      )}

      {cs.testimonial && (
        <section className="pb-16">
          <Container>
            <blockquote className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-8 text-lg text-slate-800 dark:text-slate-100 leading-relaxed">
              &ldquo;{cs.testimonial.quote}&rdquo;
              <footer className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                — {cs.testimonial.attribution}
              </footer>
            </blockquote>
          </Container>
        </section>
      )}

      <CTASection
        heading="Have a Similar Challenge?"
        ctaLabel="Discuss Your Business"
        href={`/contact?industry=${industry.slug}`}
      />
    </>
  );
}
