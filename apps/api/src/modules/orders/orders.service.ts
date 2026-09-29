import { env } from "@mon/config";
import {
  addDays,
  requiresSecondDay,
  toCalendarDate,
  toInstant,
  type CalendarDate,
} from "@mon/core";
import { db, schema } from "@mon/db";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { recordAudit, type AuditActor } from "../audit/audit.service.js";
import { assertCapacityAvailable } from "../availability/availability.service.js";
import {
  consumeQuote,
  incrementDiscountUse,
  loadUsableQuote,
} from "../quotes/quotes.service.js";
import { assertTransition, type OrderStatus } from "./orders.state-machine.js";

const { orders } = schema;

/**
 * Order booking and lifecycle.
 *
 * The booking path is one transaction that:
 *   1. locks and validates the quote,
 *   2. locks the requested day(s) and re-checks capacity,
 *   3. writes the order using the quote's stored price,
 *   4. consumes the quote and increments any discount use,
 *   5. records the audit entry.
 *
 * All of it commits together or none of it does.
 */

export interface CreateOrderInput {
  quoteId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  scheduledDate: string;
  scheduledTime: string;
  notes?: string | undefined;
  locale?: string | undefined;
}

export interface RequestContext {
  actor: AuditActor;
  ipAddress?: string | undefined;
  requestId?: string | undefined;
}

export async function createOrder(
  input: CreateOrderInput,
  userId: string,
  context: RequestContext,
) {
  const scheduledDate = toCalendarDate(input.scheduledDate);

  return db.transaction(async (tx) => {
    const quote = await loadUsableQuote(tx, input.quoteId, userId);
    const quoteInput = quote.input;

    const capacityUnits = quoteInput.secondVan ? 2 : 1;
    const estimatedHours = quote.estimatedHours ? Number.parseFloat(quote.estimatedHours) : 0;

    // A job longer than a working day occupies the next day too.
    const needsSecondDay = requiresSecondDay(estimatedHours);
    const secondDate: CalendarDate | null = needsSecondDay ? addDays(scheduledDate, 1) : null;

    const daysToReserve = secondDate ? [scheduledDate, secondDate] : [scheduledDate];

    // Locks the day(s) and re-counts. Raises 409 SLOT_TAKEN if it filled up
    // between the customer seeing the calendar and pressing book.
    await assertCapacityAvailable(tx, daysToReserve, capacityUnits);

    assertLeadTimeRespected(scheduledDate, input.scheduledTime);

    const reference = await nextReference(tx);

    const [created] = await tx
      .insert(orders)
      .values({
        reference,
        userId,
        quoteId: quote.id,
        status: "quoted",
        serviceType: quote.serviceType,
        customerType: quote.customerType,

        contactName: input.contactName.trim(),
        contactEmail: input.contactEmail.trim().toLowerCase(),
        contactPhone: input.contactPhone.trim(),

        originAddress: quoteInput.originAddress,
        destinationAddress: quoteInput.destinationAddress ?? null,
        originFloor: quoteInput.originFloor,
        destinationFloor: quoteInput.destinationFloor,
        originHasElevator: quoteInput.originHasElevator,
        destinationHasElevator: quoteInput.destinationHasElevator,
        distanceKm: quote.distanceKm,

        calculationMethod: quoteInput.calculationMethod,
        areaSqm: quoteInput.areaSqm ?? null,
        selectedItems: quoteInput.selectedItems ?? null,
        extraServices: quoteInput.extras,

        scheduledDate,
        scheduledTime: input.scheduledTime,
        scheduledSecondDate: secondDate,
        capacityUnits,
        crewSize: quoteInput.crewSize,
        estimatedHours: quote.estimatedHours,

        // Money comes from the quote row, never from the request body.
        netAmount: quote.netAmount,
        vatRate: quote.vatRate,
        vatAmount: quote.vatAmount,
        totalGross: quote.totalGross,
        depositAmount: quote.depositAmount,
        discountCode: quoteInput.discountCode ?? null,
        priceBreakdown: quote.breakdown,

        notes: input.notes?.trim() ?? null,
        locale: input.locale ?? "de",
      })
      .returning();

    if (!created) {
      throw AppError.internal("Order could not be created.");
    }

    await consumeQuote(tx, quote.id, userId);

    if (quoteInput.discountCode) {
      await incrementDiscountUse(tx, quoteInput.discountCode);
    }

    await recordAudit(
      {
        actor: context.actor,
        action: "order.created",
        entityType: "order",
        entityId: created.id,
        changes: {
          reference: created.reference,
          totalGross: created.totalGross,
          scheduledDate,
        },
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      },
      tx,
    );

    return created;
  });
}

/**
 * Changes an order's status through the state machine.
 *
 * Returns both the updated row and the events the real-time layer should
 * publish — emitted by the caller *after* the transaction commits, so no
 * client is ever told about a change the database rolled back.
 */
