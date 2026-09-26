import { createMailer, type Mailer } from "@mon/mailer";

import { logger } from "./logger.js";

/**
 * The application's single mailer, wired to the application's logger.
 *
 * One instance per process, because the SMTP transport holds a connection pool
 * and building a second one would open a second pool that nothing ever drains.
 *
 * Logging is injected rather than imported by the mailer package: the package
 * stays free of a logging dependency and remains testable without one, while
 * every send still lands in the same structured log as the request that caused
 * it. The logger's `redact` list already covers password and token fields, and
 * nothing here passes a message body into a log — a reset link in the logs is a
 * reset link anyone with log access can use.
 */
export const mailer: Mailer = createMailer({
  onSend: (event) => {
    logger.info(
      {
        template: event.template,
        to: event.to,
        driver: event.driver,
        delivered: event.delivered,
        durationMs: event.durationMs,
      },
      event.delivered ? "Mail sent" : "Mail recorded but not sent",
    );
  },

  onError: (event) => {
    // `error` rather than `warn`: this only fires from `trySend`, where the
    // surrounding operation is allowed to succeed. That makes the log the only
    // trace that a customer never got their email.
    logger.error(
      { template: event.template, to: event.to, err: event.error },
      "Mail could not be sent",
    );
  },

  onTransportEvent: (event) => {
    logger[event.level]({ scope: "mail" }, event.message);
  },
});

/**
 * Checks at startup that the configured transport can actually deliver.
 *
 * Deliberately non-fatal. A failing SMTP login should be loud and immediate —
 * that is the difference between finding out now and finding out from a
 * customer who never received a code — but it should not stop the API from
 * serving the other ninety-odd endpoints that have nothing to do with email.
 */
export async function verifyMailer(): Promise<void> {
  try {
    await mailer.verify();
    logger.info({ driver: mailer.driver }, "Mail transport ready");
  } catch (error) {
    logger.error(
      { driver: mailer.driver, err: error },
      "Mail transport is NOT working — outbound email will fail",
    );
  }
}
