import type { Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutInput } from "./layout.js";

export interface PasswordResetPayload {
  /** The full reset URL, already carrying the single-use token. */
  url: string;
  expiresInMinutes: number;
  name?: string | undefined;
}

interface Copy {
  subject: string;
  heading: string;
  greeting: (name: string) => string;
  intro: string;
  button: string;
  fallback: string;
  notice: (minutes: number) => string;
  ignore: string;
}

const COPY: Record<Locale, Copy> = {
  de: {
    subject: "Passwort zurücksetzen",
    heading: "Passwort zurücksetzen",
    greeting: (name) => `Hallo ${name},`,
    intro: "Sie haben angefordert, Ihr m.on-Passwort zurückzusetzen. Wählen Sie ein neues Passwort:",
    button: "Neues Passwort wählen",
    fallback: "Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:",
    notice: (m) => `Der Link ist ${m} Minuten gültig und kann nur einmal verwendet werden.`,
    ignore: "Wenn Sie das nicht angefordert haben, ignorieren Sie diese E-Mail. Ihr Passwort bleibt unverändert.",
  },
  en: {
    subject: "Reset your password",
    heading: "Reset your password",
    greeting: (name) => `Hello ${name},`,
    intro: "You asked to reset your m.on password. Choose a new one:",
    button: "Choose a new password",
    fallback: "If the button does not work, copy this link into your browser:",
    notice: (m) => `The link is valid for ${m} minutes and can only be used once.`,
    ignore: "If you did not ask for this, ignore this email. Your password stays unchanged.",
  },
  ar: {
    subject: "إعادة تعيين كلمة السر",
    heading: "إعادة تعيين كلمة السر",
    greeting: (name) => `مرحباً ${name}،`,
    intro: "طلبت إعادة تعيين كلمة السر لحسابك في m.on. اختر كلمة سر جديدة:",
    button: "اختيار كلمة سر جديدة",
    fallback: "إذا لم يعمل الزر، انسخ هذا الرابط إلى متصفحك:",
    notice: (m) => `الرابط صالح لمدة ${m} دقيقة ويُستخدم مرة واحدة فقط.`,
    ignore: "إذا لم تطلب هذا، تجاهل الرسالة. كلمة السر لن تتغيّر.",
  },
  tr: {
    subject: "Şifrenizi sıfırlayın",
    heading: "Şifrenizi sıfırlayın",
    greeting: (name) => `Merhaba ${name},`,
    intro: "m.on şifrenizi sıfırlamayı talep ettiniz. Yeni bir şifre seçin:",
    button: "Yeni şifre seç",
    fallback: "Düğme çalışmazsa bu bağlantıyı tarayıcınıza kopyalayın:",
    notice: (m) => `Bağlantı ${m} dakika geçerlidir ve yalnızca bir kez kullanılabilir.`,
    ignore: "Bunu siz talep etmediyseniz e-postayı yok sayın. Şifreniz değişmez.",
  },
};

export function passwordResetTemplate(
  payload: PasswordResetPayload,
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
    notice: copy.notice(payload.expiresInMinutes),
  };

  return { subject: copy.subject, html: renderHtml(layout), text: renderText(layout) };
}
