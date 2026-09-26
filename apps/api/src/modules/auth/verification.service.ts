import { randomInt } from "node:crypto";

import { generateVerificationToken, hashToken } from "@mon/auth";
import { env } from "@mon/config";
import { db, schema } from "@mon/db";
import type { VerificationPurpose } from "@mon/db/schema";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { mailer } from "../../lib/mailer.js";

const { users, verificationTokens, refreshTokens } = schema;

/**
 * Email verification, password reset and one-time login codes.
 *
 * Kept out of `auth.service.ts` because the two have different shapes: that
 * file is about establishing a session from a credential the caller already
 * holds, this one is about proving control of a mailbox. They share the `users`
 * table and nothing else.
 *
 * Every flow here follows the same three rules, and the reasons are worth
 * stating once rather than at each call site:
 *
 *  1. **Only hashes are stored.** A leak of `verification_tokens` must not hand
 *     an attacker a working reset link or a valid login code.
 *  2. **Requests never reveal whether an account exists.** Asking to reset an
 *     unknown address answers exactly as it does for a known one, or the
 *     endpoint becomes an account-enumeration oracle that needs no credentials.
 *  3. **Issuing invalidates what came before.** Two live reset links for one
 *     account doubles the window an intercepted email is useful in, for no
 *     benefit to the person who asked for the second one.
 */

/** Long enough to click, short enough that an intercepted email goes stale. */
const PASSWORD_RESET_TTL_MINUTES = 30;
/** Generous: this link is often opened on a different device, later. */
const EMAIL_VERIFICATION_TTL_HOURS = 24;
const OTP_TTL_MINUTES = 10;

/**
 * How many wrong guesses a single code tolerates before it is dead.
 *
 * Five, against a million possibilities, is a one-in-200,000 chance per code —
 * and the counter lives on the row, so spreading the guesses across addresses
 * or sessions does not buy an attacker more of them.
 */
const OTP_MAX_ATTEMPTS = 5;

export interface OtpChallenge {
  /** Echoed so a client can show "code sent to a…@example.de". */
  email: string;
  expiresAt: Date;
  /**
   * False when the mail transport recorded the message instead of sending it,
   * so a developer running with `MAIL_DRIVER=log` is told where to look rather
   * than waiting on an inbox.
   */
  delivered: boolean;
}

/**
 * Sends a login code to a registered address.
 *
 * Returns the same shape whether or not the address exists — see rule 2. The
 * expiry in the response for an unknown address is a plausible fiction, and it
 * has to be: computing it only in the branch that found a user would make the
 * two responses distinguishable by content, which defeats the point of making
 * them indistinguishable by status code.
 */
export async function requestLoginOtp(emailInput: string): Promise<OtpChallenge> {
  const email = normalizeEmail(emailInput);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  const user = await findActiveUser(email);

  if (!user) {
    logger.info({ email }, "OTP requested for an address with no active account");
    return { email, expiresAt, delivered: false };
  }

  // Six digits via `randomInt`, not `Math.random()`: this is a credential, and
  // `Math.random()` is a predictable PRNG. `padStart` keeps codes beginning
  // with a zero six characters long instead of silently becoming five.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  await issueToken({ userId: user.id, purpose: "login_otp", tokenHash: hashToken(code), expiresAt });

  // `send`, not `trySend`: the email *is* the operation. Reporting success when
  // nothing was sent leaves the customer waiting on a code that does not exist.
  const sent = await mailer.send({
    template: "otp",
    to: user.email,
    locale: user.locale,
    payload: {
      code,
      expiresInMinutes: OTP_TTL_MINUTES,
      ...(user.fullName ? { name: user.fullName } : {}),
    },
  });

  return { email, expiresAt, delivered: sent.delivered };
}

/**
 * Verifies a login code and reports which user it belonged to.
 *
 * Returns the user id rather than a session: minting one needs the request's
 * user agent and IP, which live in the route layer, and `auth.service.ts`
 * already owns that. Splitting it keeps one definition of what a session is.
 */
export async function verifyLoginOtp(emailInput: string, code: string): Promise<string> {
  const email = normalizeEmail(emailInput);
  const user = await findActiveUser(email);

  // Same error for an unknown address as for a wrong code, so a failed attempt
  // does not disclose that the address is registered.
  if (!user) throw invalidCode();

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.userId, user.id),
        eq(verificationTokens.purpose, "login_otp"),
        isNull(verificationTokens.consumedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) throw invalidCode();

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    // Burn the row rather than leaving it to expire: a code that has been
    // guessed at five times should not stay alive for the rest of its window.
    await db
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(verificationTokens.id, row.id));

    logger.warn({ userId: user.id }, "OTP exhausted its attempt budget");
    throw invalidCode();
  }

  if (row.tokenHash !== hashToken(code)) {
    // `sql` increment rather than read-modify-write: two concurrent guesses
    // would each read the same count and write the same value, so the budget
    // would only ever record one of them.
    await db
      .update(verificationTokens)
      .set({ attempts: sql`${verificationTokens.attempts} + 1` })
      .where(eq(verificationTokens.id, row.id));

    throw invalidCode();
  }

  await db
    .update(verificationTokens)
    .set({ consumedAt: new Date() })
    .where(eq(verificationTokens.id, row.id));

  return user.id;
}

