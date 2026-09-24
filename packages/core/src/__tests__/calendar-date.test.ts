import { describe, expect, it } from "vitest";

import {
  addDays,
  daysInMonth,
  differenceInDays,
  fromInstant,
  fromParts,
  isCalendarDate,
  isSaturday,
  toCalendarDate,
  toInstant,
  weekday,
} from "../calendar-date.js";

/**
 * Regression tests for the off-by-one date bug.
 *
 * The legacy implementation was:
 *
 *     const toISO = (d) => d.toISOString().slice(0, 10);
 *     toISO(new Date(2026, 8, 7))  →  "2026-09-06"   ← wrong
 *
 * These tests pin the corrected behaviour so it cannot silently regress.
 */
describe("calendar dates never shift across time zones", () => {
  it("keeps the day the caller asked for, in summer time", () => {
    // 15 July 2026, Berlin is on CEST (UTC+2) — the legacy code lost a day here.
    expect(fromParts(2026, 7, 15)).toBe("2026-07-15");
  });

  it("keeps the day the caller asked for, in winter time", () => {
    // 15 January 2026, Berlin is on CET (UTC+1).
    expect(fromParts(2026, 1, 15)).toBe("2026-01-15");
  });

  it("resolves an instant to the Berlin day, not the UTC day", () => {
    // 00:30 on 7 Sep in Berlin is still 22:30 on 6 Sep in UTC.
    const justAfterBerlinMidnight = new Date("2026-09-06T22:30:00.000Z");

    expect(fromInstant(justAfterBerlinMidnight, "Europe/Berlin")).toBe("2026-09-07");
    expect(fromInstant(justAfterBerlinMidnight, "UTC")).toBe("2026-09-06");
  });

  it("crosses a DST boundary without dropping or repeating a day", () => {
    // Germany moves to summer time on 29 March 2026.
    expect(addDays(toCalendarDate("2026-03-28"), 1)).toBe("2026-03-29");
    expect(addDays(toCalendarDate("2026-03-29"), 1)).toBe("2026-03-30");

    // And back to winter time on 25 October 2026.
    expect(addDays(toCalendarDate("2026-10-24"), 1)).toBe("2026-10-25");
    expect(addDays(toCalendarDate("2026-10-25"), 1)).toBe("2026-10-26");
  });
});

describe("calendar date arithmetic", () => {
  it("adds and subtracts across month and year boundaries", () => {
    expect(addDays(toCalendarDate("2026-01-31"), 1)).toBe("2026-02-01");
    expect(addDays(toCalendarDate("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(toCalendarDate("2026-01-01"), -1)).toBe("2025-12-31");
  });

  it("handles leap years", () => {
    expect(addDays(toCalendarDate("2028-02-28"), 1)).toBe("2028-02-29");
    expect(daysInMonth(2028, 2)).toHaveLength(29);
    expect(daysInMonth(2026, 2)).toHaveLength(28);
  });

  it("measures whole days between two dates", () => {
    expect(differenceInDays(toCalendarDate("2026-07-15"), toCalendarDate("2026-07-18"))).toBe(3);
    expect(differenceInDays(toCalendarDate("2026-07-18"), toCalendarDate("2026-07-15"))).toBe(-3);
    // Spanning the DST change, which is 23 real hours shorter.
    expect(differenceInDays(toCalendarDate("2026-03-28"), toCalendarDate("2026-03-30"))).toBe(2);
  });

  it("identifies weekdays correctly", () => {
    expect(weekday(toCalendarDate("2026-09-07"))).toBe(1); // Monday
    expect(isSaturday(toCalendarDate("2026-09-12"))).toBe(true);
    expect(isSaturday(toCalendarDate("2026-09-13"))).toBe(false); // Sunday
  });
});

describe("validation", () => {
  it("rejects impossible dates the regex alone would allow", () => {
    expect(isCalendarDate("2026-02-31")).toBe(false);
    expect(isCalendarDate("2026-13-01")).toBe(false);
    expect(isCalendarDate("2026-00-10")).toBe(false);
  });

  it("rejects timestamps and malformed input", () => {
    expect(isCalendarDate("2026-09-07T00:00:00Z")).toBe(false);
    expect(isCalendarDate("07.09.2026")).toBe(false);
    expect(isCalendarDate("")).toBe(false);
    expect(isCalendarDate(null)).toBe(false);
  });

  it("throws with a useful message", () => {
    expect(() => toCalendarDate("07.09.2026")).toThrow(/Expected YYYY-MM-DD/);
  });
});

describe("combining a day with a wall-clock time", () => {
  it("interprets the time in the business zone, not UTC", () => {
    // 09:00 Berlin in summer is 07:00 UTC.
    expect(toInstant(toCalendarDate("2026-07-15"), "09:00", "Europe/Berlin").toISOString()).toBe(
      "2026-07-15T07:00:00.000Z",
    );

    // 09:00 Berlin in winter is 08:00 UTC.
    expect(toInstant(toCalendarDate("2026-01-15"), "09:00", "Europe/Berlin").toISOString()).toBe(
      "2026-01-15T08:00:00.000Z",
    );
  });
});
