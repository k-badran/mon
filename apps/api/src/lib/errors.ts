/**
 * The application's error vocabulary.
 *
 * Every failure that reaches a client is one of these, so responses have a
 * single predictable shape and a stable machine-readable `code`. The legacy
 * app returned ad-hoc German sentences, which the frontend then matched on
 * with `message.includes("Invalid login")` — a string comparison standing in
 * for an error contract.
 */

export type ErrorCode =
  // 400 family
  | "VALIDATION_FAILED"
  | "INVALID_INPUT"
  // 401
  | "UNAUTHENTICATED"
  | "TOKEN_EXPIRED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_BLOCKED"
  // 403
  | "FORBIDDEN"
  | "INSUFFICIENT_ROLE"
  // 404
  | "NOT_FOUND"
  // 409
  | "CONFLICT"
  | "EMAIL_TAKEN"
  | "SLOT_TAKEN"
  | "INVALID_STATE_TRANSITION"
  | "QUOTE_EXPIRED"
  | "QUOTE_ALREADY_USED"
  // 422
  | "UNPROCESSABLE"
  | "PRICING_FAILED"
  // 429
  | "RATE_LIMITED"
  // 5xx
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    message: string,
    /** Safe to expose. Never put secrets or internal identifiers here. */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, AppError);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError("INVALID_INPUT", 400, message, details);
  }

  static unauthenticated(message = "Authentication is required."): AppError {
    return new AppError("UNAUTHENTICATED", 401, message);
  }

  static invalidCredentials(): AppError {
    // Deliberately vague: distinguishing "no such user" from "wrong password"
    // turns the login form into an account-enumeration oracle.
    return new AppError("INVALID_CREDENTIALS", 401, "Email or password is incorrect.");
  }

  static forbidden(message = "You do not have access to this resource."): AppError {
    return new AppError("FORBIDDEN", 403, message);
  }

  static insufficientRole(required: string): AppError {
    return new AppError("INSUFFICIENT_ROLE", 403, `This action requires the ${required} role.`);
  }

  static notFound(resource: string): AppError {
    return new AppError("NOT_FOUND", 404, `${resource} was not found.`);
  }

  static conflict(code: ErrorCode, message: string, details?: unknown): AppError {
    return new AppError(code, 409, message, details);
  }

  static unprocessable(message: string, details?: unknown): AppError {
    return new AppError("UNPROCESSABLE", 422, message, details);
  }

  static internal(message = "An unexpected error occurred."): AppError {
    return new AppError("INTERNAL_ERROR", 500, message);
  }
}

/** The single response body shape for every error. */
export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId: string;
  };
}
