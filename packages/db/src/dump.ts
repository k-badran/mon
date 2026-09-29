import { existsSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { env } from "@mon/config";

import { detectRunner, parseDatabaseUrl, runPgTool } from "./pg-tools.js";

/**
 * Exports the database to a compressed, portable dump.
 *
 * Custom format (`-Fc`) rather than plain SQL: it is compressed, and
 * `pg_restore` can pick individual tables out of it, which plain SQL cannot.
 *
 * Worth knowing before a server move: the schema is fully reproducible from
 * the Drizzle migrations, so a fresh server needs only
 * `pnpm db:migrate && pnpm seed`. This dump is for carrying *data* across, or
 * for taking a backup before something risky.
 *
 *   pnpm db:dump                 everything
 *   pnpm db:dump --schema-only   structure, no rows
 *   pnpm db:dump --data-only     rows, no structure
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const schemaOnly = args.includes("--schema-only");
  const dataOnly = args.includes("--data-only");

  if (schemaOnly && dataOnly) {
    throw new Error("Use either --schema-only or --data-only, not both.");
  }

  const target = parseDatabaseUrl(env.DATABASE_URL);
  const runner = detectRunner("pg_dump");

  if (!runner) {
    throw new Error(
      "Neither pg_dump nor the Postgres container is available.\n\n" +
        "Start the container with `pnpm db:up`, or install the PostgreSQL client tools:\n" +
        "  Windows : winget install PostgreSQL.PostgreSQL\n" +
        "  macOS   : brew install libpq && brew link --force libpq\n" +
        "  Debian  : sudo apt install postgresql-client",
    );
  }

  const backupsDir = resolve(process.cwd(), "../../backups");
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const suffix = schemaOnly ? "-schema" : dataOnly ? "-data" : "";
  const outFile = resolve(backupsDir, `mon-${stamp}${suffix}.dump`);

  const pgArgs = [
    "--format", "custom",
    "--compress", "9",
    // The local owning role will not exist on the server, so ownership and
    // grants are omitted and the restoring role takes over.
    "--no-owner",
    "--no-privileges",
  ];

  if (schemaOnly) pgArgs.push("--schema-only");
  if (dataOnly) pgArgs.push("--data-only");

  console.log(`Dumping "${target.database}" via ${runner}…`);

  await runPgTool({
    tool: "pg_dump",
    runner,
    target,
    args: pgArgs,
    file: outFile,
    direction: "write",
  });

  const sizeKb = Math.max(1, Math.round(statSync(outFile).size / 1024));

  console.log(`\nWritten: ${outFile} (${sizeKb} KB)`);
  console.log("\nTo load this on the server:");
  console.log(`  scp "${outFile}" user@server:/tmp/`);
  console.log("  ssh user@server");
  console.log("  pnpm db:restore /tmp/<file>.dump");
}

main().catch((error: unknown) => {
  console.error("\nDump failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
