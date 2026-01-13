import { mongoFind, mongoUpdateOne, mongoInsertMany } from "../db/mongo/dataApi";

function nowMinusHours(h: number) {
  return Date.now() - h * 60 * 60 * 1000;
}

export async function evaluatePredictionRuns(env: any, opts: { hours: number; maxRuns: number }) {
  const cutoff = nowMinusHours(opts.hours);

  // find runs older than cutoff and not evaluated
  const runsRes = await mongoFind(env, {
    collection: "prediction_runs",
    filter: { createdAt: { $lte: cutoff }, evaluatedAt: { $exists: false } },
    limit: Math.min(200, Math.max(1, opts.maxRuns)),
    sort: { createdAt: 1 }
  });

  const runs = (runsRes?.documents ?? []) as any[];
  if (!runs.length) return { evaluatedRuns: 0, message: "nothing to evaluate" };

  let evaluated = 0;
  const outcomeDocs: any[] = [];

  for (const run of runs) {
    const recs = Array.isArray(run.recommendations) ? run.recommendations : [];
    if (!recs.length) {
      await mongoUpdateOne(env, {
        collection: "prediction_runs",
        filter: { _id: run._id },
        update: { $set: { evaluatedAt: Date.now(), evalNote: "no recommendations" } }
      });
      evaluated++;
      continue;
    }

    // fetch current prices for referenced cards
    const cardIds = recs.map((r: any) => String(r.cardId)).filter(Boolean);
    const cardsRes = await mongoFind(env, {
      collection: "cards",
      filter: { cardId: { $in: cardIds } },
      limit: Math.min(500, cardIds.length),
      sort: {}
    });
    const cards = (cardsRes?.documents ?? []) as any[];
    const priceMap = new Map<string, number>();
    for (const c of cards) {
      const p = Number(c.price ?? 0);
      if (p > 0) priceMap.set(String(c.cardId), p);
    }

    // evaluate each recommendation: did price move favorably?
    const eaTax = Number(run.eaTaxPct ?? 5);

    let hit = 0, miss = 0, unknown = 0;
    const itemOutcomes: any[] = [];

    for (const r of recs) {
      const id = String(r.cardId);
      const buy = Number(r.buy ?? 0);
      const expectedSell = Number(r.expectedSell ?? 0);
      const nowPrice = priceMap.get(id);

      if (!nowPrice || !buy) { unknown++; continue; }

      // If current market price >= expectedSell we count as hit
      const isHit = nowPrice >= expectedSell;

      // Also compute realized net profit if sold now
      const realizedProfitPct = ((nowPrice * (1 - eaTax / 100)) / buy - 1) * 100;

      if (isHit) hit++; else miss++;

      itemOutcomes.push({
        cardId: id,
        buy,
        expectedSell,
        nowPrice,
        realizedProfitPct: Math.round(realizedProfitPct * 10) / 10,
        hit: isHit
      });

      // update per-card learning stats
      await mongoUpdateOne(env, {
        collection: "card_learning",
        filter: { cardId: id },
        update: {
          $inc: { runs: 1, hits: isHit ? 1 : 0, misses: isHit ? 0 : 1 },
          $set: { updatedAt: Date.now() },
          $setOnInsert: { createdAt: Date.now(), cardId: id }
        },
        upsert: true
      });
    }

    const summary = {
      runId: run._id,
      createdAt: run.createdAt,
      evaluatedAt: Date.now(),
      hours: opts.hours,
      hit,
      miss,
      unknown,
      hitRate: (hit + miss) ? Math.round((hit / (hit + miss)) * 1000) / 10 : null,
      items: itemOutcomes.slice(0, 200)
    };

    outcomeDocs.push(summary);

    await mongoUpdateOne(env, {
      collection: "prediction_runs",
      filter: { _id: run._id },
      update: { $set: { evaluatedAt: Date.now(), evalSummary: summary } }
    });

    evaluated++;
  }

  if (outcomeDocs.length) {
    await mongoInsertMany(env, { collection: "prediction_outcomes", documents: outcomeDocs });
  }

  return { evaluatedRuns: evaluated, outcomesSaved: outcomeDocs.length };
}
