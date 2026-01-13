import { RawItem } from "../types";
import { fetchRss, parseRssAsRawItems } from "./rssUtil";

export function eaNewsRssSource(opts: { maxItems: number; timeoutMs: number }) {
  const id = "news:ea";
  return {
    id,
    fetch: async (): Promise<RawItem[]> => {
      // EA sites often provide RSS/feeds depending on section; if this changes, replace with a working EA feed URL.
      // Use Google News feed as fallback for "site:ea.com FC 26" if EA feed unavailable.
      const fallback = `https://news.google.com/rss/search?q=${encodeURIComponent("site:ea.com EA SPORTS FC 26 Ultimate Team")}&hl=en-US&gl=US&ceid=US:en`;
      const xml = await fetchRss({ CRAWL_USER_AGENT: "fut-omnisense-ai/1.0" }, fallback, opts.timeoutMs);
      const items = parseRssAsRawItems(xml, id);
      items.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
      return items.slice(0, opts.maxItems);
    }
  };
}
