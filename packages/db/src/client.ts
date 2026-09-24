import { env, isProduction } from "@umzugplus/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.js";

/**
 * Postgres connection pool.
 *
 * `max` is deliberately modest: each API instance holds its own pool, and
 * Postgres handles far fewer concurrent connections well than most people
 * assume. Raise it only alongside a connection pooler such as PgBouncer.
 */
const queryClient = postgres(env.DATABASE_URL, {
  max: isProduction ? 20 : 5,
  idle_timeout: 30,
  connect_timeout: 10,
  // Calendar dates must come back as plain "YYYY-MM-DD" strings, never as
  // JS Date objects — converting a date to a Date and back through UTC is
  // exactly the bug this rewrite exists to eliminate.
  types: {
    date: {
      to: 1082,
      from: [1082],
      serialize: (value: string) => value,
      parse: (value: string) => value,
    },
  },
});

export const db = drizzle(queryClient, { schema, logger: !isProduction });

export type Database = typeof db;

/** Closes the pool. Call from the API's graceful-shutdown handler. */
export async function closeDatabase(): Promise<void> {
  await queryClient.end({ timeout: 5 });
}

/** Lightweight liveness probe used by GET /health. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await queryClient`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
