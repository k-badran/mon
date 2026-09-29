import { formatCurrency, type Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutBlock, type LayoutInput } from "./layout.js";

export interface PaymentReceiptPayload {
  reference: string;
  name?: string | undefined;
  /** Decimal string. Always positive — `kind` carries the direction. */
  amount: string;
  kind: "deposit" | "balance" | "refund";
  /** How it was paid, when recorded. Free text from the admin. */
  method?: string | undefined;
  /** Total paid so far, after this entry. */
  paidAmount: string;
  totalGross: string;
  url?: string | undefined;
}

interface Copy {
  subject: (reference: string) => string;
  heading: string;
  intro: string;
  settled: string;
  outstanding: (amount: string) => string;
  button: string;
  labels: { reference: string; amount: string; method: string; paid: string; total: string };
  kinds: Record<PaymentReceiptPayload["kind"], string>;
}

const COPY: Record<Locale, { payment: Copy; refund: Copy }> = {
  de: {
    payment: {
      subject: (r) => `Zahlungsbestätigung — ${r}`,
      heading: "Zahlung erhalten",
      intro: "Vielen Dank. Wir haben Ihre Zahlung verbucht.",
      settled: "Der Auftrag ist vollständig bezahlt.",
      outstanding: (a) => `Offener Betrag: ${a}`,
      button: "Auftrag ansehen",
      labels: { reference: "Referenz", amount: "Betrag", method: "Zahlungsart", paid: "Bereits bezahlt", total: "Gesamtpreis" },
      kinds: { deposit: "Anzahlung", balance: "Restzahlung", refund: "Rückerstattung" },
    },
    refund: {
      subject: (r) => `Rückerstattung — ${r}`,
      heading: "Rückerstattung veranlasst",
      intro: "Wir haben eine Rückerstattung für Ihren Auftrag veranlasst.",
      settled: "Es ist kein Betrag mehr offen.",
      outstanding: (a) => `Offener Betrag: ${a}`,
      button: "Auftrag ansehen",
      labels: { reference: "Referenz", amount: "Betrag", method: "Zahlungsart", paid: "Bereits bezahlt", total: "Gesamtpreis" },
      kinds: { deposit: "Anzahlung", balance: "Restzahlung", refund: "Rückerstattung" },
    },
  },
  en: {
    payment: {
      subject: (r) => `Payment confirmation — ${r}`,
      heading: "Payment received",
      intro: "Thank you. We've recorded your payment.",
      settled: "This order is now paid in full.",
      outstanding: (a) => `Outstanding: ${a}`,
      button: "View order",
      labels: { reference: "Reference", amount: "Amount", method: "Method", paid: "Paid so far", total: "Total" },
      kinds: { deposit: "Deposit", balance: "Balance", refund: "Refund" },
    },
    refund: {
      subject: (r) => `Refund — ${r}`,
      heading: "Refund issued",
      intro: "We've issued a refund on your order.",
      settled: "Nothing is outstanding.",
      outstanding: (a) => `Outstanding: ${a}`,
      button: "View order",
      labels: { reference: "Reference", amount: "Amount", method: "Method", paid: "Paid so far", total: "Total" },
      kinds: { deposit: "Deposit", balance: "Balance", refund: "Refund" },
    },
  },
  ar: {
    payment: {
      subject: (r) => `تأكيد الدفع — ${r}`,
      heading: "استلمنا دفعتك",
      intro: "شكراً لك. سجّلنا دفعتك.",
      settled: "تم سداد قيمة الطلب بالكامل.",
      outstanding: (a) => `المتبقّي: ${a}`,
      button: "عرض الطلب",
      labels: { reference: "رقم الطلب", amount: "المبلغ", method: "طريقة الدفع", paid: "المدفوع حتى الآن", total: "المجموع" },
      kinds: { deposit: "عربون", balance: "الدفعة المتبقية", refund: "استرداد" },
    },
    refund: {
      subject: (r) => `استرداد — ${r}`,
      heading: "تم إصدار الاسترداد",
      intro: "أصدرنا استرداداً لطلبك.",
      settled: "لا يوجد مبلغ متبقٍ.",
      outstanding: (a) => `المتبقّي: ${a}`,
      button: "عرض الطلب",
      labels: { reference: "رقم الطلب", amount: "المبلغ", method: "طريقة الدفع", paid: "المدفوع حتى الآن", total: "المجموع" },
      kinds: { deposit: "عربون", balance: "الدفعة المتبقية", refund: "استرداد" },
    },
  },
  tr: {
    payment: {
      subject: (r) => `Ödeme onayı — ${r}`,
      heading: "Ödeme alındı",
      intro: "Teşekkürler. Ödemenizi kaydettik.",
      settled: "Bu sipariş tamamen ödendi.",
      outstanding: (a) => `Kalan: ${a}`,
      button: "Siparişi görüntüle",
      labels: { reference: "Referans", amount: "Tutar", method: "Yöntem", paid: "Şimdiye kadar ödenen", total: "Toplam" },
      kinds: { deposit: "Ön ödeme", balance: "Kalan ödeme", refund: "İade" },
    },
    refund: {
      subject: (r) => `İade — ${r}`,
      heading: "İade yapıldı",
      intro: "Siparişiniz için bir iade yaptık.",
      settled: "Kalan tutar yok.",
      outstanding: (a) => `Kalan: ${a}`,
      button: "Siparişi görüntüle",
      labels: { reference: "Referans", amount: "Tutar", method: "Yöntem", paid: "Şimdiye kadar ödenen", total: "Toplam" },
      kinds: { deposit: "Ön ödeme", balance: "Kalan ödeme", refund: "İade" },
    },
  },
};

