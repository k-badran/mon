import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

/**
 * Assigns every request a correlation id.
 *
 * The id is echoed in the response header and included in error bodies and
 * audit rows, so a customer reporting a failure can quote one value that
 * points at the exact request in the logs.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers["x-request-id"];
  const requestId = typeof inbound === "string" && inbound.length <= 64 ? inbound : randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  next();
}
