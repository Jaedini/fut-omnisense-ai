import { RawItem } from "../types";
import { fetchRss, parseRssAsRawItems } from "./rssUtil";

function buildRedditRssUrls(query: string) {
  // Real RSS endpoints (public)
  const subreddits = ["EASportsFC", "FUT", "FUTTrading"];
  const q = encodeURIComponent(query);

  // subreddit search RSS
  const searchFeeds = subreddits.map(
    (sr) => `https://www.reddit.com/r/${sr}/search.rss?q=${q}&restrict_sr=1&sort=new&t=day`
  );

  // hot/new subreddit RSS
  const newFeeds = subreddits.map((sr) => `https://www.reddit.com/r/${sr}/new.rss`);
  return [...searchFeeds, ...newFeeds];
}

export function redditRssSource(opts: { query: string; maxItems: number; timeoutMs: number }) {
  const id = "reddit:rss";
  return {
    id,
    fetch: async (): Promise<RawItem[]> => {
      const urls = buildRedditRssUrls(opts.query);
      const all: RawItem[] = [];
      for (const url of urls) {
        const xml = await fetchRss({ CRAWL_USER_AGENT: "fut-omnisense-ai/1.0" }, url, opts.timeoutMs);
        all.push(...parseRssAsRawItems(xml, id));
      }
      // keep newest
      all.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
      return all.slice(0, opts.maxItems);
    }
  };
}
