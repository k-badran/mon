import {
  ROLE_RANK,
  ROLES,
  can,
  canAssignRole,
  isStaffRole,
  type Role,
} from "@umzugplus/core";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  generateTemporaryPassword,
  hashPassword,
} from "@umzugplus/auth";
import { db, schema } from "@umzugplus/db";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { revokeAllSessions } from "../auth/auth.service.js";

const { users } = schema;

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

/** The caller's own profile. Any authenticated user may read and edit this. */
usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        role: users.role,
        locale: users.locale,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User");
    }

    res.json(user);
  }),
);

/**
 * Self-service profile edit.
 *
 * Note what is absent: `role` and `status`. In the legacy app the browser
 * wrote directly to `profiles`, so whether a customer could make themselves an
 * admin came down to how one RLS policy was phrased. Here those fields simply
 * have no path in from a self-edit.
 */
usersRouter.patch(
  "/me",
  validate({
    body: z.object({
      fullName: z.string().trim().min(2).max(120).optional(),
      phone: z.string().trim().min(5).max(40).nullable().optional(),
      locale: z.enum(["de", "en", "ar", "tr"]).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const [updated] = await db
      .update(users)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(users.id, req.user!.id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        locale: users.locale,
      });

    res.json(updated);
  }),
);

// ── Administration ──────────────────────────────────────────────────────

const listQuery = z.object({
  search: z.string().trim().max(120).optional(),
  // Filtering by role reads the shared role list, so adding a role does not
  // leave this filter silently rejecting it.
  role: z.enum(ROLES).optional(),
  status: z.enum(["active", "blocked"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

usersRouter.get(
  "/",
  requirePermission("users.read"),
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof listQuery>>(req);
    const filters: SQL[] = [];

    if (query.role) filters.push(eq(users.role, query.role));
    if (query.status) filters.push(eq(users.status, query.status));

    if (query.search) {
      const term = `%${query.search}%`;
      filters.push(or(ilike(users.email, term), ilike(users.fullName, term))!);
    }

    const items = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(users.createdAt))
      .limit(query.limit);

    res.json({ items });
  }),
);

/**
 * Creating an account on someone else's behalf.
 *
 * Two separate questions, deliberately not collapsed into one permission:
 *
 *   - **May you create an account at all?** `users.write`. Adding a customer
 *     — a walk-in, a phone booking — is ordinary back-office work.
 *   - **May you create an account that can *do* things?** That is handing out
 *     capability, which is the same act as promoting someone, so it asks the
 *     same thing a promotion asks: `roles.write`, bounded by rank. Without
 *     this, `users.write` would be a way to mint a peer and act through them,
 *     and every rank check on the edit path would be worth nothing.
 *
 * The password is returned exactly once, in this response. That is not ideal
 * — an invitation link the new user redeems themselves would be better, and
 * is noted as missing rather than faked — but it is honest about where the
 * secret is, and it is a deliberate improvement on the alternative of letting
 * an administrator choose a colleague's password for them.
 */
const createUserBody = z.object({
  email: z.string().trim().toLowerCase().email("A valid email address is required."),
  fullName: z.string().trim().min(2, "Please provide a name.").max(120),
  role: z.enum(ROLES),
  phone: z.string().trim().min(5).max(40).optional(),
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
  /**
   * Optional. When absent one is generated and returned once — which is the
   * path the admin screen uses, because an administrator inventing a
   * colleague's password tends to invent the same one repeatedly.
   */
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).optional(),
});

usersRouter.post(
  "/",
  requirePermission("users.write"),
  validate({ body: createUserBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createUserBody>;
    // Already re-read from the database by `requirePermission`, so a demotion
    // cannot be outrun by an access token minted before it.
    const actorRole = req.user!.role;

    if (isStaffRole(body.role) && !canAssignRole(actorRole, body.role)) {
      // Two causes, one refusal — but the message says which, because "you
      // need roles.write" and "you cannot create your own equal" lead to
      // different next steps for the person reading it.
      throw AppError.forbidden(
        can(actorRole, "roles.write")
          ? "You cannot create an account at or above your own role."
          : "Creating a staff account requires the roles.write capability.",
      );
    }

    const generated = body.password === undefined;
    const password = body.password ?? generateTemporaryPassword();

    const [created] = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash: await hashPassword(password),
        fullName: body.fullName,
        phone: body.phone ?? null,
        role: body.role,
        locale: body.locale,
        // Somebody with `users.write` vouched for this address by typing it.
        // Mailing a confirmation link to prove an address an administrator
        // already asserted would be theatre, and it would leave the account
        // unusable until the new colleague happened to check their inbox.
        emailVerifiedAt: new Date(),
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      });

    if (!created) {
      throw AppError.internal("The account could not be created.");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "user.created",
      entityType: "user",
      entityId: created.id,
      // The role is the part worth being able to answer questions about later
      // — "who made this person an admin, and when". The password is not
      // recorded in any form.
      changes: { role: { from: null, to: created.role }, email: created.email },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.status(201).json({
      user: created,
      // Only when this endpoint invented it. Echoing a password the caller
      // supplied would put it in a response body for no reason.
      ...(generated ? { temporaryPassword: password } : {}),
    });
  }),
);

