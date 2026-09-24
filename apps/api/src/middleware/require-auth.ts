import { TokenError, verifyAccessToken, type UserRole } from "@umzugplus/auth";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../lib/errors.js";

/**
 * Server-side authentication and authorisation.
 *
 * This replaces the legacy approach entirely. There, the admin panel was a
 * client component whose only protection was:
 *
 *     useEffect(() => { if (!isAdmin) router.push("/") }, [...]);
 *
 * — a cosmetic redirect that ran *after* the data had already been fetched in
 * the browser. Authorisation now happens before any handler runs, on the
 * server, against a cryptographically verified token.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Present only after `requireAuth` has run. */
      user?: {
        id: string;
        role: UserRole;
        email: string;
        sessionId: string;
      };
      requestId: string;
    }
  }
}

/**
 * Rejects the request unless it carries a valid access token.
 * Attaches the verified identity to `req.user`.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    next(AppError.unauthenticated("A bearer access token is required."));
    return;
  }

  try {
    const claims = await verifyAccessToken(token);

    req.user = {
      id: claims.sub,
      role: claims.role,
      email: claims.email,
      sessionId: claims.sid,
    };

    next();
  } catch (error) {
    if (error instanceof TokenError && error.code === "EXPIRED") {
      // A distinct code lets the client refresh silently instead of logging
      // the user out on every access-token expiry.
      next(new AppError("TOKEN_EXPIRED", 401, "Access token has expired."));
      return;
    }

    next(AppError.unauthenticated("Access token is not valid."));
  }
}

/**
 * Restricts a route to the given roles. Must run after `requireAuth`.
 *
 *   router.get("/orders", requireAuth, requireRole("staff", "admin"), handler)
 */
export function requireRole(...allowed: readonly UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      // A programming error rather than a client error: the guard was
      // mounted without `requireAuth` in front of it.
      next(AppError.internal("requireRole was used without requireAuth."));
      return;
    }

    if (!allowed.includes(req.user.role)) {
      next(AppError.insufficientRole(allowed.join(" or ")));
      return;
    }

    next();
  };
}

/**
 * Attaches the user when a token is present, but allows anonymous access.
 *
 * Used by the price calculator, which works without an account — the quote is
 * linked to the user when there is one, and adopted at signup when there is not.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const claims = await verifyAccessToken(token);
    req.user = {
      id: claims.sub,
      role: claims.role,
      email: claims.email,
      sessionId: claims.sid,
    };
  } catch {
    // An invalid token on an optional route is simply treated as anonymous.
  }

  next();
}

/**
 * Guards a resource owned by a specific user: the owner may act on it, and so
 * may staff and admins. Pass a function that resolves the owner's id.
 */
export function requireOwnershipOr(
  ...elevatedRoles: readonly UserRole[]
): (ownerId: string, req: Request) => void {
  return (ownerId, req) => {
    if (!req.user) {
      throw AppError.unauthenticated();
    }

    if (req.user.id === ownerId) return;
    if (elevatedRoles.includes(req.user.role)) return;

    // 404 rather than 403: confirming a resource exists but is not yours
    // leaks its existence to anyone probing ids.
    throw AppError.notFound("Resource");
  };
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}
