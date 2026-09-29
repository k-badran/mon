import type { Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutInput } from "./layout.js";

export interface VerifyEmailPayload {
  /** The full confirmation URL, already carrying the token. */
  url: string;
  expiresInHours: number;
  name?: string | undefined;
}

interface Copy {
  subject: string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  button: string;
  fallback: string;
  notice: (hours: number) => string;
  ignore: string;
}

const COPY: Record<Locale, Copy> = {
  de: {
    subject: "Bestätigen Sie Ihre E-Mail-Adresse",
    heading: "E-Mail-Adresse bestätigen",
    greeting: (name) => `Hallo ${name},`,
    intro: "Bestätigen Sie Ihre E-Mail-Adresse, um Ihr m.on-Konto vollständig zu aktivieren.",
    button: "E-Mail bestätigen",
    fallback: "Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:",
    notice: (h) => `Der Link ist ${h} Stunden gültig.`,
    ignore: "Wenn Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.",
  },
  en: {
    subject: "Confirm your email address",
    heading: "Confirm your email address",
    greeting: (name) => `Hello ${name},`,
    intro: "Confirm your email address to finish activating your m.on account.",
    button: "Confirm email",
    fallback: "If the button does not work, copy this link into your browser:",
    notice: (h) => `The link is valid for ${h} hours.`,
    ignore: "If you did not create an account, you can ignore this email.",
  },
  ar: {
    subject: "أكّد عنوان بريدك الإلكتروني",
    heading: "تأكيد البريد الإلكتروني",
    greeting: (name) => `مرحباً ${name}،`,
    intro: "أكّد عنوان بريدك الإلكتروني لتفعيل حسابك في m.on بالكامل.",
    button: "تأكيد البريد",
    fallback: "إذا لم يعمل الزر، انسخ هذا الرابط إلى متصفحك:",
    notice: (h) => `الرابط صالح لمدة ${h} ساعة.`,
    ignore: "إذا لم تُنشئ حساباً، تجاهل هذه الرسالة.",
  },
  tr: {
    subject: "E-posta adresinizi onaylayın",
    heading: "E-posta adresinizi onaylayın",
    greeting: (name) => `Merhaba ${name},`,
    intro: "m.on hesabınızı tamamen etkinleştirmek için e-posta adresinizi onaylayın.",
    button: "E-postayı onayla",
    fallback: "Düğme çalışmazsa bu bağlantıyı tarayıcınıza kopyalayın:",
    notice: (h) => `Bağlantı ${h} saat geçerlidir.`,
    ignore: "Hesap oluşturmadıysanız bu e-postayı yok sayabilirsiniz.",
  },
};

export function verifyEmailTemplate(
  payload: VerifyEmailPayload,
  locale: Locale,
): RenderedTemplate {
  const copy = COPY[locale];

  const layout: LayoutInput = {
    locale,
    heading: copy.heading,
    blocks: [
      ...(payload.name ? [{ paragraph: copy.greeting(payload.name) }] : []),
      { paragraph: copy.intro },
      { button: { label: copy.button, url: payload.url } },
      { fallbackUrl: { label: copy.fallback, url: payload.url } },
      { paragraph: copy.ignore },
    ],
    notice: copy.notice(payload.expiresInHours),
  };

  return { subject: copy.subject, html: renderHtml(layout), text: renderText(layout) };
}
