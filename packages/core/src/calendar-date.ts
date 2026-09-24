/**
 * Calendar-day handling.
 *
 * This module exists because of a specific, reproducible bug in the legacy
 * app: it derived booking days with `new Date(y, m, d).toISOString().slice(0, 10)`.
 * `toISOString()` converts to UTC, and the Date was built at *local* midnight,
 * so in Germany (UTC+1/+2) every day rolled back by one:
 *
 *     TZ=Europe/Berlin
 *     new Date(2026, 8, 7)  →  Mon Sep 07 2026 00:00:00 GMT+0200
 *     .toISOString()        →  "2026-09-06T22:00:00.000Z"  →  "2026-09-06"
 *
 * A customer clicking 15 July booked 14 July, capacity was counted against the
 * wrong day, and monthly revenue reports moved orders between months.
 *
 * The fix is to treat a calendar day as what it is — a label, not an instant —
 * and never to route one through UTC. A `CalendarDate` is the string
 * "YYYY-MM-DD"; it maps directly onto Postgres `date`.
 */

/** An ISO calendar day, "YYYY-MM-DD". Has no time and no time zone. */
export type CalendarDate = string & { readonly __brand: "CalendarDate" };

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: unknown): value is CalendarDate {
  if (typeof value !== "string" || !ISO_DAY_PATTERN.test(value)) return false;

  // Reject impossible days such as "2026-02-31", which the regex allows.
  const { year, month, day } = splitParts(value);
  const probe = new Date(Date.UTC(year, month - 1, day));

  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function toCalendarDate(value: string): CalendarDate {
  if (!isCalendarDate(value)) {
    throw new TypeError(`Not a valid calendar date: "${value}". Expected YYYY-MM-DD.`);
  }
  return value;
}

/** Builds a calendar date from parts. `month` is 1-based, as humans write it. */
export function fromParts(year: number, month: number, day: number): CalendarDate {
  const value = [
    year.toString().padStart(4, "0"),
    month.toString().padStart(2, "0"),
    day.toString().padStart(2, "0"),
  ].join("-");

  return toCalendarDate(value);
}

/**
 * Today's date in the business time zone.
 *
 * Note this reads the *wall clock in Berlin*, not the server's local time —
 * so a server running in UTC still agrees with the office about what "today"
 * means, which matters at 01:00 CEST when UTC is still on the previous day.
 */
export function today(timeZone: string): CalendarDate {
  return fromInstant(new Date(), timeZone);
}

/** Projects an instant onto the calendar day it falls on in `timeZone`. */
export function fromInstant(instant: Date, timeZone: string): CalendarDate {
  // `en-CA` formats as YYYY-MM-DD, which is exactly the shape we want.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return toCalendarDate(formatter.format(instant));
}

/** Adds (or with a negative value, subtracts) whole days. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const { year, month, day } = splitParts(date);

  // UTC arithmetic is safe here precisely because both ends are UTC — there is
  // no local midnight involved, so no DST boundary can shift the result.
  const shifted = new Date(Date.UTC(year, month - 1, day + days));

  return fromParts(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** Day of week, 0 = Sunday, matching `Date.prototype.getDay`. */
export function weekday(date: CalendarDate): number {
  const { year, month, day } = splitParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isSaturday(date: CalendarDate): boolean {
  return weekday(date) === 6;
}

/** Whole days from `from` to `to`. Negative when `to` precedes `from`. */
export function differenceInDays(from: CalendarDate, to: CalendarDate): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((toUtcMillis(to) - toUtcMillis(from)) / MS_PER_DAY);
}

export function compare(a: CalendarDate, b: CalendarDate): number {
  // ISO day strings sort lexicographically in chronological order.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBefore(a: CalendarDate, b: CalendarDate): boolean {
  return a < b;
}

export function isAfter(a: CalendarDate, b: CalendarDate): boolean {
  return a > b;
}

/** Every day in a month, for rendering an availability calendar. */
export function daysInMonth(year: number, month: number): CalendarDate[] {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: count }, (_unused, index) => fromParts(year, month, index + 1));
}

export function firstDayOfMonth(year: number, month: number): CalendarDate {
  return fromParts(year, month, 1);
}

export function lastDayOfMonth(year: number, month: number): CalendarDate {
  return fromParts(year, month, new Date(Date.UTC(year, month, 0)).getUTCDate());
}

/**
 * Combines a calendar day and a wall-clock time into a real instant,
 * interpreting them in `timeZone`. Use this only when an actual point in time
 * is needed — for example "is this job less than 12 hours away?".
 */
export function toInstant(date: CalendarDate, time: string, timeZone: string): Date {
  const { year, month, day } = splitParts(date);
  const [hours = 0, minutes = 0] = time.split(":").map((part) => Number.parseInt(part, 10));

  // Start from the naive UTC reading, then correct by that zone's offset on
  // that date. Doing it this way handles DST transitions correctly.
  const naiveUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const offsetMinutes = zoneOffsetMinutes(new Date(naiveUtc), timeZone);

  return new Date(naiveUtc - offsetMinutes * 60_000);
}

function splitParts(date: string): { year: number; month: number; day: number } {
  const match = ISO_DAY_PATTERN.exec(date);

  if (!match) {
    throw new TypeError(`Not a valid calendar date: "${date}"`);
  }

  return {
    year: Number.parseInt(match[1]!, 10),
    month: Number.parseInt(match[2]!, 10),
    day: Number.parseInt(match[3]!, 10),
  };
}

function toUtcMillis(date: CalendarDate): number {
  const { year, month, day } = splitParts(date);
  return Date.UTC(year, month - 1, day);
}

/** Offset of `timeZone` from UTC, in minutes, at the given instant. */
function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const asUtc = Date.UTC(
    Number.parseInt(parts.year!, 10),
    Number.parseInt(parts.month!, 10) - 1,
    Number.parseInt(parts.day!, 10),
    // Intl renders midnight as "24" in some environments.
    Number.parseInt(parts.hour!, 10) % 24,
    Number.parseInt(parts.minute!, 10),
    Number.parseInt(parts.second!, 10),
  );

  return (asUtc - instant.getTime()) / 60_000;
}
