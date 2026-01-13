import { mongoFind, mongoInsertMany } from "../db/mongo/dataApi";
import { stableId } from "../utils/stableId";

function nowMinusHours(h: number) {
  return Date.now() - h * 60 * 60 * 1000;
}

// naive entity extraction (später: proper NER)
function extractEntities(text: string): string[] {
  const t = text.toLowerCase();
  const hits: string[] = [];

  const keywords = [
    "eafc 26", "ea fc 26", "ultimate team", "fut", "sbc", "totw", "promo",
    "market crash", "investment", "trading", "sniping", "price rise", "price drop"
  ];

  for (const k of keywords) if (t.includes(k)) hits.push(k);

  // player-like tokens: very simple (capitalized words in title normally; but text is lowercased already)
  // You can plug a real entity extractor later.
  return Array.from(new Set(hits)).slice(0, 10);
}

export async function rebuildAggregates(env: any, opts: { hours: number }) {
  const since = nowMinusHours(opts.hours);

  // Pull recent signals (limit to keep worker safe)
  const data = await mongoFind(env, {
    collection: "signals",
    filter: { publishedAt: { $gte: since } },
    limit: 2000,
    sort: { publishedAt: -1 }
  });

  const docs = (data?.documents ?? []) as any[];

  const buckets = new Map<string, any>();

  for (const s of docs) {
    const entities = extractEntities(String(s.text ?? ""));
    for (const e of entities) {
      const key = e;
      const b = buckets.get(key) ?? {
        _id: stableId(`agg:${key}:${Math.floor(Date.now() / (60 * 60 * 1000))}`), // hour bucket
        entity: key,
        windowHours: opts.hours,
        mentions: 0,
        avgTrust: 0,
        avgSentiment: 0,
        avgHype: 0,
        lastSeenAt: 0,
        createdAt: Date.now()
      };

      b.mentions += 1;
      b.avgTrust += Number(s.trust ?? 0.5);
      b.avgSentiment += Number(s.sentiment ?? 0);
      b.avgHype += Number(s.hype ?? 0);
      b.lastSeenAt = Math.max(b.lastSeenAt, Number(s.publishedAt ?? s.createdAt ?? 0));
      buckets.set(key, b);
    }
  }

  const out = Array.from(buckets.values()).map((b) => {
    const m = Math.max(1, b.mentions);
    return {
      ...b,
      avgTrust: b.avgTrust / m,
      avgSentiment: b.avgSentiment / m,
      avgHype: b.avgHype / m
    };
  });

  if (out.length) {
    await mongoInsertMany(env, { collection: "aggregates", documents: out });
  }

  return { since, scannedSignals: docs.length, aggregatesSaved: out.length };
}
