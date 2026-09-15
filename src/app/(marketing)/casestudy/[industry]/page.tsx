import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Container, Eyebrow, SampleBadge } from "@/components/marketing/ui";
import { CTASection } from "@/components/marketing/CTASection";
import { INDUSTRIES, getIndustryBySlug } from "@/lib/marketing/industries";
import { getServiceByKey } from "@/lib/marketing/services";
import { getCaseStudiesForIndustry } from "@/lib/marketing/case-studies";
import { IndustryViewTracker } from "@/components/marketing/IndustryViewTracker";

export function generateStaticParams() {
  return INDUSTRIES.map((i) => ({ industry: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }): Promise<Metadata> {
  const { industry: slug } = await params;
  const industry = getIndustryBySlug(slug);
  if (!industry) return {};
  return { title: industry.headline, description: industry.intro };
}

export default async function IndustryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry: slug } = await params;
  const industry = getIndustryBySlug(slug);
  if (!industry) notFound();

  const caseStudies = getCaseStudiesForIndustry(industry.slug);
  const services = industry.relevantServices.map((key) => getServiceByKey(key)!);

  return (
    <>
      <IndustryViewTracker industrySlug={industry.slug} industryName={industry.name} />

      <section className="pt-16 pb-14 sm:pt-24 sm:pb-16">
        <Container>
          <Eyebrow>Industry</Eyebrow>
          <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white max-w-2xl">
            {industry.headline}
          </h1>
          <p className="mt-5 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">{industry.intro}</p>
        </Container>
      </section>

      <section className="pb-16 sm:pb-20">
        <Container>
          <div className="grid lg:grid-cols-2 gap-10">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Common Challenges
              </h2>
              <ul className="mt-4 space-y-3">
                {industry.commonChallenges.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Relevant Solutions
              </h2>
              <ul className="mt-4 space-y-3">
                {services.map((s) => (
                  <li key={s.key} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                    <Check size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      <span className="font-medium">{s.name}</span> — {s.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24 border-t border-slate-200 dark:border-slate-800 pt-16">
        <Container>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Relevant Case Studies
          </h2>

          {caseStudies.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                No {industry.name.toLowerCase()} case studies published yet.
              </p>
              <p className="mt-1.5 text-sm text-slate-400">
                Every case study here is real — nothing is fabricated to fill this page. Tell me about your business and
                I&apos;ll tell you what&apos;s realistic based on similar work.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid sm:grid-cols-2 gap-6">
              {caseStudies.map((cs) => (
                <Link
                  key={cs.slug}
                  href={`/casestudy/${industry.slug}/${cs.slug}`}
                  className="block rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-900 dark:hover:border-white transition-colors"
                >
                  {cs.isSample && <div className="mb-3">{<SampleBadge />}</div>}
                  <h3 className="font-semibold text-slate-900 dark:text-white">{cs.clientName}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{cs.challenge}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-white">
                    View case study <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </section>

      <CTASection
        heading="Have a Similar Challenge?"
        ctaLabel={`Discuss Your ${industry.name} Marketing`}
        href={`/contact?industry=${industry.slug}`}
      />
    </>
  );
}