export function paymentReceiptTemplate(
  payload: PaymentReceiptPayload,
  locale: Locale,
): RenderedTemplate {
  // A refund is not a payment and must not be worded as one — "thank you, we've
  // recorded your payment" for money going back to the customer reads as a
  // mistake, and invites a support call.
  const copy = COPY[locale][payload.kind === "refund" ? "refund" : "payment"];

  const outstanding =
    Number.parseFloat(payload.totalGross) - Number.parseFloat(payload.paidAmount);

  const blocks: LayoutBlock[] = [];
  if (payload.name) blocks.push({ paragraph: greeting(payload.name, locale) });
  blocks.push({ paragraph: copy.intro });

  const facts = [
    `${copy.labels.reference}: ${payload.reference}`,
    `${copy.labels.amount}: ${formatCurrency(payload.amount, locale)} (${copy.kinds[payload.kind]})`,
  ];

  if (payload.method) facts.push(`${copy.labels.method}: ${payload.method}`);

  facts.push(`${copy.labels.paid}: ${formatCurrency(payload.paidAmount, locale)}`);
  facts.push(`${copy.labels.total}: ${formatCurrency(payload.totalGross, locale)}`);

  blocks.push({ lines: facts });

  // Rounded to the cent before comparing: these are decimal strings parsed to
  // floats, and a balance that is 0.004 away from zero is paid in full.
  blocks.push({
    paragraph:
      outstanding <= 0.005
        ? copy.settled
        : copy.outstanding(formatCurrency(outstanding, locale)),
  });

  if (payload.url) blocks.push({ button: { label: copy.button, url: payload.url } });

  const layout: LayoutInput = { locale, heading: copy.heading, blocks, reason: "transaction" };

  return {
    subject: copy.subject(payload.reference),
    html: renderHtml(layout),
    text: renderText(layout),
  };
}

const GREETINGS: Record<Locale, (name: string) => string> = {
  de: (n) => `Hallo ${n},`,
  en: (n) => `Hello ${n},`,
  ar: (n) => `مرحباً ${n}،`,
  tr: (n) => `Merhaba ${n},`,
};

function greeting(name: string, locale: Locale): string {
  return GREETINGS[locale](name);
}
