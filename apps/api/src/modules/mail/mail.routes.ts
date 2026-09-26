import { Router } from "express";
import { z } from "zod";

import { mailer } from "../../lib/mailer.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate } from "../../middleware/validate.js";
import { AppError } from "../../lib/errors.js";
import { recordAudit } from "../audit/audit.service.js";
import { pruneVerificationTokens } from "../auth/verification.service.js";

/**
 * Mail diagnostics, for administrators.
 *
 * This exists because "is email working?" is otherwise only answerable by
 * triggering a real customer flow and waiting. Setting up SMTP involves a
 * hostname, a port, a TLS mode, a password and a DNS zone, and the failure for
 * most of those is the same silence — an endpoint that reports which step broke
 * turns an afternoon of guessing into one request.
 *
 * Guarded by `settings.write` rather than by role: whoever can change the
 * system's configuration is who should be able to test it.
 */
export const mailRouter: Router = Router();

const testSchema = z.object({
  to: z.string().trim().toLowerCase().email(),
  locale: z.enum(["de", "en", "ar", "tr"]).default("de"),
});

mailRouter.get(
  "/status",
  requireAuth,
  requirePermission("settings.write"),
  asyncHandler(async (_req, res) => {
    /**
     * Reports whether the transport can connect and authenticate.
     *
     * Never reports the password, the host or the user — an administrator
     * already knows what they configured, and echoing credentials back over an
     * API is how they end up in a browser's network log.
     */
    let reachable = false;
    let error: string | undefined;

    try {
      await mailer.verify();
      reachable = true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }

    res.json({
      driver: mailer.driver,
      reachable,
      /**
       * Spelled out because the distinction is the one that confuses people:
       * the `log` driver is "working" in the sense that it never fails, and
       * delivers nothing.
       */
      sendsRealEmail: mailer.driver === "smtp",
      ...(error ? { error } : {}),
    });
  }),
);

mailRouter.post(
  "/test",
  requireAuth,
  requirePermission("settings.write"),
  validate({ body: testSchema }),
  asyncHandler(async (req, res) => {
    const { to, locale } = req.body as z.infer<typeof testSchema>;

    // A fixed, obviously-fake code. The template is the OTP one because that is
    // the message whose rendering matters most — a six-digit code has to survive
    // right-to-left layout and a subject-line preview — but nothing accepts this
    // value, so a test email is never a credential.
    const sent = await mailer.send({
      template: "otp",
      to,
      locale,
      payload: { code: "000000", expiresInMinutes: 10, name: "Test" },
    });

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "mail.test_sent",
      entityType: "mail",
      entityId: to,
      changes: { driver: sent.via, delivered: sent.delivered },
      requestId: req.requestId,
      ipAddress: req.ip,
    });

    res.json({
      messageId: sent.messageId,
      driver: sent.via,
      delivered: sent.delivered,
      ...(sent.delivered
        ? {}
        : {
            note: "MAIL_DRIVER is 'log' — the message was written to MAIL_OUTBOX_DIR, not sent.",
          }),
    });
  }),
);

mailRouter.post(
  "/prune-tokens",
  requireAuth,
  requirePermission("settings.write"),
  asyncHandler(async (req, res) => {
    // Housekeeping with no scheduler behind it yet. There is no job runner in
    // this codebase, so until there is, an administrator can trigger the
    // cleanup that a cron would otherwise own.
    if (!req.user) throw AppError.unauthenticated();

    const deleted = await pruneVerificationTokens();
    res.json({ deleted });
  }),
);
