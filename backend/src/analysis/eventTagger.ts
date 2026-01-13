// backend/src/analysis/eventTagger.ts
import { mongoFind, mongoUpdateOne } from "../db/mongo/dataApi";
import { stableId } from "../utils/stableId";

type TagOpts = {
  hours: number;
  maxSignals: number;
};

function nowMinusHours(h: number) {
  return Date.now() - h * 60 * 60 * 1000;
}

function norm(s: string) {
  return String(s ?? "").toLowerCase();
}

type EventHit = {
  type: string;
  score: number;  // 0..1
  keywords: string[];
};

function detectEvent(text: string): EventHit | null {
  const t = norm(text);

  // Broad event signals
  const rules: { type: string; kws: string[]; weight: number }[] = [
    { type: "TOTW", kws: ["totw", "team of the week"], weight: 1.0 },
    { type: "PROMO", kws: ["promo", "event", "special cards", "new promo", "pack promo"], weight: 0.8 },
    { type: "SBC", kws: ["sbc", "challenge", "squad building"], weight: 0.8 },
    { type: "PATCH", kws: ["patch", "title update", "update notes", "patch notes"], weight: 0.8 },
    { type: "REWARDS", kws: ["rewards", "weekend league", "wl rewards", "rivals rewards"], weight: 0.6 },
    { type: "CRASH", kws: ["market crash", "crash", "panic sell", "panic selling"], weight: 0.7 }
  ];

  let best: EventHit | null = null;

  for (const r of rules) {
    let hits = 0;
    const used: string[] = [];
    for (const kw of r.kws) {
      if (t.includes(kw)) { hits++; used.push(kw); }
    }
    if (!hits) continue;
    const score = Math.min(1, (hits / r.kws.length) * r.weight + 0.15);
    if (!best || score > best.score) best = { type: r.type, score, keywords: used };
  }

  return best;
}

export async function tagEvents(env: any, opts: TagOpts) {
  const since = nowMinusHours(opts.hours);

  const sigRes = await mongoFind(env, {
    collection: "signals",
    filter: { publishedAt: { $gte: since } },
    limit: Math.min(5000, Math.max(50, opts.maxSignals)),
    sort: { publishedAt: -1 },
    projection: { id: 1, _id: 1, text: 1, title: 1, sourceId: 1, publishedAt: 1, createdAt: 1, url: 1, trust: 1 }
  });
  const signals = (sigRes?.documents ?? []) as any[];

  let taggedSignals = 0;

  for (const s of signals) {
    const text = String(s.text ?? s.title ?? "");
    const hit = detectEvent(text);
    if (!hit) continue;

    taggedSignals++;

    const publishedAt = Number(s.publishedAt ?? s.createdAt ?? Date.now());
    const sid = String(s.id ?? s._id ?? stableId(`${s.sourceId}|${s.url}|${s.title}`));
    const dayKey = new Date(publishedAt).toISOString().slice(0, 10); // YYYY-MM-DD
    const eventId = stableId(`event:${hit.type}:${dayKey}`);

    // upsert event window (coarse but effective)
    await mongoUpdateOne(env, {
      collection: "events",
      filter: { _id: eventId },
      update: {
        $set: {
          _id: eventId,
          type: hit.type,
          confidence: hit.score,
          keywords: hit.keywords,
          lastSeenAt: publishedAt,
          updatedAt: Date.now()
        },
        $min: { startAt: publishedAt },
        $max: { endAt: publishedAt },
        $inc: { mentions: 1 },
        $setOnInsert: { createdAt: Date.now(), startAt: publishedAt, endAt: publishedAt, mentions: 0 }
      },
      upsert: true
    });

    // attach event tag to signal
    await mongoUpdateOne(env, {
      collection: "signals",
      filter: { id: sid },
      update: {
        $set: { eventType: hit.type, eventId, eventConfidence: hit.score, eventTaggedAt: Date.now() }
      },
      upsert: false
    });
  }

  await mongoUpdateOne(env, {
    collection: "jobs_state",
    filter: { _id: "event_tag_latest" },
    update: {
      $set: {
        _id: "event_tag_latest",
        ranAt: Date.now(),
        windowHours: opts.hours,
        scannedSignals: signals.length,
        taggedSignals
      },
      $setOnInsert: { createdAt: Date.now() }
    },
    upsert: true
  });

  return { windowHours: opts.hours, scannedSignals: signals.length, taggedSignals };
}
