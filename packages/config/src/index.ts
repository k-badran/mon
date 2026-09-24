import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

// The monorepo keeps a single .env at the repo root so every app agrees on
// credentials. Loading is idempotent; an already-set process env always wins.
loadDotenv({ path: resolve(process.cwd(), "../../.env") });
loadDotenv();

const durationPattern = /^\d+(?:s|m|h|d)$/;

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
  JWT_ISSUER: z.string().min(1).default("umzugplus-api"),
  JWT_ACCESS_TTL: z.string().regex(durationPattern).default("15m"),
  JWT_REFRESH_TTL: z.string().regex(durationPattern).default("30d"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),

  /**
   * The domain the session hint cookie is scoped to, e.g. `.umzugplus.de`.
   *
   * Only the hint needs this. In development the API and the web app share a
   * host and differ only by port, which cookies ignore, so it is left unset
   * and the cookie is host-only. In production they are separate hostnames —
   * api.umzugplus.de and umzugplus.de — and without a parent domain here the
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

  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default("UmzugPlus <info@umzugplus.de>"),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEOCODING_USER_AGENT: z.string().min(1).default("UmzugPlus/1.0"),

  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

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
