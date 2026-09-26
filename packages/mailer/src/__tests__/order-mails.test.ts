import { describe, expect, it } from "vitest";

import { renderTemplate } from "../templates/registry.js";

const order = {
  reference: "UP-2026-000142",
  totalGross: "1290.00",
  depositAmount: "258.00",
  scheduledDate: "2026-03-01",
  scheduledTime: "09:00:00",
  url: "https://moveongo.de/de/konto/auftraege/abc",
  name: "Khaled",
};

describe("order status emails", () => {
  it("carries the reference in the subject at every stage", () => {
    for (const stage of ["submitted", "confirmed", "completed", "cancelled"] as const) {
      const mail = renderTemplate("order-status", { ...order, stage }, "de");
      expect(mail.subject).toContain("UP-2026-000142");
      expect(mail.text).toContain("UP-2026-000142");
    }
  });

  it("describes a new order as received, not as 'quoted'", () => {
    // The row is `quoted`; the customer has submitted a request and is waiting.
    // Leaking the internal status into the copy describes our bookkeeping.
    const mail = renderTemplate("order-status", { ...order, stage: "submitted" }, "en");
    expect(mail.heading ?? mail.html).toContain("received");
    expect(mail.subject.toLowerCase()).not.toContain("quoted");
  });

  it("formats the date as the day that was booked, never the day before", () => {
    // The point of the assertion is the day number, not the word order — each
    // locale arranges it differently ("01. März 2026" vs "March 01, 2026"). What
    // must never happen is 28 February: constructing a local Date from the ISO
    // string is what shifted bookings by a day west of Greenwich.
    for (const locale of ["de", "en", "ar", "tr"] as const) {
      const text = renderTemplate("order-status", { ...order, stage: "confirmed" }, locale).text;
      expect(text).toMatch(/\b0?1\b/);
      expect(text).not.toMatch(/\b28\b/);
      expect(text).toContain("2026");
    }

    expect(renderTemplate("order-status", { ...order, stage: "confirmed" }, "de").text)
      .toContain("März");
  });

  it("trims the seconds off the booking time", () => {
    const mail = renderTemplate("order-status", { ...order, stage: "confirmed" }, "de");
    expect(mail.text).toContain("09:00");
    expect(mail.text).not.toContain("09:00:00");
  });

  it("formats money as currency for the locale", () => {
    const de = renderTemplate("order-status", { ...order, stage: "confirmed" }, "de");
    // German writes the symbol last and uses a comma as the decimal separator.
    expect(de.text).toMatch(/1\.290,00\s?€/);
  });

  it("omits a zero deposit rather than printing a confusing line", () => {
    const mail = renderTemplate(
      "order-status",
      { ...order, stage: "confirmed", depositAmount: "0" },
      "de",
    );
    expect(mail.text).not.toContain("Anzahlung");
  });

  it("shows a cancellation fee only on a cancellation, and only when charged", () => {
    const withFee = renderTemplate(
      "order-status",
      { ...order, stage: "cancelled", cancellationFee: "129.00" },
      "de",
    );
    expect(withFee.text).toContain("Stornogebühr");

    const noFee = renderTemplate("order-status", { ...order, stage: "cancelled" }, "de");
    expect(noFee.text).not.toContain("Stornogebühr");
  });

  it("does not claim the customer requested it", () => {
    // The account footer ("requested from your m.on account") belongs on an OTP
    // or a reset link, where it is how someone who did not ask spots trouble. An
    // order confirmation follows from a booking, and saying it was requested
    // reads as a mistake.
    const mail = renderTemplate("order-status", { ...order, stage: "confirmed" }, "en");
    expect(mail.text).not.toContain("requested from your");
    expect(mail.text).toContain("about your order");
  });

  it("does not promise an invoice that nothing sends", () => {
    const mail = renderTemplate("order-status", { ...order, stage: "completed" }, "en");
    expect(mail.text).not.toMatch(/invoice follows/i);
  });

  it("renders Arabic right-to-left", () => {
    const mail = renderTemplate("order-status", { ...order, stage: "submitted" }, "ar");
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.html).toContain('lang="ar"');
  });

  it("copes with an order that has no date agreed yet", () => {
    const { scheduledDate, scheduledTime, ...dateless } = order;
    const mail = renderTemplate("order-status", { ...dateless, stage: "submitted" }, "de");
    expect(mail.subject).toContain("UP-2026-000142");
    expect(mail.text).not.toContain("undefined");
  });
});

describe("payment receipt emails", () => {
  const payment = {
    reference: "UP-2026-000142",
    amount: "258.00",
    paidAmount: "258.00",
    totalGross: "1290.00",
    url: order.url,
  } as const;

  it("states what is still outstanding", () => {
    const mail = renderTemplate(
      "payment-receipt",
      { ...payment, kind: "deposit" },
      "en",
    );
    expect(mail.text).toContain("Outstanding");
    expect(mail.text).toMatch(/1,032\.00/);
  });

  it("says the order is settled when nothing is left", () => {
    const mail = renderTemplate(
      "payment-receipt",
      { ...payment, kind: "balance", paidAmount: "1290.00" },
      "en",
    );
    expect(mail.text).toContain("paid in full");
    expect(mail.text).not.toContain("Outstanding");
  });

  it("does not thank the customer for a refund", () => {
    // "Thank you, we've recorded your payment" for money going back to the
    // customer reads as a mistake and invites a support call.
    const mail = renderTemplate(
      "payment-receipt",
      { ...payment, kind: "refund" },
      "en",
    );
    expect(mail.subject).toContain("Refund");
    expect(mail.text).toContain("refund");
    expect(mail.text).not.toContain("recorded your payment");
  });

  it("includes the payment method when one was recorded", () => {
    const mail = renderTemplate(
      "payment-receipt",
      { ...payment, kind: "deposit", method: "bank_transfer" },
      "en",
    );
    expect(mail.text).toContain("bank_transfer");
  });
});
