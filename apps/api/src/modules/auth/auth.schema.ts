import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@mon/auth";
import { z } from "zod";

/**
 * Request contracts for the auth routes.
 * These are the single definition of what the API accepts — the handler never
 * reads a field that has not passed through one of these.
 */

const email = z.string().trim().toLowerCase().email("A valid email address is required.");

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH);

const locale = z.enum(["de", "en", "ar", "tr"]).default("de");

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2, "Please provide your name.").max(120),
  phone: z.string().trim().min(5).max(40).optional(),
  locale: locale.optional(),
  /** Attaches a quote created before signup, so nothing is retyped. */
  quoteId: z.string().uuid().optional(),
});

export const loginSchema = z.object({
  email,
  // Not length-checked: an old password may predate the current policy, and
  // rejecting it here would tell an attacker the policy rather than the answer.
  password: z.string().min(1, "Password is required."),
});

/**
 * Shared by refresh and logout.
 *
 * The token is optional rather than removed: the browser sends it as an
 * httpOnly cookie and puts nothing in the body, while a native client — which
 * has no cookie jar — still passes it here. The handler decides which source
 * to read; requiring the field would break the cookie path, and dropping it
 * would break the native one.
 *
 * `.default({})` covers a POST sent with no body at all, which is the normal
 * shape of a cookie-only refresh.
 */
export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, "A refresh token cannot be empty.").optional(),
  })
  .default({});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: password,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "The new password must differ from the current one.",
    path: ["newPassword"],
  });

export const requestPasswordResetSchema = z.object({ email });

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});

export const confirmEmailSchema = z.object({ token: z.string().min(1) });

export const requestOtpSchema = z.object({ email });

export const verifyOtpSchema = z.object({
  email,
  /**
   * Exactly six digits.
   *
   * `regex` rather than a coerced number: a numeric type would accept `1234.0`
   * and would drop a leading zero, and a code that begins with a zero is one
   * the generator produces a tenth of the time.
   */
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "The code is six digits."),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
export type RequestPasswordResetBody = z.infer<typeof requestPasswordResetSchema>;
export type ConfirmPasswordResetBody = z.infer<typeof confirmPasswordResetSchema>;
export type RequestOtpBody = z.infer<typeof requestOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
