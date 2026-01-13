import { crawlOnce } from "../crawler";
import { getRedis } from "../../db/redis/client";
import { mongoInsertMany } from "../../db/mongo/dataApi";
import { runWithConcurrency } from "../../utils/concurrency";

type RunAllOpts = {
  reason: "cron" | "http";
  overrideQueries?: string[];
};

function parseQueries(env: any, override?: string[]) {
  if (override && override.length) return override;
  const raw = String(env.CRAWL_QUERIES ?? "").trim();
  if (!raw) return ["EA FC 26 FUT trading"];
  return raw.split(",").map((s: string) => s.trim()).filter(Boolean);
}

export async function runAllQueries(env: any, opts: RunAllOpts) {
  const redis = getRedis(env);

  const lockSec = Number(env.CRAWL_RUNALL_LOCK_SEC ?? 240);
  const lockKey = "lock:crawl:runAll";
  const got = await redis.set(lockKey, JSON.stringify({ ts: Date.now(), reason: opts.reason }), { nx: true, ex: lockSec });
  if (!got) {
    return { ran: false, message: "runAll already running", reason: opts.reason };
  }

  const startedAt = Date.now();
  const queries = parseQueries(env, opts.overrideQueries);
  const concurrency = Math.max(1, Number(env.CRAWL_CONCURRENCY ?? 3));

  try {
    const results = await runWithConcurrency(queries, concurrency, async (q) => {
      try {
        const r = await crawlOnce(env, { query: q });
        return { query: q, ok: true, ...r };
      } catch (e: any) {
        return { query: q, ok: false, error: String(e?.message ?? e) };
      }
    });

    const endedAt = Date.now();

    const summary = {
      reason: opts.reason,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      concurrency,
      queries,
      success: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      totalFetched: results.reduce((a, r: any) => a + (r.fetched ?? 0), 0),
      totalKept: results.reduce((a, r: any) => a + (r.kept ?? 0), 0),
      totalSaved: results.reduce((a, r: any) => a + (r.saved ?? 0), 0),
      results
    };

    // Cache last run (quick access)
    await redis.set("crawl:lastRun", summary, { ex: 60 * 60 });

    // Persist run report
    await mongoInsertMany(env, {
      collection: "crawl_runs",
      documents: [summary]
    });

    return { ran: true, ...summary };
  } finally {
    await redis.del(lockKey);
  }
}
