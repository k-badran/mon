import type { IncomingMessage } from "node:http";

import { env, isProduction } from "@mon/config";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { globalRateLimit } from "./middleware/rate-limit.js";
import { requestContext } from "./middleware/request-context.js";
import { auditRouter } from "./modules/audit/audit.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { availabilityRouter } from "./modules/availability/availability.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { complaintsRouter } from "./modules/complaints/complaints.routes.js";
import { discountsRouter } from "./modules/discounts/discounts.routes.js";
import { mailRouter } from "./modules/mail/mail.routes.js";
import { faqRouter } from "./modules/faq/faq.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { pricingRouter } from "./modules/pricing/pricing.routes.js";
import { quotesRouter } from "./modules/quotes/quotes.routes.js";
import { reviewsRouter } from "./modules/reviews/reviews.routes.js";
import { siteRouter } from "./modules/site/site.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

/**
 * Builds the Express application.
 *
 * Exported as a factory rather than a singleton so integration tests can
 * construct an app without binding a port.
 *
 * Middleware order matters and is deliberate:
 *   request id → logging → security headers → CORS → body parsing →
 *   rate limiting → routes → 404 → error handler.
 */
export function createServer(): Express {
  const app = express();

  // Behind nginx or a load balancer, `req.ip` must come from X-Forwarded-For,
  // or every client would share one rate-limit bucket.
  app.set("trust proxy", isProduction ? 1 : false);
  app.disable("x-powered-by");

  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req: IncomingMessage) => (req as { requestId?: string }).requestId ?? "unknown",
      autoLogging: { ignore: (req: IncomingMessage) => req.url?.startsWith("/health") ?? false },
    }),
  );

  app.use(
    helmet({
      // The API serves JSON, never HTML, so the strictest CSP is free.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: "same-site" },
      hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );

  app.use(
    cors({
      // An explicit allowlist. A wildcard plus credentials is rejected by
      // browsers anyway, and silently breaks auth.
      origin: [env.WEB_ORIGIN],
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id"],
      maxAge: 86_400,
    }),
  );

  app.use(compression());
  // A bounded body limit: without it a single large POST can exhaust memory.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());

  // Health checks are mounted before the limiter so probes are never throttled.
  app.use(healthRouter);
  app.use(globalRateLimit);

  // Public surfaces first: the calculator, catalog and FAQ must work
  // before a visitor has an account.
  app.use("/api/auth", authRouter);
  app.use("/api/quotes", quotesRouter);
  app.use("/api/catalog", catalogRouter);
  app.use("/api/availability", availabilityRouter);
  app.use("/api/faq", faqRouter);
  // Theme and copy the website renders with; editable from the dashboard.
  app.use("/api/site", siteRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/chat", chatRouter);

  // Authenticated surfaces.
  app.use("/api/orders", ordersRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/complaints", complaintsRouter);
  app.use("/api/payments", paymentsRouter);

  // Administration.
  app.use("/api/pricing", pricingRouter);
  app.use("/api/discounts", discountsRouter);
  // Read-only: the trail is written by recordAudit, never through a route.
  app.use("/api/audit", auditRouter);
  // Mail diagnostics — answers "is outbound email actually working?"
  app.use("/api/admin/mail", mailRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