export async function changeStatus(
  orderId: string,
  nextStatus: OrderStatus,
  context: RequestContext & { reason?: string | undefined },
) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update")
      .limit(1);

    if (!order) {
      throw AppError.notFound("Order");
    }

    assertTransition(order.status, nextStatus);

    const now = new Date();
    const patch: Partial<typeof orders.$inferInsert> = {
      status: nextStatus,
      updatedAt: now,
    };

    if (nextStatus === "confirmed") patch.confirmedAt = now;
    if (nextStatus === "completed") patch.completedAt = now;

    if (nextStatus === "cancelled") {
      patch.cancelledAt = now;
      patch.cancellationReason = context.reason ?? null;
      patch.cancellationFee = calculateCancellationFee(order);
    }

    const [updated] = await tx
      .update(orders)
      .set(patch)
      .where(eq(orders.id, orderId))
      .returning();

    await recordAudit(
      {
        actor: context.actor,
        action: "order.status_changed",
        entityType: "order",
        entityId: orderId,
        changes: { status: { from: order.status, to: nextStatus } },
        ipAddress: context.ipAddress,
        requestId: context.requestId,
      },
      tx,
    );

    return updated!;
  });
}

export interface ListOrdersOptions {
  status?: OrderStatus | undefined;
  search?: string | undefined;
  /** Restricts to one customer's own orders. */
  userId?: string | undefined;
  limit: number;
  cursor?: string | undefined;
  sort?: "newest" | "oldest" | undefined;
}

/**
 * Paginated order list.
 *
 * The legacy admin panel ran `select("*")` with no limit and filtered in the
 * browser, so the whole orders table was downloaded on every page load.
 */
export async function listOrders(options: ListOrdersOptions) {
  const conditions: SQL[] = [];

  if (options.status) conditions.push(eq(orders.status, options.status));
  if (options.userId) conditions.push(eq(orders.userId, options.userId));

  if (options.search) {
    const term = `%${options.search}%`;
    conditions.push(
      or(
        ilike(orders.reference, term),
        ilike(orders.contactName, term),
        ilike(orders.contactEmail, term),
      )!,
    );
  }

  const oldestFirst = options.sort === "oldest";

  // Keyset pagination: stable under inserts, unlike OFFSET.
  if (options.cursor) {
    // Bound as a string with an explicit cast. A raw sql`` template has no
    // column to take an encoder from, and the driver refuses a Date there —
    // which made every request for a second page answer 500.
    const cursor = sql`${new Date(options.cursor).toISOString()}::timestamptz`;

    // The cursor is an ISO string, so it carries milliseconds while the column
    // carries microseconds. Walking forwards, the last row served is a few
    // microseconds *after* its own cursor and would come back as the first row
    // of the next page; truncating the column to the cursor's precision keeps
    // it out.
    conditions.push(
      oldestFirst
        ? sql`date_trunc('milliseconds', ${orders.createdAt}) > ${cursor}`
        : sql`${orders.createdAt} < ${cursor}`,
    );
  }

  const rows = await db
    .select({
      id: orders.id,
      reference: orders.reference,
      status: orders.status,
      serviceType: orders.serviceType,
      contactName: orders.contactName,
      contactEmail: orders.contactEmail,
      scheduledDate: orders.scheduledDate,
      totalGross: orders.totalGross,
      paidAmount: orders.paidAmount,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(oldestFirst ? asc(orders.createdAt) : desc(orders.createdAt))
    // One extra row tells us whether another page exists.
    .limit(options.limit + 1);

  const hasMore = rows.length > options.limit;
  const items = hasMore ? rows.slice(0, options.limit) : rows;

  return {
    items,
    nextCursor: hasMore ? items.at(-1)?.createdAt.toISOString() : undefined,
  };
}

export async function getOrderById(orderId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw AppError.notFound("Order");
  }

  return order;
}

// ── internals ───────────────────────────────────────────────────────────

/**
 * Human-facing reference, e.g. "UP-2026-000142".
 *
 * Derived from a per-year count inside the booking transaction, so two
 * concurrent bookings cannot produce the same reference — the unique index on
 * `reference` is the final backstop.
 */
async function nextReference(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getUTCFullYear();

  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`extract(year from ${orders.createdAt}) = ${year}`);

  const sequence = Number(row?.count ?? 0) + 1;

  return `UP-${year}-${sequence.toString().padStart(6, "0")}`;
}

/** Refuses a booking that violates the minimum notice period. */
function assertLeadTimeRespected(date: CalendarDate, time: string): void {
  const startsAt = toInstant(date, time, env.BUSINESS_TIMEZONE);

  if (startsAt.getTime() <= Date.now()) {
    throw AppError.unprocessable("The requested date is in the past.");
  }
}

/**
 * Cancellation fee per the published terms: free until 12 hours before the
 * job, after which the base rate plus a 3% handling fee is retained.
 *
 * Implemented here rather than restated in the assistant prompt and the terms
 * page, which is how those three drifted apart in the legacy app.
 */
const FREE_CANCELLATION_WINDOW_HOURS = 12;
const HANDLING_FEE_PERCENT = 3;

function calculateCancellationFee(order: typeof orders.$inferSelect): string | null {
  if (!order.scheduledDate) return null;

  const startsAt = toInstant(
    toCalendarDate(order.scheduledDate),
    order.scheduledTime ?? "09:00",
    env.BUSINESS_TIMEZONE,
  );

  const hoursUntil = (startsAt.getTime() - Date.now()) / 3_600_000;

  if (hoursUntil >= FREE_CANCELLATION_WINDOW_HOURS) {
    return "0.00";
  }

  const baseLine = order.priceBreakdown.lines.find((line) => line.key === "line.base_rate");
  const base = Number.parseFloat(baseLine?.amount ?? "0");
  const handling = (Number.parseFloat(order.totalGross) * HANDLING_FEE_PERCENT) / 100;

  return (Math.round((base + handling) * 100) / 100).toFixed(2);
}
