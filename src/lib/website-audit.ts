// Lightweight, honest website audit checks. Per spec section 6: "Do not
// fabricate unavailable data." We only report what we can actually verify by
// fetching the page and its well-known files; anything needing a paid
// API (Lighthouse/PSI for Core Web Vitals, etc.) is explicitly marked
// unavailable rather than guessed.

import { DATA_UNAVAILABLE } from "./constants";

export interface AuditCheck {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail" | "unavailable";
  detail: string;
}

export interface WebsiteAuditResult {
  url: string;
  fetchedOk: boolean;
  checks: AuditCheck[];
  rawTitle?: string;
  rawMetaDescription?: string;
  wordCount?: number;
  // A real image already on the page (its og:image), kept only as a visual
  // reference for the wizard's Sample Ads step when AI image generation
  // isn't configured — never presented as a finished ad creative.
  ogImageUrl?: string;
}

export function extractTag(html: string, regex: RegExp): string | undefined {
  const m = html.match(regex);
  return m ? m[1].trim() : undefined;
}

export async function fetchText(url: string, timeoutMs = 8000): Promise<{ ok: boolean; text?: string; status?: number }> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DMConsultantAuditBot/1.0)" },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    return { ok: true, text, status: res.status };
  } catch {
    return { ok: false };
  }
}

