import Link from "next/link";
import type { ReactNode } from "react";

import { AccountLink, LanguageMenu } from "@/app/components/site/ChromeControls";
import { appLink } from "@/app/components/site/appLink";
import { MESSAGES } from "@/lib/i18n/catalogue";
import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOGO } from "@/lib/site/defaults";

type Copy = Record<string, string>;

/**
 * Site footer.
 *
 * Built from "Footer Desktop - Quiet" (101:76) in its inverted form — the
 * "Variant A Desktop Frame" (101:128) the new homepage and moving page end
 * with (106:10440 on the moving page is the same instance). One 64px row of
 * logo · the header's links + Login · language + a white "GET APP" pill, a
 * hairline, then © · three social icons · Privacy / Terms / Imprint.
 *
 * It replaces the four-column ink footer (services, company, contact) of the
 * old frames; those rows stay in the CMS but nothing reads them any more.
 *
 * Link labels come from the catalogue, like the header they repeat. The
 * copyright line, legal labels and social URLs are CMS rows, so an admin can
 * change them, and a social icon without a URL is left out rather than
 * pointing at "#".
 */

const SHELL = "mx-auto w-full max-w-[1440px] px-5 md:px-10 2xl:px-20";

/** The header's links, in the frame's order ("Middle Links" 101:132). */
const LINKS = [
  { path: "/ueber-uns", key: "nav.about" },
  { path: "/rechner", key: "nav.calculator" },
  // No services overview page exists; the homepage's services row is it.
  { path: "/#services", key: "nav.services" },
  { path: "/kundenstimmen", key: "nav.reviews" },
  { path: "/faq", key: "nav.faq" },
  { path: "/kontakt", key: "nav.contact" },
] as const;

/**
 * Pages the header does not carry.
 *
 * The quiet footer only repeats the header, which left these four pages —
 * linked from the old four-column footer's "Company" column — with no way in
 * from anywhere on the site. They sit on their own quieter row under the main
 * one, so the frame's main row stays exactly as drawn.
 */
const MORE = [
  { path: "/so-funktioniert", key: "nav.howItWorks" },
  { path: "/fuer-unternehmen", key: "nav.business" },
  { path: "/partner", key: "nav.partner" },
  { path: "/ratgeber", key: "nav.guide" },
] as const;

/**
 * The frame's three legal links, plus Cookies.
 *
 * The new frame drops the old footer's "Cookie Policy", but /cookies is where
 * consent can be changed after the banner is gone, and a consent choice that
 * cannot be revisited is not valid consent. So it stays, last and in the same
 * quiet style.
 */
const LEGAL = [
  { path: "/datenschutz", slot: "footer.legal.privacy" },
  { path: "/agb", slot: "footer.legal.terms" },
  { path: "/impressum", slot: "footer.legal.imprint" },
  { path: "/cookies", slot: "footer.legal.cookies" },
] as const;

const LINK =
  "inline-flex items-center gap-1.5 px-2 py-3 text-body-sm font-semibold whitespace-nowrap text-white hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow rounded-md";

export function Footer({
  copy,
  locale,
  brandName,
  appUrl,
  logo = DEFAULT_LOGO,
}: {
  copy: Copy;
  locale: Locale;
  /** `brand.name` from the settings — the frame's "© 2026 m.on." */
  brandName?: string | undefined;
  /** `brand.appUrl` from the settings; see appLink for the fallback. */
  appUrl?: string | undefined;
  /** `brand.logo` from the settings, already checked by `logoSrc`. */
  logo?: string;
}) {
  const href = (path: string) =>
    path.startsWith("/#") ? `/${locale}${path.slice(1)}` : `/${locale}${path}`;
  const app = appLink(appUrl, locale);
  const brand = brandName || "m.on";
  const socials = SOCIALS.filter((social) => Boolean(copy[`footer.social.${social.key}`]));

  return (
    <footer className="rounded-t-xl bg-neutral-900 text-white">
      <div className={`${SHELL} grid gap-4 pt-6 pb-4`}>
        {/* ── Main row ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <Link href={href("")} className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-brand-yellow">
            <img
              src={logo}
              alt={brand}
              width={86}
              height={47}
              className="h-[47px] w-auto"
            />
          </Link>

          {/* Last on small screens, where it wraps onto its own lines. */}
          <nav
            aria-label={MESSAGES["footer.navLabel"][locale]}
            className="order-last flex w-full flex-wrap items-center gap-x-4 xl:order-none xl:w-auto"
          >
            <ul className="contents">
              {LINKS.map((link) => (
                <li key={link.path}>
                  <Link href={href(link.path)} className={LINK}>
                    {MESSAGES[link.key][locale]}
                  </Link>
                </li>
              ))}
              <li>
                <AccountLink className={LINK} />
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-5">
            <LanguageMenu tone="dark" placement="above" />

            <a
              href={app.href}
              {...(app.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-flex items-center rounded-full bg-neutral-0 px-6 py-2.5 text-body leading-[21px] font-medium whitespace-nowrap text-neutral-900 uppercase transition-colors hover:bg-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
            >
              {MESSAGES["nav.getApp"][locale]}
            </a>
          </div>
        </div>

        <ul className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {MORE.map((link) => (
            <li key={link.path}>
              <Link
                href={href(link.path)}
                className="inline-flex py-1 text-caption font-medium text-white/70 hover:text-brand-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow rounded-md"
              >
                {MESSAGES[link.key][locale]}
              </Link>
            </li>
          ))}
        </ul>

        <hr className="border-0 border-t border-white/15" />

        {/* ── Legal line ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-caption text-white/60">
            © {new Date().getFullYear()} {brand}. {copy["footer.rights"]}
          </p>

          {socials.length > 0 ? (
            <ul className="flex items-center gap-3">
              {socials.map((social) => (
                <li key={social.key}>
                  <a
                    href={copy[`footer.social.${social.key}`]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="grid size-8 place-items-center rounded-full bg-white/8 text-neutral-400 transition-colors hover:bg-brand-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL.filter((item) => Boolean(copy[item.slot])).map((item) => (
              <li key={item.path}>
                <Link className="text-caption text-white/60 hover:text-white" href={href(item.path)}>
                  {copy[item.slot]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* ── Social icons: the frame's outlined 16px glyphs, 1.5–2px stroke ──── */

const SOCIALS: { key: string; label: string; icon: ReactNode }[] = [
  {
    key: "instagram",
    label: "Instagram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37ZM17.5 6.5h.01" />
      </svg>
    ),
  },
  {
    key: "x",
    label: "X (Twitter)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3Z" />
      </svg>
    ),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6ZM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];
