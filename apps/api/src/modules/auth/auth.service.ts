import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  needsRehash,
  refreshTokenExpiry,
  signAccessToken,
  verifyPassword,
  type UserRole,
} from "@umzugplus/auth";
import { db, schema } from "@umzugplus/db";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

const { users, refreshTokens } = schema;

export interface SessionContext {
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    locale: string;
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string | undefined;
  locale?: string | undefined;
}

/**
 * Registers a new account.
 *
 * `role` is never taken from the input — it always defaults to "customer".
 * The legacy app let the browser write `profiles.role` directly, which meant
 * privilege escalation depended entirely on how one RLS policy was written.
 */
export async function register(
  input: RegisterInput,
  context: SessionContext,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() ?? null,
      locale: input.locale ?? "de",
      role: "customer",
    })
    .returning();

  if (!created) {
    throw AppError.internal("Account could not be created.");
  }

  logger.info({ userId: created.id }, "Account registered");

  return issueSession(created, context);
}

/**
 * Authenticates with email and password.
 *
 * Always performs a password verification, even when no user matched, so the
 * response time does not reveal whether an address is registered.
 */
export async function login(
  emailInput: string,
  password: string,
  context: SessionContext,
): Promise<AuthResult> {
  const email = normalizeEmail(emailInput);

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    // Burn comparable CPU against a dummy hash to keep timing flat.
    await verifyPassword(DUMMY_HASH, password);
    throw AppError.invalidCredentials();
  }

  const passwordMatches = await verifyPassword(user.passwordHash, password);

  if (!passwordMatches) {
    throw AppError.invalidCredentials();
  }

  // A blocked account is a distinct, actionable state — unlike wrong
  // credentials, telling the user is helpful and leaks nothing they cannot
  // already determine by having valid credentials.
  if (user.status === "blocked") {
    throw new AppError("ACCOUNT_BLOCKED", 403, "This account has been blocked.");
  }

  // Transparently upgrade hashes made under weaker parameters.
  if (needsRehash(user.passwordHash)) {
    const upgraded = await hashPassword(password);
    await db.update(users).set({ passwordHash: upgraded }).where(eq(users.id, user.id));
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return issueSession(user, context);
}

/**
 * Exchanges a refresh token for a new pair, rotating the old one.
 *
 * Reuse detection: presenting a token that was already rotated means it was
 * captured, because the legitimate client would have moved on to the
 * replacement. In that case every session for the user is revoked.
 */
export async function refresh(token: string, context: SessionContext): Promise<AuthResult> {
  const tokenHash = hashToken(token);

  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored) {
    throw AppError.unauthenticated("Refresh token is not recognised.");
  }

  if (stored.revokedAt !== null) {
    logger.error(
      { userId: stored.userId, tokenId: stored.id },
      "Refresh token reuse detected — revoking every session for this user",
    );

    await revokeAllSessions(stored.userId);
    throw AppError.unauthenticated("Session was revoked. Please sign in again.");
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthenticated("Session has expired. Please sign in again.");
  }

  const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);

  if (!user || user.status === "blocked") {
    throw AppError.unauthenticated("Account is no longer active.");
  }

  // Rotate inside a transaction so a crash cannot leave two live tokens.
  return db.transaction(async (tx) => {
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));

    return issueSession(user, context, { rotatedFromId: stored.id, tx });
  });
}

/** Signs out a single device by revoking the presented refresh token. */
export async function logout(token: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, hashToken(token)), isNull(refreshTokens.revokedAt)));
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw AppError.invalidCredentials();
  }

  const passwordHash = await hashPassword(newPassword);

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));

    // Changing a password must end every other session, or a thief who
    // already has one keeps their access.
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  });
}

/** Housekeeping: drop rows that are expired or long revoked. */
export async function pruneExpiredTokens(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000);

  const deleted = await db
    .delete(refreshTokens)
    .where(or(lt(refreshTokens.expiresAt, new Date()), lt(refreshTokens.revokedAt, cutoff)))
    .returning({ id: refreshTokens.id });

  return deleted.length;
}

/** Lists a user's live sessions, so they can see and revoke their devices. */
export async function listSessions(userId: string) {
  return db
    .select({
      id: refreshTokens.id,
      userAgent: refreshTokens.userAgent,
      ipAddress: refreshTokens.ipAddress,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
    })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );
}

// ── internals ───────────────────────────────────────────────────────────

type UserRow = typeof users.$inferSelect;

async function issueSession(
  user: UserRow,
  context: SessionContext,
  options?: { rotatedFromId?: string; tx?: Parameters<Parameters<typeof db.transaction>[0]>[0] },
): Promise<AuthResult> {
  const executor = options?.tx ?? db;
  const { token, tokenHash } = generateRefreshToken();

  const [session] = await executor
    .insert(refreshTokens)
    .values({
      userId: user.id,
      tokenHash,
      expiresAt: refreshTokenExpiry(),
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
      rotatedFromId: options?.rotatedFromId ?? null,
    })
    .returning({ id: refreshTokens.id });

  if (!session) {
    throw AppError.internal("Session could not be created.");
  }

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    sid: session.id,
  });

  return {
    accessToken,
    refreshToken: token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      locale: user.locale,
    },
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * A real Argon2 hash of a throwaway value, used to equalise login timing when
 * no account matches. Must be a genuine hash — verifying against a malformed
 * string returns early and defeats the purpose.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$J2Vw8VuKXnJ0WgF1uZ8zVYQnLQ0xX3vN5rK8mP2tD4s";

/**
 * The signed-in user's profile.
 *
 * Returns only what a client legitimately needs to render itself — never the
 * password hash, and never the internal status field beyond what the session
 * already implies.
 */
export async function getProfile(userId: string) {
  const [profile] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      role: users.role,
      locale: users.locale,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, "active")))
    .limit(1);

  return profile ?? null;
}
