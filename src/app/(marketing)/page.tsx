"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, CTAButton, Eyebrow, Pill, SampleBadge } from "@/components/marketing/ui";
import { CTASection } from "@/components/marketing/CTASection";
import { INDUSTRIES } from "@/lib/marketing/industries";
import { SERVICES } from "@/lib/marketing/services";
import { CASE_STUDIES } from "@/lib/marketing/case-studies";
import { useSelectedIndustry } from "@/components/marketing/IndustryContext";
import { usePresentationSlideNav } from "@/components/marketing/PresentationMode";

const SERVICE_TAGS = ["SEO", "Performance Marketing", "Lead Generation", "CRO", "Marketing Strategy", "Analytics", "CRM Automation"];

export default function HomePage() {
  usePresentationSlideNav();
  const { selectedIndustry } = useSelectedIndustry();
  const currentIndustry = INDUSTRIES.find((i) => i.slug === selectedIndustry);
  const helpServices = (currentIndustry ? currentIndustry.relevantServices : SERVICES.slice(0, 4).map((s) => s.key)).map(
    (key) => SERVICES.find((s) => s.key === key)!
  );

  return (
    <>
      {/* 1. Hero — Who I am / What I do */}
      <section data-slide className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <Container>
          <Eyebrow>Digital Marketing Consultant</Eyebrow>
          <h1 className="mt-4 text-4xl sm:text-6xl font-semibold tracking-tight text-slate-900 dark:text-white max-w-4xl">
            Digital Marketing That Creates Business Growth
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl">
            I help D2C, B2C and B2B businesses improve visibility, generate qualified leads, increase conversions and
            build measurable digital growth systems.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {SERVICE_TAGS.map((tag) => (
              <Pill key={tag}>{tag}</Pill>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <CTAButton href="/contact" size="lg">
              Discuss Your Business <ArrowRight size={16} />
            </CTAButton>
            <CTAButton href="/industries" variant="secondary" size="lg">
              See Relevant Work
            </CTAButton>
          </div>
        </Container>
      </section>

      {/* 2. What I do — services strip */}
      <section data-slide className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800">
        <Container>
          <Eyebrow>What I Do</Eyebrow>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Growth systems, not one-off campaigns
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map((service) => (
              <div key={service.key} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white">{service.name}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{service.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CTASection heading="Need Help With Your Marketing?" ctaLabel="Discuss Your Business" />

      {/* 3. Choose your industry */}
      <section data-slide id="industries" className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800">
        <Container>
          <Eyebrow>Relevant Experience</Eyebrow>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white max-w-2xl">
            Don&apos;t just take my word for it — choose your industry
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl">
            See the work, results and proof relevant to businesses like yours.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {INDUSTRIES.map((industry) => (
              <Link
                key={industry.slug}
                href={`/casestudy/${industry.slug}`}
                className="rounded-full border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-slate-900 hover:text-slate-900 dark:hover:border-white dark:hover:text-white transition-colors"
              >
                {industry.name}
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. How I Can Help Your Business — dynamic on selected industry */}
      <section data-slide className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
        <Container>
          <Eyebrow>{currentIndustry ? currentIndustry.name : "For Your Business"}</Eyebrow>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            How I Can Help Your Business
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl">
            {currentIndustry
              ? `Based on common ${currentIndustry.name.toLowerCase()} challenges, here's where I can help:`
              : "Pick your industry above, or get in touch and I'll point to what's most relevant."}
          </p>
          <ul className="mt-8 grid sm:grid-cols-2 gap-3 max-w-2xl">
            {helpServices.map((service) => (
              <li key={service.key} className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                <span className="font-medium">{service.name}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <CTAButton href="/contact" size="lg">
              Discuss My Business
            </CTAButton>
          </div>
        </Container>
      </section>

      {/* 5. Results / proof */}
      <section data-slide className="py-16 sm:py-24 border-t border-slate-200 dark:border-slate-800">
        <Container>
          <Eyebrow>Proof</Eyebrow>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Real work, real results
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 gap-6">
            {CASE_STUDIES.map((cs) => (
              <Link
                key={cs.slug}
                href={`/casestudy/${cs.industrySlug}/${cs.slug}`}
                className="block rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-slate-900 dark:hover:border-white transition-colors"
              >
                {cs.isSample && <div className="mb-3">{<SampleBadge />}</div>}
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                  {INDUSTRIES.find((i) => i.slug === cs.industrySlug)?.name}
                </p>
                <h3 className="mt-2 font-semibold text-slate-900 dark:text-white">{cs.clientName}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{cs.challenge}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-white">
                  View case study <ArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <CTASection heading="Want Similar Results?" subtext="Tell me about your business and I'll tell you what's realistic." />

      {/* 6. Let's work together — closing slide */}
      <section data-slide className="py-20 sm:py-28 border-t border-slate-200 dark:border-slate-800">
        <Container className="text-center">
          <Eyebrow>Let&apos;s Work Together</Eyebrow>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Ready to build your growth system?
          </h2>
          <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            A short conversation is all it takes to find out what&apos;s realistic for your business.
          </p>
          <div className="mt-8">
            <CTAButton href="/contact" size="lg">
              Discuss Your Business
            </CTAButton>
          </div>
        </Container>
      </section>
    </>
  );
}
