import { Hono } from "hono";
import { buildAnalysisSummary } from "../analysis/summary";
import { rebuildAggregates } from "../analysis/rebuildAggregates";
import { matchEntities } from "../analysis/entityMatcher";
import { tagEvents } from "../analysis/eventTagger";

export const analysisRoute = new Hono();

analysisRoute.get("/summary", async (c) => {
  const q = c.req.query("q") ?? "EA FC 26 FUT trading";
  const hours = Number(c.req.query("hours") ?? 6);
  const res = await buildAnalysisSummary(c.env, { query: q, hours });
  return c.json({ ok: true, ...res });
});

analysisRoute.post("/rebuild", async (c) => {
  const hours = Number(c.req.query("hours") ?? 72);
  const res = await rebuildAggregates(c.env, { hours });
  return c.json({ ok: true, ...res });
});

analysisRoute.post("/matchEntities", async (c) => {
  const hours = Number(c.req.query("hours") ?? 6);
  const maxSignals = Number(c.req.query("maxSignals") ?? 1500);
  const maxCards = Number(c.req.query("maxCards") ?? 15000);
  const res = await matchEntities(c.env, { hours, maxSignals, maxCards });
  return c.json({ ok: true, ...res });
});

analysisRoute.post("/tagEvents", async (c) => {
  const hours = Number(c.req.query("hours") ?? 72);
  const maxSignals = Number(c.req.query("maxSignals") ?? 2000);
  const res = await tagEvents(c.env, { hours, maxSignals });
  return c.json({ ok: true, ...res });
});
