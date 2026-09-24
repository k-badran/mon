import { env } from "@umzugplus/config";
import { Redis } from "ioredis";

import { logger } from "./logger.js";

/**
 * Redis connection, used for rate limiting, caching and real-time pub/sub.
 *
 * `maxRetriesPerRequest: null` lets commands queue during a brief outage
 * instead of failing immediately; combined with the backoff below, a Redis
 * restart degrades throughput rather than taking the API down.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
});

redis.on("error", (error) => logger.error({ err: error }, "Redis error"));
redis.on("ready", () => logger.info("Redis connected"));

export async function closeRedis(): Promise<void> {
  await redis.quit();
}

export async function pingRedis(): Promise<boolean> {
  try {
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
}
