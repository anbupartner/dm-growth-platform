// Client-side attribution capture (spec sections 10 & 11) — sessionStorage
// keys read by the lead form on submit. Landing Page is first-touch (the
// entry page of this browser session); UTM params are also first-touch;
// Case Study Viewed / Industry Viewed are last-touch (the most recent one
// the visitor looked at before converting), matching the spec's own stated
// purpose: "which case study influenced the prospect before they contacted
// me" — that's whichever one they saw last, not necessarily first.

const KEYS = {
  landingPage: "attr_landingPage",
  utmSource: "attr_utm_source",
  utmMedium: "attr_utm_medium",
  utmCampaign: "attr_utm_campaign",
  utmTerm: "attr_utm_term",
  utmContent: "attr_utm_content",
  industryViewed: "attr_industryViewed",
  caseStudyViewed: "attr_caseStudyViewed",
} as const;

export interface AttributionSnapshot {
  landingPage: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  industryViewed: string;
  caseStudyViewed: string;
}

function safeGet(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeSet(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore — private browsing / storage disabled
  }
}

export function captureLandingPageOnce(pathAndQuery: string) {
  if (!safeGet(KEYS.landingPage)) safeSet(KEYS.landingPage, pathAndQuery);
}

export function captureUtmOnce(params: URLSearchParams) {
  const map: Array<[string, string]> = [
    ["utm_source", KEYS.utmSource],
    ["utm_medium", KEYS.utmMedium],
    ["utm_campaign", KEYS.utmCampaign],
    ["utm_term", KEYS.utmTerm],
    ["utm_content", KEYS.utmContent],
  ];
  if (!safeGet(KEYS.utmSource) && params.get("utm_source")) {
    for (const [param, key] of map) {
      const value = params.get(param);
      if (value) safeSet(key, value);
    }
  }
}

export function setIndustryViewed(industryName: string) {
  safeSet(KEYS.industryViewed, industryName);
}

export function setCaseStudyViewed(clientName: string) {
  safeSet(KEYS.caseStudyViewed, clientName);
}

export function getAttributionSnapshot(): AttributionSnapshot {
  return {
    landingPage: safeGet(KEYS.landingPage),
    utmSource: safeGet(KEYS.utmSource),
    utmMedium: safeGet(KEYS.utmMedium),
    utmCampaign: safeGet(KEYS.utmCampaign),
    utmTerm: safeGet(KEYS.utmTerm),
    utmContent: safeGet(KEYS.utmContent),
    industryViewed: safeGet(KEYS.industryViewed),
    caseStudyViewed: safeGet(KEYS.caseStudyViewed),
  };
}
