/**
 * The set of languages the product speaks, shared by everything that has to
 * agree on them.
 *
 * This lives in `core` rather than in the web app because the locale is not a
 * rendering concern alone: `users.locale` is a database column, the API picks
 * an email's language from it, and the assistant answers in it. Three
 * independent copies of "which languages exist" is three chances for them to
 * drift, and the one that drifts silently is the email — a locale the mailer
 * has never heard of falls back to German without anybody noticing.
 *
 * `apps/web/lib/i18n/config.ts` keeps its own richer `LOCALE_META` (labels,
 * BCP 47 tags) because those are presentation details the API has no use for.
 * The list of codes and the writing direction are the parts that must match,
 * and they are defined here.
 */

export const LOCALES = ["de", "en", "ar", "tr"] as const;

export type Locale = (typeof LOCALES)[number];

/** German: the business operates in Germany and this is the fallback everywhere. */
export const DEFAULT_LOCALE: Locale = "de";

export type TextDirection = "ltr" | "rtl";

const DIRECTIONS: Record<Locale, TextDirection> = {
  de: "ltr",
  en: "ltr",
  ar: "rtl",
  tr: "ltr",
};

export function directionOf(locale: Locale): TextDirection {
  return DIRECTIONS[locale];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Narrows an arbitrary stored value to a locale.
 *
 * `users.locale` is a plain `text` column with no check constraint, so a row
 * written before a language was added — or by hand — can hold anything. A
 * caller that is about to render an email needs a locale it can index with,
 * not a validation error, so an unrecognised value becomes the default.
 */
export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
