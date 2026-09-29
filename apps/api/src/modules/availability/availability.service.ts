import { env } from "@mon/config";
import {
  classifyRange,
  firstDayOfMonth,
  lastDayOfMonth,
  toCalendarDate,
  type AvailabilityRules,
  type AvailabilitySnapshot,
  type CalendarDate,
  type DayAvailability,
} from "@mon/core";
import { db, schema } from "@mon/db";
import { and, between, eq, ne, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";

const { orders, blockedDays, capacityConfig } = schema;

/**
 * Availability and capacity.
 *
 * The split here is deliberate:
 *
 *  - `getMonthAvailability` is **advisory**. It answers "what should the
 *    calendar look like?" and may be stale the moment it is returned.
 *
 *  - `reserveCapacity` is **authoritative**. It runs inside a transaction that
 *    locks the day, re-counts committed capacity, and either succeeds or
 *    raises `409 SLOT_TAKEN`.
 *
 * The legacy app had only the advisory half, in the browser. Two customers
 * looking at the last slot both saw "free" and both inserted successfully.
 */

export async function getRules(): Promise<AvailabilityRules> {
  const [config] = await db
    .select()
    .from(capacityConfig)
    .where(eq(capacityConfig.id, "default"))
    .limit(1);

  if (!config) {
    throw AppError.internal("Capacity configuration is missing. Run `pnpm seed`.");
  }

  return {
    maxCapacityPerDay: config.maxCapacityPerDay,
    closedWeekday: config.closedWeekday,
    bookingHorizonDays: config.bookingHorizonDays,
    minLeadTimeHours: config.minLeadTimeHours,
    timeZone: env.BUSINESS_TIMEZONE,
  };
}

/**
 * Loads committed capacity and blocked days for a date range.
 *
 * Cancelled orders do not consume capacity. A job spanning two days consumes
 * capacity on both, which is why the second date is counted too.
 */
async function loadSnapshot(from: CalendarDate, to: CalendarDate): Promise<AvailabilitySnapshot> {
  const [primary, secondary, blocked] = await Promise.all([
    db
      .select({
        day: orders.scheduledDate,
        used: sql<number>`sum(${orders.capacityUnits})::int`,
      })
      .from(orders)
      .where(and(between(orders.scheduledDate, from, to), ne(orders.status, "cancelled")))
      .groupBy(orders.scheduledDate),

    db
      .select({
        day: orders.scheduledSecondDate,
        used: sql<number>`sum(${orders.capacityUnits})::int`,
      })
      .from(orders)
      .where(and(between(orders.scheduledSecondDate, from, to), ne(orders.status, "cancelled")))
      .groupBy(orders.scheduledSecondDate),

    db
      .select()
      .from(blockedDays)
      .where(between(blockedDays.day, from, to)),
  ]);

  const bookedCapacity = new Map<CalendarDate, number>();

  for (const row of [...primary, ...secondary]) {
    if (!row.day) continue;
    const day = toCalendarDate(row.day);
    bookedCapacity.set(day, (bookedCapacity.get(day) ?? 0) + Number(row.used ?? 0));
  }

  return {
    bookedCapacity,
    blockedDays: new Map(
      blocked.map((row) => [
        toCalendarDate(row.day),
        { reason: row.reason, isPublicHoliday: row.isPublicHoliday },
      ]),
    ),
  };
}

/** Calendar for one month, for rendering the date picker. */
export async function getMonthAvailability(
  year: number,
  month: number,
  requiredCapacity = 1,
): Promise<DayAvailability[]> {
  const from = firstDayOfMonth(year, month);
  const to = lastDayOfMonth(year, month);

  const [rules, snapshot] = await Promise.all([getRules(), loadSnapshot(from, to)]);

  return classifyRange(from, to, rules, snapshot, requiredCapacity);
}

/**
 * Re-checks capacity for specific days under a row lock, inside the caller's
 * transaction. Throws `409 SLOT_TAKEN` if the day filled up in the meantime.
 *
 * `pg_advisory_xact_lock` serialises concurrent bookings for the same day
 * without locking the whole orders table: the lock is keyed on the date, so
 * bookings for different days still run in parallel. It is released
 * automatically when the transaction ends, including on rollback.
 */
export async function assertCapacityAvailable(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  days: readonly CalendarDate[],
  requiredCapacity: number,
): Promise<void> {
  const rules = await getRules();

  // Lock in a stable order so two concurrent bookings for overlapping days
  // cannot deadlock by taking the same locks in opposite order.
  const ordered = [...new Set(days)].sort();

  for (const day of ordered) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${day}))`);
  }

  for (const day of ordered) {
    const [row] = await tx
      .select({ used: sql<number>`coalesce(sum(${orders.capacityUnits}), 0)::int` })
      .from(orders)
      .where(
        and(
          sql`(${orders.scheduledDate} = ${day} OR ${orders.scheduledSecondDate} = ${day})`,
          ne(orders.status, "cancelled"),
        ),
      );

    const used = Number(row?.used ?? 0);

    if (used + requiredCapacity > rules.maxCapacityPerDay) {
      throw AppError.conflict(
        "SLOT_TAKEN",
        "That date was just booked by someone else. Please choose another day.",
        { day, remaining: Math.max(0, rules.maxCapacityPerDay - used) },
      );
    }

    // A day blocked after the customer opened the calendar must also fail.
    const [blocked] = await tx
      .select()
      .from(blockedDays)
      .where(eq(blockedDays.day, day))
      .limit(1);

    if (blocked) {
      throw AppError.conflict("SLOT_TAKEN", "That date is not available.", {
        day,
        reason: blocked.reason,
      });
    }
  }
}

/** Admin: block or unblock a day. */
export async function setDayBlocked(
  day: CalendarDate,
  reason: string,
  createdBy: string,
): Promise<void> {
  await db
    .insert(blockedDays)
    .values({ day, reason, isPublicHoliday: false, createdBy })
    .onConflictDoUpdate({ target: blockedDays.day, set: { reason } });
}

export async function unblockDay(day: CalendarDate): Promise<void> {
  // Public holidays are generated, not manual, so they are not removable here.
  await db
    .delete(blockedDays)
    .where(and(eq(blockedDays.day, day), eq(blockedDays.isPublicHoliday, false)));
}
