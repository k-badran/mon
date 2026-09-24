import { pingDatabase } from "@umzugplus/db";
import { Router } from "express";

import { pingRedis } from "../../lib/redis.js";
import { asyncHandler } from "../../middleware/error-handler.js";

export const healthRouter: Router = Router();

/** Liveness: is the process up? Never touches dependencies. */
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
});

/**
 * Readiness: can this instance actually serve traffic?
 * Returns 503 when a dependency is down, so a load balancer stops routing here.
 */
healthRouter.get(
  "/health/ready",
  asyncHandler(async (_req, res) => {
    const [database, cache] = await Promise.all([pingDatabase(), pingRedis()]);
    const ready = database && cache;

    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "degraded",
      checks: { database, cache },
    });
  }),
);
