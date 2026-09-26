export * from "./types.js";
export * from "./mailer.js";
export * from "./render.js";
export { renderTemplate } from "./templates/registry.js";
export type { PayloadFor, TemplateKey } from "./templates/registry.js";
export type {
  OtpPayload,
  PasswordResetPayload,
  VerifyEmailPayload,
} from "./templates/registry.js";
export { createSmtpTransport, type SmtpOptions } from "./transports/smtp.js";
export { createLogTransport, type LogOptions } from "./transports/log.js";
