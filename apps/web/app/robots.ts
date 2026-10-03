import type { MetadataRoute } from "next";

/**
 * Served at /robots.txt.
 *
 * Without it that path fell through to the `[locale]` route, which treated
 * "robots.txt" as a language and made two API calls per crawler visit — and
 * answered 200 with the homepage, so a crawler was told it had rules when it
 * had none.
 *
 * The signed-in areas are disallowed because there is nothing there for a
 * crawler: every page behind them requires a session, so indexing attempts only
 * produce redirects to /login.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/konto/", "/*/dashboard/", "/*/admin/"],
    },
    // No `sitemap:` line on purpose — the site has no sitemap route yet, and
    // pointing a crawler at a 404 is worse than saying nothing.
  };
}
