// backend/src/routes/pipeline.ts
import { Hono } from "hono";
import { requireAdmin } from "../middleware/admin";
import { runAllQueries } from "../crawler/scheduler/runAll";
import { rebuildAggregates } from "../analysis/rebuildAggregates";
import { matchEntities } from "../analysis/entityMatcher";
import { tagEvents } from "../analysis/eventTagger";
import { updatePrices } from "../prices/updatePrices";
import { buildRecommendations } from "../predictions/recommendations";
import { mongoInsertMany } from "../db/mongo/dataApi";

export const pipelineRoute = new Hono();

/**
 * POST /pipeline/run
 * Optional query params:
 *  - budget=50000
 *  - minProfitPct=10
 *  - crawlHours=72 (used for tagEvents scanning window)
 *  - matchHours=6  (attention window)
 *  - rebuildHours=72
 *  - updatePrices=1 (default 0)
 *  - save=1 (default 1) saves recommendations snapshot for learning
 */
pipelineRoute.use("/run", requireAdmin);
pipelineRoute.post("/run", async (c) => {
  const budget = Number(c.req.query("budget") ?? 50000);
  const minProfitPct = Number(c.req.query("minProfitPct") ?? 10);

  const crawlHours = Number(c.req.query("crawlHours") ?? 72);
  const matchHours = Number(c.req.query("matchHours") ?? 6);
  const rebuildHours = Number(c.req.query("rebuildHours") ?? 72);

  const doUpdatePrices = (c.req.query("updatePrices") ?? "0") === "1";
  const doSave = (c.req.query("save") ?? "1") === "1";

  const startedAt = Date.now();
  const steps: any[] = [];

  // 1) Crawl (multi-query)
  const crawlRes = await runAllQueries(c.env, { reason: "http", overrideQueries: undefined });
  steps.push({ step: "crawl.runAll", ...crawlRes });

  // 2) Tag events (scan larger window)
  const tagRes = await tagEvents(c.env, { hours: crawlHours, maxSignals: 2500 });
  steps.push({ step: "analysis.tagEvents", ...tagRes });

  // 3) Match entities -> card_attention
  const matchRes = await matchEntities(c.env, { hours: matchHours, maxSignals: 2000, maxCards: 15000 });
  steps.push({ step: "analysis.matchEntities", ...matchRes });

  // 4) Rebuild aggregates (optional but useful for dashboards)
  const rebuildRes = await rebuildAggregates(c.env, { hours: rebuildHours });
  steps.push({ step: "analysis.rebuildAggregates", ...rebuildRes });

  // 5) Update prices (only if you configured PRICE_SOURCE_URLS)
  if (doUpdatePrices) {
    const upd = await updatePrices(c.env, { ids: undefined, limit: 200 });
    steps.push({ step: "cards.updatePrices", ...upd });
  } else {
    steps.push({ step: "cards.updatePrices", skipped: true });
  }

  // 6) Recommendations (ChatGPT brain)
  const recs = await buildRecommendations(c.env, { budget, minProfitPct });
  steps.push({ step: "predictions.recommendations", count: recs.length });

  // 7) Save run snapshot (for learning evaluate)
  if (doSave) {
    await mongoInsertMany(c.env, {
      collection: "prediction_runs",
      documents: [{
        createdAt: Date.now(),
        budget,
        minProfitPct,
        eaTaxPct: 5,
        recommendations: recs
      }]
    });
    steps.push({ step: "predictions.save", saved: true });
  } else {
    steps.push({ step: "predictions.save", skipped: true });
  }

  const endedAt = Date.now();

  // Persist pipeline run report
  await mongoInsertMany(c.env, {
    collection: "pipeline_runs",
    documents: [{
      createdAt: startedAt,
      finishedAt: endedAt,
      durationMs: endedAt - startedAt,
      budget,
      minProfitPct,
      doUpdatePrices,
      doSave,
      steps
    }]
  });

  return c.json({
    ok: true,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    budget,
    minProfitPct,
    doUpdatePrices,
    doSave,
    recommendations: recs,
    steps
  });
});
