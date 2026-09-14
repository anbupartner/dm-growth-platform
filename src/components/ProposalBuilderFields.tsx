"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Card, CardHeader, Field, Input, Textarea, Badge, Select } from "@/components/ui";
import { groupServicesByCategory, type ProposalPackage, type ServicePackagesConfig } from "@/lib/pdf/proposal-types";
import { formatCurrencyDisplay } from "@/lib/calculations";
import { Star, Check } from "lucide-react";

// Numbered section navigation for the proposal builder — a sticky sidebar
// table-of-contents, part of the outline-numbered redesign of this builder
// (replacing the old flat, unnumbered stack of cards with no way to jump
// around). Sections are renumbered incrementally as the consultant confirms
// each part of their outline ("go one by one, test after completing"), so
// `number` is optional here: a section with a confirmed outline number shows
// a small numbered pill; one not yet renumbered shows a plain dot instead of
// a wrong or made-up number. `filled`/`optional` drive the small status dot
// (green = has content, grey = empty/omitted from the PDF) — omit `filled`
// entirely for a section with nothing to fill in (e.g. the Cover Page, which
// is always generated from Business/Consultant info, not its own field).
export interface ProposalNavSection {
  id: string;
  number?: string; // e.g. "1", "1.1" — only set once the consultant has confirmed this section's outline number
  label: string;
  note?: string; // small caption under the label, e.g. "Always included"
  filled?: boolean; // has content right now? omit for a section with no fill/blank state of its own
  optional?: boolean; // an empty optional section is expected/fine (just omitted from the PDF); an empty non-optional one is a gap
  // Marks this entry as a non-interactive group-title row (e.g. "2. Scope
  // of the project") rather than a jumpable subsection — the consultant's
  // own outline groups several numbered subsections under one such title.
  // Not clickable, no number pill/status dot; `id` only needs to be unique
  // for React's key, since there's no matching DOM section to scroll to.
  heading?: boolean;
}

