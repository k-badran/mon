import { toLocale, type Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { orderStatusTemplate, type OrderStage, type OrderStatusPayload } from "./order-status.js";
import { otpTemplate, type OtpPayload } from "./otp.js";
import { paymentReceiptTemplate, type PaymentReceiptPayload } from "./payment-receipt.js";
import { passwordResetTemplate, type PasswordResetPayload } from "./password-reset.js";
import { verifyEmailTemplate, type VerifyEmailPayload } from "./verify-email.js";

/**
 * The one place that knows which emails exist.
 *
 * Registering builders here rather than letting callers import a template
 * directly is what makes the payload type-checked at the call site: `sendMail`
 * is generic over the key, so asking for `otp` and passing a reset payload does
 * not compile. A stringly-typed `send(name, data)` would push that mistake to
 * runtime, where the failure is a customer who never receives a code.
 */
const TEMPLATES = {
  otp: otpTemplate,
  "verify-email": verifyEmailTemplate,
  "password-reset": passwordResetTemplate,
  "order-status": orderStatusTemplate,
  "payment-receipt": paymentReceiptTemplate,
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

/** The payload the named template requires — derived, never restated. */
export type PayloadFor<K extends TemplateKey> = Parameters<(typeof TEMPLATES)[K]>[0];

export type {
  OrderStage,
  OrderStatusPayload,
  OtpPayload,
  PasswordResetPayload,
  PaymentReceiptPayload,
  VerifyEmailPayload,
};

/**
 * Renders a registered template.
 *
 * `locale` is accepted as `unknown` and narrowed here rather than being typed
 * as `Locale`, because every real caller reads it from `users.locale` — a plain
 * `text` column with no check constraint. Forcing the narrowing on each call
 * site means the one that forgets sends nothing at all; doing it once here
 * means an unknown language quietly becomes German, which is the right
 * behaviour for a password reset.
 */
export function renderTemplate<K extends TemplateKey>(
  key: K,
  payload: PayloadFor<K>,
  locale: unknown,
): RenderedTemplate {
  const resolved: Locale = toLocale(locale);

  // The cast is confined to this line. `TEMPLATES[key]` is a union of builder
  // signatures, so TypeScript cannot see that the payload matches the one
  // builder it will actually reach — the generic already guaranteed that at the
  // call site, which is the only place it can be checked usefully.
  const build = TEMPLATES[key] as (p: PayloadFor<K>, l: Locale) => RenderedTemplate;

  return build(payload, resolved);
}
