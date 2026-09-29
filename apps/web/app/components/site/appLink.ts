import type { Locale } from "@/lib/i18n/config";

/**
 * Where "GET APP" points, for the nav bar and the footer alike.
 *
 * There is no app-store listing anywhere in the settings or the content, so
 * until `brand.appUrl` is filled in the dashboard the button falls back to the
 * online calculator — the web version of what the app is for, and where the
 * "Instant Quote" button this one replaced used to go.
 *
 * A plain module rather than part of either component: the footer is a server
 * component and the nav bar a client one, and a helper exported from a client
 * file cannot be called on the server.
 */
export const APP_FALLBACK_PATH = "/rechner";

export interface AppLink {
  href: string;
  /** An app-store link leaves the site, so it opens in a new tab. */
  external: boolean;
}

/** Absolute URLs as given; site paths get the locale prefix. */
export function appLink(appUrl: string | undefined, locale: Locale): AppLink {
  const url = appUrl?.trim();

  if (!url) return { href: `/${locale}${APP_FALLBACK_PATH}`, external: false };
  if (url.startsWith("/")) return { href: `/${locale}${url}`, external: false };

  return { href: url, external: /^https?:\/\//.test(url) };
}
