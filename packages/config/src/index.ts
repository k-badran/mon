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
  JWT_ISSUER: z.string().min(1).default("umzugplus-api"),
  JWT_ACCESS_TTL: z.string().regex(durationPattern).default("15m"),
  JWT_REFRESH_TTL: z.string().regex(durationPattern).default("30d"),

  API_PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default("http://localhost:4000"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),

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
