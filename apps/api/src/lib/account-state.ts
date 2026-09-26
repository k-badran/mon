import { eq } from "drizzle-orm";

import { isRole, type Role } from "@mon/core";
import { db, schema } from "@mon/db";

/**
 * What an account may do *right now*.
 *
 * An access token asserts a role at the moment it was minted and keeps
 * asserting it until it expires — up to fifteen minutes during which a demoted
 * administrator is still an administrator and a blocked account still works.
 * Every guard in this API therefore asks the database rather than the token,
 * and they all ask through here: one definition of "may this account act at
 * all", instead of one per middleware that drifts from the others.
 *
 * The socket gateway asks the same question on a timer, because a connection
 * outlives the token that opened it.
 *
 * Deliberately not cached. A cache is a second place for the answer to be
 * stale, which is the exact failure this function exists to remove; the read
 * is a primary-key lookup and staff traffic is low volume.
 */
export async function effectiveRole(userId: string): Promise<Role | null> {
  const [row] = await db
    .select({ role: schema.users.role, status: schema.users.status })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  // Deleted since the token was minted.
  if (!row) return null;

  // A blocked account keeps its role in the table but loses every capability,
  // so suspending someone does not also require demoting them — and reversing
  // a suspension does not require remembering what they used to be.
  if (row.status === "blocked") return null;

  return isRole(row.role) ? row.role : null;
}
