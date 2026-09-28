import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

// The monorepo keeps a single .env at the repo root so every app agrees on
// credentials. Loading is idempotent; an already-set process env always wins.
loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

const durationPattern = /^\d+(?:s|m|h|d)$/;

/**
 * A value that may be absent, and whose presence-with-no-value means absent.
 *
 * `.env.example` ships keys with empty values as the way of saying "fill this
 * in", so an empty string has to read as unconfigured. Without this, an
 * untouched `SMTP_PASSWORD=` would satisfy a `z.string().optional()` and the
 * driver check below would pass on a blank password.
 */
const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url().startsWith("postgres"),
  REDIS_URL: z.string().url().startsWith("redis"),

  // Secrets are long on purpose: a short HS256 key is brute-forceable offline.
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  /**
   * Signs the session hint the web tier verifies at the edge.
   *
   * Optional, and separate from `JWT_ACCESS_SECRET` on purpose. The Next.js
   * process has to hold whichever key verifies the hint; while that was the
   * access secret, any disclosure from the web tier was also the key that
   * mints API sessions. Left unset, the key is derived from the access secret
   * by a one-way hash — good enough that the web tier cannot run it backwards,
   * and it keeps existing deployments working without new configuration.
   */
  JWT_HINT_SECRET: z.preprocess(
    // A key present in the .env file with no value means "not configured" —
    // which is how the example file ships it — not "configured as empty".
    (value) => (value === "" ? undefined : value),
    z.string().min(32, "JWT_HINT_SECRET must be at least 32 characters").optional(),
  ),
  JWT_ISSUER: z.string().min(1).default("mon-api"),
  JWT_ACCESS_TTL: z.string().regex(durationPattern).default("15m"),
  JWT_REFRESH_TTL: z.string().regex(durationPattern).default("30d"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),

  /**
   * The domain the session hint cookie is scoped to, e.g. `.moveongo.de`.
   *
   * Only the hint needs this. In development the API and the web app share a
   * host and differ only by port, which cookies ignore, so it is left unset
   * and the cookie is host-only. In production they are separate hostnames —
   * api.moveongo.de and moveongo.de — and without a parent domain here the
   * hint the API sets never reaches the origin whose middleware reads it, so
   * every signed-in user is bounced to /login. The refresh cookie stays
   * host-only either way: it is a credential, and a credential that travels to
   * every subdomain travels to the one that gets compromised.
   */
  SESSION_COOKIE_DOMAIN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),

  BUSINESS_TIMEZONE: z.string().min(1).default("Europe/Berlin"),

  /**
   * Which transport delivers mail.
   *
   * `log` records messages to `MAIL_OUTBOX_DIR` and sends nothing, which is the
   * right default for development and the only safe one for tests. Left unset
   * it resolves by environment (see the transform below) rather than defaulting
   * to a single value, because the two environments want opposite answers and a
   * shared default is wrong in one of them: `log` in production means outbound
   * mail silently stops, and `smtp` in development means a test run can email a
   * real customer.
   */
  MAIL_DRIVER: z.enum(["smtp", "resend", "log"]).optional(),

  /**
   * Resend's HTTP API key, used when MAIL_DRIVER is "resend".
   *
   * Reinstated after being removed with the unused Resend config: it now has a
   * consumer. The reason to prefer it over SMTP here is not the protocol but
   * the port — it sends over 443, and ports 25/465/587 are blocked both
   * locally and on the DigitalOcean host, which is that provider's default.
   */
  RESEND_API_KEY: optionalString,

  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  /**
   * True for implicit TLS (port 465), false for STARTTLS (port 587).
   *
   * Not `z.coerce.boolean()`: that treats any non-empty string as true, so the
   * string "false" — the only way to write false in an env file — would turn
   * TLS on and quietly contradict the configuration.
   */
  SMTP_SECURE: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    return value.trim().toLowerCase() !== "false";
  }, z.boolean().default(true)),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,

  MAIL_FROM: z.string().default("m.on <info@moveongo.de>"),
  MAIL_REPLY_TO: optionalString,
  /** Where the `log` driver writes. Relative paths resolve from the cwd. */
  MAIL_OUTBOX_DIR: z.string().min(1).default(".mail-outbox"),

  /**
   * Photo uploads from the dashboard, stored in Amazon S3.
   *
   * All optional: without a bucket, region and key pair the upload endpoint
   * answers 503 and the dashboard hides its button, and editors paste paths or
   * URLs as before. Uploads are a convenience, not something the site needs to
   * boot, so a missing value disables them instead of refusing to start.
   */
  S3_BUCKET: optionalString,
  S3_REGION: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  /**
   * Only for an S3-compatible store (MinIO, R2, a local mock). Set, requests go
   * there with path-style addressing, which those stores expect; unset, the
   * SDK talks to AWS itself.
   */
  S3_ENDPOINT: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional(),
  ),
  /**
   * The public origin uploaded files are served from — a CloudFront
   * distribution or the bucket's own URL. Unset, it is derived from the bucket
   * and region (see `uploadStorage`).
   */
  S3_PUBLIC_BASE_URL: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url().optional(),
  ),

  ANTHROPIC_API_KEY: z.string().optional(),
  GEOCODING_USER_AGENT: z.string().min(1).default("m.on/1.0"),

  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_NAME: z.string().optional(),
});

