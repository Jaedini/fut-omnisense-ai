import { Hono } from "hono";
import { evaluatePredictionRuns } from "../learning/evaluate";

function requireAdmin(c: any) {
  const token = c.env.ADMIN_TOKEN;
  const got = c.req.header("x-admin-token") || c.req.query("admin");
  return token && got === token;
}

export const learningRoute = new Hono();

/**
 * POST /learning/evaluate?hours=6
 */
learningRoute.post("/evaluate", async (c) => {
  if (!requireAdmin(c)) return c.json({ ok: false, error: "unauthorized" }, 401);

  const hours = Number(c.req.query("hours") ?? Number(c.env.EVAL_HOURS ?? 6));
  const maxRuns = Number(c.env.EVAL_MAX_RUNS ?? 50);

  const res = await evaluatePredictionRuns(c.env, { hours, maxRuns });
  return c.json({ ok: true, ...res });
});
