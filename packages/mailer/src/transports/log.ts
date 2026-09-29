import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type { MailMessage, MailTransport, SentMail } from "../types.js";

export interface LogOptions {
  /** Directory the messages are written to. Relative paths resolve from cwd. */
  outboxDir: string;
  /** Receives a one-line summary per message. Wired to pino. */
  onRecord?: ((event: { to: string; subject: string; file: string }) => void) | undefined;
  /**
   * False disables writing files and keeps only the callback. Used by tests,
   * which assert on the message and should not leave artefacts behind.
   */
  writeFiles?: boolean | undefined;
}

/**
 * Records messages instead of sending them.
 *
 * This is the default outside production, and it is a deliberate design choice
 * rather than a stub. Three things fall out of it: development needs no SMTP
 * credentials at all, the test suite cannot email a real customer by accident,
 * and outbound port 465 being blocked — which is normal on home and mobile
 * networks — stops being something that blocks working on the product.
 *
 * The `.html` file is openable in a browser, which is the only practical way to
 * check that the Arabic layout renders right to left.
 */
export function createLogTransport(options: LogOptions): MailTransport {
  const writeFiles = options.writeFiles ?? true;

  return {
    driver: "log",

    async send(message: MailMessage): Promise<SentMail> {
      const messageId = `${Date.now()}-${randomUUID()}`;
      const file = resolve(options.outboxDir, `${messageId}.html`);

      if (writeFiles) {
        await mkdir(options.outboxDir, { recursive: true });

        // The headers are written into the file as a comment so one artefact
        // carries everything needed to judge the message — recipient, subject
        // and the plain-text alternative that a spam filter would read.
        const contents = [
          "<!--",
          `To:      ${message.to}`,
          `Subject: ${message.subject}`,
          `From:    ${message.from ?? "(default MAIL_FROM)"}`,
          "",
          "--- text/plain alternative ---",
          message.text,
          "-->",
          message.html,
        ].join("\n");

        await writeFile(file, contents, "utf8");
      }

      options.onRecord?.({ to: message.to, subject: message.subject, file });

      // `delivered: false` is the point of this transport. A caller that tells
      // the user "check your inbox" has to be able to tell that nothing left
      // the machine, and a silent pretend-success is how a broken mail
      // configuration reaches production unnoticed.
      return { messageId, via: "log", delivered: false };
    },

    // Nothing to verify — but it must not throw, so a startup check that runs
    // in every environment does not fail the ones that do not send.
    verify: async () => {},
    close: async () => {},
  };
}
