import { Redis } from "@upstash/redis";

export function getRedis(env: any) {
  return new Redis({ url: env.REDIS_URL, token: env.REDIS_TOKEN });
}
