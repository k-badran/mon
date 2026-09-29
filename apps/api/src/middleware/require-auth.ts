import {
  TokenError,
  verifyAccessToken,
  type AccessTokenClaims,
  type UserRole,
} from "@mon/auth";
import type { NextFunction, Request, Response } from "express";

import { effectiveRole } from "../lib/account-state.js";
import { AppError } from "../lib/errors.js";

/**
 * Server-side authentication.
 *
 * This replaces the legacy approach entirely. There, the admin panel was a
 * client component whose only protection was:
 *
 *     useEffect(() => { if (!isAdmin) router.push("/") }, [...]);
 *
 * — a cosmetic redirect that ran *after* the data had already been fetched in
 * the browser. Authorisation now happens before any handler runs, on the
 * server, against a cryptographically verified token.
 *
 * ## The token says who, the database says what
 *
 * A verified token is proof of identity and nothing else. Its `role` claim is
 * discarded here and the account is re-read, so blocking or demoting someone
 * takes effect on their next request instead of when their token happens to
 * expire. Customer routes need this as much as staff routes do: they authorise
 * by ownership and never reach `requirePermission`, so without the read a
 * blocked customer kept placing orders for the rest of the token's life.
 *
 * There is deliberately no `requireRole` here any more. Naming roles at the
 * route meant every route had to be revisited when a role was added, and the
 * check ran against the token's claim; `requirePermission` asks what the caller
 * may do and answers from the database.
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
      /**
       * The role the database held when this request arrived — never the
       * token's copy of it. Set by `requireAuth` and `optionalAuth`; read by
       * `requirePermission` so one request does not ask the same question
       * twice. Absent means nobody has asked yet, not that the answer is no.
       */
      verifiedRole?: UserRole;
      requestId: string;
    }
  }
}

/**
 * Rejects the request unless it carries a valid access token for an account
 * that is still allowed to act. Attaches the verified identity to `req.user`.
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

  let claims: AccessTokenClaims;

  try {
    claims = await verifyAccessToken(token);
  } catch (error) {
    if (error instanceof TokenError && error.code === "EXPIRED") {
      // A distinct code lets the client refresh silently instead of logging
      // the user out on every access-token expiry.
      next(new AppError("TOKEN_EXPIRED", 401, "Access token has expired."));
      return;
    }

    next(AppError.unauthenticated("Access token is not valid."));
    return;
  }

  // Kept out of the block above so a database failure is reported as itself
  // rather than as an invalid token.
  try {
    const role = await effectiveRole(claims.sub);

    if (!role) {
      // Blocked or deleted since the token was minted. Not TOKEN_EXPIRED: the
      // client must not respond by refreshing, because refreshing would
      // succeed at nothing and hide the reason from the user.
      next(AppError.unauthenticated("This account is no longer active."));
      return;
    }

    req.user = {
      id: claims.sub,
      role,
      email: claims.email,
      sessionId: claims.sid,
    };
    req.verifiedRole = role;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Attaches the user when a token is present, but allows anonymous access.
 *
 * Used by the price calculator, which works without an account — the quote is
 * linked to the user when there is one, and adopted at signup when there is not.
 *
 * A blocked account is treated as anonymous rather than rejected: these routes
 * are open to visitors anyway, so there is nothing to refuse, and leaving the
 * identity attached would let a suspended account keep acting as itself.
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
    const role = await effectiveRole(claims.sub);

    if (role) {
      req.user = {
        id: claims.sub,
        role,
        email: claims.email,
        sessionId: claims.sid,
      };
      req.verifiedRole = role;
    }
  } catch {
    // An invalid token on an optional route is simply treated as anonymous,
    // and so is a failed account read: these routes are open to visitors, so
    // falling back to the anonymous case is falling back to less, not more.
  }

  next();
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice("Bearer ".length).trim();

  return token.length > 0 ? token : null;
}
