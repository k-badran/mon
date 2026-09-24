import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

import { can, canAll, isRole, type Permission, type Role } from "@umzugplus/core";
import { db, schema } from "@umzugplus/db";

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
 * still an administrator. For staff routes, which are low-volume, the current
 * role is read from the database so a revocation takes effect on the next
 * request.
 *
 * Customer-facing routes are unaffected: they authorise by ownership of the
 * record, not by role, and never reach this middleware.
 */

/** The caller's role as the database has it right now. */
async function currentRole(userId: string): Promise<Role | null> {
  const [row] = await db
    .select({ role: schema.users.role, status: schema.users.status })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!row) return null;

  // A blocked account keeps its role but loses every capability, so a
  // suspension does not require also demoting the person.
  if (row.status === "blocked") return null;

  return isRole(row.role) ? row.role : null;
}

/**
 * Requires every listed capability.
 *
 * Several rather than one because some routes genuinely need a combination —
 * assigning a crew is both reading an order and changing it — and spelling
 * that out is clearer than inventing a compound permission for each pairing.
 */
export function requirePermission(...required: readonly Permission[]) {
  if (required.length === 0) {
    throw new Error("requirePermission needs at least one permission.");
  }

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      // A programming error, not a client error: the guard was mounted
      // without `requireAuth` in front of it.
      next(AppError.internal("requirePermission was used without requireAuth."));
      return;
    }

    try {
      const role = await currentRole(req.user.id);

      if (!role) {
        next(AppError.unauthenticated());
        return;
      }

      if (!canAll(role, required)) {
        next(AppError.insufficientRole(required.join(" and ")));
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
  const role = await currentRole(userId);
  return role !== null && can(role, permission);
}
