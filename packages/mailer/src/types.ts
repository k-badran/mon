import type { Locale } from "@umzugplus/core";

/**
 * A message that is ready to send — every decision already made.
 *
 * Templates produce this; transports consume it. Nothing downstream of here
 * knows what a locale or a template is, which is what lets the SMTP transport
 * be tested without rendering and the templates be tested without a network.
 */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  /**
   * Required, not optional.
   *
   * A message with no plain-text alternative reads as bulk mail to every
   * spam filter worth the name, and the one that matters here is the one in
   * front of a customer waiting on a login code. Making the field optional
   * means the first template written in a hurry ships without it.
   */
  text: string;
  /** Overrides `MAIL_FROM`. Only a caller with a reason should set this. */
  from?: string | undefined;
  replyTo?: string | undefined;
  /** Carried into logs and the outbox filename, never into the message. */
  tags?: Record<string, string> | undefined;
}

export interface SentMail {
  /** The transport's own identifier, for correlating with a provider's logs. */
  messageId: string;
  /** Which transport handled it — `smtp` sent it, `log` did not. */
  via: MailDriver;
  /**
   * False when the message was recorded rather than delivered. Callers that
   * tell a user "check your inbox" have to be able to tell the difference.
   */
  delivered: boolean;
}

export type MailDriver = "smtp" | "log";

export interface MailTransport {
  readonly driver: MailDriver;
  send(message: MailMessage): Promise<SentMail>;
  /**
   * Proves the transport can actually deliver, before anything depends on it.
   *
   * Separate from `send` because the useful moment to discover that a password
   * is wrong or a port is blocked is at startup or from a diagnostic endpoint —
   * not when a customer is waiting for a reset link.
   */
  verify(): Promise<void>;
  /** Releases pooled connections. Called from the API's shutdown path. */
  close(): Promise<void>;
}

/** What every template receives on top of its own payload. */
export interface TemplateContext {
  locale: Locale;
}

/** The rendered half of a message — the part a template is responsible for. */
export interface RenderedTemplate {
  subject: string;
  html: string;
  text: string;
}
