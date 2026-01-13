import { mongoFind } from "../db/mongo/dataApi";

function nowMinusHours(h: number) {
  return Date.now() - h * 60 * 60 * 1000;
}

export async function buildAnalysisSummary(env: any, opts: { query: string; hours: number }) {
  const since = nowMinusHours(opts.hours);

  // Pull recent signals
  const signalsRes = await mongoFind(env, {
    collection: "signals",
    filter: { publishedAt: { $gte: since } },
    limit: 500,
    sort: { publishedAt: -1 }
  });

  const signals = (signalsRes?.documents ?? []) as any[];

  // very simple summary stats
  const total = signals.length;
  const avgTrust = total ? signals.reduce((a, s) => a + (Number(s.trust ?? 0.5)), 0) / total : 0;
  const avgSent = total ? signals.reduce((a, s) => a + (Number(s.sentiment ?? 0)), 0) / total : 0;
  const avgHype = total ? signals.reduce((a, s) => a + (Number(s.hype ?? 0)), 0) / total : 0;

  // top sources
  const bySource = new Map<string, number>();
  for (const s of signals) bySource.set(s.sourceId, (bySource.get(s.sourceId) ?? 0) + 1);
  const topSources = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([sourceId, count]) => ({ sourceId, count }));

  return {
    query: opts.query,
    windowHours: opts.hours,
    since,
    totals: { totalSignals: total, avgTrust, avgSentiment: avgSent, avgHype },
    topSources,
    latestSignals: signals.slice(0, 30)
  };
}
