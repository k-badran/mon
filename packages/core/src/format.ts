import { DEFAULT_LOCALE, type Locale } from "./locale.js";

/**
 * Locale-aware display formatting, shared by everything that shows a customer
 * a number or a date.
 *
 * It lives here because there are now three consumers and they must agree: the
 * web app renders a price on screen, the mailer renders the same price into an
 * email, and a PDF will render it again. `apps/web/lib/i18n/translate.ts` had
 * the only copy, and a package cannot import from an app — so without this the
 * mailer would have grown a second implementation, and the email would
 * eventually have disagreed with the page it was confirming.
 */

/** Currency, written the way the locale writes it. */
export function formatCurrency(amount: string | number, locale: Locale = DEFAULT_LOCALE): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(value) ? value : 0);
}

/**
 * A calendar day, formatted for the locale.
 *
 * Takes the "YYYY-MM-DD" string the API returns and never constructs a local
 * `Date` from it. `new Date("2026-03-01")` parses as midnight UTC, which west
 * of Greenwich is the previous day — the bug that showed customers a moving
 * date one day earlier than the one they booked.
 */
export function formatCalendarDate(
  isoDate: string,
  locale: Locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" },
): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;

  const [, year, month, day] = match;

  // Constructed as UTC and formatted as UTC, so the two cancel out and the
  // label is exactly the day that was stored.
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(date);
}

/**
 * A booking time, trimmed to hours and minutes.
 *
 * Postgres `time` comes back as "09:00:00"; the seconds are always zero and
 * showing them makes a simple appointment look like a precise one.
 */
export function formatClockTime(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : value;
}
