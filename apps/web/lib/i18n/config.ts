/**
 * Locale configuration.
 *
 * The previous implementation kept the language in `localStorage` and patched
 * `<html lang>` after mount. That meant the server always rendered German and
 * the browser swapped afterwards — a visible flash, a hydration mismatch, and
 * a site Google could only ever index in one language. It also made a link
 * unshareable in a given language.
 *
 * The locale now lives in the URL path, so it is known before a single byte is
 * rendered.
 */

export const LOCALES = ["de", "en", "ar", "tr"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";

export interface LocaleMeta {
  code: Locale;
  /** The language's own name, as speakers of it write it. */
  label: string;
  dir: "ltr" | "rtl";
  /** BCP 47 tag, for Intl and the `lang` attribute. */
  tag: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  de: { code: "de", label: "Deutsch", dir: "ltr", tag: "de-DE" },
  en: { code: "en", label: "English", dir: "ltr", tag: "en-GB" },
  ar: { code: "ar", label: "العربية", dir: "rtl", tag: "ar" },
  tr: { code: "tr", label: "Türkçe", dir: "ltr", tag: "tr-TR" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): "ltr" | "rtl" {
  return LOCALE_META[locale].dir;
}

/**
 * Picks the best locale from an Accept-Language header.
 *
 * Parses quality values properly rather than taking the first entry, so a
 * browser sending `en;q=0.8, de;q=0.9` gets German.
 */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));

      return {
        // Match on the primary subtag: "de-AT" should select German.
        language: tag.trim().toLowerCase().split("-")[0] ?? "",
        quality: quality ? Number.parseFloat(quality.slice(2)) : 1,
      };
    })
    .filter((entry) => entry.language.length > 0 && Number.isFinite(entry.quality))
    .sort((left, right) => right.quality - left.quality);

  for (const entry of ranked) {
    if (isLocale(entry.language)) return entry.language;
  }

  return DEFAULT_LOCALE;
}

/** Rewrites a path to a different locale, keeping the rest of the route. */
export function localizePath(pathname: string, locale: Locale): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length > 0 && isLocale(segments[0])) {
    segments[0] = locale;
  } else {
    segments.unshift(locale);
  }

  return `/${segments.join("/")}`;
}

/** Extracts the locale from a path, or the default when absent. */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}
