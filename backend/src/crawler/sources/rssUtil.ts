import { XMLParser } from "fast-xml-parser";
import { RawItem } from "../types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

function toArray<T>(x: T | T[] | undefined): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function pickText(x: any): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  return x["#text"] ?? x["__cdata"] ?? x["content"] ?? "";
}

function parseDateToMs(d: any): number | undefined {
  const s = pickText(d);
  if (!s) return undefined;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : undefined;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch RSS/Atom with retry+backoff for 429/5xx.
 */
export async function fetchRss(env: any, url: string, timeoutMs: number): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ac = new AbortController();
    const id = setTimeout(() => ac.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": env?.CRAWL_USER_AGENT ?? "fut-omnisense-ai/1.0"
        },
        signal: ac.signal
      });

      if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
        if (attempt === maxRetries) throw new Error(`RSS fetch failed ${res.status} after retries`);
        const backoff = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
        await sleep(backoff);
        continue;
      }

      if (!res.ok) throw new Error(`RSS fetch failed ${res.status}`);
      return await res.text();
    } catch (e: any) {
      if (attempt === maxRetries) throw e;
      const backoff = 400 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
      await sleep(backoff);
      continue;
    } finally {
      clearTimeout(id);
    }
  }

  throw new Error("unreachable");
}

/**
 * Parse RSS 2.0 or Atom feed XML into RawItems.
 */
export function parseRssAsRawItems(xml: string, sourceId: string): RawItem[] {
  const data = parser.parse(xml);

  // RSS 2.0
  const rssItems = toArray(data?.rss?.channel?.item).map((it: any) => {
    const link = pickText(it.link) || pickText(it.guid);
    const title = pickText(it.title);
    const desc = pickText(it.description) || pickText(it["content:encoded"]);
    return {
      sourceId,
      url: link,
      title,
      snippet: desc,
      author: pickText(it.author) || pickText(it["dc:creator"]),
      publishedAt: parseDateToMs(it.pubDate),
      tags: toArray(it.category).map(pickText).filter(Boolean),
      meta: {}
    } as RawItem;
  });

  if (rssItems.length) return rssItems.filter((x) => x.url && x.title);

  // Atom
  const atomEntries = toArray(data?.feed?.entry).map((e: any) => {
    const links = toArray(e.link);
    const href =
      links.find((l: any) => l["@_rel"] === "alternate")?.["@_href"] ??
      links[0]?.["@_href"];

    const title = pickText(e.title);
    const summary = pickText(e.summary) || pickText(e.content);

    return {
      sourceId,
      url: href,
      title,
      snippet: summary,
      author: pickText(e.author?.name) || pickText(e.author),
      publishedAt: parseDateToMs(e.published) ?? parseDateToMs(e.updated),
      tags: toArray(e.category).map((c: any) => c["@_term"]).filter(Boolean),
      meta: {}
    } as RawItem;
  });

  return atomEntries.filter((x) => x.url && x.title);
}
