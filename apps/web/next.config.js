/** @type {import('next').NextConfig} */

const { createHash } = require("node:crypto");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");

/**
 * Values `middleware.ts` needs, taken from the monorepo's root .env.
 *
 * Next only reads .env files inside this app, but the repo deliberately keeps
 * one .env at the root so every app agrees on the same secrets. Without this
 * bridge the middleware verifies the session hint against an empty secret,
 * `readHint` returns null for everyone, and a signed-in administrator is
 * redirected to /login — a failure that looks like a broken session rather
 * than missing configuration.
 *
 * ## What this process is given, and what it is not
 *
 * It is given the key that verifies a *session hint*, and never the key that
 * mints API access tokens. Those used to be the same value, which meant any
 * secret disclosure from the web tier escalated straight to forging sessions
 * against the API — a steep price for a routing convenience. When
 * `JWT_HINT_SECRET` is not configured the hint key is derived from the access
 * secret by a one-way hash, here and identically in `packages/auth/src/tokens.ts`
 * (`deriveHintSecret`); the access secret itself is read, used for that
 * derivation, and deliberately not written into this process's environment.
 *
 * Neither value may ever gain a NEXT_PUBLIC_ prefix: that inlines it into the
 * browser bundle, which for a signing key means publishing it. They are read
 * here instead, where they reach the Node process only. Middleware runs in the
 * edge sandbox, which is handed a copy of this process's environment at request
 * time, so setting them here works under both `next dev` and `next start`.
 */
const FROM_ROOT_ENV = ["JWT_ACCESS_SECRET", "JWT_HINT_SECRET", "JWT_ISSUER"];

/** Mirrors `deriveHintSecret` in packages/auth — one rule, written twice. */
function deriveHintSecret(source) {
  return createHash("sha256").update(`mon:session-hint:v1:${source}`).digest("base64");
}

function readRootEnv() {
  const file = resolve(__dirname, "../../.env");
  const values = {};

  if (!existsSync(file)) return values;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (!FROM_ROOT_ENV.includes(key)) continue;

    // Strip one layer of matching quotes, the way dotenv does.
    values[key] = rawValue.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }

  return values;
}

function loadRootEnv() {
  const fromFile = readRootEnv();

  // An already-set variable always wins, so a container or CI that injects the
  // real value is never overwritten by whatever the file holds. Assigning an
  // absent value is not the same as leaving it alone — process.env coerces,
  // and the middleware would then verify against the issuer "undefined" and
  // redirect every signed-in user to /login.
  if (!process.env.JWT_ISSUER && fromFile.JWT_ISSUER) {
    process.env.JWT_ISSUER = fromFile.JWT_ISSUER;
  }

  if (process.env.JWT_HINT_SECRET) return;

  if (fromFile.JWT_HINT_SECRET) {
    process.env.JWT_HINT_SECRET = fromFile.JWT_HINT_SECRET;
    return;
  }

  // No separate hint secret configured. Derive one rather than fall back to
  // the access secret: the derivation is what keeps this process unable to
  // sign an access token even though it can verify a hint.
  const accessSecret = process.env.JWT_ACCESS_SECRET || fromFile.JWT_ACCESS_SECRET;

  if (accessSecret) {
    process.env.JWT_HINT_SECRET = deriveHintSecret(accessSecret);
  }
}

loadRootEnv();

/**
 * Builds and the dev server use separate output directories.
 *
 * `next build` writes into `.next` by default, which is the same directory the
 * running dev server serves from — so a build taken while `next dev` is up
 * leaves the dev server returning 500s until it is restarted. Giving builds
 * their own directory lets both run at once.
 */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

module.exports = nextConfig;
