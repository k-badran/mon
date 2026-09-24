import { cache } from "react";

import { DEFAULT_THEME, type SiteTheme } from "./defaults";

/**
 * The bridge between the settings an admin edits and the CSS the site renders,
 * and the server-side reads that fetch them.
 *
 * Settings come back as a flat map of keys like "color.brand". This turns them
 * into the custom properties the design system already references, so changing
 * a value in the dashboard restyles the whole product — no component knows a
 * hex code, which is exactly what makes that possible.
 *
 * Server-only: the reads below use React's request-scoped `cache`, so anything
 * client-side takes the defaults from `./defaults` instead.
 */

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

// ── Reporting a dropped read ────────────────────────────────────────────

/**
 * Why the next three blocks exist.
 *
 * Both reads below used to swallow their error and hand back an empty map.
 * With the API stopped, every page still answered 200 — navbar, footer, and
 * nothing in between. No log line, no message on the page, nothing naming the
 * cause. It read as a broken stylesheet and cost hours of looking in the
 * wrong place.
 *
 * So: a dropped read is always reported to the server log, is shown on the
 * page in development, and still never takes production down.
 */

/** One dropped CMS read. */
export interface ContentFailure {
  /** The section asked for, or "all sections" for a whole-locale read. */
  section: string;
  url: string;
  reason: string;
}

interface FailureLog {
  failures: ContentFailure[];
  /** Reads still in flight, so the banner can wait for the page's own. */
  pending: Set<Promise<unknown>>;
}

/**
 * Request-scoped, via React's `cache`: one log per server render pass.
 *
 * A module-level array would be shared by everyone being served at that
 * moment, so one visitor's dropped read would surface on another's page.
 */
const failureLog = cache((): FailureLog => ({ failures: [], pending: new Set() }));

/**
 * `fetch` reports every transport-level problem as the same "fetch failed" and
 * puts the part that identifies it — ECONNREFUSED, ENOTFOUND, a timeout — on
 * the cause. Reporting only the message is what makes a log line useless.
 */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const cause = error.cause;

  return cause instanceof Error ? `${error.message} (${cause.message})` : error.message;
}

function record(section: string, url: string, reason: string): void {
  // Loud, and in every environment. Production staying up is not the same as
  // production having nothing to say.
  console.error(`[site-content] "${section}" could not be loaded from ${url} — ${reason}`);

  failureLog().failures.push({ section, url, reason });
}

/**
 * Reads JSON from the CMS, reporting rather than hiding a failure.
 *
 * Returns null on any failure, so each caller still chooses what to stand in
 * with — the difference being that the choice is now made knowingly.
 */
async function readJson<T>(section: string, url: string, revalidate: number): Promise<T | null> {
  const log = failureLog();

  const request = (async (): Promise<T | null> => {
    try {
      const response = await fetch(url, { next: { revalidate } });

      if (!response.ok) {
        record(section, url, `HTTP ${response.status} ${response.statusText}`.trimEnd());
        return null;
      }

      return (await response.json()) as T;
    } catch (error) {
      record(section, url, describe(error));
      return null;
    }
  })();

  log.pending.add(request);
  // Cleared by a reaction attached before any waiter's, so something awaiting
  // this promise always sees the set shrink rather than spinning on it.
  void request.finally(() => log.pending.delete(request));

  return request;
}

/**
 * Every CMS read this request has dropped, once the reads have finished.
 *
 * The development banner renders as a sibling of the page, so when it runs the
 * page has started its own reads but not finished them. Waiting on whatever is
 * in flight is what lets the banner name the section the page was missing
 * rather than only the layout's own read.
 */
export async function settledContentFailures(): Promise<ContentFailure[]> {
  const log = failureLog();

  // A pass can uncover a read that a deeper component only started once its
  // parent's data arrived. The cap is there so this can never hold a response
  // open indefinitely.
  for (let pass = 0; pass < 10 && log.pending.size > 0; pass += 1) {
    await Promise.allSettled([...log.pending]);
  }

  return log.failures;
}

// ── Reads ───────────────────────────────────────────────────────────────

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

/**
 * Fetches the theme on the server.
 *
 * Revalidated rather than cached forever: an admin's change should appear
 * within a minute without a redeploy, and a failure must not take the site
 * down, so the defaults stand in.
 */
export async function fetchSiteTheme(): Promise<SiteTheme> {
  const url = `${apiBase()}/api/site/theme`;
  const payload = await readJson<SiteTheme>("theme", url, 60);

  if (!payload) return DEFAULT_THEME;

  return {
    theme: { ...DEFAULT_THEME.theme, ...payload.theme },
    brand: { ...DEFAULT_THEME.brand, ...payload.brand },
    contact: payload.contact ?? {},
    seo: payload.seo ?? {},
  };
}

/**
 * Editable copy for a locale, by section.
 *
 * Still resolves to an empty map on failure, so a CMS outage leaves the
 * marketing site standing rather than turning every page into a 500 — but by
 * then the failure has been logged, and in development it is on the screen.
 */
export async function fetchSiteContent(
  locale: string,
  section?: string,
): Promise<Record<string, Record<string, string>>> {
  const query = new URLSearchParams({ locale, ...(section ? { section } : {}) });
  const url = `${apiBase()}/api/site/content?${query}`;

  const payload = await readJson<{ sections: Record<string, Record<string, string>> }>(
    section ?? "all sections",
    url,
    60,
  );

  return payload?.sections ?? {};
}
