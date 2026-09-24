/**
 * The bridge between the settings an admin edits and the CSS the site renders.
 *
 * Settings come back as a flat map of keys like "color.brand". This turns them
 * into the custom properties the design system already references, so changing
 * a value in the dashboard restyles the whole product — no component knows a
 * hex code, which is exactly what makes that possible.
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

/** Maps a settings key to the custom property the stylesheet reads. */
const TOKEN_MAP: Record<string, string[]> = {
  "color.brand": ["--brand-red", "--red-500"],
  /**
   * Deliberately not mapped to --danger. The foundations frame is explicit
   * that errors use their own red and never the brand red, so an admin
   * retheming the brand must not turn every failure message into something
   * that reads as a call to action.
   */
  "color.brandHover": ["--red-600"],
  "color.ink": ["--neutral-900"],
  "color.accent": ["--brand-yellow", "--yellow-500"],
  "color.pageBackground": ["--neutral-50", "--surface-page"],
  "color.success": ["--success"],
  "color.warning": ["--warning"],
};

/**
 * Builds the CSS that overrides the defaults.
 *
 * Only values that differ from the default are emitted, so an untouched theme
 * ships no extra bytes and the stylesheet's own defaults stay authoritative.
 */
export function themeToCss(theme: SiteTheme["theme"]): string {
  const declarations: string[] = [];

  for (const [key, properties] of Object.entries(TOKEN_MAP)) {
    const value = theme[key];

    if (!value || value === DEFAULT_THEME.theme[key]) continue;

    for (const property of properties) {
      declarations.push(`${property}:${value}`);
    }
  }

  const radius = theme["radius.base"];
  if (radius && radius !== DEFAULT_THEME.theme["radius.base"]) {
    const base = Number.parseInt(radius, 10);

    if (Number.isFinite(base) && base >= 0 && base <= 32) {
      // The scale moves together, so one control restyles every corner.
      declarations.push(`--radius-sm:${Math.max(2, base - 4)}px`);
      declarations.push(`--radius-md:${base}px`);
      declarations.push(`--radius-lg:${base + 4}px`);
      declarations.push(`--radius-xl:${base + 10}px`);
    }
  }

  const body = theme["font.body"];
  const display = theme["font.display"];

  if (body && body !== DEFAULT_THEME.theme["font.body"]) {
    declarations.push(`--font-sans:"${cssSafe(body)}",system-ui,sans-serif`);
  }

  if (display && display !== DEFAULT_THEME.theme["font.display"]) {
    declarations.push(`--font-display:"${cssSafe(display)}",system-ui,sans-serif`);
  }

  return declarations.length > 0 ? `:root{${declarations.join(";")}}` : "";
}

/**
 * A font family arrives from a text field an admin controls, and is
 * interpolated into a stylesheet. Anything that could close the declaration or
 * open a new rule is stripped.
 */
function cssSafe(value: string): string {
  return value.replace(/[^\w\s-]/g, "").slice(0, 60);
}

/** Google Fonts URL for whichever families the theme names. */
export function fontHref(theme: SiteTheme["theme"], isRtl: boolean): string {
  if (isRtl) {
    return "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap";
  }

  const families = [
    theme["font.display"] ?? DEFAULT_THEME.theme["font.display"]!,
    theme["font.body"] ?? DEFAULT_THEME.theme["font.body"]!,
  ]
    .map((family) => `family=${encodeURIComponent(cssSafe(family)).replace(/%20/g, "+")}:wght@400;500;600;700;800`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Fetches the theme on the server.
 *
 * Revalidated rather than cached forever: an admin's change should appear
 * within a minute without a redeploy, and a failure must not take the site
 * down, so the defaults stand in.
 */
export async function fetchSiteTheme(): Promise<SiteTheme> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(`${base}/api/site/theme`, { next: { revalidate: 60 } });

    if (!response.ok) return DEFAULT_THEME;

    const payload = (await response.json()) as SiteTheme;

    return {
      theme: { ...DEFAULT_THEME.theme, ...payload.theme },
      brand: { ...DEFAULT_THEME.brand, ...payload.brand },
      contact: payload.contact ?? {},
      seo: payload.seo ?? {},
    };
  } catch {
    return DEFAULT_THEME;
  }
}

/** Editable copy for a locale, by section. */
export async function fetchSiteContent(
  locale: string,
  section?: string,
): Promise<Record<string, Record<string, string>>> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const query = new URLSearchParams({ locale, ...(section ? { section } : {}) });

  try {
    const response = await fetch(`${base}/api/site/content?${query}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return {};

    const payload = (await response.json()) as { sections: Record<string, Record<string, string>> };

    return payload.sections ?? {};
  } catch {
    // Copy is decoration relative to the app working; an empty map lets each
    // component fall back to its own default string.
    return {};
  }
}