export function ProposalSectionNav({ sections, activeId }: { sections: ProposalNavSection[]; activeId?: string }) {
  function jump(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return (
    <nav className="space-y-0.5" aria-label="Proposal sections">
      <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Proposal Sections
      </p>
      {sections.map((s) => {
        if (s.heading) {
          return (
            <div key={s.id} className="mt-3 mb-1 px-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 first:mt-0 first:border-t-0 first:pt-0">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          );
        }
        const active = activeId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => jump(s.id)}
            className={clsx(
              "w-full flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
              active
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {s.number ? (
              <span
                className={clsx(
                  "shrink-0 mt-0.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold tabular-nums h-4 min-w-[16px] px-1",
                  active
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                )}
              >
                {s.number}
              </span>
            ) : (
              <span className="shrink-0 mt-2 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            )}
            <span className="flex-1 leading-snug">
              {s.label}
              {s.note && <span className="block text-[10px] text-slate-400 dark:text-slate-500">{s.note}</span>}
            </span>
            {s.filled === true && (
              <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" title="Has content" />
            )}
            {s.filled === false && (
              <span
                className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700"
                title={s.optional ? "Empty — omitted from the PDF" : "Empty"}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

// Tracks which numbered section is currently in view, so the sidebar can
// highlight it as the consultant scrolls — same idea as a doc's live table
// of contents. Re-observes whenever the list of section ids changes (e.g.
// once the report finishes loading and the page has its real content), and
// picks the topmost section currently visible rather than the single
// section nearest mid-screen, so it stays stable while scrolling past a
// short section.
export function useSectionScrollSpy(ids: string[]): string | undefined {
  const [activeId, setActiveId] = useState<string | undefined>(ids[0]);

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join("|")]);

  return activeId;
}

// Generic defaults for the proposal-level Deliverables fields (Monthly/
// One-Time — shared once for the whole engagement, not per package) and a
// package's Discount Tiers field — same "always show every section"
// reasoning as the other default*Text() helpers in this file. The
// consultant can freely tailor this copy afterward.
export function defaultMonthlyDeliverablesText(): string {
  return [
    "Monthly Performance Report: campaign results, spend and key metrics.",
    "Ongoing Optimization: continuous management of live campaigns.",
  ].join("\n");
}
export function defaultOneTimeDeliverablesText(): string {
  return [
    "Onboarding & Account Setup: tracking, access and platform configuration.",
    "Initial Strategy Document: goals, audience and channel plan.",
  ].join("\n");
}
export function defaultDiscountTiersText(): string {
  return ["3 months: 5%", "6 months: 10%"].join("\n");
}

// Sorted, joined key used to test whether a package's checked services
// exactly match a configured tier's service list — order-independent set
// equality without pulling in a Set-comparison helper for one use.
function sortedKey(keys: string[]): string {
  return [...keys].sort().join("|");
}

function toggleKey(keys: string[], key: string): string[] {
  return keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
}

// The shared "priced packages + terms/validity" editing UI used by both the
// New Proposal flow (leads/[id]/proposal/new) and the Edit Proposal flow
// (leads/[id]/proposal/[proposalId]/edit) — kept as one component so the two
// flows can never drift apart on what "editable" means for a proposal
// (package name, price, description/scope, which one's recommended, terms
// text, and the valid-until date). The caller owns the actual `packages`
// array — this component only ever calls back with the same shape it was
// given, never invents or drops a field.

export function ProposalPackagesGrid({
  packages,
  onUpdate,
  onMarkRecommended,
  onAdd,
  onRemove,
  servicePackages,
}: {
  packages: ProposalPackage[];
  onUpdate: (index: number, patch: Partial<ProposalPackage>) => void;
  onMarkRecommended: (index: number) => void;
  // Optional — when omitted, no "+ Add Package"/"Remove package" controls are
  // shown at all (packages come purely from copied audit scenarios, as
  // before). Passed by both the New Proposal and Edit Proposal flows so a
  // lead with no audit/scenario data can still build a proposal from
  // scratch — see the Quick Proposal flow.
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  // Optional — the consultant's Settings-configured "Recommended Services &
  // Scope" list (master services + named pricing tiers). When present, each
  // package card gets a services checklist plus a "Load a preset" picker;
  // when absent (or the consultant hasn't configured any services/tiers
  // yet), the checklist is simply not shown — nothing about the existing
  // package fields changes.
  servicePackages?: ServicePackagesConfig | null;
}) {
  // Applies a configured tier's name/price/description/services onto one
  // package in one step — the tier is just the current template in
  // Settings; the package keeps its own frozen copy from this point on, so
  // editing the tier later never changes an already-built package.
  function applyTier(i: number, tierKey: string) {
    const tier = servicePackages?.tiers.find((t) => t.key === tierKey);
    if (!tier) return;
    const labels = tier.serviceKeys
      .map((k) => servicePackages?.services.find((s) => s.key === k)?.label)
      .filter((l): l is string => !!l);
    onUpdate(i, {
      label: tier.name,
      price: tier.price,
      description: tier.descriptionOverride || (labels.length ? labels.join(" + ") : undefined),
      selectedServiceKeys: tier.serviceKeys,
      selectedServiceLabels: labels,
    });
  }

  function toggleService(i: number, pkg: ProposalPackage, key: string) {
    const nextKeys = toggleKey(pkg.selectedServiceKeys ?? [], key);
    const labels = nextKeys
      .map((k) => servicePackages?.services.find((s) => s.key === k)?.label)
      .filter((l): l is string => !!l);
    onUpdate(i, { selectedServiceKeys: nextKeys, selectedServiceLabels: labels });
  }

  // Whether each package's Included-Services <details> is open, keyed by
  // package key. Defaults to open only while nothing's selected yet (so a
  // brand-new package starts ready to check boxes) — but once the consultant
  // has explicitly opened/closed it (recorded in this map via onToggle), that
  // choice sticks regardless of how many boxes get checked afterward. Without
  // this, deriving `open` straight from `selectedServiceKeys.length === 0` on
  // every render meant checking the very first box slammed the panel shut
  // mid-click, since React re-syncs a <details>'s `open` attribute to
  // whatever's passed each render.
  const [openServicesFor, setOpenServicesFor] = useState<Record<string, boolean>>({});
  function isServicesOpen(pkg: ProposalPackage): boolean {
    return openServicesFor[pkg.key] ?? (pkg.selectedServiceKeys?.length ?? 0) === 0;
  }

  // Group → Category → Services view of the master list, for the Included
  // Services picker below — with 100+ services across 16 categories, a
  // single flat wrapped chip list would be unusable, so it's sectioned the
  // same way as the Settings > Master Services List editor.
  const groupedServices = servicePackages ? groupServicesByCategory(servicePackages) : [];

  return (
    <div className="mb-4">
      <div className="mb-3">
        {/* "4.1 Pricing packages" — this card used to be mislabeled "2.2
            Recommended Services & Scope" — the consultant clarified that 2.2
            is the strategic recommendation write-up (see
            ProposalRecommendedServicesCard above), not the priced-package
            picker. This is purely a pricing editor: name, monthly price,
            description and included services per tier — feeding the PDF's
            Commercial Terms page. Upfront-commitment discount tiers used to
            live here too, but the consultant asked for them to be their own
            separate "4.2 Project Fee Discounts" section — see
            ProposalFeeDiscountsCard below. */}
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">4.1 Pricing packages</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Commercial Terms — packages the client can choose from (Foundation, Growth, Performance, or your own names) — name, monthly price, description and included services.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
      {packages.map((pkg, i) => {
        // A live suggestion: if the services currently checked exactly match
        // one configured tier's own service list, offer to apply that
        // tier's name/price in one click — but only once something is
        // actually checked, so a brand-new package doesn't show a
        // suggestion before the consultant has touched the checklist.
        const matchedTier =
          servicePackages && (pkg.selectedServiceKeys?.length ?? 0) > 0
            ? servicePackages.tiers.find((t) => t.serviceKeys.length > 0 && sortedKey(t.serviceKeys) === sortedKey(pkg.selectedServiceKeys ?? []))
            : undefined;
        return (
          <Card key={pkg.key} className={pkg.recommended ? "p-4 border-indigo-400 border-2" : "p-4"}>
            <div className="flex items-center justify-between mb-3">
              {pkg.recommended ? (
                <Badge className="bg-indigo-600 text-white">Recommended</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => onMarkRecommended(i)}
                  className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                >
                  <Star size={12} /> Mark recommended
                </button>
              )}
              {onRemove && (
                <button type="button" onClick={() => onRemove(i)} className="text-xs text-slate-400 hover:text-red-600">
                  Remove package
                </button>
              )}
            </div>
            <Field label="Package name">
              <Input value={pkg.label} onChange={(e) => onUpdate(i, { label: e.target.value })} />
            </Field>
            <div className="mt-3">
              <Field label={`Monthly price (${pkg.currency})`}>
                <Input type="number" min={0} value={pkg.price || ""} onChange={(e) => onUpdate(i, { price: Number(e.target.value) || 0 })} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Description" hint="What's included at this tier — add or edit points, adjust scope, freely.">
                <Textarea rows={3} value={pkg.description ?? ""} onChange={(e) => onUpdate(i, { description: e.target.value })} />
              </Field>
            </div>

            {servicePackages && servicePackages.services.length > 0 ? (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Services Included {(pkg.selectedServiceKeys?.length ?? 0) > 0 && `(${pkg.selectedServiceKeys!.length})`}
                  </p>
                  {servicePackages.tiers.length > 0 && (
                    <Select value="" onChange={(e) => e.target.value && applyTier(i, e.target.value)} className="w-auto text-xs py-1">
                      <option value="">Load a preset…</option>
                      {servicePackages.tiers.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.name} — {formatCurrencyDisplay(t.price, pkg.currency)}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                <details
                  className="space-y-2"
                  open={isServicesOpen(pkg)}
                  onToggle={(e) => {
                    // Read the native open/closed state synchronously — React
                    // pools this event, so grabbing it inside the setState
                    // updater below (which can run after the handler
                    // returns) reads a nulled-out currentTarget instead.
                    const nowOpen = e.currentTarget.open;
                    setOpenServicesFor((prev) => ({ ...prev, [pkg.key]: nowOpen }));
                  }}
                >
                  <summary className="cursor-pointer select-none text-[11px] text-indigo-600 dark:text-indigo-400 mb-1.5">
                    {(pkg.selectedServiceKeys?.length ?? 0) > 0 ? "Edit selected services" : "Choose services"}
                  </summary>
                  <div className="space-y-2">
                  {groupedServices.map(({ group, categories }) => {
                    const visibleCategories = categories.filter((c) => c.services.length > 0);
                    if (visibleCategories.length === 0) return null;
                    return (
                      <div key={group}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{group}</p>
                        <div className="space-y-1.5">
                          {visibleCategories.map(({ category, services }) => (
                            <div key={category.key}>
                              <p className="text-[10px] text-slate-400 mb-1">{category.label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {services.map((svc) => {
                                  const checked = (pkg.selectedServiceKeys ?? []).includes(svc.key);
                                  return (
                                    <button
                                      key={svc.key}
                                      type="button"
                                      onClick={() => toggleService(i, pkg, svc.key)}
                                      className={
                                        checked
                                          ? "text-[11px] px-2 py-1 rounded-full bg-indigo-600 text-white flex items-center gap-1"
                                          : "text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                                      }
                                    >
                                      {checked && <Check size={10} />}
                                      {svc.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </details>
                {matchedTier && (
                  <p className="text-xs text-emerald-600 mt-2">
                    Matches your &quot;{matchedTier.name}&quot; package ({formatCurrencyDisplay(matchedTier.price, pkg.currency)}/month).{" "}
                    <button type="button" className="underline" onClick={() => applyTier(i, matchedTier.key)}>
                      Use this price &amp; name
                    </button>
                  </p>
                )}
              </div>
            ) : null}

            {/* NOTE: Deliverables (Monthly/One-Time) intentionally has no
                fields on this card. It used to (below Services Included),
                but that meant the exact same scope-of-work text got typed
                once per package — confirmed from real proposal screenshots
                showing identical Monthly/One-Time Deliverables text repeated
                across all 3 pricing tiers. Deliverables is now one shared
                field for the whole proposal — see ProposalDeliverablesCard
                below — since every tier covers the same scope of work; only
                price and included services vary by package. */}
            {/* NOTE: Upfront-Commitment Discount Tiers intentionally has no
                field on this card either. It used to live here, but the
                consultant asked for "4.2 Project Fee Discounts" to be its
                own separate section, extracted from these package cards —
                see ProposalFeeDiscountsCard below. Still per-package
                internally (discount % genuinely varies by tier), just no
                longer editable from this card. */}
            {/* NOTE: KPI & Measurement Framework intentionally has no fields
                on this card. It used to show per-package projected numbers
                (Traffic/Leads/CPL/CAC/ROAS) here, but the consultant clarified
                that section 2.5 isn't about projected figures at all — it's
                a simple list of which platforms are in use and the important
                metrics that will be tracked for each (e.g. "SEO: Organic
                traffic, Referral, CTR, Impressions, Clicks, Backlinks"), with
                no numbers attached and not tied to any one pricing package.
                See ProposalKpiCard below — a shared platform/metrics list for
                the whole proposal, same "one thing, not one per package"
                reasoning as Deliverables above. The projected-figures
                fields that used to live on ProposalPackage were removed. */}
            {/* NOTE: this card used to end with a Customers/mo, Revenue/mo,
                ROI stat row here — the backing scenario's projected figures,
                shown purely as a builder-side reference underneath the
                editable price. Removed entirely at the consultant's request
                — it was never rendered on the actual Proposal PDF (confirmed
                via grep — ProposalDocument.tsx never reads
                customers/revenue/roi), so removing it drops no PDF-visible
                content. */}
          </Card>
        );
      })}
      </div>
      {packages.length === 0 && (
        <p className="text-xs text-slate-400 mb-3">No packages yet — add one below to start pricing this proposal.</p>
      )}
      {onAdd && (
        <button type="button" onClick={onAdd} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          + Add Package
        </button>
      )}
    </div>
  );
}

// "4.2 Project Fee Discounts" — ONE shared upfront-commitment discount
// schedule for the whole proposal, gated by an explicit "Discount available"
// checkbox. Originally built as a separate discountTiersText field per
// pricing package (mirroring how 2.5 KPI was pulled out of the package
// cards) — the consultant then clarified that a discount schedule isn't tied
// to which package the customer picks: whichever package they choose, the
// SAME schedule applies (a package's own price still changes the computed
// dollar amount, but that math happens on the PDF side — see
// ProposalDocument.tsx — not here). So this card no longer touches
// `packages` at all, and the whole section — checkbox included — either
// applies uniformly or is entirely absent, rather than "leave the text
// blank to omit" like every other optional section in this builder: the
// consultant specifically asked for an on/off checkbox so the section
// disappears deliberately, not by remembering to clear a field.
export function ProposalFeeDiscountsCard({
  available,
  onAvailableChange,
  tiersText,
  onTiersTextChange,
}: {
  available: boolean;
  onAvailableChange: (value: boolean) => void;
  tiersText: string;
  onTiersTextChange: (value: string) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="4.2 Project Fee Discounts"
        subtitle="One shared upfront-commitment discount schedule, applied uniformly no matter which package the client picks (the computed monthly amount still differs by package price on the generated PDF)."
      />
      <div className="pt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={available} onChange={(e) => onAvailableChange(e.target.checked)} />
          Discount available on this proposal
        </label>
        {available ? (
          <Field label="Discount Tiers" hint={`One per line as "N months: X%" — e.g. "3 months: 5%". Pre-filled with a generic starting point — edit freely.`}>
            <Textarea rows={3} value={tiersText} onChange={(e) => onTiersTextChange(e.target.value)} />
          </Field>
        ) : (
          <p className="text-xs text-slate-400">
            No discount section will appear on the PDF. Check the box above to offer an upfront-commitment discount.
          </p>
        )}
      </div>
    </Card>
  );
}

// Optional per-proposal override of "prepared by" identity — consultant
// name, company, phone, WhatsApp, email, website. These normally come from
// the report version this proposal was quoted from (frozen at the time
// that report was generated from Settings), which means a later Settings
// correction never reaches an already-generated proposal, and there was
// previously no way to send one specific proposal from a different name/
// contact. A field left blank here falls back to that report's own value —
// shown as the input's placeholder so it's clear what will actually appear
// on the PDF if nothing is typed.
export interface ConsultantOverrideValue {
  consultantName?: string;
  companyName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

export function ProposalConsultantCard({
  override,
  defaults,
  onChange,
}: {
  override: ConsultantOverrideValue;
  defaults?: {
    consultantName?: string;
    companyName?: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
  };
  onChange: (patch: Partial<ConsultantOverrideValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="Prepared By (this proposal)"
        subtitle="Overrides the name/company/contact shown on this proposal's cover page, header, footer and closing section. Leave any field blank to use your Settings default for it."
      />
      <div className="pt-4 grid sm:grid-cols-2 gap-4">
        <Field label="Consultant Name">
          <Input
            value={override.consultantName ?? ""}
            placeholder={defaults?.consultantName || "Your Name"}
            onChange={(e) => onChange({ consultantName: e.target.value })}
          />
        </Field>
        <Field label="Company / Brand">
          <Input
            value={override.companyName ?? ""}
            placeholder={defaults?.companyName || "Your Consultancy"}
            onChange={(e) => onChange({ companyName: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <Input value={override.phone ?? ""} placeholder={defaults?.phone ?? ""} onChange={(e) => onChange({ phone: e.target.value })} />
        </Field>
        <Field label="WhatsApp">
          <Input
            value={override.whatsapp ?? ""}
            placeholder={defaults?.whatsapp ?? ""}
            onChange={(e) => onChange({ whatsapp: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={override.email ?? ""}
            placeholder={defaults?.email ?? ""}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </Field>
        <Field label="Website">
          <Input value={override.website ?? ""} placeholder={defaults?.website ?? ""} onChange={(e) => onChange({ website: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}

// "5. Policies & Terms" — whole-engagement sections shown once on the
// proposal (not per package): 5.1 Revision, 5.2 Client Responsibilities, 5.3
// Not Included, modeled on a real reference SOW the consultant shared. Each
// is optional free text, one bullet per line; left blank, that section
// simply doesn't appear on the PDF — nothing is pre-filled or invented here.
// NOTE: this used to also carry a 4th field, "Communication" (a short line
// on how you'll stay in touch) — the consultant's 5.1-5.4 outline has no
// slot for it, and asked for it to be removed from the proposal entirely
// rather than folded into one of the 4 numbered items. Removed here; the DB
// column (pointOfContactText) is left in place but simply no longer read or
// written, same "harmless, simply no longer used" pattern as other removed
// fields in this file.
export interface ProposalPolicyValue {
  revisionPolicyText: string;
  clientResponsibilitiesText: string;
  notIncludedText: string;
}

// Generic, non-client-specific boilerplate for the 3 whole-engagement policy
// sections — same reasoning as defaultNextStepsText() below: these describe
// a universal policy stance, not this client's data, so they're shown
// pre-filled rather than blank (a real proposal was otherwise shipping with
// these 3 sections silently missing whenever the consultant hadn't typed
// anything into them — see the "always show every section" decision this
// fixes). The consultant can edit or clear any of them freely; clearing one
// omits that section, exactly as before.
export function defaultRevisionPolicyText(): string {
  return ["Up to 2 rounds of revisions per deliverable are included.", "Additional revision rounds are billed at the standard hourly rate."].join("\n");
}
export function defaultClientResponsibilitiesText(): string {
  return [
    "Timely feedback and approvals on deliverables.",
    "Access to required accounts/assets (website, analytics, ad accounts, social pages).",
    "A single point of contact for coordination.",
  ].join("\n");
}
export function defaultNotIncludedText(): string {
  return [
    "Website design/development beyond what's listed above.",
    "Content or copywriting beyond what's listed above.",
    "Paid ad spend (billed separately, directly to the ad platform).",
  ].join("\n");
}

// "5.4 Terms & conditions" (plus "Valid until", which has no outline number
// of its own but naturally belongs alongside the terms it governs) used to
// live on a separate "Terms & Validity" card (see the removed
// ProposalTermsCard) — merged into this card so all of "5. Policies & Terms"
// renders as one physical section, matching how the PDF already puts
// Revision/Client Responsibilities/Not Included/Terms & Conditions together
// on one Policies & Terms page.
export function ProposalPolicyCard({
  value,
  onChange,
  termsText,
  onTermsTextChange,
  validUntil,
  onValidUntilChange,
}: {
  value: ProposalPolicyValue;
  onChange: (patch: Partial<ProposalPolicyValue>) => void;
  termsText: string;
  onTermsTextChange: (value: string) => void;
  validUntil: string;
  onValidUntilChange: (value: string) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="5. Policies & Terms"
        subtitle="Whole-engagement sections shown once on the proposal, not per package. Pre-filled with common defaults — edit freely, or clear a field to omit it from the PDF."
      />
      <div className="pt-4 space-y-4">
        <Field label="5.1 Revision" hint="One bullet per line.">
          <Textarea
            rows={3}
            value={value.revisionPolicyText}
            onChange={(e) => onChange({ revisionPolicyText: e.target.value })}
            placeholder={"Blog/SEO optimization: 1 revision cycle where required\nWebpage creation: 2 revision rounds per page"}
          />
        </Field>
        <Field label="5.2 Client Responsibilities" hint="One bullet per line — what the client needs to provide.">
          <Textarea
            rows={3}
            value={value.clientResponsibilitiesText}
            onChange={(e) => onChange({ clientResponsibilitiesText: e.target.value })}
            placeholder={"Final content and images\nWebsite/CMS access where required\nBrand guidelines and logo assets"}
          />
        </Field>
        <Field label="5.3 Not Included" hint="One bullet per line — explicitly out of scope.">
          <Textarea
            rows={3}
            value={value.notIncludedText}
            onChange={(e) => onChange({ notIncludedText: e.target.value })}
            placeholder={"Paid advertising budget\nWebsite development beyond existing templates"}
          />
        </Field>
        <Field label="Valid until" hint="Leave blank for no expiry.">
          <Input type="date" value={validUntil} onChange={(e) => onValidUntilChange(e.target.value)} className="max-w-xs" />
        </Field>
        <Field label="5.4 Terms & conditions">
          <Textarea rows={6} value={termsText} onChange={(e) => onTermsTextChange(e.target.value)} />
        </Field>
      </div>
    </Card>
  );
}

// "Requirements" (outline 1.2 — its own numbered section, split out of the
// combined "Requirements & Strategy" card below) and "Digital Growth
// Strategy" (outline 2.1 — Attract → Engage → Convert → Retain). All
// optional free text, one bullet per line; a stage or the Requirements
// field left blank simply doesn't appear on the PDF. No existing report
// data covers these, so — unlike Executive Summary/Challenges/the 90-Day
// Roadmap, which reuse the report's own data automatically — this is
// genuinely new content only the consultant can provide.
export interface ProposalRequirementsValue {
  requirementsText: string;
}

export interface ProposalStrategyValue {
  strategyAttractText: string;
  strategyEngageText: string;
  strategyConvertText: string;
  strategyRetainText: string;
}

// Generic starting-point text for Requirements and the 4 Digital Growth
// Strategy stages — same reasoning as defaultNextStepsText() below: this is
// a real proposal was otherwise silently dropping the entire Requirements
// page (misleadingly titled "Requirements & Understanding" with no
// Requirements in it — see the fix for that) and the whole Digital Growth
// Strategy page whenever the consultant hadn't typed anything in yet. Shown
// pre-filled so both always render by default; freely editable, and
// clearing a field back to blank omits that piece exactly as before.
export function defaultRequirementsText(): string {
  return [
    "A mobile-friendly website with clear calls to action.",
    "Consistent lead flow from Google Search and paid channels.",
    "Brand presence and consistent posting across key social platforms.",
  ].join("\n");
}

// "1.2 Requirements" — its own numbered section (outline 1.1 Executive
// Summary / 1.2 Requirements / 1.3 Challenges & Opportunities all sit
// together at the top of the builder, right after Prepared By, matching the
// order they render in on the PDF). Used to live combined with Digital
// Growth Strategy in one "Requirements & Strategy" card — split out here so
// each numbered outline item has its own clearly-titled section, and so the
// builder's numbering can match the PDF's one item at a time.
export function ProposalRequirementsCard({
  value,
  onChange,
}: {
  value: ProposalRequirementsValue;
  onChange: (patch: Partial<ProposalRequirementsValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="1.2 Requirements"
        subtitle="Confirms what the client needs — shown once on the proposal. Pre-filled with a generic starting point — edit freely, or clear it to omit this section from the PDF."
      />
      <div className="pt-4">
        <Field label="Requirements" hint="One bullet per line — clearly confirm what the client needs.">
          <Textarea
            rows={3}
            value={value.requirementsText}
            onChange={(e) => onChange({ requirementsText: e.target.value })}
            placeholder={"A mobile-friendly website with clear calls to action\nConsistent lead flow from Google Search\nBrand presence across Instagram and Facebook"}
          />
        </Field>
      </div>
    </Card>
  );
}

export function defaultStrategyAttractText(): string {
  return ["SEO content targeting high-intent search terms.", "Paid search and social ads for immediate visibility."].join("\n");
}
export function defaultStrategyEngageText(): string {
  return ["Social media content calendar.", "Email/SMS nurture sequence for new leads."].join("\n");
}
export function defaultStrategyConvertText(): string {
  return ["Landing page and offer optimization.", "Clear calls to action across the funnel."].join("\n");
}
export function defaultStrategyRetainText(): string {
  return ["Post-purchase email and remarketing flows.", "Loyalty, reviews and referral offers."].join("\n");
}

export function ProposalStrategyCard({
  value,
  onChange,
}: {
  value: ProposalStrategyValue;
  onChange: (patch: Partial<ProposalStrategyValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="2.1 Digital Growth Strategy"
        subtitle="How you'll grow them (Attract → Engage → Convert → Retain) — shown once on the proposal. Pre-filled with a generic starting point — edit freely, or clear a field to omit it from the PDF."
      />
      <div className="pt-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Attract" hint="One bullet per line.">
              <Textarea
                rows={2}
                value={value.strategyAttractText}
                onChange={(e) => onChange({ strategyAttractText: e.target.value })}
                placeholder={"SEO content targeting high-intent search terms\nGoogle Ads for immediate visibility"}
              />
            </Field>
            <Field label="Engage" hint="One bullet per line.">
              <Textarea
                rows={2}
                value={value.strategyEngageText}
                onChange={(e) => onChange({ strategyEngageText: e.target.value })}
                placeholder={"Social media content calendar\nEmail nurture sequence"}
              />
            </Field>
            <Field label="Convert" hint="One bullet per line.">
              <Textarea
                rows={2}
                value={value.strategyConvertText}
                onChange={(e) => onChange({ strategyConvertText: e.target.value })}
                placeholder={"Landing page optimization\nClear calls to action and offers"}
              />
            </Field>
            <Field label="Retain" hint="One bullet per line.">
              <Textarea
                rows={2}
                value={value.strategyRetainText}
                onChange={(e) => onChange({ strategyRetainText: e.target.value })}
                placeholder={"Post-purchase email flows\nLoyalty and referral offers"}
              />
            </Field>
        </div>
      </div>
    </Card>
  );
}

// "2.2 Recommended Services & Scope" — a single consultant recommendation
// write-up, NOT a pricing/package editor. Given a client's stated
// requirement (e.g. "improve website visits"), this is where the consultant
// states that requirement and what they recommend doing to achieve it — in
// prose, one point per line, same simple pattern as 1.2 Requirements. This
// replaced an earlier version of this section that was wrongly tied to the
// pricing-package cards (name/price/services-included chips) — the
// consultant clarified that "Recommended Services & Scope" means the
// strategic recommendation itself, not which priced tier a client picks
// (that's Commercial Terms' job — see ProposalPackagesGrid below, moved out
// of this "Scope of the project" grouping entirely).
export interface ProposalRecommendedServicesValue {
  recommendedServicesText: string;
}

export function defaultRecommendedServicesText(): string {
  return [
    "Improve organic visibility and traffic through technical SEO and content optimization.",
    "Drive immediate qualified leads with targeted Google & Meta ad campaigns.",
    "Convert more of that traffic into customers with landing page and funnel optimization.",
    "Track and refine performance monthly against the KPIs defined below.",
  ].join("\n");
}

export function ProposalRecommendedServicesCard({
  value,
  onChange,
}: {
  value: ProposalRecommendedServicesValue;
  onChange: (patch: Partial<ProposalRecommendedServicesValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="2.2 Recommended Services & Scope"
        subtitle="What the client needs and what we recommend doing to achieve it — shown once on the proposal. Pre-filled with a generic starting point — edit freely, or clear it to omit this section from the PDF."
      />
      <div className="pt-4">
        <Field
          label="Recommendation"
          hint={`One point per line — start with the client's requirement/goal, then the services/approach recommended to achieve it. E.g. "Client wants more website visits -> recommend technical SEO plus targeted paid search to drive qualified traffic."`}
        >
          <Textarea
            rows={4}
            value={value.recommendedServicesText}
            onChange={(e) => onChange({ recommendedServicesText: e.target.value })}
            placeholder={"Improve organic visibility and traffic through technical SEO and content optimization\nDrive immediate qualified leads with targeted Google & Meta ad campaigns"}
          />
        </Field>
      </div>
    </Card>
  );
}

// Executive Summary ("What We Understand" / "The Opportunity" / "What We
// Recommend" / "Our Approach") — used to be computed live from the report
// snapshot every time; now its own editable, proposal-level field. The
// caller seeds these from the report's own data the moment a report version
// is selected (see leads/[id]/proposal/new/page.tsx), so the consultant
// opens the builder to real, pre-filled text — never a blank page — but can
// freely rewrite any part of it before generating.
// NOTE: this card intentionally has no "Key Problems" field. It used to
// (seeded from the same website-audit findings as Challenges &
// Opportunities' "What We Found"), which meant the exact same bullet list
// rendered twice on two different pages of a real generated proposal —
// confirmed from a real client PDF where "Meta Description: No meta
// description found." etc. appeared under both "What We Understand" and
// "What We Found". Removed here rather than from Challenges & Opportunities
// since the audit findings belong more naturally under Challenges.
export interface ProposalSummaryValue {
  currentSituationText: string;
  opportunityText: string;
  recommendedDirectionText: string;
  approachText: string;
}

export function ProposalSummaryCard({
  value,
  onChange,
}: {
  value: ProposalSummaryValue;
  onChange: (patch: Partial<ProposalSummaryValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="1.1 Executive Summary"
        subtitle="Seeded from the report — edit any part of it freely. Clearing a block omits it from the PDF."
      />
      <div className="pt-4 space-y-4">
        <Field label="What We Understand">
          <Textarea rows={3} value={value.currentSituationText} onChange={(e) => onChange({ currentSituationText: e.target.value })} />
        </Field>
        <Field label="The Opportunity">
          <Textarea rows={3} value={value.opportunityText} onChange={(e) => onChange({ opportunityText: e.target.value })} />
        </Field>
        <Field label="What We Recommend">
          <Textarea rows={3} value={value.recommendedDirectionText} onChange={(e) => onChange({ recommendedDirectionText: e.target.value })} />
        </Field>
        <Field label="Our Approach">
          <Textarea rows={3} value={value.approachText} onChange={(e) => onChange({ approachText: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}

// "Challenges & Opportunities" — same seeded-then-editable pattern as
// Executive Summary above. Optional: left blank, that half (or the whole
// section) is omitted from the PDF.
export interface ProposalChallengesValue {
  topProblemsText: string;
  competitorInsightsText: string;
}

export function ProposalChallengesCard({
  value,
  onChange,
}: {
  value: ProposalChallengesValue;
  onChange: (patch: Partial<ProposalChallengesValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="1.3 Challenges & Opportunities"
        subtitle="Seeded from the report's website audit and competitor findings — edit freely. Leave blank to omit (optional)."
      />
      <div className="pt-4 space-y-4">
        <Field label="What We Found" hint="One bullet per line.">
          <Textarea rows={3} value={value.topProblemsText} onChange={(e) => onChange({ topProblemsText: e.target.value })} />
        </Field>
        <Field label="Competitive Landscape" hint="One bullet per line.">
          <Textarea rows={3} value={value.competitorInsightsText} onChange={(e) => onChange({ competitorInsightsText: e.target.value })} />
        </Field>
      </div>
    </Card>
  );
}

// 90-Day Growth Roadmap — a dynamic list of phases (title + bullet items
// each), seeded from the report's own growthPlan when a report version is
// selected, then fully editable: rewrite any phase, add a new one, or
// remove one entirely. Real phase names/items only when seeded; a phase
// added by the consultant is exactly what they type, never invented.
export interface ProposalRoadmapPhase {
  title: string;
  itemsText: string;
}

export function ProposalRoadmapCard({
  phases,
  onChange,
}: {
  phases: ProposalRoadmapPhase[];
  onChange: (phases: ProposalRoadmapPhase[]) => void;
}) {
  function updatePhase(i: number, patch: Partial<ProposalRoadmapPhase>) {
    onChange(phases.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function removePhase(i: number) {
    onChange(phases.filter((_, j) => j !== i));
  }
  function addPhase() {
    onChange([...phases, { title: "", itemsText: "" }]);
  }

  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="2.4 90-Day Growth Roadmap"
        subtitle="Seeded from the report's growth plan — edit any phase, add one, or remove one. A phase left with no title is omitted."
      />
      <div className="pt-4 space-y-4">
        {phases.map((phase, i) => (
          <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Phase {i + 1}</p>
              <button
                type="button"
                onClick={() => removePhase(i)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remove phase
              </button>
            </div>
            <Field label="Phase Title" hint='e.g. "0–30 Days – Foundation"'>
              <Input value={phase.title} onChange={(e) => updatePhase(i, { title: e.target.value })} />
            </Field>
            <div className="mt-3">
              <Field label="Items" hint="One bullet per line.">
                <Textarea rows={3} value={phase.itemsText} onChange={(e) => updatePhase(i, { itemsText: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addPhase}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          + Add phase
        </button>
      </div>
    </Card>
  );
}

// "2.3 Tools & Resource Plan" (platforms/tools/team required — sits under
// "2. Scope of the project"). Optional free text, one bullet per line; left
// blank, that section/page simply doesn't appear on the PDF. No existing
// report data covers this, so — same as Requirements/Digital Growth Strategy
// above — it's a new consultant-entered field.
// NOTE: this card used to also carry a "KPI & Measurement Framework —
// Notes" field. Moved out to ProposalKpiCard below (outline 2.5, its own
// numbered section) so it doesn't share a card with 2.3's own content.
export interface ProposalScopeValue {
  toolsResourcePlanText: string;
}

// Generic starting-point text — a real proposal was otherwise silently
// dropping the entire Tools & Resource Plan page whenever the consultant
// hadn't typed anything in yet (see the "always show every section" fix).
export function defaultToolsResourcePlanText(): string {
  return [
    "Google Analytics 4 & Search Console for tracking.",
    "Meta Business Suite for social content & ads.",
    "CRM for lead management.",
    "Dedicated account manager + content team.",
  ].join("\n");
}

export function ProposalScopeCard({
  value,
  onChange,
}: {
  value: ProposalScopeValue;
  onChange: (patch: Partial<ProposalScopeValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="2.3 Tools & Resource Plan"
        subtitle="Platforms, tools and team/resources required — shown once on the proposal. Pre-filled with a generic starting point — edit freely, or clear it to omit this section."
      />
      <div className="pt-4">
        <Field label="Tools & Resource Plan" hint="One bullet per line.">
          <Textarea
            rows={4}
            value={value.toolsResourcePlanText}
            onChange={(e) => onChange({ toolsResourcePlanText: e.target.value })}
          />
        </Field>
      </div>
    </Card>
  );
}

// "2.5 KPI & Measurement Framework" — NOT projected numbers. Originally built
// as per-package projected stats (Traffic/Leads/CPL/CAC/ROAS seeded from the
// report scenario each package was built from), but the consultant clarified
// this section is about something else entirely: which platforms/channels
// are in use, and the important metrics that will be tracked for each —
// e.g. "SEO: Organic traffic, Referral, CTR, Impressions, Clicks,
// Backlinks" — no numbers, just what's being measured. A dynamic add/remove
// list of {platform, metricsText} pairs, same pattern as the 90-Day Roadmap's
// phase editor, plus the pre-existing optional whole-proposal notes field
// (unchanged). One shared list for the whole proposal, not per package —
// the platforms/metrics tracked don't vary by which pricing tier the client
// picks, same reasoning as the Deliverables migration above. The old
// per-package projected-figures fields were removed from ProposalPackage
// entirely (see the note on that interface in proposal-types.ts) — this
// section no longer touches `packages` at all.
export interface ProposalKpiPlatform {
  platform: string;
  metricsText: string;
}

// Generic starting point — real platform names and typical metric labels
// for each, no fabricated numbers anywhere. Freely editable: rewrite a
// platform's name/metrics, add one, or remove one entirely.
export function defaultKpiPlatforms(): ProposalKpiPlatform[] {
  return [
    { platform: "SEO", metricsText: "Organic traffic, Referral traffic, CTR, Impressions, Clicks, Backlinks" },
    { platform: "Paid Ads (Google/Meta)", metricsText: "Impressions, Clicks, CTR, CPC, Conversions" },
    { platform: "Social Media", metricsText: "Followers, Engagement Rate, Reach, Clicks" },
  ];
}

export function ProposalKpiCard({
  platforms,
  onChange,
  notesValue,
  onNotesChange,
}: {
  platforms: ProposalKpiPlatform[];
  onChange: (platforms: ProposalKpiPlatform[]) => void;
  notesValue: string;
  onNotesChange: (value: string) => void;
}) {
  function updatePlatform(i: number, patch: Partial<ProposalKpiPlatform>) {
    onChange(platforms.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }
  function removePlatform(i: number) {
    onChange(platforms.filter((_, j) => j !== i));
  }
  function addPlatform() {
    onChange([...platforms, { platform: "", metricsText: "" }]);
  }

  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="2.5 KPI & Measurement Framework"
        subtitle="Which platforms you're using and the important metrics you'll track for each — no projected values, just what will be measured. Edit any platform, add one, or remove one."
      />
      <div className="pt-4 space-y-4">
        {platforms.map((p, i) => (
          <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Platform {i + 1}</p>
              <button
                type="button"
                onClick={() => removePlatform(i)}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                Remove platform
              </button>
            </div>
            <Field label="Platform" hint='e.g. "SEO", "Paid Ads (Google/Meta)", "Social Media"'>
              <Input value={p.platform} onChange={(e) => updatePlatform(i, { platform: e.target.value })} />
            </Field>
            <div className="mt-3">
              <Field label="Metrics to track" hint="Comma-separated — e.g. Organic traffic, Referral, CTR, Impressions, Clicks, Backlinks">
                <Textarea rows={2} value={p.metricsText} onChange={(e) => updatePlatform(i, { metricsText: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addPlatform}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          + Add platform
        </button>
      </div>
      <div className="pt-4">
        <Field
          label="Measurement Framework Notes (optional)"
          hint="One bullet per line — context alongside the platforms/metrics above."
        >
          <Textarea
            rows={3}
            value={notesValue}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={"Reported monthly via a shared dashboard\nReviewed together in the monthly check-in call"}
          />
        </Field>
      </div>
    </Card>
  );
}

// Deliverables (outline section 3: 3.1 Monthly Deliverable / 3.2 One-Time
// Deliverable) — ONE shared field pair for the whole proposal, not one copy
// per pricing package. This used to live on each package card, which meant
// the exact same scope-of-work text got typed 3 times over (confirmed from a
// real proposal's screenshots showing identical Monthly/One-Time
// Deliverables text on every one of its 3 package cards) — every tier covers
// the same deliverables; only price and included services vary by package,
// and those already have their own place (the package card's price field and
// Services Included checklist). Pre-filled with a generic default (same
// pattern as Tools & Resource Plan/Next Steps) — edit freely, or clear a
// field to omit that half of the Deliverables page.
export interface ProposalDeliverablesValue {
  monthlyDeliverablesText: string;
  oneTimeDeliverablesText: string;
}

export function ProposalDeliverablesCard({
  value,
  onChange,
}: {
  value: ProposalDeliverablesValue;
  onChange: (patch: Partial<ProposalDeliverablesValue>) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="3. Deliverables"
        subtitle="Shown once for the whole proposal — the same scope of work applies regardless of which package the client picks. Pre-filled with a generic starting point — edit freely, or clear a field to omit it."
      />
      <div className="pt-4 space-y-4">
        <Field
          label="3.1 Monthly Deliverable"
          hint={`One per line as "Item: details" — e.g. "Blog Publishing: 4 posts/month, on-page SEO, CMS upload." Rendered as a table on the Deliverables page.`}
        >
          <Textarea
            rows={3}
            value={value.monthlyDeliverablesText}
            onChange={(e) => onChange({ monthlyDeliverablesText: e.target.value })}
          />
        </Field>
        <Field
          label="3.2 One-Time Deliverable"
          hint={`One per line as "Item: details" — e.g. "Website Audit: technical + on-page review, findings report." Rendered as a table on the Deliverables page.`}
        >
          <Textarea
            rows={3}
            value={value.oneTimeDeliverablesText}
            onChange={(e) => onChange({ oneTimeDeliverablesText: e.target.value })}
          />
        </Field>
      </div>
    </Card>
  );
}

// "Next Steps" — the document's closing section (Approval -> Kickoff ->
// Onboarding -> Access -> Execution). Unlike every other optional field
// above, this one describes a universal process rather than client-specific
// data, so it's shown pre-filled with a generic default rather than blank —
// same pattern as defaultTermsText() in the New Proposal page. The
// consultant can edit or clear it freely; clearing it omits the section.
// NOTE: keep this arrow-free ("->" not "→") — a literal "→" falls outside
// react-pdf's Helvetica/WinAnsi font and renders as a garbled glyph on the
// PDF. This exact bug has already been fixed twice in this codebase
// (ReportDocument.tsx and this file's own Digital Growth Strategy subtitle)
// — don't reintroduce it a third time.
export function defaultNextStepsText(): string {
  return [
    "Proposal approval & sign-off",
    "Kickoff call to confirm goals, timelines and points of contact",
    "Onboarding: brand, business and existing-asset walkthrough",
    "Access setup: website, analytics, ad accounts and social pages",
    "Execution begins per the 90-Day Growth Roadmap",
  ].join("\n");
}

export function ProposalNextStepsCard({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="p-5 mb-4">
      <CardHeader
        title="6. Next steps"
        subtitle="Closing section of the proposal. Pre-filled with a generic process — edit freely, or clear it to omit this section."
      />
      <div className="pt-4">
        <Field label="Next Steps" hint="One bullet per line.">
          <Textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} />
        </Field>
      </div>
    </Card>
  );
}

// NOTE: ProposalTermsCard (formerly its own "Terms & Validity" card) was
// merged into ProposalPolicyCard above as "5.4 Terms & conditions" plus
// "Valid until" — see the note there. This component was removed entirely
// rather than kept as a thin wrapper, so there's only one place that owns
// Terms & Validity's fields.
