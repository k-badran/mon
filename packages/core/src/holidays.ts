import { addDays, fromParts, type CalendarDate } from "./calendar-date.js";

/**
 * German public holidays, computed for any year.
 *
 * The legacy app hardcoded a `Set` of eleven 2026 dates. On 1 January 2027
 * every lookup would have missed and all of that year's holidays would have
 * silently become bookable working days — no error, no warning, just crews
 * dispatched on Christmas Day.
 *
 * Most German holidays are fixed dates; the rest are offsets from Easter
 * Sunday, which is computed below. The company operates in North
 * Rhine-Westphalia, whose state holidays are Corpus Christi and All Saints.
 */

export interface Holiday {
  date: CalendarDate;
  /** Stable key for translation — the UI never shows this raw. */
  key: string;
  /** German name, used for the admin calendar and audit entries. */
  name: string;
}

/**
 * Easter Sunday by the Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 * Valid for the Gregorian calendar, which covers every year this app cares
 * about by several centuries in each direction.
 */
export function easterSunday(year: number): CalendarDate {
  assertSupportedYear(year);

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);

  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return fromParts(year, month, day);
}

/**
 * Public holidays observed in North Rhine-Westphalia for `year`.
 * Returned sorted, so the result can be rendered directly.
 */
export function publicHolidaysNRW(year: number): Holiday[] {
  assertSupportedYear(year);

  const easter = easterSunday(year);

  const holidays: Holiday[] = [
    { date: fromParts(year, 1, 1), key: "new_year", name: "Neujahr" },
    { date: addDays(easter, -2), key: "good_friday", name: "Karfreitag" },
    { date: addDays(easter, 1), key: "easter_monday", name: "Ostermontag" },
    { date: fromParts(year, 5, 1), key: "labour_day", name: "Tag der Arbeit" },
    { date: addDays(easter, 39), key: "ascension", name: "Christi Himmelfahrt" },
    { date: addDays(easter, 50), key: "whit_monday", name: "Pfingstmontag" },
    // NRW state holiday.
    { date: addDays(easter, 60), key: "corpus_christi", name: "Fronleichnam" },
    { date: fromParts(year, 10, 3), key: "german_unity", name: "Tag der Deutschen Einheit" },
    // NRW state holiday.
    { date: fromParts(year, 11, 1), key: "all_saints", name: "Allerheiligen" },
    { date: fromParts(year, 12, 25), key: "christmas_1", name: "1. Weihnachtstag" },
    { date: fromParts(year, 12, 26), key: "christmas_2", name: "2. Weihnachtstag" },
  ];

  return holidays.sort((left, right) => (left.date < right.date ? -1 : 1));
}

/** Holidays across an inclusive range of years, for bulk seeding. */
export function publicHolidaysForRange(fromYear: number, toYear: number): Holiday[] {
  if (toYear < fromYear) {
    throw new RangeError(`toYear (${toYear}) must not precede fromYear (${fromYear})`);
  }

  const years = Array.from({ length: toYear - fromYear + 1 }, (_unused, i) => fromYear + i);

  return years.flatMap((year) => publicHolidaysNRW(year));
}

function assertSupportedYear(year: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw new RangeError(`Year out of supported range (1900-2200): ${year}`);
  }
}
