import { isSafeImageSrc } from "@mon/core";

import shippedImages from "./public-images.json";

/**
 * The shape of the site's theme, and the values it falls back to.
 *
 * Kept apart from `theme.ts` because the client-side `useSiteSettings` hook
 * needs these too, and `theme.ts` now reaches for server-only React and Next
 * APIs. Importing this leaf instead keeps the fetch layer — and the
 * request-scoped failure log it writes to — out of the browser bundle.
 */

export interface SiteTheme {
  theme: Record<string, string>;
  brand: Record<string, string>;
  contact: Record<string, string>;
  seo: Record<string, string>;
}

/** Falls back to the brand defaults, so a failed fetch never yields an unstyled page. */
export const DEFAULT_THEME: SiteTheme = {
  theme: {
    "color.brand": "#E62039",
    "color.brandHover": "#C4162E",
    "color.ink": "#121214",
    "color.accent": "#FFCB08",
    "color.pageBackground": "#F8F9FA",
    "color.success": "#10B981",
    "color.warning": "#F59E0B",
    "radius.base": "12",
    "font.display": "Outfit",
    "font.body": "DM Sans",
  },
  brand: {
    "brand.name": "m.on",
    "brand.legalName": "m.on GmbH",
    "brand.logo": "/images/brand/logo.png",
    "brand.tagline": "Moving made simpler, faster, and stress-free.",
  },
  contact: {},
  seo: {},
};

/** The logo the chrome is drawn around, used when the setting is empty or unsafe. */
export const DEFAULT_LOGO = "/images/brand/logo.png";

/**
 * The brand logo to render.
 *
 * The API only stores an `/images/...` path or an https URL; the value is
 * checked again because it goes straight into an `<img src>`, and a local
 * path whose file no longer ships falls back rather than showing a broken logo.
 */
export function logoSrc(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || !isSafeImageSrc(trimmed)) return DEFAULT_LOGO;
  if (trimmed.startsWith("/images/") && !(shippedImages as string[]).includes(trimmed)) return DEFAULT_LOGO;
  return trimmed;
}
