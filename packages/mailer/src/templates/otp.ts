import type { Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutInput } from "./layout.js";

export interface OtpPayload {
  /** The six-digit code, already generated. Templates never mint secrets. */
  code: string;
  /** How long the code stays valid, in minutes — rendered into the copy. */
  expiresInMinutes: number;
  /** Optional: greets the customer by name when the caller knows it. */
  name?: string | undefined;
}

interface Copy {
  subject: string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  notice: (minutes: number) => string;
  ignore: string;
}

const COPY: Record<Locale, Copy> = {
  de: {
    subject: "Ihr m.on-Anmeldecode",
    heading: "Ihr Anmeldecode",
    greeting: (name) => `Hallo ${name},`,
    intro: "Geben Sie diesen Code ein, um fortzufahren:",
    notice: (m) => `Der Code ist ${m} Minuten gültig und kann nur einmal verwendet werden.`,
    ignore: "Wenn Sie diesen Code nicht angefordert haben, ignorieren Sie diese E-Mail — Ihr Konto bleibt sicher.",
  },
  en: {
    subject: "Your m.on sign-in code",
    heading: "Your sign-in code",
    greeting: (name) => `Hello ${name},`,
    intro: "Enter this code to continue:",
    notice: (m) => `The code is valid for ${m} minutes and can only be used once.`,
    ignore: "If you did not request this code, ignore this email — your account is safe.",
  },
  ar: {
    subject: "رمز الدخول الخاص بك في m.on",
    heading: "رمز الدخول",
    greeting: (name) => `مرحباً ${name}،`,
    intro: "أدخل هذا الرمز للمتابعة:",
    notice: (m) => `الرمز صالح لمدة ${m} دقيقة ويُستخدم مرة واحدة فقط.`,
    ignore: "إذا لم تطلب هذا الرمز، تجاهل الرسالة — حسابك بأمان.",
  },
  tr: {
    subject: "m.on giriş kodunuz",
    heading: "Giriş kodunuz",
    greeting: (name) => `Merhaba ${name},`,
    intro: "Devam etmek için bu kodu girin:",
    notice: (m) => `Kod ${m} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
    ignore: "Bu kodu siz talep etmediyseniz bu e-postayı yok sayın — hesabınız güvende.",
  },
};

export function otpTemplate(payload: OtpPayload, locale: Locale): RenderedTemplate {
  const copy = COPY[locale];

  const layout: LayoutInput = {
    locale,
    heading: copy.heading,
    blocks: [
      ...(payload.name ? [{ paragraph: copy.greeting(payload.name) }] : []),
      { paragraph: copy.intro },
      { code: payload.code },
      { paragraph: copy.ignore },
    ],
    notice: copy.notice(payload.expiresInMinutes),
  };

  return {
    // The code goes in the subject on purpose: it is the one case where it
    // saves the customer opening the message at all, and every major provider
    // does it. It is short-lived and single-use, so a subject line in a
    // notification preview is an acceptable place for it.
    subject: `${payload.code} — ${copy.subject}`,
    html: renderHtml(layout),
    text: renderText(layout),
  };
}