/**
 * Resolves `MAIL_DRIVER` and then refuses a configuration that cannot send.
 *
 * The check belongs here rather than in the mailer because of when it runs:
 * this throws while the process is starting, whereas a check inside the
 * transport would first fail on a real customer's password reset. `smtp`
 * without a host or credentials is not a degraded mode worth supporting — it is
 * a deployment that looks healthy and drops every message.
 */
const resolvedEnvSchema = envSchema
  .transform((raw) => ({
    ...raw,
    MAIL_DRIVER: raw.MAIL_DRIVER ?? (raw.NODE_ENV === "production" ? "smtp" : "log"),
  }))
  .superRefine((config, ctx) => {
    const required =
      config.MAIL_DRIVER === "smtp"
        ? (["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"] as const)
        : config.MAIL_DRIVER === "resend"
          ? (["RESEND_API_KEY"] as const)
          : [];

    for (const key of required) {
      if (config[key] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required when MAIL_DRIVER is "${config.MAIL_DRIVER}".`,
        });
      }
    }
  });

export type Env = z.infer<typeof resolvedEnvSchema>;

function loadEnv(): Env {
  const parsed = resolvedEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    // Fail loudly at boot rather than throwing a confusing runtime error later.
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}\n`);
  }

  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

/** Where dashboard uploads go, once every value it needs is present. */
export interface UploadStorage {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | undefined;
  /** No trailing slash; an object's URL is `${publicBaseUrl}/${key}`. */
  publicBaseUrl: string;
}

const UPLOAD_KEYS = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

/**
 * Resolves the upload storage, or lists what is missing.
 *
 * The missing names are returned rather than a bare "disabled" so the API's
 * 503 can say exactly which variable to set — the same reasoning as the mail
 * check above, applied to a feature that may be switched off.
 */
export function uploadStorage(
  source: Env = env,
): { enabled: true; storage: UploadStorage } | { enabled: false; missing: string[] } {
  const missing = UPLOAD_KEYS.filter((key) => source[key] === undefined);

  if (missing.length > 0) return { enabled: false, missing };

  const bucket = source.S3_BUCKET!;
  const region = source.S3_REGION!;
  const endpoint = source.S3_ENDPOINT?.replace(/\/+$/, "");

  // Path-style against a custom endpoint, matching how the client addresses
  // it; the virtual-hosted AWS URL otherwise.
  const derived = endpoint
    ? `${endpoint}/${bucket}`
    : `https://${bucket}.s3.${region}.amazonaws.com`;

  return {
    enabled: true,
    storage: {
      bucket,
      region,
      accessKeyId: source.S3_ACCESS_KEY_ID!,
      secretAccessKey: source.S3_SECRET_ACCESS_KEY!,
      endpoint,
      publicBaseUrl: (source.S3_PUBLIC_BASE_URL ?? derived).replace(/\/+$/, ""),
    },
  };
}
