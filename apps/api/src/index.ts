import { createServer as createHttpServer } from "node:http";

import { env } from "@mon/config";
import { closeDatabase } from "@mon/db";

import { closeRedis } from "./lib/redis.js";
import { logger } from "./lib/logger.js";
import { mailer, verifyMailer } from "./lib/mailer.js";
import { closeRealtimeGateway, createRealtimeGateway } from "./realtime/gateway.js";
import { createServer } from "./server.js";

/**
 * Process entry point.
 *
 * Wraps the Express app in a bare HTTP server so the real-time gateway
 * (Socket.IO) can attach to the same port later, and shuts everything down in
 * a defined order: stop accepting connections, drain in-flight requests, then
 * release the database and Redis.
 */

const app = createServer();
const httpServer = createHttpServer(app);

// The gateway shares the HTTP server, so REST and WebSocket use one port.
createRealtimeGateway(httpServer);

httpServer.listen(env.API_PORT, () => {
  logger.info(
    { port: env.API_PORT, env: env.NODE_ENV, timezone: env.BUSINESS_TIMEZONE },
    `API listening on http://localhost:${env.API_PORT}`,
  );

  // Checked after the port is open, and not awaited: a slow or unreachable mail
  // host must not delay the server becoming ready, and a broken one must not
  // stop it. The result is logged either way — see `verifyMailer`.
  void verifyMailer();
});

/** Requests in flight get this long to finish before the process exits. */
const SHUTDOWN_GRACE_MS = 10_000;
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down");

  // Force-exit if a hung connection would otherwise keep the process alive.
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_GRACE_MS);

  forceExit.unref();

  try {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });

    // Close sockets before the database: a handler mid-flight would
    // otherwise query a pool that is already shutting down.
    await closeRealtimeGateway();
    // `mailer.close()` joins the same group: it releases the SMTP connection
    // pool, and like the others it must not be able to hold up the exit — hence
    // allSettled rather than all.
    await Promise.allSettled([closeDatabase(), closeRedis(), mailer.close()]);

    logger.info("Shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// An unhandled rejection leaves the process in an unknown state; log it and
// restart rather than continuing to serve traffic from a corrupted runtime.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  void shutdown("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  void shutdown("uncaughtException");
});
