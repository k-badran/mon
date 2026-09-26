import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@mon/config";
import { ROLES, type Role } from "@mon/core";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";

/**
 * JWT issuing and verification.
 *
 * Design notes:
 *
 *  - **Access tokens are short-lived JWTs** (15 minutes by default) carrying
 *    the user id and role. They are stateless, so no database round trip is
 *    needed to authorise a request.
 *
 *  - **Refresh tokens are opaque random strings**, not JWTs. They are stored
 *    hashed in `refresh_tokens`, one row per session, so a single device can
 *    be revoked. A JWT refresh token cannot be revoked before it expires,
 *    which is exactly the property you do not want in a refresh token.
 *
 *  - **The two secrets are separate.** Signing both with one key means a token
 *    minted for one purpose can be replayed as the other.
 */

/**
 * Kept as an alias of the shared `Role` so callers that already import
 * `UserRole` from here keep working, while there is only one definition of
 * what the roles are.
 */
export type UserRole = Role;

export interface AccessTokenClaims {
  /** Subject — the user id. */
  sub: string;
  role: UserRole;
  email: string;
  /** Session id, linking this access token to the refresh row that issued it. */
  sid: string;
}

/**
 * A token that has been verified, as opposed to one being minted.
 *
 * `expiresAt` is carried out of the payload because one consumer genuinely
 * needs it: a socket is not torn down when the token that opened it expires,
 * so the gateway has to know when that moment arrives and close the connection
 * itself.
 */
export interface VerifiedAccessToken extends AccessTokenClaims {
  expiresAt: Date;
}

const accessClaimsSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(ROLES),
  email: z.string().email(),
  sid: z.string().uuid(),
  /** Seconds since the epoch, as JWT defines it. Always set by the signer. */
  exp: z.number().int().positive(),
});

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

/**
 * A hint key with no power to mint a session.
 *
 * Returns a string rather than bytes because the other half of this lives in
 * `apps/web/next.config.js`, which can only hand the Next.js process a value
 * through the environment. Both sides then encode that string the same way, so
 * a configured `JWT_HINT_SECRET` and a derived one are handled identically.
 * The two derivations are one rule written twice and have to stay in step.
 */
export function deriveHintSecret(source: string): string {
  return createHash("sha256").update(`mon:session-hint:v1:${source}`).digest("base64");
}

/**
 * The key the session hint is signed with — deliberately not `accessSecret`.
 *
 * The hint is verified by the Next.js server, so that process has to hold
 * whichever key verifies it. While the two were the same key, any disclosure
 * from the web tier was also the key that mints API access tokens: a routing
 * convenience that could buy a session. A separate `JWT_HINT_SECRET` is
 * preferred; without one the key is derived from the access secret, which the
 * web tier can then hold without being able to run it backwards.
 */
const hintSecret = new TextEncoder().encode(
  env.JWT_HINT_SECRET ?? deriveHintSecret(env.JWT_ACCESS_SECRET),
);

export class TokenError extends Error {
  constructor(
    message: string,
    public readonly code: "EXPIRED" | "INVALID" | "MALFORMED",
  ) {
    super(message);
    this.name = "TokenError";
  }
}

export async function signAccessToken(claims: AccessTokenClaims): Promise<string> {
  return new SignJWT({ role: claims.role, email: claims.email, sid: claims.sid })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_ISSUER)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);
}

/**
 * Verifies signature, expiry, issuer and audience, then validates the claim
 * shape. A token that is cryptographically valid but structurally wrong is
 * still rejected — never trust a payload just because the signature checks.
 */
export async function verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
  let payload: JWTPayload;

  try {
    ({ payload } = await jwtVerify(token, accessSecret, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_ISSUER,
      algorithms: ["HS256"],
    }));
  } catch (error) {
    const code =
      error instanceof Error && error.name === "JWTExpired" ? "EXPIRED" : "INVALID";
    throw new TokenError("Access token is not valid.", code);
  }

  const parsed = accessClaimsSchema.safeParse(payload);

  if (!parsed.success) {
    throw new TokenError("Access token payload has an unexpected shape.", "MALFORMED");
  }

  const { exp, ...claims } = parsed.data;

  return { ...claims, expiresAt: new Date(exp * 1000) };
}

/**
 * Generates an opaque refresh token and the hash to store alongside it.
 *
 * 32 bytes of CSPRNG output is 256 bits of entropy — not guessable. Only the
 * hash is persisted, so a database leak does not hand over working sessions.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/**
 * SHA-256 is the right choice here, not Argon2.
 *
 * These tokens are already high-entropy random values, so there is nothing to
 * brute-force and no need for a slow hash — and a slow hash on every refresh
 * would be a self-inflicted denial of service.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison, so timing cannot reveal a partial match. */
export function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}

/** Single-use token for password reset and email confirmation. */
export function generateVerificationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

/** Converts a duration like "15m" or "30d" into milliseconds. */
export function durationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);

  if (!match) {
    throw new TypeError(`Unsupported duration: "${duration}". Use e.g. "15m" or "30d".`);
  }

  const amount = Number.parseInt(match[1]!, 10);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

  return amount * multipliers[match[2] as keyof typeof multipliers];
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + durationToMs(env.JWT_REFRESH_TTL));
}

/**
 * The session hint the edge middleware reads.
 *
 * A separate, deliberately minimal token: the subject and the role, nothing
 * else. It exists because Next.js middleware runs before the page and can only
 * see cookies — with the session held in memory it could not tell an anonymous
 * visitor from an administrator, so the admin area was guarded by a redirect
 * that fired after the page had already rendered.
 *
 * It is signed, so a forged role cannot pass verification, and it is never
 * treated as authority: the API resolves the caller's real role from the
 * database on every request. The hint only decides what to render and where to
 * send someone.
 */
export interface SessionHintClaims {
  sub: string;
  role: Role;
}

const sessionHintSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(ROLES),
});

export async function signSessionHint(claims: SessionHintClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(`${env.JWT_ISSUER}:hint`)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(hintSecret);
}

export async function verifySessionHint(token: string): Promise<SessionHintClaims> {
  let payload: JWTPayload;

  try {
    ({ payload } = await jwtVerify(token, hintSecret, {
      issuer: env.JWT_ISSUER,
      audience: `${env.JWT_ISSUER}:hint`,
      // Pinned for the same reason the access token pins it: the verifier, not
      // the token, decides which algorithm was acceptable. Leaving it open
      // makes the header a thing the attacker writes.
      algorithms: ["HS256"],
    }));
  } catch (error) {
    const expired = error instanceof Error && error.name === "JWTExpired";
    throw new TokenError(
      expired ? "Session hint has expired." : "Session hint is invalid.",
      expired ? "EXPIRED" : "INVALID",
    );
  }

  const parsed = sessionHintSchema.safeParse(payload);
  if (!parsed.success) {
    throw new TokenError("Session hint payload is malformed.", "MALFORMED");
  }

  return parsed.data;
}
