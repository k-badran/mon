import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";

import { env, isProduction } from "@umzugplus/config";

import { detectRunner, parseDatabaseUrl, runPgTool } from "./pg-tools.js";

/**
 * Restores a dump produced by `pnpm db:dump`.
 *
 *   pnpm db:restore backups/umzugplus-2026-09-12T10-00-00.dump
 *   pnpm db:restore <file> --clean     drop existing objects first
 *
 * `--clean` is opt-in because dropping what is already there is exactly the
 * operation worth thinking about first. Against production, or with --clean,
 * the database name has to be typed to confirm.
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith("--"));
  const clean = args.includes("--clean");

  if (!file) {
    throw new Error("Usage: pnpm db:restore <file.dump> [--clean]");
  }

  const dumpPath = resolve(process.cwd(), file);

  if (!existsSync(dumpPath)) {
    throw new Error(`Dump file not found: ${dumpPath}`);
  }

  const target = parseDatabaseUrl(env.DATABASE_URL);
  const runner = detectRunner("pg_restore");

  if (!runner) {
    throw new Error(
      "Neither pg_restore nor the Postgres container is available. Run `pnpm db:up` first.",
    );
  }

  console.log(`Restoring into "${target.database}" at ${target.host}:${target.port} via ${runner}`);
  console.log(`From: ${dumpPath}`);
  if (clean) console.log("Mode: --clean — existing objects will be DROPPED");

  if (isProduction || clean) {
    if (!(await confirm(target.database))) {
      console.log("Aborted.");
      process.exit(1);
    }
  }

  const pgArgs = [
    "--no-owner",
    "--no-privileges",
    // One transaction, so a failure leaves nothing half-applied.
    "--single-transaction",
  ];

  if (clean) {
    // --if-exists stops DROP failing on objects that are not there.
    pgArgs.push("--clean", "--if-exists");
  }

  await runPgTool({
    tool: "pg_restore",
    runner,
    target,
    args: pgArgs,
    file: dumpPath,
    direction: "read",
  });

  console.log("\nRestore complete.");
  console.log("Now confirm the schema is at the latest migration:");
  console.log("  pnpm db:migrate");
}

async function confirm(databaseName: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = await rl.question(
      `\nThis overwrites data in "${databaseName}".\nType the database name to continue: `,
    );

    return answer.trim() === databaseName;
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error("\nRestore failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
