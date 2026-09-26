import nodemailer, { type Transporter } from "nodemailer";

import type { MailMessage, MailTransport, SentMail } from "../types.js";

export interface SmtpOptions {
  host: string;
  port: number;
  /** True for implicit TLS on 465; false for STARTTLS on 587. */
  secure: boolean;
  user: string;
  password: string;
  /** Default `From`, used when a message does not override it. */
  from: string;
  replyTo?: string | undefined;
  /** How many times a *transient* failure is retried. Default 2. */
  maxRetries?: number | undefined;
  /** Receives one line per attempt. Wired to the API's pino logger. */
  onAttempt?: ((event: SmtpAttemptEvent) => void) | undefined;
}

export interface SmtpAttemptEvent {
  attempt: number;
  outcome: "sent" | "retrying" | "failed";
  /** SMTP reply code when the server gave one. */
  code?: string | undefined;
  message?: string | undefined;
}

/**
 * SMTP delivery over a pooled connection.
 *
 * Pooling matters more than it looks: opening a TLS connection to
 * `mail.privateemail.com` costs a full handshake, and a burst of OTP requests
 * that each build their own connection is both slow and the shape of traffic
 * that gets a sending IP rate-limited. One warm pool sends them in sequence
 * over an open socket.
 */
export function createSmtpTransport(options: SmtpOptions): MailTransport {
  const maxRetries = options.maxRetries ?? 2;

  const transporter: Transporter = nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: { user: options.user, pass: options.password },

    pool: true,
    maxConnections: 3,
    maxMessages: 50,

    // Explicit, and short enough to matter. Without these nodemailer inherits
    // the OS socket timeout, which on a blocked outbound port means the
    // request handling this sits there for minutes — a hung reset endpoint is
    // worse than a failed one, because the customer keeps retrying it.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,

    // Refuse a server whose certificate does not validate. nodemailer's default
    // already does this; it is pinned because the usual "fix" for a TLS error
    // found in a hurry is to turn it off, and that turns an encrypted channel
    // carrying reset links into one anybody on the path can read.
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });

  async function attemptSend(message: MailMessage, attempt: number): Promise<SentMail> {
    try {
      const info = await transporter.sendMail({
        from: message.from ?? options.from,
        to: message.to,
        replyTo: message.replyTo ?? options.replyTo,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      options.onAttempt?.({ attempt, outcome: "sent" });

      return { messageId: info.messageId, via: "smtp", delivered: true };
    } catch (error) {
      const code = errorCode(error);
      const retryable = attempt <= maxRetries && isTransient(error);

      options.onAttempt?.({
        attempt,
        outcome: retryable ? "retrying" : "failed",
        code,
        message: error instanceof Error ? error.message : String(error),
      });

      if (!retryable) throw error;

      // Linear backoff, not exponential: the ceiling is two retries, and a
      // request is waiting on this. Seconds of delay here are seconds a
      // customer spends on a spinner.
      await delay(attempt * 500);

      return attemptSend(message, attempt + 1);
    }
  }

  return {
    driver: "smtp",
    send: (message) => attemptSend(message, 1),
    verify: async () => {
      await transporter.verify();
    },
    close: async () => {
      transporter.close();
    },
  };
}

function errorCode(error: unknown): string | undefined {
  if (error !== null && typeof error === "object") {
    const candidate = (error as { responseCode?: number; code?: string }).responseCode;
    if (typeof candidate === "number") return String(candidate);

    const code = (error as { code?: string }).code;
    if (typeof code === "string") return code;
  }

  return undefined;
}

/**
 * Decides whether an error is worth a second attempt.
 *
 * The distinction is the whole value of retrying. A 4xx reply and a dropped
 * socket are the server saying "not now"; a 5xx reply is it saying "not ever" —
 * a rejected recipient or a refused login. Retrying a bad password does not
 * fix it, it just spends three attempts getting the sending address flagged for
 * repeated authentication failures.
 */
function isTransient(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;

  const { responseCode, code } = error as { responseCode?: number; code?: string };

  if (typeof responseCode === "number") {
    return responseCode >= 400 && responseCode < 500;
  }

  // Network-level failures, which carry no SMTP reply code at all.
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNECTION" ||
    code === "ESOCKET" ||
    code === "EDNS"
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
