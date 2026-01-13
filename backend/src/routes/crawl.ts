import { Hono } from "hono";
import { getRedis } from "../db/redis/client";
import { crawlOnce } from "../crawler/crawler";
import { runAllQueries } from "../crawler/scheduler/runAll";

export const crawlRoute = new Hono();

crawlRoute.get("/run", async (c) => {
  const q = (c.req.query("q") ?? "EA FC 26 FUT trading") as string;

  const redis = getRedis(c.env);
  const lockKey = `lock:crawl:${q}`;
  const got = await redis.set(lockKey, "1", { nx: true, ex: 90 });
  if (!got) return c.json({ ok: false, message: "crawl already running for query" }, 429);

  try {
    const res = await crawlOnce(c.env, { query: q });
    return c.json({ ok: true, ...res });
  } finally {
    await redis.del(lockKey);
  }
});

/**
 * GET /crawl/runAll
 * Optional:
 *  - q=comma,separated,queries   (überschreibt env.CRAWL_QUERIES)
 */
crawlRoute.get("/runAll", async (c) => {
  const q = c.req.query("q");
  const override = q ? q.split(",").map(s => s.trim()).filter(Boolean) : undefined;

  const result = await runAllQueries(c.env, {
    reason: "http",
    overrideQueries: override
  });

  return c.json({ ok: true, ...result });
});
