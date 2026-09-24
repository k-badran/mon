import { db, schema } from "@umzugplus/db";
import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";

const { discountCodes } = schema;

export const discountsRouter: Router = Router();

// Reading the list and editing it are the same capability here: a code's value
// is the sensitive part, so there is nothing on these routes that someone
// without `discounts.write` should see. Naming the capability rather than the
// role also stops super_admin from being locked out, as `requireRole("admin")`
// did. Validation of a code at quote time is a separate, unauthenticated path
// inside the quotes service.
discountsRouter.use(requireAuth, requirePermission("discounts.write"));

discountsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const codes = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt));
    res.json({ codes });
  }),
);

const codeBody = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, "Use letters, digits, hyphen or underscore only."),
    kind: z.enum(["percentage", "fixed"]),
    value: z.string().regex(/^\d+(\.\d{1,2})?$/),
    maxUses: z.number().int().positive().nullable().default(null),
    minOrderValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().default(null),
    validFrom: z.string().datetime().nullable().default(null),
    validUntil: z.string().datetime().nullable().default(null),
  })
  // The engine clamps a discount so it can never produce a negative invoice,
  // but rejecting an impossible percentage here keeps the stored data honest.
  .refine((value) => value.kind !== "percentage" || Number.parseFloat(value.value) <= 100, {
    message: "A percentage discount cannot exceed 100.",
    path: ["value"],
  })
  .refine(
    (value) =>
      value.validFrom === null ||
      value.validUntil === null ||
      new Date(value.validFrom) < new Date(value.validUntil),
    { message: "validFrom must precede validUntil.", path: ["validUntil"] },
  );

discountsRouter.post(
  "/",
  validate({ body: codeBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof codeBody>;

    const [created] = await db
      .insert(discountCodes)
      .values({
        ...body,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
      })
      .returning();

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "discount.created",
      entityType: "discount_code",
      entityId: created!.code,
      changes: { kind: body.kind, value: body.value, maxUses: body.maxUses },
      requestId: req.requestId,
    });

    res.status(201).json(created);
  }),
);

/**
 * Codes are disabled, never deleted: `orders.discount_code` references them,
 * and deleting one would make historical invoices unexplainable.
 */
discountsRouter.patch(
  "/:code",
  validate({
    params: z.object({ code: z.string().min(1).max(40) }),
    body: z.object({ isActive: z.boolean() }),
  }),
  asyncHandler(async (req, res) => {
    const code = validatedParams<{ code: string }>(req).code.toUpperCase();

    const [updated] = await db
      .update(discountCodes)
      .set({ isActive: req.body.isActive })
      .where(eq(discountCodes.code, code))
      .returning();

    if (!updated) {
      throw AppError.notFound("Discount code");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: req.body.isActive ? "discount.enabled" : "discount.disabled",
      entityType: "discount_code",
      entityId: code,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);
