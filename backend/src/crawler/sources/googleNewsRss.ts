import { RawItem } from "../types";
import { fetchRss, parseRssAsRawItems } from "./rssUtil";

export function googleNewsRssSource(opts: { query: string; maxItems: number; timeoutMs: number }) {
  const id = "news:google";
  return {
    id,
    fetch: async (): Promise<RawItem[]> => {
      const q = encodeURIComponent(opts.query);
      const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
      const xml = await fetchRss({ CRAWL_USER_AGENT: "fut-omnisense-ai/1.0" }, url, opts.timeoutMs);
      const items = parseRssAsRawItems(xml, id);
      items.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
      return items.slice(0, opts.maxItems);
    }
  };
}
