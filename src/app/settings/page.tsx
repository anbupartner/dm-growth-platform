"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { PageHeading, Card, Field, Input, Textarea, Button, Spinner, Select } from "@/components/ui";
import { CURRENCIES } from "@/lib/constants";
import { DEFAULT_SERVICE_PACKAGES, type ServicePackagesConfig } from "@/lib/pdf/proposal-types";
import { Trash2, BellRing } from "lucide-react";

interface Settings {
  consultantName: string;
  companyName: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  linkedin: string;
  address: string;
  reportFooter: string;
  ctaText: string;
  currency: string;
  defaultQualificationRate: number;
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number | null;
  taxRegistrationNumber: string | null;
  aiImageApiKey: string | null;
  logoUrl: string | null;
  servicePackagesJson: string | null;
  desktopNotificationsEnabled: boolean;
}

// PNG/JPEG only — @react-pdf/renderer's <Image> (used to show this logo on
// every generated PDF's header) renders raster formats, not SVG. Kept small
// since the logo is stored inline as a data: URI on the consultant_settings
// row (same "no separate file-serving route needed" tradeoff as every other
// small embedded asset in this app, e.g. generated ad images).
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  // Mirrors the browser's own Notification.permission — not persisted to the
  // server (only the consultant's on/off preference is, as
  // settings.desktopNotificationsEnabled). "unsupported" covers browsers/
  // contexts without the Notification API at all (e.g. some mobile browsers).
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [notifBusy, setNotifBusy] = useState(false);
  // Parsed view of settings.servicePackagesJson for the Service Packages
  // editor below — kept in sync with settings.servicePackagesJson (the
  // string actually persisted) on every edit, so the existing "Save
  // Settings" button saves this section too, no separate save path needed.
  // Falls back to the starter template until the consultant saves their own.
  const [servicePackages, setServicePackages] = useState<ServicePackagesConfig>(DEFAULT_SERVICE_PACKAGES);

  useEffect(() => {
    api.get<Settings>("/api/settings").then((s) => {
      setSettings(s);
      if (s.servicePackagesJson) {
        try {
          setServicePackages(JSON.parse(s.servicePackagesJson));
        } catch {
          setServicePackages(DEFAULT_SERVICE_PACKAGES);
        }
      }
    });
  }, []);

  // Turning the toggle on requests real browser permission at that moment
  // (a user gesture, not on page load); the preference only actually turns
  // on once permission comes back granted. Turning it off never touches
  // browser permission — it just stops the poller in useFollowUpAlerts from
  // firing notifications.
  async function toggleDesktopNotifications(checked: boolean) {
    if (!checked) {
      set("desktopNotificationsEnabled", false);
      return;
    }
    if (notifPermission === "unsupported") return;
    if (notifPermission === "granted") {
      set("desktopNotificationsEnabled", true);
      return;
    }
    setNotifBusy(true);
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      set("desktopNotificationsEnabled", result === "granted");
    } finally {
      setNotifBusy(false);
    }
  }

  function updateServicePackages(next: ServicePackagesConfig) {
    setServicePackages(next);
    set("servicePackagesJson", JSON.stringify(next));
  }

  function updateServiceLabel(key: string, label: string) {
    updateServicePackages({ ...servicePackages, services: servicePackages.services.map((s) => (s.key === key ? { ...s, label } : s)) });
  }

  function addService() {
    const baseKey = "new-service";
    let key = baseKey;
    let n = 1;
    while (servicePackages.services.some((s) => s.key === key)) key = `${baseKey}-${++n}`;
    updateServicePackages({ ...servicePackages, services: [...servicePackages.services, { key, label: "New Service" }] });
  }

  function removeService(key: string) {
    updateServicePackages({
      services: servicePackages.services.filter((s) => s.key !== key),
      tiers: servicePackages.tiers.map((t) => ({ ...t, serviceKeys: t.serviceKeys.filter((k) => k !== key) })),
    });
  }

  function updateTier(key: string, patch: Partial<ServicePackagesConfig["tiers"][number]>) {
    updateServicePackages({ ...servicePackages, tiers: servicePackages.tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)) });
  }

  function toggleTierService(tierKey: string, serviceKey: string) {
    updateServicePackages({
      ...servicePackages,
      tiers: servicePackages.tiers.map((t) =>
        t.key === tierKey
          ? { ...t, serviceKeys: t.serviceKeys.includes(serviceKey) ? t.serviceKeys.filter((k) => k !== serviceKey) : [...t.serviceKeys, serviceKey] }
          : t
      ),
    });
  }

  function addTier() {
    const baseKey = "tier";
    let key = baseKey;
    let n = 1;
    while (servicePackages.tiers.some((t) => t.key === key)) key = `${baseKey}-${++n}`;
    updateServicePackages({
      ...servicePackages,
      tiers: [...servicePackages.tiers, { key, name: "New Package", price: 0, serviceKeys: [], descriptionOverride: null }],
    });
  }

  function removeTier(key: string) {
    updateServicePackages({ ...servicePackages, tiers: servicePackages.tiers.filter((t) => t.key !== key) });
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    await api.patch("/api/settings", settings);
    setSaving(false);
    setSaved(true);
  }

  // Upload/Change save immediately on selection (rather than waiting for the
  // main "Save Settings" button) — a logo picker with a pending, easy-to-
  // forget save step is a common source of "I uploaded it but it didn't
  // stick" confusion. Delete works the same way for consistency.
  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setLogoError(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setLogoError("Please choose a PNG or JPEG image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("That image is too large — please choose one under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLogoBusy(true);
      try {
        await api.patch("/api/settings", { logoUrl: dataUrl });
        setSettings((s) => (s ? { ...s, logoUrl: dataUrl } : s));
      } catch (err) {
        setLogoError((err as Error).message);
      } finally {
        setLogoBusy(false);
      }
    };
    reader.onerror = () => setLogoError("Couldn't read that file — please try again.");
    reader.readAsDataURL(file);
  }

  async function deleteLogo() {
    setLogoBusy(true);
    setLogoError(null);
    try {
      await api.patch("/api/settings", { logoUrl: null });
      setSettings((s) => (s ? { ...s, logoUrl: null } : s));
    } catch (err) {
      setLogoError((err as Error).message);
    } finally {
      setLogoBusy(false);
    }
  }

  if (!settings) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl">
      <PageHeading title="Consultant Settings" subtitle="These details are automatically used on every generated PDF report." />
      <Card className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Consultant Name"><Input value={settings.consultantName} onChange={(e) => set("consultantName", e.target.value)} /></Field>
          <Field label="Company / Brand"><Input value={settings.companyName} onChange={(e) => set("companyName", e.target.value)} /></Field>
          <Field label="Phone"><Input value={settings.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="WhatsApp"><Input value={settings.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={settings.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Website"><Input value={settings.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
          <Field label="LinkedIn"><Input value={settings.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} /></Field>
          <Field label="Currency">
            <Select value={settings.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Default Qualification Rate %">
            <Input type="number" value={settings.defaultQualificationRate} onChange={(e) => set("defaultQualificationRate", Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Address"><Textarea value={settings.address ?? ""} onChange={(e) => set("address", e.target.value)} /></Field>
        <Field label="Report Footer"><Input value={settings.reportFooter ?? ""} onChange={(e) => set("reportFooter", e.target.value)} /></Field>
        <Field label="PDF Call-to-Action"><Textarea value={settings.ctaText} onChange={(e) => set("ctaText", e.target.value)} /></Field>
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      </Card>

      <Card className="p-5 space-y-3 mt-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Brand Logo (optional)</p>
          <p className="text-xs text-slate-400 mt-1">
            Shown next to your Company / Brand name in the header of every generated PDF report and proposal. PNG or JPEG, up to 2MB.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Brand logo"
              className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700"
            />
          ) : (
            <div className="h-16 w-16 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 text-center px-1">
              No logo
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => logoInputRef.current?.click()} disabled={logoBusy}>
                {logoBusy ? "Uploading…" : settings.logoUrl ? "Change" : "Upload Logo"}
              </Button>
              {settings.logoUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={deleteLogo} disabled={logoBusy} title="Remove logo">
                  <Trash2 size={13} className="text-red-500" /> Delete
                </Button>
              )}
            </div>
            {logoError && <p className="text-xs text-red-600">{logoError}</p>}
          </div>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoFile} />
        </div>
      </Card>

      <Card className="p-5 space-y-4 mt-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Tax / GST (optional)</p>
          <p className="text-xs text-slate-400 mt-1">
            When enabled, this tax is added on top of the Invoice and Custom Invoice PDFs, and broken out for reference
            on Payment Receipt PDFs. Left disabled, no tax appears on either document.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={settings.taxEnabled} onChange={(e) => set("taxEnabled", e.target.checked)} />
          Enable tax on invoices &amp; receipts
        </label>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Tax Label" hint="e.g. GST, VAT, Sales Tax">
            <Input value={settings.taxLabel ?? ""} onChange={(e) => set("taxLabel", e.target.value)} disabled={!settings.taxEnabled} />
          </Field>
          <Field label="Tax Rate %">
            <Input
              type="number"
              value={settings.taxRate ?? ""}
              onChange={(e) => set("taxRate", e.target.value === "" ? null : Number(e.target.value))}
              disabled={!settings.taxEnabled}
            />
          </Field>
          <Field label="GSTIN / Tax Reg. Number">
            <Input
              value={settings.taxRegistrationNumber ?? ""}
              onChange={(e) => set("taxRegistrationNumber", e.target.value)}
              disabled={!settings.taxEnabled}
            />
          </Field>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      </Card>

      <Card className="p-5 space-y-3 mt-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <BellRing size={15} className="text-indigo-600" /> Desktop Notifications (optional)
          </p>
          <p className="text-xs text-slate-400 mt-1">
            When enabled, this browser shows a real desktop notification for each follow-up that becomes overdue or due
            today, for as long as a tab of this app stays open. Uses your browser&apos;s own notification permission — no
            data leaves your device for this.
          </p>
        </div>
        {notifPermission === "unsupported" ? (
          <p className="text-xs text-slate-500">Desktop notifications aren&apos;t supported in this browser.</p>
        ) : notifPermission === "denied" ? (
          <p className="text-xs text-red-600">
            Notifications are blocked for this site in your browser settings. Allow notifications for this site, then
            reload this page to turn this on.
          </p>
        ) : (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={settings.desktopNotificationsEnabled}
              disabled={notifBusy}
              onChange={(e) => toggleDesktopNotifications(e.target.checked)}
            />
            <span className={clsx(notifBusy && "opacity-60")}>
              {notifBusy ? "Requesting permission…" : "Enable desktop notifications for due follow-ups"}
            </span>
          </label>
        )}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      </Card>

      <Card className="p-5 space-y-3 mt-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">AI Image Generation (optional)</p>
          <p className="text-xs text-slate-400 mt-1">
            Powers real, generated Image Ad concepts in the Sample Ads step of the assessment wizard (using OpenAI&apos;s DALL·E 3).
            Left blank, image generation is simply unavailable there — nothing is faked in its place. Each image you
            generate is billed by OpenAI to this key; images are only generated when you click &quot;Generate Image&quot; on a
            specific ad concept, never automatically.
          </p>
        </div>
        <Field label="OpenAI API Key" hint="Starts with sk-… Get one at platform.openai.com/api-keys.">
          <Input
            type="password"
            value={settings.aiImageApiKey ?? ""}
            onChange={(e) => set("aiImageApiKey", e.target.value)}
            placeholder="sk-…"
            className="max-w-md"
            autoComplete="off"
          />
        </Field>
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      </Card>

      <Card className="p-5 space-y-4 mt-6">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Recommended Services & Scope (optional)</p>
          <p className="text-xs text-slate-400 mt-1">
            Powers the Services Included checklist and &quot;Load a preset&quot; picker on every proposal&apos;s package cards. Editing a
            tier here only affects proposals built from it afterward — a package already built from a tier keeps its own price and
            selected services, so an already-sent proposal never changes.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">Master Services List</p>
          <div className="flex flex-wrap items-center gap-2">
            {servicePackages.services.map((svc) => (
              <div key={svc.key} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full pl-3 pr-1 py-1">
                <input
                  value={svc.label}
                  onChange={(e) => updateServiceLabel(svc.key, e.target.value)}
                  className="bg-transparent text-xs w-24 focus:outline-none text-slate-700 dark:text-slate-200"
                />
                <button type="button" onClick={() => removeService(svc.key)} className="text-slate-400 hover:text-red-500" title="Remove service">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addService}>
              + Add Service
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Pricing Tiers</p>
          {servicePackages.tiers.map((tier) => (
            <div key={tier.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Tier Name">
                  <Input value={tier.name} onChange={(e) => updateTier(tier.key, { name: e.target.value })} />
                </Field>
                <Field label={`Price (${settings.currency})`}>
                  <Input type="number" min={0} value={tier.price || ""} onChange={(e) => updateTier(tier.key, { price: Number(e.target.value) || 0 })} />
                </Field>
              </div>
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1.5">
                  Included services — leave all unchecked for a tier that isn&apos;t defined by specific services (use the description
                  override below instead).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {servicePackages.services.map((svc) => {
                    const checked = tier.serviceKeys.includes(svc.key);
                    return (
                      <button
                        key={svc.key}
                        type="button"
                        onClick={() => toggleTierService(tier.key, svc.key)}
                        className={
                          checked
                            ? "text-[11px] px-2 py-1 rounded-full bg-indigo-600 text-white"
                            : "text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }
                      >
                        {svc.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3">
                <Field
                  label="Description override (optional)"
                  hint={`Shown instead of the joined service list, e.g. "Small business / focused execution."`}
                >
                  <Input
                    value={tier.descriptionOverride ?? ""}
                    onChange={(e) => updateTier(tier.key, { descriptionOverride: e.target.value || null })}
                  />
                </Field>
              </div>
              <div className="mt-3 text-right">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeTier(tier.key)}>
                  <Trash2 size={13} className="text-red-500" /> Remove tier
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addTier}>
            + Add Tier
          </Button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
          {saved && <span className="text-sm text-emerald-600">Saved.</span>}
        </div>
      </Card>
    </div>
  );
}
