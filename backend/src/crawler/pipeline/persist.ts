import { Signal } from "../types";
import { mongoInsertMany } from "../../db/mongo/dataApi";
import { getRedis } from "../../db/redis/client";

export async function persistSignals(env: any, signals: Signal[]): Promise<number> {
  if (!signals.length) return 0;

  // Redis dedup barrier (avoid re-inserting across runs)
  const redis = getRedis(env);
  const toSave: Signal[] = [];
  for (const s of signals) {
    const key = `sig:${s.id}`;
    const exists = await redis.get(key);
    if (exists) continue;
    await redis.set(key, "1", { ex: 60 * 60 * 24 * 3 }); // 3 days
    toSave.push(s);
  }
  if (!toSave.length) return 0;

  // MongoDB Data API insert
  await mongoInsertMany(env, { collection: "signals", documents: toSave });
  return toSave.length;
}
