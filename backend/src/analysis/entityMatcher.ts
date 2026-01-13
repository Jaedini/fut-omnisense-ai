import { mongoFind, mongoUpdateOne, mongoInsertMany } from "../db/mongo/dataApi";
import { stableId } from "../utils/stableId";

type MatchOpts = {
  hours: number;      // window for signals
  maxSignals: number; // safety limit
  maxCards: number;   // safety limit
};

function nowMinusHours(h: number) {
  return Date.now() - h * 60 * 60 * 1000;
}

function norm(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s\-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string) {
  const t = norm(s);
  const parts = t.split(" ").map(x => x.trim()).filter(Boolean);
  // keep useful tokens only
  return parts.filter(p => p.length >= 3 && p.length <= 30);
}

function buildKeywordIndex(cards: any[]) {
  // token -> set(cardId)
  const index = new Map<string, Set<string>>();
  const cardKeywords = new Map<string, Set<string>>(); // cardId -> tokens

  for (const c of cards) {
    const cardId = String(c.cardId ?? c._id ?? "").trim();
    if (!cardId) continue;

    const kws: string[] = [
      String(c.name ?? ""),
      ...(Array.isArray(c.keywords) ? c.keywords.map(String) : []),
      String(c.clubName ?? ""),
      String(c.leagueName ?? ""),
      String(c.nationName ?? ""),
      String(c.position ?? ""),
      c.overall ? `ovr ${c.overall}` : "",
      c.overall ? String(c.overall) : ""
    ].filter(Boolean);

    const tokSet = new Set<string>();
    for (const kw of kws) {
      for (const tok of tokenize(kw)) tokSet.add(tok);
    }

    // push stronger tokens: lastName, commonName
    for (const tok of tokenize(c.lastName ?? "")) tokSet.add(tok);
    for (const tok of tokenize(c.commonName ?? "")) tokSet.add(tok);

    // store
    cardKeywords.set(cardId, tokSet);

    // inverted index
    for (const tok of tokSet) {
      if (!index.has(tok)) index.set(tok, new Set());
      index.get(tok)!.add(cardId);
    }
  }

  return { index, cardKeywords };
}

function matchCardsForSignal(index: Map<string, Set<string>>, signalText: string) {
  const tokens = new Set(tokenize(signalText));
  const candidates = new Map<string, number>(); // cardId -> hit count

  for (const tok of tokens) {
    const ids = index.get(tok);
    if (!ids) continue;
    for (const id of ids) {
      candidates.set(id, (candidates.get(id) ?? 0) + 1);
    }
  }

  // require at least 2 token hits to reduce false positives
  const matched = Array.from(candidates.entries())
    .filter(([, hits]) => hits >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, hits]) => ({ cardId: id, hits }));

  return matched;
}

export async function matchEntities(env: any, opts: MatchOpts) {
  const since = nowMinusHours(opts.hours);

  const cardsRes = await mongoFind(env, {
    collection: "cards",
    filter: {},
    limit: Math.min(20000, Math.max(1, opts.maxCards)),
    sort: { updatedAt: -1 },
    projection: {
      cardId: 1, _id: 1, name: 1, keywords: 1, clubName: 1, leagueName: 1, nationName: 1,
      position: 1, overall: 1, lastName: 1, commonName: 1
    }
  });
  const cards = (cardsRes?.documents ?? []) as any[];

  const { index } = buildKeywordIndex(cards);

  const sigRes = await mongoFind(env, {
    collection: "signals",
    filter: { publishedAt: { $gte: since } },
    limit: Math.min(5000, Math.max(50, opts.maxSignals)),
    sort: { publishedAt: -1 },
    projection: { id: 1, _id: 1, text: 1, title: 1, sourceId: 1, trust: 1, sentiment: 1, hype: 1, publishedAt: 1, createdAt: 1, url: 1 }
  });
  const signals = (sigRes?.documents ?? []) as any[];

  let matchedSignals = 0;
  let totalMatches = 0;

  const matchDocs: any[] = [];
  const cardAttention = new Map<string, { mentions: number; trustSum: number; sentSum: number; hypeSum: number; lastSeenAt: number }>();

  for (const s of signals) {
    const text = String(s.text ?? s.title ?? "");
    const matches = matchCardsForSignal(index, text);
    if (!matches.length) continue;

    matchedSignals++;
    totalMatches += matches.length;

    const sid = String(s.id ?? s._id ?? stableId(`${s.sourceId}|${s.url}|${s.title}`));
    const publishedAt = Number(s.publishedAt ?? s.createdAt ?? Date.now());

    for (const m of matches) {
      matchDocs.push({
        _id: stableId(`match:${sid}:${m.cardId}`),
        signalId: sid,
        cardId: m.cardId,
        hits: m.hits,
        sourceId: s.sourceId,
        trust: Number(s.trust ?? 0.5),
        sentiment: Number(s.sentiment ?? 0),
        hype: Number(s.hype ?? 0),
        publishedAt,
        createdAt: Date.now()
      });

      const acc = cardAttention.get(m.cardId) ?? { mentions: 0, trustSum: 0, sentSum: 0, hypeSum: 0, lastSeenAt: 0 };
      acc.mentions += 1;
      acc.trustSum += Number(s.trust ?? 0.5);
      acc.sentSum += Number(s.sentiment ?? 0);
      acc.hypeSum += Number(s.hype ?? 0);
      acc.lastSeenAt = Math.max(acc.lastSeenAt, publishedAt);
      cardAttention.set(m.cardId, acc);
    }
  }

  // persist matches (idempotent via stable _id)
  for (const doc of matchDocs) {
    await mongoUpdateOne(env, {
      collection: "signal_card_matches",
      filter: { _id: doc._id },
      update: { $set: doc, $setOnInsert: { createdAt: doc.createdAt } },
      upsert: true
    });
  }

  // update per-card attention aggregate for last 6h window
  const aggDocs: any[] = [];
  for (const [cardId, acc] of cardAttention.entries()) {
    const m = Math.max(1, acc.mentions);
    aggDocs.push({
      _id: stableId(`cardatt:${cardId}:${opts.hours}h:${Math.floor(Date.now() / (60 * 60 * 1000))}`),
      cardId,
      windowHours: opts.hours,
      mentions: acc.mentions,
      avgTrust: acc.trustSum / m,
      avgSentiment: acc.sentSum / m,
      avgHype: acc.hypeSum / m,
      lastSeenAt: acc.lastSeenAt,
      createdAt: Date.now()
    });
  }

  if (aggDocs.length) {
    await mongoInsertMany(env, { collection: "card_attention", documents: aggDocs });
  }

  await mongoUpdateOne(env, {
    collection: "jobs_state",
    filter: { _id: "entity_match_latest" },
    update: {
      $set: {
        _id: "entity_match_latest",
        ranAt: Date.now(),
        windowHours: opts.hours,
        scannedSignals: signals.length,
        matchedSignals,
        totalMatches,
        cardsIndexed: cards.length
      },
      $setOnInsert: { createdAt: Date.now() }
    },
    upsert: true
  });

  return {
    windowHours: opts.hours,
    cardsIndexed: cards.length,
    scannedSignals: signals.length,
    matchedSignals,
    totalMatches,
    attentionDocsSaved: aggDocs.length
  };
}
