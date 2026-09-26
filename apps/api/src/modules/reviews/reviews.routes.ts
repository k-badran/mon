import { db, schema } from "@mon/db";
import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { optionalAuth, requireAuth } from "../../middleware/require-auth.js";
import { requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";

const { reviews, orders } = schema;

export const reviewsRouter: Router = Router();

const listQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) });

/** Public: only moderated reviews, and never the reviewer's identity. */
reviewsRouter.get(
  "/",
  optionalAuth,
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { limit } = validatedQuery<z.infer<typeof listQuery>>(req);

    const items = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        adminReply: reviews.adminReply,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.isPublished, true))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);

    res.json({ items });
  }),
);

const createBody = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

/**
 * A review may only be left by the customer who owns the order, and only once
 * the job is complete. Both facts are checked server-side; the unique index on
 * `order_id` is the backstop against a double submit.
 */
reviewsRouter.post(
  "/",
  requireAuth,
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;

    const [order] = await db
      .select({ id: orders.id, userId: orders.userId, status: orders.status })
      .from(orders)
      .where(eq(orders.id, body.orderId))
      .limit(1);

    if (!order || order.userId !== req.user!.id) {
      throw AppError.notFound("Order");
    }

    if (order.status !== "completed") {
      throw AppError.unprocessable("You can review a job once it has been completed.");
    }

    const [created] = await db
      .insert(reviews)
      .values({
        orderId: body.orderId,
        userId: req.user!.id,
        rating: body.rating,
        comment: body.comment ?? null,
        // Held back until an admin publishes it.
        isPublished: false,
      })
      .returning();

    res.status(201).json(created);
  }),
);

const idParam = z.object({ id: z.string().uuid() });

/** Moderation: publish, unpublish, or reply. */
reviewsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("reviews.moderate"),
  validate({
    params: idParam,
    body: z.object({
      isPublished: z.boolean().optional(),
      adminReply: z.string().trim().max(2000).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (req.body.isPublished !== undefined) patch.isPublished = req.body.isPublished;

    if (req.body.adminReply !== undefined) {
      patch.adminReply = req.body.adminReply;
      patch.adminRepliedAt = new Date();
      patch.adminRepliedBy = req.user!.id;
    }

    const [updated] = await db.update(reviews).set(patch).where(eq(reviews.id, id)).returning();

    if (!updated) {
      throw AppError.notFound("Review");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "review.moderated",
      entityType: "review",
      entityId: id,
      changes: patch,
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);

/**
 * Staff view: submissions still awaiting moderation. Reading the queue is a
 * lesser act than acting on it, so customer service can triage what is waiting
 * without being able to publish or hide anything.
 */
reviewsRouter.get(
  "/pending",
  requireAuth,
  requirePermission("reviews.read"),
  asyncHandler(async (_req, res) => {
    const items = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.isPublished, false)))
      .orderBy(desc(reviews.createdAt))
      .limit(100);

    res.json({ items });
  }),
);
