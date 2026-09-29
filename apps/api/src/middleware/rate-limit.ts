import { isTest } from "@mon/config";
import type { Request } from "express";
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

import { redis } from "../lib/redis.js";

/**
 * Rate limiting, backed by Redis so the limit is shared across API instances.
 * An in-memory limiter would let an attacker multiply their allowance by the
 * number of running processes.
 */
function createLimiter(options: {
  windowMs: number;
  max: number;
  prefix: string;
  byUserOrIp?: boolean;
}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Disabled under test so suites are not throttled by their own speed.
    skip: () => isTest,
    store: new RedisStore({
      prefix: `ratelimit:${options.prefix}:`,
      // ioredis types `call` as (command, ...args); the store hands us one
      // flat array, so destructure the command off the front.
      sendCommand: (...args: string[]) => {
        const [command, ...rest] = args as [string, ...string[]];
        return redis.call(command, ...rest) as Promise<never>;
      },
    }),
    keyGenerator: (req: Request) =>
      options.byUserOrIp && req.user ? `user:${req.user.id}` : `ip:${req.ip ?? "unknown"}`,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please wait a moment and try again.",
      },
    },
  });
}

/** Strict: login, registration, password change. Credential-stuffing defence. */
export const authRateLimit = createLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  prefix: "auth",
});

/**
 * The assistant is answered from the local knowledge base, so a message costs
 * a database read rather than an API call. The limit is therefore about abuse
 * and scraping, not spend — 12/min was tight enough that a customer asking
 * several questions in a row would hit it.
 */
export const chatRateLimit = createLimiter({
  windowMs: 60_000,
  max: 30,
  prefix: "chat",
  byUserOrIp: true,
});

/** Geocoding proxies a service with its own strict quota. */
export const geocodingRateLimit = createLimiter({
  windowMs: 60_000,
  max: 30,
  prefix: "geo",
  byUserOrIp: true,
});

/** Pricing is CPU-bound and anonymous, so it needs a ceiling of its own. */
export const quoteRateLimit = createLimiter({
  windowMs: 60_000,
  max: 30,
  prefix: "quote",
  byUserOrIp: true,
});

/**
 * Photo uploads. Each one can be 8 MB and becomes a paid S3 object, so the
 * ceiling is far below the global one — generous for an editor swapping a
 * page's photos, small enough that a stolen session cannot fill the bucket.
 */
export const uploadRateLimit = createLimiter({
  windowMs: 10 * 60_000,
  max: 30,
  prefix: "upload",
  byUserOrIp: true,
});

/** Broad backstop for everything else. */
export const globalRateLimit = createLimiter({
  windowMs: 60_000,
  max: 300,
  prefix: "global",
  byUserOrIp: true,
});
