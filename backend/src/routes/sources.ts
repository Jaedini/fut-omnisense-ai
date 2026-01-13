import { Hono } from "hono";
import { getRedis } from "../db/redis/client";

export const sourcesRoute = new Hono();

sourcesRoute.get("/status", async (c) => {
  const redis = getRedis(c.env);
  const lastRun = await redis.get("crawl:lastRun");
  return c.json({ ok: true, lastRun });
});
