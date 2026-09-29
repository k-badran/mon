import { spawn, spawnSync } from "node:child_process";

/**
 * Runs `pg_dump` / `pg_restore`, from the host when available and otherwise
 * inside the Postgres container.
 *
 * The fallback matters in practice: the PostgreSQL client tools are not
 * installed by default on Windows or macOS, but the container the project
 * already runs has the matching version. Requiring a separate install just to
 * take a backup is the kind of friction that stops backups being taken.
 */

export interface ConnectionTarget {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

export function parseDatabaseUrl(url: string): ConnectionTarget {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1),
  };
}

/** The container that docker-compose.dev.yml creates. */
const CONTAINER = process.env.POSTGRES_CONTAINER ?? "mon-postgres";

export type Runner = "host" | "container";

export function detectRunner(tool: "pg_dump" | "pg_restore"): Runner | null {
  if (commandExists(tool)) return "host";
  if (containerRunning()) return "container";

  return null;
}

function commandExists(command: string): boolean {
  const probe = spawnSync(command, ["--version"], { stdio: "ignore", shell: false });
  return probe.status === 0;
}

function containerRunning(): boolean {
  const probe = spawnSync("docker", ["inspect", "-f", "{{.State.Running}}", CONTAINER], {
    encoding: "utf8",
  });

  return probe.status === 0 && probe.stdout.trim() === "true";
}

export interface RunOptions {
  tool: "pg_dump" | "pg_restore";
  runner: Runner;
  target: ConnectionTarget;
  args: string[];
  /**
   * Host path the dump is read from or written to. Inside the container the
   * file is streamed over stdio instead, so no bind mount is needed.
   */
  file: string;
  direction: "write" | "read";
}

export function runPgTool(options: RunOptions): Promise<void> {
  const { tool, runner, target, args, file, direction } = options;

  if (runner === "host") {
    return spawnAndWait(
      tool,
      [
        "--host", target.host,
        "--port", target.port,
        "--username", target.user,
        "--dbname", target.database,
        ...args,
        ...(direction === "write" ? ["--file", file] : [file]),
      ],
      { PGPASSWORD: target.password },
    );
  }

  // In the container the database is reachable at localhost:5432 regardless of
  // which host port it is published on.
  const inner = [
    tool,
    "--host", "localhost",
    "--port", "5432",
    "--username", target.user,
    "--dbname", target.database,
    ...args,
  ];

  const dockerArgs = [
    "exec",
    // stdin is only attached when the tool needs to read the dump.
    direction === "read" ? "-i" : "",
    "-e", `PGPASSWORD=${target.password}`,
    CONTAINER,
    ...inner,
  ].filter(Boolean);

  return spawnAndWait("docker", dockerArgs, {}, { file, direction });
}

function spawnAndWait(
  command: string,
  args: string[],
  extraEnv: Record<string, string>,
  stream?: { file: string; direction: "write" | "read" },
): Promise<void> {
  return new Promise((resolve, reject) => {
    // When streaming, the dump travels over stdout/stdin rather than a path
    // the container can see.
    const stdio: Array<"ignore" | "inherit" | "pipe"> = stream
      ? [stream.direction === "read" ? "pipe" : "ignore", stream.direction === "write" ? "pipe" : "inherit", "inherit"]
      : ["ignore", "inherit", "inherit"];

    const child = spawn(command, args, {
      env: { ...process.env, ...extraEnv },
      stdio,
    });

    if (stream) {
      // Imported here so the module has no top-level fs dependency when the
      // host path is used.
      void import("node:fs").then(({ createReadStream, createWriteStream }) => {
        if (stream.direction === "write" && child.stdout) {
          child.stdout.pipe(createWriteStream(stream.file));
        }

        if (stream.direction === "read" && child.stdin) {
          createReadStream(stream.file).pipe(child.stdin);
        }
      });
    }

    child.on("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "ENOENT"
          ? new Error(
              `${command} was not found.\n\n` +
                "Install the PostgreSQL client tools, or start the database container:\n" +
                "  pnpm db:up",
            )
          : error,
      );
    });

    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}`)),
    );
  });
}
