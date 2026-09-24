/** @type {import('next').NextConfig} */

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
 * These are server-only and must never gain a NEXT_PUBLIC_ prefix: that
 * prefix inlines a value into the browser bundle, which for a JWT signing
 * secret means publishing it. They are read here instead, where they reach the
 * Node process only. Middleware runs in the edge sandbox, which is handed a
 * copy of this process's environment at request time, so setting them here
 * works under both `next dev` and `next start`.
 */
const FROM_ROOT_ENV = ["JWT_ACCESS_SECRET", "JWT_ISSUER"];

function loadRootEnv() {
  const file = resolve(__dirname, "../../.env");
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    const [, key, rawValue] = match;

    // An already-set variable always wins, so a container or CI that injects
    // the real secret is never overwritten by whatever the file holds.
    if (!FROM_ROOT_ENV.includes(key) || process.env[key] !== undefined) continue;

    // Strip one layer of matching quotes, the way dotenv does.
    process.env[key] = rawValue.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
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
