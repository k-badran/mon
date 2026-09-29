import { Router, type Response } from "express";

import { hashPassword, signSessionHint } from "@mon/auth";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { validate } from "../../middleware/validate.js";
import { authRateLimit } from "../../middleware/rate-limit.js";
import * as authService from "./auth.service.js";
import * as verificationService from "./verification.service.js";
import {
  clearSessionCookies,
  readRefreshToken,
  setRefreshCookie,
  setSessionHintCookie,
} from "./session-cookie.js";
import {
  changePasswordSchema,
  confirmEmailSchema,
  confirmPasswordResetSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requestOtpSchema,
  requestPasswordResetSchema,
  verifyOtpSchema,
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
 * ─── Email-proof flows ────────────────────────────────────────────────────
 *
 * All five carry `authRateLimit`. Each one either sends an email or accepts a
 * guess at a secret, and both are things an unauthenticated caller can ask for
 * repeatedly: unthrottled, the request endpoints are a way to use this server
 * to mail somebody several thousand times, and the verify endpoints are a way to
 * brute-force a six-digit code.
 */

authRouter.post(
  "/request-password-reset",
  authRateLimit,
  validate({ body: requestPasswordResetSchema }),
  asyncHandler(async (req, res) => {
    await verificationService.requestPasswordReset(req.body.email);

    /**
     * 202 unconditionally — including for an address with no account.
     *
     * The response cannot depend on whether the address is registered. A 404
     * here, or any difference in body or timing, turns this into an
     * account-enumeration oracle that needs no credentials at all: submit a
     * list of addresses, keep the ones that answer differently.
     *
     * 202 rather than 200 because it is honest about what happened — the
     * request was accepted, and whether an email follows is deliberately not
     * something this response claims to know.
     */
    res.status(202).json({ status: "accepted" });
  }),
);

authRouter.post(
  "/confirm-password-reset",
  authRateLimit,
  validate({ body: confirmPasswordResetSchema }),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    // Hashed in the route rather than the service so that `verification.service`
    // never handles a plaintext password — the one place that does is
    // `@mon/auth`, and keeping it that way means there is one answer to
    // "where could a password be logged by accident".
    await verificationService.confirmPasswordReset(token, await hashPassword(newPassword));

    // No session is issued. Whoever completed this proved control of the
    // mailbox, not of the account: signing them straight in would mean a
    // compromised inbox is a compromised account with no further step.
    res.status(204).send();
  }),
);

authRouter.post(
  "/send-verification",
  requireAuth,
  authRateLimit,
  asyncHandler(async (req, res) => {
    await verificationService.sendEmailVerification(req.user!.id);
    res.status(202).json({ status: "accepted" });
  }),
);

authRouter.post(
  "/verify-email",
  authRateLimit,
  validate({ body: confirmEmailSchema }),
  asyncHandler(async (req, res) => {
    // Deliberately unauthenticated: the link is opened from an email client,
    // often on a device that has never signed in. The token is the proof.
    await verificationService.confirmEmail(req.body.token);
    res.status(204).send();
  }),
);

authRouter.post(
  "/otp/request",
  authRateLimit,
  validate({ body: requestOtpSchema }),
  asyncHandler(async (req, res) => {
    const challenge = await verificationService.requestLoginOtp(req.body.email);
    res.status(202).json(challenge);
  }),
);

authRouter.post(
  "/otp/verify",
  authRateLimit,
  validate({ body: verifyOtpSchema }),
  asyncHandler(async (req, res) => {
    const { email, code } = req.body;
    const userId = await verificationService.verifyLoginOtp(email, code);

    // A correct code is a full sign-in, so it goes through the same session
    // issuance as a password login — same cookies, same hint, same claims.
    const result = await authService.issueSessionForVerifiedUser(userId, sessionContext(req));

    await issueSessionCookies(res, result);
    res.json(result);
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
