import { describe, expect, it } from "vitest";

import { renderTemplate } from "../templates/registry.js";

describe("template rendering", () => {
  it("renders an OTP in every supported locale", () => {
    for (const locale of ["de", "en", "ar", "tr"] as const) {
      const mail = renderTemplate("otp", { code: "483920", expiresInMinutes: 10 }, locale);

      expect(mail.subject).toContain("483920");
      expect(mail.html).toContain("483920");
      expect(mail.text).toContain("483920");
      expect(mail.html).toContain(`lang="${locale}"`);
    }
  });

  it("marks Arabic right-to-left but keeps the code itself left-to-right", () => {
    const mail = renderTemplate("otp", { code: "112233", expiresInMinutes: 10 }, "ar");

    expect(mail.html).toContain('dir="rtl"');
    // Without this the code is reordered on screen and the customer types a
    // sequence the server never issued.
    expect(mail.html).toMatch(/<p dir="ltr"[^>]*>[\s\S]*112233/);
  });

  it("falls back to German for a locale the database holds but we do not ship", () => {
    const mail = renderTemplate("otp", { code: "555000", expiresInMinutes: 5 }, "fr");

    expect(mail.html).toContain('lang="de"');
    expect(mail.subject).toContain("Anmeldecode");
  });

  it("always produces a plain-text alternative", () => {
    const templates = [
      renderTemplate("otp", { code: "1", expiresInMinutes: 1 }, "en"),
      renderTemplate("verify-email", { url: "https://x.de/v?t=1", expiresInHours: 24 }, "en"),
      renderTemplate("password-reset", { url: "https://x.de/r?t=1", expiresInMinutes: 30 }, "en"),
    ];

    for (const mail of templates) {
      expect(mail.text.length).toBeGreaterThan(40);
      expect(mail.text).not.toContain("<");
    }
  });

  it("escapes a name that contains markup", () => {
    const mail = renderTemplate(
      "verify-email",
      { url: "https://x.de/v?t=1", expiresInHours: 24, name: '<script>alert(1)</script>' },
      "en",
    );

    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("neutralises a link that is not http(s)", () => {
    const mail = renderTemplate(
      "password-reset",
      { url: "javascript:alert(document.cookie)", expiresInMinutes: 30 },
      "en",
    );

    expect(mail.html).not.toContain("javascript:");
    expect(mail.html).toContain('href="#"');
    // The plain-text body prints the destination for clients that will not
    // render a link, so it has to be filtered too — otherwise the message
    // still invites the recipient to paste the payload into their address bar.
    expect(mail.text).not.toContain("javascript:");
  });

  it("keeps a real reset link intact", () => {
    const url = "https://moveongo.de/reset?token=abc-123_XYZ";
    const mail = renderTemplate("password-reset", { url, expiresInMinutes: 30 }, "de");

    expect(mail.html).toContain("https://moveongo.de/reset?token=abc-123_XYZ");
    expect(mail.text).toContain(url);
  });
});
