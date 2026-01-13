import { RawItem } from "../types";
import { fetchRss, parseRssAsRawItems } from "./rssUtil";

function buildYouTubeTopicFeeds(query: string) {
  // YouTube RSS needs channel/playlist IDs usually.
  // Real workaround: Google News RSS for YouTube pages is better for search.
  // BUT: You can also track specific channels via their channelId feeds.
  // Here: track a few known FUT-related channels by channel ID (you can replace later).
  const channelIds = [
    // replace with your preferred channels
    "UCv9FfK8f2h0cWQ0Xv5yKkWg" // example placeholder; change to real channelId you want to follow
  ];
  return channelIds.map((id) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
}

export function youtubeRssSource(opts: { query: string; maxItems: number; timeoutMs: number }) {
  const id = "youtube:rss";
  return {
    id,
    fetch: async (): Promise<RawItem[]> => {
      const urls = buildYouTubeTopicFeeds(opts.query);
      const all: RawItem[] = [];
      for (const url of urls) {
        const xml = await fetchRss({ CRAWL_USER_AGENT: "fut-omnisense-ai/1.0" }, url, opts.timeoutMs);
        all.push(...parseRssAsRawItems(xml, id));
      }
      all.sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));
      return all.slice(0, opts.maxItems);
    }
  };
}
