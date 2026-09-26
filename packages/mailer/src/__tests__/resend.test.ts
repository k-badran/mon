import { afterEach, describe, expect, it, vi } from "vitest";

import { createResendTransport } from "../transports/resend.js";

const message = {
  to: "kunde@example.de",
  subject: "Test",
  html: "<p>hi</p>",
  text: "hi",
};

function mockFetch(...responses: Array<Response | Error>) {
  const spy = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) spy.mockRejectedValueOnce(r);
    else spy.mockResolvedValueOnce(r);
  }
  vi.stubGlobal("fetch", spy);
  return spy;
}

const ok = (id = "abc-123") =>
  new Response(JSON.stringify({ id }), { status: 200 });

const fail = (status: number, message = "nope") =>
  new Response(JSON.stringify({ message }), { status });

afterEach(() => void vi.unstubAllGlobals());

describe("resend transport", () => {
  it("posts the message and returns the provider's id", async () => {
    const spy = mockFetch(ok("re_msg_1"));
    const transport = createResendTransport({ apiKey: "re_test", from: "a@b.de" });

    const sent = await transport.send(message);

    expect(sent).toEqual({ messageId: "re_msg_1", via: "resend", delivered: true });

    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");

    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["kunde@example.de"]);
    // Both parts must go: an HTML-only message reads as bulk mail.
    expect(body.html).toBe("<p>hi</p>");
    expect(body.text).toBe("hi");
  });

  it("retries a 429, because that is the documented rate limit", async () => {
    const spy = mockFetch(fail(429, "rate limited"), ok());
    const transport = createResendTransport({ apiKey: "k", from: "a@b.de" });

    await expect(transport.send(message)).resolves.toMatchObject({ delivered: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("retries a 5xx", async () => {
    const spy = mockFetch(fail(502), ok());
    const transport = createResendTransport({ apiKey: "k", from: "a@b.de" });

    await expect(transport.send(message)).resolves.toMatchObject({ delivered: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a 4xx — a revoked key or bad recipient is not transient", async () => {
    const spy = mockFetch(fail(422, "domain is not verified"));
    const transport = createResendTransport({ apiKey: "k", from: "a@b.de" });

    await expect(transport.send(message)).rejects.toThrow("domain is not verified");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("retries a network failure, then gives up after the budget", async () => {
    const spy = mockFetch(
      new Error("ECONNRESET"),
      new Error("ECONNRESET"),
      new Error("ECONNRESET"),
    );
    const transport = createResendTransport({ apiKey: "k", from: "a@b.de", maxRetries: 2 });

    await expect(transport.send(message)).rejects.toThrow("ECONNRESET");
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("treats a 401 from the domains check as a pass, for a send-only key", async () => {
    mockFetch(fail(401, "restricted"));
    const transport = createResendTransport({ apiKey: "k", from: "a@b.de" });

    // A key scoped to sending cannot list domains, but can still send — so this
    // must not be reported as a broken configuration.
    await expect(transport.verify()).resolves.toBeUndefined();
  });

  it("reports an unreachable API from verify", async () => {
    mockFetch(fail(503));
    const transport = createResendTransport({ apiKey: "k", from: "a@b.de" });

    await expect(transport.verify()).rejects.toThrow("not reachable");
  });
});
