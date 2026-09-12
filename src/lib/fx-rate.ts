// Live currency conversion for the Audience step's budget-allocation
// estimate (see estimateChannelBudgetResult in recommendations.ts). Every
// seeded ad-platform benchmark (CPC/CPV/CVR in data/benchmarks/*.json) is
// denominated in USD, so turning a client's monthly budget — entered in
// whatever currency matches their Target Country, any of 223 — into a real
// clicks/leads estimate needs a real, current exchange rate. Rather than
// fabricate one or restrict the estimate to USD-only clients, this fetches
// a live rate from Frankfurter (https://frankfurter.dev), a free,
// no-API-key exchange-rate service built on the European Central Bank's
// daily reference rates — same "real external data or say so, never invent
// it" rule the live website-audit fetches already follow in this app.
//
// The ECB reference rates cover roughly 30 major currencies. A currency
// outside that set (or any network failure) makes Frankfurter return a
// non-OK response — treated here exactly like "unavailable", so the caller
// shows an honest "conversion unavailable" message instead of guessing.

export interface FxRate {
  rate: number; // 1 unit of the source currency = `rate` USD
  asOf: string; // ISO date (YYYY-MM-DD) the rate was published
}

// In-memory cache, scoped to this server process — ECB rates only publish
// once a day, so refetching on every render/keystroke would be wasteful.
// Cleared on server restart, same tradeoff as every other in-memory cache
// in this app (e.g. the statement cache in db/index.ts).
const cache = new Map<string, { value: FxRate | null; fetchedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getUsdExchangeRate(currency: string, timeoutMs = 6000): Promise<FxRate | null> {
  if (currency === "USD") return { rate: 1, asOf: new Date().toISOString().slice(0, 10) };

  const cached = cache.get(currency);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.value;

  let result: FxRate | null = null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(currency)}&symbols=USD`,
      { signal: controller.signal }
    );
    clearTimeout(t);
    if (res.ok) {
      const data = (await res.json()) as { date?: string; rates?: Record<string, number> };
      if (data.rates && typeof data.rates.USD === "number") {
        result = { rate: data.rates.USD, asOf: data.date ?? new Date().toISOString().slice(0, 10) };
      }
    }
  } catch {
    result = null; // network error, timeout, or bad JSON — treated as "unavailable", never guessed
  }
  cache.set(currency, { value: result, fetchedAt: Date.now() });
  return result;
}
