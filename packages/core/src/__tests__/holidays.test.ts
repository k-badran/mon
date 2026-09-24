import { describe, expect, it } from "vitest";

import { easterSunday, publicHolidaysNRW } from "../holidays.js";

/**
 * The legacy app hardcoded eleven dates for 2026 only, so every 2027 holiday
 * would have become a bookable working day on 1 January. These tests prove the
 * computed version stays correct for years the old list never covered.
 */
describe("Easter falls on the known date", () => {
  it.each([
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2028, "2028-04-16"],
    [2029, "2029-04-01"],
    [2030, "2030-04-21"],
  ])("Easter %i", (year, expected) => {
    expect(easterSunday(year)).toBe(expected);
  });
});

describe("NRW public holidays", () => {
  it("returns all eleven observed days", () => {
    expect(publicHolidaysNRW(2026)).toHaveLength(11);
    expect(publicHolidaysNRW(2027)).toHaveLength(11);
  });

  it("derives the movable feasts from Easter", () => {
    const byKey = new Map(publicHolidaysNRW(2027).map((h) => [h.key, h.date]));

    expect(byKey.get("good_friday")).toBe("2027-03-26");
    expect(byKey.get("easter_monday")).toBe("2027-03-29");
    expect(byKey.get("ascension")).toBe("2027-05-06");
    expect(byKey.get("whit_monday")).toBe("2027-05-17");
    expect(byKey.get("corpus_christi")).toBe("2027-05-27");
  });

  it("includes the fixed dates and the NRW-specific ones", () => {
    const byKey = new Map(publicHolidaysNRW(2027).map((h) => [h.key, h.date]));

    expect(byKey.get("new_year")).toBe("2027-01-01");
    expect(byKey.get("german_unity")).toBe("2027-10-03");
    expect(byKey.get("all_saints")).toBe("2027-11-01");
    expect(byKey.get("christmas_1")).toBe("2027-12-25");
  });

  it("still works well beyond the hardcoded list's horizon", () => {
    expect(() => publicHolidaysNRW(2040)).not.toThrow();
    expect(publicHolidaysNRW(2040)).toHaveLength(11);
  });

  it("returns them in chronological order", () => {
    const dates = publicHolidaysNRW(2028).map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
