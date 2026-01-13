type PriceQuote = { source: string; price: number; ts: number; raw?: any };

function parseUrls(env: any): string[] {
  const raw = String(env.PRICE_SOURCE_URLS ?? "").trim();
  if (!raw) return [];
  return raw.split(",").map((s: string) => s.trim()).filter(Boolean);
}

function extractNumberDeep(obj: any): number | null {
  // tries to find a plausible price number anywhere
  const seen = new Set<any>();
  const stack = [obj];
  while (stack.length) {
    const x = stack.pop();
    if (x == null) continue;
    if (typeof x === "number" && Number.isFinite(x)) return x;
    if (typeof x === "string") {
      const n = Number(x.replace(/[^\d.]/g, ""));
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (typeof x === "object") {
      if (seen.has(x)) continue;
      seen.add(x);
      for (const k of Object.keys(x)) stack.push(x[k]);
    }
  }
  return null;
}

export async function fetchPriceQuotes(env: any, cardId: string): Promise<PriceQuote[]> {
  const urls = parseUrls(env);
  if (!urls.length) return [];

  const quotes: PriceQuote[] = [];
  for (const tmpl of urls) {
    const url = tmpl.replace("{cardId}", encodeURIComponent(cardId));
    try {
      const res = await fetch(url, { headers: { "User-Agent": env.CRAWL_USER_AGENT ?? "fut-omnisense-ai/1.0" } });
      if (!res.ok) continue;
      const json = await res.json().catch(() => null);
      if (!json) continue;

      const p = extractNumberDeep(json);
      if (p && p > 0) quotes.push({ source: url, price: Math.round(p), ts: Date.now(), raw: undefined });
    } catch {
      // ignore single source errors
    }
  }
  return quotes;
}

export function pickBestBuyPrice(quotes: PriceQuote[]): PriceQuote | null {
  if (!quotes.length) return null;
  quotes.sort((a, b) => a.price - b.price);
  return quotes[0];
}
