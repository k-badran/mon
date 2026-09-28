import type { NextFunction, Request, Response } from "express";

import { can, canAll, canAny, type Permission, type Role } from "@mon/core";

import { effectiveRole } from "../lib/account-state.js";
import { AppError } from "../lib/errors.js";

/**
 * Authorisation by capability.
 *
 * Routes used to name roles — `requireRole("staff", "admin")`. That reads
 * fine until a fourth role exists and every route has to be revisited to
 * decide whether it belongs in the list. Asking for a capability instead —
 * "may this caller change pricing?" — leaves the route alone when the roles
 * change around it, and keeps the answer in one table.
 *
 * ## The role is re-read, not taken from the token
 *
 * The access token carries a role, and trusting it would save a query. But a
 * token minted before someone was demoted keeps asserting the old role until
 * it expires — up to fifteen minutes during which a revoked administrator is
 * still an administrator. `requireAuth` has already resolved the account
 * against the database for this request and left the answer on `req`; this
 * guard reuses that rather than repeating the read, and falls back to its own
 * read so it is still correct if it is ever mounted on its own.
 */

/** The caller's role as the database has it for this request. */
async function roleForRequest(req: Request, userId: string): Promise<Role | null> {
  return req.verifiedRole ?? (await effectiveRole(userId));
}

/**
 * Requires every listed capability.
 *
 * Several rather than one because some routes genuinely need a combination —
 * assigning a crew is both reading an order and changing it — and spelling
 * that out is clearer than inventing a compound permission for each pairing.
 */
export function requirePermission(...required: readonly Permission[]) {
  return guard("requirePermission", required, canAll, " and ");
}

/**
 * Requires at least one of the listed capabilities.
 *
 * For a tool two editors share: a photo upload serves both the content editor
 * (page photos, `content.write`) and the theme editor (the logo,
 * `theme.write`), and either one alone should be enough to use it.
 */
export function requireAnyPermission(...accepted: readonly Permission[]) {
  return guard("requireAnyPermission", accepted, canAny, " or ");
}

function guard(
  name: string,
  permissions: readonly Permission[],
  allows: (role: Role, permissions: readonly Permission[]) => boolean,
  joiner: string,
) {
  if (permissions.length === 0) {
    throw new Error(`${name} needs at least one permission.`);
  }

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      // A programming error, not a client error: the guard was mounted
      // without `requireAuth` in front of it.
      next(AppError.internal(`${name} was used without requireAuth.`));
      return;
    }

    try {
      const role = await roleForRequest(req, req.user.id);

      if (!role) {
        next(AppError.unauthenticated());
        return;
      }

      if (!allows(role, permissions)) {
        next(AppError.insufficientRole(permissions.join(joiner)));
        return;
      }

      // Downstream handlers branch on what the caller may do, so they read the
      // verified role rather than the token's copy of it.
      req.user.role = role;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Answers a capability question without rejecting the request.
 *
 * For handlers that serve both sides of a boundary — an order is readable by
 * the customer who placed it and by staff with `orders.read`, and the handler
 * has to know which case it is in to decide how much to return.
 */
export async function hasPermission(
  userId: string,
  permission: Permission,
): Promise<boolean> {
  const role = await effectiveRole(userId);
  return role !== null && can(role, permission);
}