/**
 * Starts a password reset.
 *
 * Resolves without signalling anything about the address — the route answers
 * 202 unconditionally.
 */
export async function requestPasswordReset(emailInput: string): Promise<void> {
  const email = normalizeEmail(emailInput);
  const user = await findActiveUser(email);

  if (!user) {
    logger.info({ email }, "Password reset requested for an address with no active account");
    return;
  }

  const { token, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);

  await issueToken({ userId: user.id, purpose: "password_reset", tokenHash, expiresAt });

  // `trySend`: the caller is told nothing either way, so a transport failure
  // has nowhere to surface except the log. Throwing here would turn a mail
  // outage into a 500 on an endpoint documented as always succeeding.
  await mailer.trySend({
    template: "password-reset",
    to: user.email,
    locale: user.locale,
    payload: {
      // The path must match the web app's own route, which is German like the
      // rest of the site (`apps/web/app/[locale]/passwort-zuruecksetzen`). A
      // guessed English slug here produces a link that 404s — and nobody finds
      // out until a customer clicks one.
      url: `${env.WEB_ORIGIN}/${user.locale}/passwort-zuruecksetzen?token=${encodeURIComponent(token)}`,
      expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
      ...(user.fullName ? { name: user.fullName } : {}),
    },
  });
}

/** Completes a password reset, and ends every session the account had. */
export async function confirmPasswordReset(token: string, passwordHash: string): Promise<void> {
  const row = await consumeToken(token, "password_reset");

  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, row.userId));

    await tx
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(verificationTokens.id, row.id));

    // Whoever asked for this either forgot the password or lost control of the
    // account. Both readings end the same way: existing sessions must not
    // survive a reset, or a thief holding one keeps their access.
    await tx
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)));
  });

  logger.info({ userId: row.userId }, "Password reset completed");
}

/** Sends (or re-sends) the address-confirmation link for a signed-in user. */
export async function sendEmailVerification(userId: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!user) throw AppError.unauthenticated();

  if (user.emailVerifiedAt) {
    throw new AppError("CONFLICT", 409, "This email address is already confirmed.");
  }

  const { token, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 3_600_000);

  await issueToken({ userId, purpose: "email_verification", tokenHash, expiresAt });

  await mailer.send({
    template: "verify-email",
    to: user.email,
    locale: user.locale,
    payload: {
      url: `${env.WEB_ORIGIN}/${user.locale}/email-bestaetigen?token=${encodeURIComponent(token)}`,
      expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
      ...(user.fullName ? { name: user.fullName } : {}),
    },
  });
}

/** Confirms an address from a link. Idempotent for an already-confirmed one. */
export async function confirmEmail(token: string): Promise<void> {
  const row = await consumeToken(token, "email_verification");

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, row.userId));

    await tx
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(verificationTokens.id, row.id));
  });

  logger.info({ userId: row.userId }, "Email address confirmed");
}

/**
 * Deletes verification tokens that can no longer be used.
 *
 * Consumed and expired rows are dead weight that grows with every reset
 * request. Mirrors `pruneExpiredTokens` in `auth.service.ts`, and like it has
 * no scheduler yet — there is no job runner in this codebase, so for now it is
 * called from the admin diagnostics endpoint.
 */
export async function pruneVerificationTokens(): Promise<number> {
  const deleted = await db
    .delete(verificationTokens)
    .where(lt(verificationTokens.expiresAt, new Date()))
    .returning({ id: verificationTokens.id });

  return deleted.length;
}

/**
 * Writes a new token, retiring any earlier live one for the same purpose.
 *
 * One transaction, so there is never a moment with two valid codes or none.
 */
async function issueToken(input: {
  userId: string;
  purpose: VerificationPurpose;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(verificationTokens.userId, input.userId),
          eq(verificationTokens.purpose, input.purpose),
          isNull(verificationTokens.consumedAt),
        ),
      );

    await tx.insert(verificationTokens).values({
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
  });
}

/**
 * Looks up a link token by its hash and checks it is still usable.
 *
 * The hash is the lookup key, which is what makes this safe: the plaintext
 * token never has to be compared against a stored value, so there is no
 * string comparison whose timing could leak a prefix.
 */
async function consumeToken(
  token: string,
  purpose: VerificationPurpose,
): Promise<{ id: string; userId: string }> {
  const [row] = await db
    .select({ id: verificationTokens.id, userId: verificationTokens.userId })
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, hashToken(token)),
        eq(verificationTokens.purpose, purpose),
        isNull(verificationTokens.consumedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    throw new AppError(
      "INVALID_INPUT",
      400,
      "This link is no longer valid. Request a new one.",
    );
  }

  return row;
}

/**
 * Finds a user who is allowed to receive one of these emails.
 *
 * A blocked account is treated as absent rather than rejected with a distinct
 * error: the flows that call this answer identically for every address on
 * purpose, and a different response for a blocked one would undo that.
 */
async function findActiveUser(email: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      locale: users.locale,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || user.status === "blocked") return undefined;

  return user;
}

function invalidCode(): AppError {
  return new AppError("INVALID_CREDENTIALS", 401, "That code is not valid or has expired.");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
