import { RawItem } from "../types";
import { fetchRss, parseRssAsRawItems } from "./rssUtil";

const BLOG_FEEDS: string[] = [];

export function blogRssSource(opts: { maxItems: number; timeoutMs: number }) {
  const id = "blogs:rss";
  return {
    id,
    fetch: async (): Promise<RawItem[]> => {
      const all: RawItem[] = [];
      for (const url of BLOG_FEEDS) {
        const xml = await fetchRss({ CRAWL_USER_AGENT: "fut-omnisense-ai/1.0" }, url, opts.timeoutMs);
        all.push(...parseRssAsRawItems(xml, id));
      }
      all.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
      return all.slice(0, opts.maxItems);
    }
  };
}
