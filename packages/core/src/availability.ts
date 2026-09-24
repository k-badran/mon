import {
  addDays,
  compare,
  differenceInDays,
  isBefore,
  today,
  weekday,
  type CalendarDate,
} from "./calendar-date.js";

/**
 * Booking availability rules.
 *
 * These are pure predicates over already-fetched data. The *enforcement* of
 * capacity happens in the database inside a locking transaction (see
 * `availability.service.ts`) — this module decides what to render, not what is
 * allowed to be written.
 *
 * That separation is the fix for a real race in the legacy app: capacity was
 * checked only in the browser, so two customers looking at the last slot both
 * saw "free" and both inserted successfully.
 */

export type DayStatus =
  | "past"
  | "too_soon"
  | "beyond_horizon"
  | "closed"
  | "holiday"
  | "blocked"
  | "full"
  | "free";

export interface AvailabilityRules {
  maxCapacityPerDay: number;
  /** 0 = Sunday. */
  closedWeekday: number;
  bookingHorizonDays: number;
  minLeadTimeHours: number;
  timeZone: string;
}

export interface AvailabilitySnapshot {
  /** Day → capacity units already committed. */
  bookedCapacity: ReadonlyMap<CalendarDate, number>;
  /** Days closed manually or for a public holiday. */
  blockedDays: ReadonlyMap<CalendarDate, { reason: string; isPublicHoliday: boolean }>;
}

export interface DayAvailability {
  date: CalendarDate;
  status: DayStatus;
  /** Remaining capacity units. Zero for any non-bookable day. */
  remainingCapacity: number;
  reason?: string;
}

/**
 * Classifies one day. `requiredCapacity` is how many slots the job needs — a
 * second van consumes two.
 */
export function classifyDay(
  date: CalendarDate,
  rules: AvailabilityRules,
  snapshot: AvailabilitySnapshot,
  requiredCapacity = 1,
): DayAvailability {
  const currentDay = today(rules.timeZone);
  const none = (status: DayStatus, reason?: string): DayAvailability => ({
    date,
    status,
    remainingCapacity: 0,
    ...(reason ? { reason } : {}),
  });

  if (isBefore(date, currentDay)) {
    return none("past");
  }

  // Crews need notice. A job "tomorrow" booked at 23:00 is not workable.
  const leadDays = Math.ceil(rules.minLeadTimeHours / 24);
  if (differenceInDays(currentDay, date) < leadDays) {
    return none("too_soon");
  }

  if (differenceInDays(currentDay, date) > rules.bookingHorizonDays) {
    return none("beyond_horizon");
  }

  if (weekday(date) === rules.closedWeekday) {
    return none("closed");
  }

  const blocked = snapshot.blockedDays.get(date);
  if (blocked) {
    return none(blocked.isPublicHoliday ? "holiday" : "blocked", blocked.reason);
  }

  const used = snapshot.bookedCapacity.get(date) ?? 0;
  const remaining = rules.maxCapacityPerDay - used;

  if (remaining < requiredCapacity) {
    return none("full");
  }

  return { date, status: "free", remainingCapacity: remaining };
}

/** Classifies an inclusive range, for rendering a month view in one pass. */
export function classifyRange(
  from: CalendarDate,
  to: CalendarDate,
  rules: AvailabilityRules,
  snapshot: AvailabilitySnapshot,
  requiredCapacity = 1,
): DayAvailability[] {
  if (compare(from, to) > 0) {
    throw new RangeError(`Range start ${from} is after its end ${to}`);
  }

  const days: DayAvailability[] = [];

  for (let cursor = from; compare(cursor, to) <= 0; cursor = addDays(cursor, 1)) {
    days.push(classifyDay(cursor, rules, snapshot, requiredCapacity));
  }

  return days;
}

export function isBookable(day: DayAvailability): boolean {
  return day.status === "free";
}

/**
 * Finds the next consecutive bookable day after `date`.
 *
 * A job estimated over one working day needs a second, directly following day,
 * and that day must also have capacity.
 */
export function nextConsecutiveBookableDay(
  date: CalendarDate,
  rules: AvailabilityRules,
  snapshot: AvailabilitySnapshot,
  requiredCapacity = 1,
): CalendarDate | null {
  const candidate = addDays(date, 1);
  const classified = classifyDay(candidate, rules, snapshot, requiredCapacity);

  return isBookable(classified) ? candidate : null;
}

/** True when the estimate exceeds one working day, so a second day is needed. */
export function requiresSecondDay(estimatedHours: number, hoursPerWorkday = 8): boolean {
  return estimatedHours > hoursPerWorkday;
}
