import { isProduction } from "@umzugplus/config";
import { PricingError } from "@umzugplus/core";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { AppError, type ErrorResponseBody } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

/**
 * The single place an error becomes an HTTP response.
 *
 * Two rules it enforces:
 *
 *  1. **Nothing unexpected leaks.** Only `AppError` messages are sent to the
 *     client. An unrecognised error becomes a generic 500 — a database error
 *     string can contain table names, column names and sometimes row values.
 *
 *  2. **Everything is logged with its request id**, so the generic message the
 *     client sees can still be traced to a precise stack server-side.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Delegate to Express if the response already started streaming.
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestId = req.requestId ?? "unknown";
  const appError = normalize(error);

  const logPayload = {
    requestId,
    code: appError.code,
    statusCode: appError.statusCode,
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
  };

  if (appError.statusCode >= 500) {
    logger.error({ ...logPayload, err: error }, appError.message);
  } else {
    logger.warn(logPayload, appError.message);
  }

  const body: ErrorResponseBody = {
    error: {
      code: appError.code,
      // A 500's real message may describe internals, so replace it outright.
      message:
        appError.statusCode >= 500 && isProduction
          ? "An unexpected error occurred."
          : appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
      requestId,
    },
  };

  res.status(appError.statusCode).json(body);
}

/** Maps known error types onto the AppError vocabulary. */
function normalize(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError("VALIDATION_FAILED", 422, "Request validation failed.", {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof PricingError) {
    return new AppError("PRICING_FAILED", 422, error.message, { reason: error.code });
  }

  if (isPostgresError(error)) {
    return mapPostgresError(error);
  }

  return AppError.internal();
}

interface PostgresError {
  code: string;
  constraint_name?: string;
  detail?: string;
}

function isPostgresError(error: unknown): error is PostgresError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/**
 * Translates Postgres constraint violations into meaningful client errors,
 * rather than letting every one of them surface as an opaque 500.
 */
function mapPostgresError(error: PostgresError): AppError {
  switch (error.code) {
    case "23505": // unique_violation
      if (error.constraint_name?.includes("users_email")) {
        return AppError.conflict("EMAIL_TAKEN", "An account with this email already exists.");
      }
      return AppError.conflict("CONFLICT", "This record already exists.");

    case "23503": // foreign_key_violation
      return AppError.badRequest("A referenced record does not exist.");

    case "23514": // check_violation
      return AppError.unprocessable("A value violates a database constraint.");

    case "40001": // serialization_failure — lost a race, safe to retry
      return AppError.conflict("CONFLICT", "The resource changed concurrently. Please retry.");

    case "57014": // query_canceled (statement timeout)
      return new AppError("SERVICE_UNAVAILABLE", 503, "The request took too long.");

    default:
      return AppError.internal();
  }
}

/** Terminal 404 for unmatched routes. Mount after all other routes. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
}

/**
 * Wraps an async handler so a rejected promise reaches the error handler.
 *
 * Express 4 does not await handlers, so without this an async throw becomes an
 * unhandled rejection and the client is left hanging until timeout.
 */
export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
