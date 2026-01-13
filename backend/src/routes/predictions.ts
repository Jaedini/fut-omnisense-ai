import { Hono } from "hono";
import { buildRecommendations } from "../predictions/recommendations";

export const predictionsRoute = new Hono();

predictionsRoute.get("/recommendations", async (c) => {
  try {
    const budget = Number(c.req.query("budget") ?? 50000);
    const minProfitPct = Number(c.req.query("minProfitPct") ?? 10);

    const recs = await buildRecommendations(c.env, { budget, minProfitPct });

    return c.json({
      ok: true,
      budget,
      minProfitPct,
      count: recs.length,
      recommendations: recs
    });
  } catch (e: any) {
    return c.json(
      { ok: false, error: String(e?.message ?? e), where: "predictions/recommendations" },
      500
    );
  }
});
