import { redditRssSource } from "./sources/redditRss";
import { youtubeRssSource } from "./sources/youtubeRss";
import { googleNewsRssSource } from "./sources/googleNewsRss";
import { eaNewsRssSource } from "./sources/eaNewsRss";
import { blogRssSource } from "./sources/blogRss";

import { normalizeRawItems } from "./pipeline/normalize";
import { dedupSignals } from "./pipeline/dedup";
import { scoreSignals } from "./pipeline/scoring";
import { analyzeSignals } from "./pipeline/analysis";
import { persistSignals } from "./pipeline/persist";
import { RawItem, CrawlResult } from "./types";

export async function crawlOnce(env: any, opts: { query: string }): Promise<CrawlResult> {
  const maxItems = Number(env.CRAWL_MAX_ITEMS_PER_SOURCE ?? 40);
  const timeoutMs = Number(env.CRAWL_TIMEOUT_MS ?? 12000);

  const sources = [
    env.ENABLE_REDDIT_RSS === "true" ? redditRssSource({ query: opts.query, maxItems, timeoutMs }) : null,
    env.ENABLE_YOUTUBE_RSS === "true" ? youtubeRssSource({ query: opts.query, maxItems, timeoutMs }) : null,
    env.ENABLE_GOOGLE_NEWS_RSS === "true" ? googleNewsRssSource({ query: opts.query, maxItems, timeoutMs }) : null,
    env.ENABLE_EA_NEWS_RSS === "true" ? eaNewsRssSource({ maxItems, timeoutMs }) : null,
    blogRssSource({ maxItems, timeoutMs })
  ].filter(Boolean) as { id: string; fetch: () => Promise<RawItem[]> }[];

  const stats: CrawlResult = {
    query: opts.query,
    fetched: 0,
    kept: 0,
    deduped: 0,
    saved: 0,
    sources: {}
  };

  const allRaw: RawItem[] = [];
  for (const s of sources) {
    try {
      const items = await s.fetch();
      stats.sources[s.id] = { fetched: items.length, kept: 0 };
      stats.fetched += items.length;
      allRaw.push(...items);
    } catch (e: any) {
      stats.sources[s.id] = { fetched: 0, kept: 0 };
    }
  }

  // pipeline
  const normalized = normalizeRawItems(allRaw);
  const { kept, deduped } = dedupSignals(normalized);
  stats.kept = kept.length;
  stats.deduped = deduped;

  const scored = scoreSignals(kept);
  const analyzed = analyzeSignals(scored);

  const saved = await persistSignals(env, analyzed);
  stats.saved = saved;

  // per-source kept stats
  for (const sig of analyzed) {
    if (!stats.sources[sig.sourceId]) stats.sources[sig.sourceId] = { fetched: 0, kept: 0 };
    stats.sources[sig.sourceId].kept += 1;
  }

  return stats;
}
