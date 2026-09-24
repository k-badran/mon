import { db, schema } from "@umzugplus/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { hasPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams, validatedQuery } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";

const { complaints, complaintMessages, orders } = schema;

export const complaintsRouter: Router = Router();

complaintsRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

const listQuery = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/** Customers see their own threads; the support queue sees all. Enforced server-side. */
complaintsRouter.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const query = validatedQuery<z.infer<typeof listQuery>>(req);
    const filters = [];

    // No route guard: without `complaints.read` the caller is not rejected,
    // they are simply scoped to the threads they own.
    if (!(await hasPermission(req.user!.id, "complaints.read"))) {
      filters.push(eq(complaints.userId, req.user!.id));
    }

    if (query.status) filters.push(eq(complaints.status, query.status));

    const items = await db
      .select()
      .from(complaints)
      .where(filters.length > 0 ? and(...filters) : undefined)
      // Sorted by activity so the freshest thread is first in the queue.
      .orderBy(desc(complaints.updatedAt))
      .limit(query.limit);

    res.json({ items });
  }),
);

const createBody = z.object({
  orderId: z.string().uuid(),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(5000),
});

complaintsRouter.post(
  "/",
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;

    const [order] = await db
      .select({ id: orders.id, userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, body.orderId))
      .limit(1);

    // Owning the order is what authorises filing against it; `complaints.write`
    // only widens that to support staff opening a thread on someone's behalf.
    const authorised =
      order !== undefined &&
      (order.userId === req.user!.id ||
        (await hasPermission(req.user!.id, "complaints.write")));

    if (!authorised) {
      throw AppError.notFound("Order");
    }

    // Thread and first message are written together: a complaint with no
    // message is not a meaningful state to leave in the database.
    const created = await db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(complaints)
        .values({
          orderId: body.orderId,
          userId: req.user!.id,
          subject: body.subject,
          status: "open",
        })
        .returning();

      await tx.insert(complaintMessages).values({
        complaintId: thread!.id,
        authorType: "customer",
        authorId: req.user!.id,
        body: body.message,
      });

      return thread!;
    });

    res.status(201).json(created);
  }),
);

complaintsRouter.get(
  "/:id",
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [thread] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);

    const visible =
      thread !== undefined &&
      (thread.userId === req.user!.id ||
        (await hasPermission(req.user!.id, "complaints.read")));

    // 404 rather than 403: confirming a thread exists but is not yours leaks
    // its existence to anyone probing ids.
    if (!visible) {
      throw AppError.notFound("Complaint");
    }

    const messages = await db
      .select()
      .from(complaintMessages)
      .where(eq(complaintMessages.complaintId, id))
      .orderBy(asc(complaintMessages.createdAt));

    res.json({ ...thread, messages });
  }),
);

complaintsRouter.post(
  "/:id/messages",
  validate({ params: idParam, body: z.object({ body: z.string().trim().min(1).max(5000) }) }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;

    const [thread] = await db.select().from(complaints).where(eq(complaints.id, id)).limit(1);

    // Resolved once and reused: it decides both whether a non-owner may post
    // at all and how the message is attributed.
    const staff = await hasPermission(req.user!.id, "complaints.write");

    if (!thread || (thread.userId !== req.user!.id && !staff)) {
      throw AppError.notFound("Complaint");
    }

    if (thread.status === "closed") {
      throw AppError.unprocessable("This thread is closed.");
    }

    const created = await db.transaction(async (tx) => {
      const [message] = await tx
        .insert(complaintMessages)
        .values({
          complaintId: id,
          authorType: staff ? "staff" : "customer",
          authorId: req.user!.id,
          body: req.body.body,
        })
        .returning();

      // Bumping updatedAt is what keeps the staff queue ordered by activity.
      await tx
        .update(complaints)
        .set({
          updatedAt: new Date(),
          // A staff reply moves an untouched thread into progress.
          ...(staff && thread.status === "open" ? { status: "in_progress" as const } : {}),
        })
        .where(eq(complaints.id, id));

      return message!;
    });

    res.status(201).json(created);
  }),
);

complaintsRouter.patch(
  "/:id/status",
  requirePermission("complaints.write"),
  validate({
    params: idParam,
    body: z.object({ status: z.enum(["open", "in_progress", "resolved", "closed"]) }),
  }),
  asyncHandler(async (req, res) => {
    const id = validatedParams<{ id: string }>(req).id;
    const status = req.body.status as "open" | "in_progress" | "resolved" | "closed";

    const [updated] = await db
      .update(complaints)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === "resolved" ? { resolvedAt: new Date() } : {}),
      })
      .where(eq(complaints.id, id))
      .returning();

    if (!updated) {
      throw AppError.notFound("Complaint");
    }

    await recordAudit({
      actor: { id: req.user!.id, email: req.user!.email },
      action: "complaint.status_changed",
      entityType: "complaint",
      entityId: id,
      changes: { status },
      requestId: req.requestId,
    });

    res.json(updated);
  }),
);
