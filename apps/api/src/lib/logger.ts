import { env, isProduction } from "@umzugplus/config";
import pino from "pino";

/**
 * Structured logging.
 *
 * `redact` is not optional here: the legacy webhook wrote the received
 * Authorization header straight into the database, so any secret sent to it
 * ended up stored in plaintext. Redaction makes that class of leak impossible
 * to reintroduce by accident.
 */
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : isProduction ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "req.body.token",
      "res.headers['set-cookie']",
      "*.passwordHash",
      "*.tokenHash",
    ],
    censor: "[redacted]",
  },
  ...(isProduction ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});
