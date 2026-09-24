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
    "color.brand": "#D71635",
    "color.brandHover": "#B80F2A",
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
    "brand.name": "UmzugPlus",
    "brand.legalName": "UmzugPlus GmbH",
    "brand.logo": "/images/logo.svg",
    "brand.tagline": "Moving made simpler, faster, and stress-free.",
  },
  contact: {},
  seo: {},
};
