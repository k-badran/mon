import type { Locale } from "./config";

/**
 * Message lookup with interpolation and plural selection.
 *
 * The previous `t(key)` took a key and nothing else, so any sentence with a
 * number in it had to be assembled by string concatenation — which does not
 * survive translation into Arabic or Turkish grammar. Arabic needs up to six
 * plural forms; the old design supported one.
 *
 * A missing key also fell back silently to German and then to the raw key,
 * so gaps stayed invisible until a customer saw `label_flaeche` on screen.
 * Here a miss is loud in development and falls back quietly in production.
 */

export type Messages = Record<string, string | Record<string, string>>;

export interface TranslateOptions {
  /** Values substituted into `{name}` placeholders. */
  values?: Record<string, string | number>;
  /** Selects a plural form when the entry is an object. */
  count?: number;
}

/** CLDR plural categories, per locale. */
type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

function pluralCategory(locale: Locale, count: number): PluralCategory {
  // Intl knows the real CLDR rules, including Arabic's six categories —
  // far better than any hand-written condition.
  return new Intl.PluralRules(locale).select(count) as PluralCategory;
}

export function createTranslator(
  locale: Locale,
  messages: Messages,
  fallback?: Messages,
) {
  return function translate(key: string, options: TranslateOptions = {}): string {
    const entry = messages[key] ?? fallback?.[key];

    if (entry === undefined) {
      if (process.env.NODE_ENV !== "production") {
        // Loud in development so the gap is fixed before anyone ships it.
        console.warn(`[i18n] Missing message "${key}" for locale "${locale}".`);
      }

      return key;
    }

    const template =
      typeof entry === "string"
        ? entry
        : // Plural form: try the exact category, then "other" as CLDR requires.
          (entry[pluralCategory(locale, options.count ?? 0)] ?? entry.other ?? key);

    return interpolate(template, locale, options);
  };
}

function interpolate(template: string, locale: Locale, options: TranslateOptions): string {
  const values: Record<string, string | number> = {
    ...options.values,
    ...(options.count !== undefined ? { count: options.count } : {}),
  };

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];

    if (value === undefined) return match;

    // Numbers are formatted for the locale, so Arabic and German each get
    // their own digit grouping and decimal separator.
    return typeof value === "number" ? new Intl.NumberFormat(locale).format(value) : value;
  });
}

/** Currency, formatted the way the locale writes it. */
export function formatCurrency(amount: string | number, locale: Locale): string {
  const value = typeof amount === "string" ? Number.parseFloat(amount) : amount;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(value) ? value : 0);
}

/**
 * A calendar day, formatted for the locale.
 *
 * Takes the "YYYY-MM-DD" string the API returns and formats it without ever
 * constructing a Date from it in local time — which is what shifted dates by a
 * day in the previous implementation.
 */
export function formatCalendarDate(day: string, locale: Locale): string {
  const [year, month, date] = day.split("-").map((part) => Number.parseInt(part, 10));

  if (!year || !month || !date) return day;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, date)));
}