export async function runWebsiteAudit(rawUrl: string): Promise<WebsiteAuditResult> {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const checks: AuditCheck[] = [];
  const isHttps = url.startsWith("https://");
  checks.push({
    key: "https",
    label: "HTTPS",
    status: isHttps ? "pass" : "fail",
    detail: isHttps ? "Site is served over HTTPS." : "Site is not using HTTPS — this hurts trust and SEO.",
  });

  const fetchStarted = Date.now();
  const page = await fetchText(url);
  const responseTimeMs = Date.now() - fetchStarted;
  if (!page.ok || !page.text) {
    checks.push({
      key: "fetch",
      label: "Reachability",
      status: "fail",
      detail: `Could not fetch the page (${page.status ?? "network error"}). Remaining on-page checks are unavailable.`,
    });
    return { url, fetchedOk: false, checks };
  }

  const html = page.text;
  const title = extractTag(html, /<title[^>]*>([^<]*)<\/title>/i);
  const metaDescription = extractTag(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  );
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const h1Matches = html.match(/<h1[^>]*>/gi) ?? [];
  const canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const hasSchema = /application\/ld\+json/i.test(html);
  const imgTags = html.match(/<img\b[^>]*>/gi) ?? [];
  const imgsMissingAlt = imgTags.filter((tag) => !/alt\s*=\s*["'][^"']+["']/i.test(tag)).length;
  const textOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = textOnly ? textOnly.split(" ").length : 0;

  // Deeper on-page / branding / local-SEO signals — still just this one page
  // fetch, never a paid crawl or off-page API.
  const hasLangAttr = /<html[^>]+lang\s*=\s*["'][a-zA-Z-]+["']/i.test(html);
  const hasFavicon = /<link[^>]+rel=["'](?:shortcut icon|icon|apple-touch-icon)["']/i.test(html);
  const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(html);
  const ogImageRaw = extractTag(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  let ogImageUrl: string | undefined;
  if (ogImageRaw) {
    try {
      ogImageUrl = new URL(ogImageRaw, url).toString();
    } catch {
      // ignore malformed og:image URLs
    }
  }
  const socialPatterns: Array<[string, RegExp]> = [
    ["Facebook", /(?:facebook\.com|fb\.com)\/[a-z0-9._-]+/i],
    ["Instagram", /instagram\.com\/[a-z0-9._-]+/i],
    ["LinkedIn", /linkedin\.com\/(?:company|in)\/[a-z0-9._-]+/i],
    ["Twitter/X", /(?:twitter\.com|x\.com)\/[a-z0-9._-]+/i],
    ["YouTube", /youtube\.com\/(?:channel|c|@)[a-z0-9._-]+/i],
  ];
  const socialLinksFound = socialPatterns.filter(([, re]) => re.test(html)).map(([name]) => name);
  const schemaBlocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const hasLocalBusinessSchema = schemaBlocks.some((b) => /LocalBusiness|"@type"\s*:\s*"(Organization|Store|Restaurant)"|streetAddress/i.test(b));
  const phonePattern = /(?:tel:)|(?:\+?\d[\d\s().-]{7,}\d)/;
  const hasPhoneDetected = phonePattern.test(html.replace(/<script[\s\S]*?<\/script>/gi, ""));

  checks.push({
    key: "title",
    label: "Page Title",
    status: title ? (title.length >= 10 && title.length <= 60 ? "pass" : "warn") : "fail",
    detail: title ? `"${title}" (${title.length} characters)` : "No <title> tag found.",
  });

  checks.push({
    key: "meta_description",
    label: "Meta Description",
    status: metaDescription ? (metaDescription.length >= 50 && metaDescription.length <= 160 ? "pass" : "warn") : "fail",
    detail: metaDescription
      ? `"${metaDescription}" (${metaDescription.length} characters)`
      : "No meta description found.",
  });

  checks.push({
    key: "viewport",
    label: "Mobile Viewport Tag",
    status: hasViewport ? "pass" : "fail",
    detail: hasViewport
      ? "Responsive viewport meta tag present."
      : "No viewport meta tag — page likely isn't mobile-optimised.",
  });

  checks.push({
    key: "h1",
    label: "H1 Heading",
    status: h1Matches.length === 1 ? "pass" : h1Matches.length === 0 ? "fail" : "warn",
    detail:
      h1Matches.length === 1
        ? "Exactly one H1 found (recommended)."
        : h1Matches.length === 0
        ? "No H1 heading found."
        : `${h1Matches.length} H1 tags found — should typically be one.`,
  });

  checks.push({
    key: "canonical",
    label: "Canonical Tag",
    status: canonical ? "pass" : "warn",
    detail: canonical ? "Canonical tag present." : "No canonical tag found.",
  });

  checks.push({
    key: "schema",
    label: "Structured Data / Schema",
    status: hasSchema ? "pass" : "warn",
    detail: hasSchema ? "JSON-LD structured data detected." : "No structured data (schema.org) detected.",
  });

  checks.push({
    key: "image_alt",
    label: "Image ALT Text",
    status: imgTags.length === 0 ? "warn" : imgsMissingAlt === 0 ? "pass" : imgsMissingAlt < imgTags.length ? "warn" : "fail",
    detail:
      imgTags.length === 0
        ? "No <img> tags found on this page."
        : `${imgTags.length - imgsMissingAlt}/${imgTags.length} images have ALT text.`,
  });

  checks.push({
    key: "content_depth",
    label: "Content Depth",
    status: wordCount > 600 ? "pass" : wordCount > 250 ? "warn" : "fail",
    detail: `Approx. ${wordCount} words of visible text on this page.`,
  });

  checks.push({
    key: "lang_attribute",
    label: "Language Declaration",
    status: hasLangAttr ? "pass" : "warn",
    detail: hasLangAttr ? "<html lang> attribute is set." : "No <html lang> attribute — helps search engines and screen readers target the right audience.",
  });

  checks.push({
    key: "og_tags",
    label: "Social Share Tags (Open Graph)",
    status: ogTitle && ogImage ? "pass" : ogTitle || ogImage ? "warn" : "fail",
    detail:
      ogTitle && ogImage
        ? "Open Graph title and image are set — links will look branded when shared."
        : "Missing Open Graph title/image — links shared on social/WhatsApp will look generic, not branded.",
  });

  checks.push({
    key: "favicon",
    label: "Favicon",
    status: hasFavicon ? "pass" : "warn",
    detail: hasFavicon ? "Favicon present." : "No favicon found — small polish detail, but affects perceived professionalism in browser tabs and bookmarks.",
  });

  checks.push({
    key: "social_profile_links",
    label: "Social Profile Links (off-page signal)",
    status: socialLinksFound.length >= 2 ? "pass" : socialLinksFound.length === 1 ? "warn" : "fail",
    detail:
      socialLinksFound.length > 0
        ? `Linked to: ${socialLinksFound.join(", ")}.`
        : "No linked social profiles detected on this page — a missed off-page trust and reach signal.",
  });

  checks.push({
    key: "local_business_schema",
    label: "Local Business Schema",
    status: hasLocalBusinessSchema ? "pass" : "fail",
    detail: hasLocalBusinessSchema
      ? "LocalBusiness/Organization structured data with address detected."
      : "No LocalBusiness structured data detected — this is what lets Google show address, hours and map pin directly in search results.",
  });

  checks.push({
    key: "nap_consistency",
    label: "Phone Number on Page (NAP heuristic)",
    status: hasPhoneDetected ? "pass" : "warn",
    detail: hasPhoneDetected
      ? "A phone-number-like pattern was found on the page (heuristic — not a verified match)."
      : "No phone number pattern detected on this page — local searchers and Google both look for this.",
  });

  checks.push({
    key: "server_response_time",
    label: "Server Response Time",
    status: responseTimeMs < 600 ? "pass" : responseTimeMs < 1500 ? "warn" : "fail",
    detail: `This page responded in ${responseTimeMs}ms. (A proxy for server speed only — not full Core Web Vitals, see below.)`,
  });

  // robots.txt
  const origin = new URL(url).origin;
  const robots = await fetchText(origin + "/robots.txt", 5000);
  checks.push({
    key: "robots_txt",
    label: "robots.txt",
    status: robots.ok ? "pass" : "warn",
    detail: robots.ok ? "robots.txt found." : "robots.txt not found or unreachable.",
  });

  // sitemap.xml
  const sitemap = await fetchText(origin + "/sitemap.xml", 5000);
  checks.push({
    key: "sitemap_xml",
    label: "XML Sitemap",
    status: sitemap.ok ? "pass" : "warn",
    detail: sitemap.ok ? "sitemap.xml found." : "sitemap.xml not found at the default location.",
  });

  // Things we genuinely cannot check without a paid API — say so, per spec.
  checks.push({
    key: "core_web_vitals",
    label: "Core Web Vitals / Page Speed",
    status: "unavailable",
    detail: DATA_UNAVAILABLE + " (requires Google PageSpeed Insights API or similar.)",
  });
  checks.push({
    key: "broken_links",
    label: "Broken Links",
    status: "unavailable",
    detail: DATA_UNAVAILABLE + " (requires a full-site crawl.)",
  });

  return {
    url,
    fetchedOk: true,
    checks,
    rawTitle: title,
    rawMetaDescription: metaDescription,
    wordCount,
    ogImageUrl,
  };
}

/** Roll up automated checks into a 0-100 score per audit category (section 6). */
export function scoreFromChecks(checks: AuditCheck[]): number {
  const scored = checks.filter((c) => c.status !== "unavailable");
  if (scored.length === 0) return 0;
  const points = scored.reduce((sum, c) => {
    if (c.status === "pass") return sum + 100;
    if (c.status === "warn") return sum + 55;
    return sum + 10;
  }, 0);
  return Math.round(points / scored.length);
}

// Maps automated checks to the spec's audit categories (section 6). Branding
// and Local SEO now get a real starting score from on-page signals (Open
// Graph tags, favicon, linked social profiles, LocalBusiness schema, phone
// detection) instead of a blind default — the consultant can still override
// either number in the wizard, this is only ever a suggested starting point.
const CATEGORY_CHECK_KEYS: Record<string, string[]> = {
  technicalSeo: ["https", "robots_txt", "sitemap_xml", "canonical", "schema", "lang_attribute"],
  onPageSeo: ["title", "meta_description", "h1"],
  content: ["content_depth", "image_alt"],
  uxConversion: ["viewport"],
  performance: ["core_web_vitals", "server_response_time"],
  branding: ["og_tags", "favicon", "social_profile_links", "schema"],
  localSeo: ["local_business_schema", "nap_consistency"],
};

export function categorizeAuditScores(checks: AuditCheck[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [category, keys] of Object.entries(CATEGORY_CHECK_KEYS)) {
    const subset = checks.filter((c) => keys.includes(c.key));
    out[category] = scoreFromChecks(subset);
  }
  return out;
}
