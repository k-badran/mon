import type { CookieOptions, Request, Response } from "express";

import { env } from "@mon/config";

/**
 * The session cookies.
 *
 * Two things changed and both matter.
 *
 * **The refresh token moves out of `localStorage`.** It lived there because
 * the API returned it in the body and the browser had to put it somewhere. Any
 * script running on the page could read it, which for a token that mints new
 * access tokens is the whole game. As an `httpOnly` cookie it is unreadable by
 * script, and the browser attaches it only to this API's origin.
 *
 * **A signed session hint is added.** Next.js middleware runs before the page
 * and can only see cookies, so with the session held in memory it had no way
 * to tell an anonymous visitor from an administrator — the admin area was
 * guarded by a redirect that ran *after* the page had already rendered. The
 * hint carries the role in a short-lived signed token the middleware can
 * verify at the edge.
 *
 * The hint is a convenience for routing, never an authority. Every endpoint
 * still resolves the caller's real role from the database, so a hint that is
 * stale or forged buys nothing.
 */

const REFRESH_COOKIE = "mon_rt";
const HINT_COOKIE = "mon_sh";

/**
 * `sameSite: "lax"` rather than `strict`.
 *
 * Strict would drop the cookie on any cross-site navigation, so a customer
 * following a link from a confirmation email would arrive signed out. Lax
 * still withholds it from cross-site POSTs, which is the case that matters.
 */
function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  };
}

/** Thirty days, matching the refresh token's own lifetime. */
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), maxAge: REFRESH_MAX_AGE });
}

/**
 * The hint the edge middleware reads.
 *
 * Not `httpOnly`: nothing secret is in it, and the browser needs to be able to
 * drop it when a sign-out fails to reach the API. It is signed, so tampering
 * with the role inside it invalidates the signature; and it is short-lived, so
 * a role change takes effect within minutes even for routing.
 *
 * ## Why this one cookie has a domain and the refresh cookie does not
 *
 * The hint is read by a *different origin* from the one that sets it. In
 * development that difference is a port, which cookies ignore, so nothing is
 * needed. In production the API is api.moveongo.de and the web app is
 * moveongo.de, and a host-only cookie set by the first never reaches the
 * second: `readHint` then returns null for everyone and every signed-in user
 * is redirected to /login — a failure that looks like a broken session rather
 * than missing configuration.
 *
 * The refresh cookie deliberately does not follow. It is a credential, and a
 * credential scoped to the parent domain is sent to every subdomain,
 * including whichever one is compromised first.
 */
function hintOptions(): CookieOptions {
  return {
    httpOnly: false,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    ...(env.SESSION_COOKIE_DOMAIN ? { domain: env.SESSION_COOKIE_DOMAIN } : {}),
  };
}

export function setSessionHintCookie(res: Response, token: string): void {
  res.cookie(HINT_COOKIE, token, { ...hintOptions(), maxAge: 15 * 60 * 1000 });
}

/**
 * Clearing has to name the same attributes the cookie was set with — a browser
 * matches the deletion by name, domain and path, so a mismatched domain leaves
 * the original cookie exactly where it was.
 */
export function clearSessionCookies(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), maxAge: 0 });
  res.clearCookie(HINT_COOKIE, { ...hintOptions(), maxAge: 0 });
}

/**
 * The refresh token for this request.
 *
 * The cookie is preferred, with the request body as a fallback so a native
 * client — which has no cookie jar — can still refresh. The body path is not
 * deprecated; it is for callers that genuinely cannot use cookies.
 */
export function readRefreshToken(req: Request): string | null {
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (fromCookie) return fromCookie;

  const fromBody = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  return typeof fromBody === "string" && fromBody.length > 0 ? fromBody : null;
}

export const COOKIE_NAMES = {
  refresh: REFRESH_COOKIE,
  hint: HINT_COOKIE,
} as const;
