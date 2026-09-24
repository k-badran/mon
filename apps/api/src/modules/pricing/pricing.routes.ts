import { db, schema } from "@umzugplus/db";
import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { invalidateRateCardCache } from "../quotes/quotes.service.js";

const { priceSettings } = schema;

export const pricingRouter: Router = Router();

/**
 * The rate card is never public.
 *
 * In the legacy app `price_settings` was readable with the public anon key, so
 * anyone — a competitor included — could read the entire margin structure
 * straight out of the browser. It is never sent to a client now; the pricing
 * engine reads it server-side and returns only the resulting breakdown.
 *
 * Authentication is mounted here for the whole router; the capability is named
 * per route, because reading the margin structure and rewriting it are not the
 * same decision even though today the same roles hold both.
 */
pricingRouter.use(requireAuth);

pricingRouter.get(
  "/",
  requirePermission("pricing.read"),
  asyncHandler(async (_req, res) => {
    const rates = await db.select().from(priceSettings).orderBy(asc(priceSettings.key));
    res.json({ rates });
  }),
);

pricingRouter.patch(
  "/:key",
  requirePermission("pricing.write"),
  validate({
    params: z.object({ key: z.string().min(1).max(80) }),
    body: z.object({
      value: z.string().regex(/^\d+(\.\d{1,2})?$/, "Expected a decimal amount."),
    }),
  }),
  asyncHandler(async (req, res) => {
    const key = validatedParams<{ key: string }>(req).key;

    const [before] = await db
      .select()
      .from(priceSettings)
      .where(eq(priceSettings.key, key))
      .limit(1);

    if (!before) {
      throw AppError.notFound("Rate");
    }

    const [updated] = await db
      .update(priceSettings)
      .set({ value: req.body.value, updatedAt: new Date(), updatedBy: req.user!.id })
      .where(eq(priceSettings.key, key))
      .returning();

    // Invalidate immediately so the next quote uses the new rate rather than
    // waiting out the cache TTL.
    await invalidateRateCardCache();

    // A price change is exactly what a later billing dispute turns on, so the
    // before and after values are recorded, not merely the fact of an edit.
    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "pricing.updated",
      entityType: "price_setting",
      entityId: key,
      changes: { value: { from: before.value, to: req.body.value } },
      ipAddress: req.ip,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);
