import { formatMoney, parseMoney } from "@mon/core";
import { db, schema } from "@mon/db";
import { asc, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { AppError } from "../../lib/errors.js";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { hasPermission, requirePermission } from "../../middleware/require-permission.js";
import { validate, validatedParams } from "../../middleware/validate.js";
import { recordAudit } from "../audit/audit.service.js";
import { sendPaymentReceiptMail } from "../orders/order-mail.js";

const { payments, orders } = schema;

export const paymentsRouter: Router = Router();

paymentsRouter.use(requireAuth);

const orderParam = z.object({ orderId: z.string().uuid() });

/** The payment ledger for one order. Customers may read their own. */
paymentsRouter.get(
  "/:orderId",
  validate({ params: orderParam }),
  asyncHandler(async (req, res) => {
    const orderId = validatedParams<{ orderId: string }>(req).orderId;

    const [order] = await db
      .select({ id: orders.id, userId: orders.userId, totalGross: orders.totalGross, paidAmount: orders.paidAmount })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    // Ownership is what opens this route to a customer; the capability only
    // widens it to staff. Checking ownership first also keeps the customer's
    // own request down to a single query.
    const isOwner = order?.userId === req.user!.id;

    if (!order || (!isOwner && !(await hasPermission(req.user!.id, "payments.read")))) {
      throw AppError.notFound("Order");
    }

    const ledger = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(asc(payments.recordedAt));

    const outstanding = parseMoney(order.totalGross) - parseMoney(order.paidAmount);

    res.json({
      orderId,
      totalGross: order.totalGross,
      paidAmount: order.paidAmount,
      outstanding: formatMoney(outstanding),
      ledger,
    });
  }),
);

const recordBody = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Expected a decimal amount."),
  kind: z.enum(["deposit", "balance", "refund"]),
  method: z.enum(["bank_transfer", "cash", "card"]).optional(),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
});

/**
 * Records a payment.
 *
 * The ledger is append-only and `orders.paid_amount` is derived from it inside
 * the same transaction, so the summary can never drift from its own history —
 * unlike the legacy design, where `bezahlt_betrag` was a single mutable number
 * updated from the browser with no record of how it got there.
 */
paymentsRouter.post(
  "/:orderId",
  requirePermission("payments.write"),
  validate({ params: orderParam, body: recordBody }),
  asyncHandler(async (req, res) => {
    const orderId = validatedParams<{ orderId: string }>(req).orderId;
    const body = req.body as z.infer<typeof recordBody>;

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for("update")
        .limit(1);

      if (!order) {
        throw AppError.notFound("Order");
      }

      // A refund reduces the balance; everything else increases it.
      const signedAmount =
        body.kind === "refund" ? -parseMoney(body.amount) : parseMoney(body.amount);

      const nextPaid = parseMoney(order.paidAmount) + signedAmount;

      if (nextPaid < 0) {
        throw AppError.unprocessable("A refund cannot exceed the amount already paid.");
      }

      if (nextPaid > parseMoney(order.totalGross)) {
        throw AppError.unprocessable("Payments would exceed the order total.");
      }

      const [entry] = await tx
        .insert(payments)
        .values({
          orderId,
          amount: formatMoney(signedAmount),
          kind: body.kind,
          method: body.method ?? null,
          reference: body.reference ?? null,
          note: body.note ?? null,
          recordedBy: req.user!.id,
        })
        .returning();

      await tx
        .update(orders)
        .set({ paidAmount: formatMoney(nextPaid), updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await recordAudit(
        {
          actor: { id: req.user!.id, email: req.user!.email },
          action: "payment.recorded",
          entityType: "order",
          entityId: orderId,
          changes: {
            kind: body.kind,
            amount: body.amount,
            paidAmount: { from: order.paidAmount, to: formatMoney(nextPaid) },
          },
          ipAddress: req.ip,
          requestId: req.requestId,
        },
        tx,
      );

      // The order row is carried out of the transaction so the receipt can be
      // sent afterwards. `paidAmount` is overridden with the new total, because
      // `order` was read before the update and still holds the old one — a
      // receipt quoting the previous balance is worse than no receipt.
      return {
        entry: entry!,
        paidAmount: formatMoney(nextPaid),
        order: { ...order, paidAmount: formatMoney(nextPaid) },
      };
    });

    // After the commit, and deliberately not inside it: an email cannot be
    // un-sent, so it must not go out for a payment the database rolled back.
    await sendPaymentReceiptMail(result.order, {
      amount: body.amount,
      kind: body.kind,
      method: body.method ?? null,
    });

    // `order` is internal plumbing for the receipt, not part of the response
    // contract — the endpoint answered with the entry and the new total before
    // this change and still does.
    res.status(201).json({ entry: result.entry, paidAmount: result.paidAmount });
  }),
);

/** Monthly revenue, for the billing view. */
paymentsRouter.get(
  "/reports/monthly",
  requirePermission("payments.read"),
  validate({
    query: z.object({
      year: z.coerce.number().int().min(2024).max(2100),
      month: z.coerce.number().int().min(1).max(12),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { year, month } = req.query as unknown as { year: number; month: number };

    // Aggregated in Postgres in the business time zone. The legacy report
    // built month boundaries with toISOString(), which shifted them and moved
    // edge-of-month orders into the neighbouring month.
    const [row] = await db
      .select({
        total: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(
        sql`date_trunc('month', ${payments.recordedAt} AT TIME ZONE 'Europe/Berlin')
            = make_date(${year}, ${month}, 1)`,
      );

    res.json({ year, month, total: row?.total ?? "0", payments: row?.count ?? 0 });
  }),
);
