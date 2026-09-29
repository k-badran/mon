import { describe, expect, it, vi } from "vitest";

import { createMailer } from "../mailer.js";
import { createLogTransport } from "../transports/log.js";
import type { MailMessage, MailTransport } from "../types.js";

/** Captures messages without rendering or a network. */
function fakeTransport(
  behaviour: { fail?: Error } = {},
): MailTransport & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];

  return {
    driver: "log",
    sent,
    async send(message) {
      if (behaviour.fail) throw behaviour.fail;
      sent.push(message);
      return { messageId: "fake-1", via: "log", delivered: true };
    },
    verify: async () => {},
    close: async () => {},
  };
}

describe("mailer", () => {
  it("renders the named template and hands it to the transport", async () => {
    const transport = fakeTransport();
    const mailer = createMailer({}, transport);

    await mailer.send({
      template: "otp",
      to: "kunde@example.de",
      payload: { code: "246810", expiresInMinutes: 10 },
      locale: "de",
    });

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]!.to).toBe("kunde@example.de");
    expect(transport.sent[0]!.subject).toContain("246810");
    expect(transport.sent[0]!.html).toContain("246810");
    expect(transport.sent[0]!.text).toContain("246810");
  });

  it("reports the send through onSend", async () => {
    const onSend = vi.fn();
    const mailer = createMailer({ onSend }, fakeTransport());

    await mailer.send({
      template: "otp",
      to: "a@b.de",
      payload: { code: "1", expiresInMinutes: 1 },
    });

    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({ template: "otp", to: "a@b.de", delivered: true }),
    );
  });

  it("send propagates a failure, because the caller's whole purpose was the email", async () => {
    const mailer = createMailer({}, fakeTransport({ fail: new Error("smtp down") }));

    await expect(
      mailer.send({ template: "otp", to: "a@b.de", payload: { code: "1", expiresInMinutes: 1 } }),
    ).rejects.toThrow("smtp down");
  });

  it("trySend swallows the failure and reports it, so the surrounding operation survives", async () => {
    const onError = vi.fn();
    const mailer = createMailer(
      { onError },
      fakeTransport({ fail: new Error("smtp down") }),
    );

    const result = await mailer.trySend({
      template: "verify-email",
      to: "a@b.de",
      payload: { url: "https://x.de/v", expiresInHours: 24 },
    });

    expect(result).toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });
});

describe("log transport", () => {
  it("reports delivered: false so a caller cannot mistake it for a real send", async () => {
    const onRecord = vi.fn();
    const transport = createLogTransport({
      outboxDir: "/tmp/does-not-matter",
      writeFiles: false,
      onRecord,
    });

    const sent = await transport.send({
      to: "a@b.de",
      subject: "s",
      html: "<p>h</p>",
      text: "h",
    });

    expect(sent.delivered).toBe(false);
    expect(sent.via).toBe("log");
    expect(onRecord).toHaveBeenCalledOnce();
  });
});
