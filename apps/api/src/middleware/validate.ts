import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

import { AppError } from "../lib/errors.js";

/**
 * Validates and *replaces* the request parts with their parsed results, so
 * handlers receive typed, coerced data and can never read an unvalidated field.
 */
export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        // `req.query` has only a getter in Express 5, so assign the parsed
        // result onto a separate property rather than overwriting it.
        Object.defineProperty(req, "query", {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
        });
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError("VALIDATION_FAILED", 422, "The request body failed validation.", {
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
              code: issue.code,
            })),
          }),
        );
        return;
      }

      next(error);
    }
  };
}

/** Helper for typing a validated handler's request. */
export type Validated<S extends ValidationSchemas> = Request<
  S["params"] extends ZodTypeAny ? z.infer<S["params"]> : Record<string, string>,
  unknown,
  S["body"] extends ZodTypeAny ? z.infer<S["body"]> : unknown,
  S["query"] extends ZodTypeAny ? z.infer<S["query"]> : unknown
>;

/**
 * Reads the parts `validate()` already parsed, with their real types.
 *
 * Express types `req.query` as `ParsedQs` and `req.params` as a string record,
 * so a validated value still arrives untyped. These helpers narrow it in one
 * place rather than scattering casts through the handlers — the value has
 * genuinely been parsed by the schema before a handler can reach it.
 */
export function validatedQuery<T>(req: Request): T {
  return req.query as unknown as T;
}

export function validatedParams<T>(req: Request): T {
  return req.params as unknown as T;
}
