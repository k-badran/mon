import { env } from "@umzugplus/config";

import { renderTemplate, type PayloadFor, type TemplateKey } from "./templates/registry.js";
import { createLogTransport } from "./transports/log.js";
import { createSmtpTransport } from "./transports/smtp.js";
import type { MailDriver, MailTransport, SentMail } from "./types.js";

export interface MailerEvents {
  /** Called for every send, whatever the outcome. Wired to pino in the API. */
  onSend?: (event: {
    template: TemplateKey;
    to: string;
    driver: MailDriver;
    delivered: boolean;
    durationMs: number;
  }) => void;
  onError?: (event: { template: TemplateKey; to: string; error: unknown }) => void;
  onTransportEvent?: (event: { level: "debug" | "warn"; message: string }) => void;
}

export interface Mailer {
  readonly driver: MailDriver;

  /**
   * Renders and sends a registered template.
   *
   * Generic over the key so the payload is checked against the one template
   * that will receive it.
   */
  send<K extends TemplateKey>(input: {
    template: K;
    to: string;
    payload: PayloadFor<K>;
    /** Read straight from `users.locale`; narrowed by the registry. */
    locale?: unknown;
  }): Promise<SentMail>;

  /**
   * Sends and swallows the failure, returning null instead of throwing.
   *
   * For the callers where the email is a side effect of an operation that has
   * already succeeded — a registration is not rolled back because a welcome
   * message bounced. The error is reported through `onError`, so it is visible
   * without being fatal. Callers whose whole purpose is the email (an OTP
   * request) use `send` and let the failure surface.
   */
  trySend<K extends TemplateKey>(input: {
    template: K;
    to: string;
    payload: PayloadFor<K>;
    locale?: unknown;
  }): Promise<SentMail | null>;

  verify(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Builds the mailer from validated configuration.
 *
 * The transport is chosen once, at construction, rather than per message: a
 * driver that can change between two sends is a system where a message's fate
 * depends on when it was sent.
 *
 * `transport` is injectable so tests can assert on what would have been sent
 * without reaching either driver.
 */
export function createMailer(
  events: MailerEvents = {},
  transport: MailTransport = defaultTransport(events),
): Mailer {
  async function dispatch<K extends TemplateKey>(input: {
    template: K;
    to: string;
    payload: PayloadFor<K>;
    locale?: unknown;
  }): Promise<SentMail> {
    const rendered = renderTemplate(input.template, input.payload, input.locale);
    const startedAt = Date.now();

    const sent = await transport.send({
      to: input.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: env.MAIL_REPLY_TO,
      tags: { template: input.template },
    });

    events.onSend?.({
      template: input.template,
      to: input.to,
      driver: sent.via,
      delivered: sent.delivered,
      durationMs: Date.now() - startedAt,
    });

    return sent;
  }

  return {
    driver: transport.driver,
    send: dispatch,

    async trySend(input) {
      try {
        return await dispatch(input);
      } catch (error) {
        events.onError?.({ template: input.template, to: input.to, error });
        return null;
      }
    },

    verify: () => transport.verify(),
    close: () => transport.close(),
  };
}

function defaultTransport(events: MailerEvents): MailTransport {
  if (env.MAIL_DRIVER === "smtp") {
    // Non-null assertions are safe here and nowhere else: the config schema
    // refuses to parse when MAIL_DRIVER is "smtp" without these three, so the
    // process cannot have started.
    return createSmtpTransport({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER!,
      password: env.SMTP_PASSWORD!,
      from: env.MAIL_FROM,
      replyTo: env.MAIL_REPLY_TO,
      onAttempt: (attempt) =>
        events.onTransportEvent?.({
          level: attempt.outcome === "sent" ? "debug" : "warn",
          message: `smtp attempt ${attempt.attempt} ${attempt.outcome}${
            attempt.code ? ` (${attempt.code})` : ""
          }${attempt.message ? `: ${attempt.message}` : ""}`,
        }),
    });
  }

  return createLogTransport({
    outboxDir: env.MAIL_OUTBOX_DIR,
    onRecord: (record) =>
      events.onTransportEvent?.({
        level: "debug",
        message: `mail recorded to ${record.file} (not sent)`,
      }),
  });
}
