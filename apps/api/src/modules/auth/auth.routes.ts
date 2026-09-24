import { Router, type Response } from "express";

import { signSessionHint } from "@umzugplus/auth";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { validate } from "../../middleware/validate.js";
import { authRateLimit } from "../../middleware/rate-limit.js";
import * as authService from "./auth.service.js";
import {
  clearSessionCookies,
  readRefreshToken,
  setRefreshCookie,
  setSessionHintCookie,
} from "./session-cookie.js";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from "./auth.schema.js";

export const authRouter: Router = Router();

/**
 * Auth endpoints are rate limited per IP and per email.
 *
 * The legacy login page called `signInWithPassword` from the browser with no
 * throttling at all, leaving credential stuffing entirely unimpeded.
 */

authRouter.post(
  "/register",
  authRateLimit,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, sessionContext(req));
    await issueSessionCookies(res, result);
    res.status(201).json(result);
  }),
);

authRouter.post(
  "/login",
  authRateLimit,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password, sessionContext(req));
    await issueSessionCookies(res, result);
    res.json(result);
  }),
);

authRouter.post(
  "/refresh",
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const token = readRefreshToken(req);

    // Neither cookie nor body: there is no session to refresh. Answering 401
    // rather than 422 keeps this indistinguishable from an expired session, so
    // the client's single transparent retry ends here instead of looping.
    if (!token) {
      throw AppError.unauthenticated("No refresh token was provided.");
    }

    const result = await authService.refresh(token, sessionContext(req));

    // The old token has just been revoked by rotation, so the cookie must be
    // replaced in the same response or the next refresh would present a dead
    // token and trip reuse detection.
    await issueSessionCookies(res, result);
    res.json(result);
  }),
);

authRouter.post(
  "/logout",
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const token = readRefreshToken(req);

    if (token) {
      await authService.logout(token);
    }

    // Cleared even when no token matched. The caller asked to be signed out,
    // and only the server can remove an httpOnly cookie — leaving one behind
    // would let the next page load resume the session.
    clearSessionCookies(res);
    res.status(204).send();
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthenticated();

    /**
     * Read the profile rather than echoing the token's claims.
     *
     * The access token carries only what authorisation needs — id, role,
     * email. Returning just that left `fullName` and `locale` undefined even
     * though the client's `AuthUser` type promises them, so the dashboard
     * greeted people as "Welcome back, !".
     *
     * Reading the row also means a name or role changed by an admin takes
     * effect on the next request instead of when the token happens to expire.
     */
    const profile = await authService.getProfile(req.user.id);

    if (!profile) {
      // The token verified but the account is gone — a deleted user holding a
      // still-valid token.
      throw AppError.unauthenticated();
    }

    res.json({ user: profile });
  }),
);

authRouter.get(
  "/sessions",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ sessions: await authService.listSessions(req.user!.id) });
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  authRateLimit,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.status(204).send();
  }),
);

/**
 * Puts the session into cookies — and still returns it in the body.
 *
 * The cookies are what a browser uses: the refresh token as httpOnly, so no
 * injected script can reach the one credential that mints new access tokens,
 * plus the signed hint the edge middleware reads to route people before a page
 * renders.
 *
 * The body is kept because a native client has no cookie jar, and because the
 * access token was never the part worth hiding — it is short-lived and the web
 * client holds it in memory only.
 */
async function issueSessionCookies(res: Response, result: authService.AuthResult): Promise<void> {
  setRefreshCookie(res, result.refreshToken);
  setSessionHintCookie(
    res,
    await signSessionHint({ sub: result.user.id, role: result.user.role }),
  );
}

function sessionContext(req: { headers: Record<string, unknown>; ip?: string | undefined }) {
  const userAgent = req.headers["user-agent"];
  return {
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 255) : undefined,
    ipAddress: req.ip,
  };
}
