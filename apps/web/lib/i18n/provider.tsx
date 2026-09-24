"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import {
  LOCALE_META,
  localizePath,
  type Locale,
} from "./config";
import {
  createTranslator,
  formatCalendarDate,
  formatCurrency,
  type Messages,
  type TranslateOptions,
} from "./translate";

/**
 * Locale context.
 *
 * The locale arrives from the URL via the server layout, so it is already
 * correct on the first render. Nothing here reads `localStorage` or patches
 * `document.documentElement` after mount, which is what produced the flash of
 * German and the hydration mismatch in the previous version.
 */

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: string, options?: TranslateOptions) => string;
  formatCurrency: (amount: string | number) => string;
  formatDate: (day: string) => string;
  /** Switches language and navigates, keeping the current route. */
  setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  fallback,
  children,
}: {
  locale: Locale;
  messages: Messages;
  /** German, used when a key is missing in another language. */
  fallback: Messages;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const value = useMemo<I18nContextValue>(() => {
    const translate = createTranslator(locale, messages, fallback);

    return {
      locale,
      dir: LOCALE_META[locale].dir,
      t: translate,
      formatCurrency: (amount) => formatCurrency(amount, locale),
      formatDate: (day) => formatCalendarDate(day, locale),
      setLocale: (next) => {
        // A real navigation, so the URL reflects the language and the page can
        // be shared, bookmarked and indexed in it.
        router.push(localizePath(pathname, next));
      },
    };
  }, [locale, messages, fallback, router, pathname]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>.");
  }

  return context;
}

/** Shorthand for the common case. */
export function useTranslate() {
  return useI18n().t;
}

/** Language switcher. Renders as links so it works without JavaScript. */
export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();

  const onChange = useCallback(
    (next: Locale) => {
      if (next !== locale) setLocale(next);
    },
    [locale, setLocale],
  );

  return (
    <div className="locale-switcher" role="group" aria-label="Sprache">
      {(Object.keys(LOCALE_META) as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          className={code === locale ? "active" : ""}
          aria-current={code === locale ? "true" : undefined}
          onClick={() => onChange(code)}
        >
          {LOCALE_META[code].label}
        </button>
      ))}
    </div>
  );
}
