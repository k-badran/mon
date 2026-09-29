import { env } from "@mon/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Applies pending migrations, then exits.
 * Uses a dedicated single connection so it never competes with the app pool.
 */
async function main(): Promise<void> {
  const client = postgres(env.DATABASE_URL, { max: 1 });

  try {
    console.log("Applying migrations…");
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