/**
 * Role and status changes — server-side, capability-checked, and audited.
 *
 * `users.write` gets you through the door, but a role change is a second,
 * stricter question: it is the one edit that hands out power, so it needs
 * `roles.write` as well and is bounded by rank. Blocking a user also revokes
 * their live sessions; leaving them valid would mean a blocked account keeps
 * working until its access token expires.
 */
usersRouter.patch(
  "/:id",
  requirePermission("users.write"),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
      role: z.enum(ROLES).optional(),
      status: z.enum(["active", "blocked"]).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const body = req.body as {
      role?: Role | undefined;
      status?: "active" | "blocked" | undefined;
    };
    // `requirePermission` has already replaced this with the role the database
    // holds right now, so a demotion cannot be outrun by an old token.
    const actorRole = req.user!.role;

    // An admin removing their own admin rights, or blocking themselves, would
    // lock them out with no way back in.
    if (id === req.user!.id && (body.role !== undefined || body.status === "blocked")) {
      throw AppError.unprocessable("You cannot change your own role or block yourself.");
    }

    const [before] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!before) {
      throw AppError.notFound("User");
    }

    // Rank bounds who may be edited at all. Without it, `users.write` alone
    // would let an admin block or demote the super admin — taking the one role
    // that can grant roles out of play, which is escalation by subtraction.
    if (ROLE_RANK[before.role] >= ROLE_RANK[actorRole]) {
      throw AppError.forbidden("You cannot modify an account at or above your own role.");
    }

    if (body.role !== undefined) {
      if (!can(actorRole, "roles.write")) {
        throw AppError.forbidden("Changing a user's role requires the roles.write capability.");
      }

      // The rank half of the same rule, from the other side: nobody hands out
      // a role at or above their own, directly or via someone they promote.
      if (!canAssignRole(actorRole, body.role)) {
        throw AppError.forbidden("You cannot assign a role at or above your own.");
      }
    }

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
      });

    if (body.status === "blocked" || (body.role && body.role !== before.role)) {
      await revokeAllSessions(id);
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "user.updated",
      entityType: "user",
      entityId: id,
      changes: {
        ...(body.role ? { role: { from: before.role, to: body.role } } : {}),
        ...(body.status ? { status: { from: before.status, to: body.status } } : {}),
      },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

/** Read-only audit trail, for investigating what happened and when. */
usersRouter.get(
  "/audit/log",
  requirePermission("audit.read"),
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }) }),
  asyncHandler(async (req, res) => {
    const { limit } = validatedQuery<{ limit: number }>(req);

    const entries = await db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);

    res.json({ entries });
  }),
);
