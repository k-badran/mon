"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useApi } from "@/lib/api";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";

/**
 * Site navigation.
 *
 * Rebuilt from the M.io "nav-bar" frame, which differs from what was here in
 * every part: the mark is a red badge beside a two-line wordmark, the links are
 * Calculator / Services / Reviews / About Us / FAQ / Contact, the language
 * picker is pipe-separated codes with the active one in red, and the right-hand
 * side is a search control, a rule, a plain "Login" link and a red
 * "Instant Quote" button — not the two buttons that were here.
 *
 * Labels come from the catalogue rather than the CMS: they are interface
 * chrome, and a missing one should fail the build rather than leave the header
 * with a gap in it.
 */

/** 80px tall, 1280 content column, 80px inline padding. */
/**
 * The three services, in the order the homepage and the footer list them.
 * Figma has pages for moving and cleaning; clearance follows their pattern.
 */
const SERVICE_LINKS = [
  { path: "/umzug", labelKey: "service.moving" },
  { path: "/entsorgung", labelKey: "service.disposal" },
  { path: "/reinigung", labelKey: "service.cleaning" },
] as const;

// The order of 3:4's nav-links frame: About Us leads.
const NAV_LINKS = [
  { path: "/ueber-uns", labelKey: "nav.about" },
  { path: "/rechner", labelKey: "nav.calculator" },
  { path: "__services__", labelKey: "nav.services" },
  { path: "/kundenstimmen", labelKey: "nav.reviews" },
  { path: "/faq", labelKey: "nav.faq" },
  { path: "/kontakt", labelKey: "nav.contact" },
] as const;

export default function Navbar() {
  const { user, loading, isStaff, signOut } = useApi();
  const { t, locale, setLocale } = useI18n();
  const { logo } = useSiteSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();

  const href = (path: string) =>
    path.startsWith("/#") ? `/${locale}${path.slice(1)}` : `/${locale}${path === "/" ? "" : path}`;

  // Navigating is the drawer's purpose, so arriving somewhere closes it.
  useEffect(() => {
    setDrawerOpen(false);
    setServicesOpen(false);
  }, [pathname]);

  // A drawer covering the page must be dismissable from the keyboard, and the
  // page behind it must not scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  // A menu that only closes by clicking its own trigger is a trap: every
  // other way out of it — Escape, clicking elsewhere — has to work too.
  useEffect(() => {
    if (!servicesOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setServicesOpen(false);
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-services-menu]")) setServicesOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [servicesOpen]);

  const locales = Object.keys(LOCALE_META) as Locale[];

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-neutral-0">
      <div className="mx-auto flex h-20 w-full max-w-[1440px] items-center justify-between gap-4 px-5 md:px-10 2xl:px-20">
        {/* ── Mark ───────────────────────────────────────────────────── */}
        {/**
         * The brand mark.
         *
         * Twelve of the fourteen page frames place this 86x47 image here; only
         * the homepage and the standalone nav-bar component draw a lettered
         * badge beside a wordmark instead. The image is the actual brand asset,
         * so it is what ships — building from those two frames is what put a
         * placeholder in the header.
         */}
        <Link href={href("/")} className="flex shrink-0 items-center">
          <img
            src={logo}
            alt={t("brand.name")}
            width={86}
            height={47}
            className="h-10 w-auto md:h-12"
          />
        </Link>

        {/* ── Links ──────────────────────────────────────────────────── */}
        <nav className="hidden items-center gap-6 xl:flex" aria-label={t("nav.services")}>
          {NAV_LINKS.map((link) =>
            link.path === "__services__" ? (
              <div key={link.path} className="relative" data-services-menu>
                <button
                  type="button"
                  aria-expanded={servicesOpen}
                  aria-haspopup="menu"
                  onClick={() => setServicesOpen((open) => !open)}
                  className="flex items-center gap-1 text-body-sm font-semibold text-text-strong hover:text-brand-red"
                >
                  {t(link.labelKey)}
                  <Caret open={servicesOpen} />
                </button>

                {servicesOpen ? (
                  <div
                    role="menu"
                    className="absolute start-0 z-40 mt-3 grid w-56 gap-1 rounded-xl border border-border-subtle bg-neutral-0 p-2 shadow-lg"
                  >
                    {SERVICE_LINKS.map((service) => (
                      <Link
                        key={service.path}
                        href={href(service.path)}
                        role="menuitem"
                        className="rounded-md px-3 py-2 text-body-sm font-semibold text-text-default hover:bg-neutral-50 hover:text-brand-red"
                        onClick={() => setServicesOpen(false)}
                      >
                        {t(service.labelKey)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                key={link.path}
                href={href(link.path)}
                className="text-body-sm font-semibold text-text-strong hover:text-brand-red"
              >
                {t(link.labelKey)}
              </Link>
            ),
          )}
        </nav>

        {/* ── Right-hand controls ────────────────────────────────────── */}
        <div className="flex min-w-0 shrink items-center gap-4">
          {/**
           * Pipe-separated language codes, the active one in red — the
           * design's own treatment rather than a segmented control.
           */}
          <div
            className="hidden items-center gap-1 lg:flex"
            role="group"
            aria-label={t("nav.language")}
          >
            {locales.map((code, index) => (
              <span key={code} className="flex items-center gap-1">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-body-sm text-text-muted">
                    |
                  </span>
                ) : null}

                <button
                  type="button"
                  lang={code}
                  aria-current={code === locale ? "true" : undefined}
                  aria-label={LOCALE_META[code].label}
                  onClick={() => setLocale(code)}
                  className={`text-body-sm ${
                    code === locale
                      ? "font-bold text-brand-red"
                      : "font-medium text-text-muted hover:text-text-strong"
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              </span>
            ))}
          </div>

          <Link
            href={href("/faq")}
            aria-label={t("nav.search")}
            className="hidden text-text-strong hover:text-brand-red lg:block"
          >
            <Search />
          </Link>

          <span aria-hidden="true" className="hidden h-6 w-px bg-border-subtle lg:block" />

          {loading ? (
            <span aria-hidden="true" className="hidden h-5 w-16 rounded bg-neutral-100 lg:block" />
          ) : user ? (
            <div className="relative">
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full bg-brand-red text-body-sm font-bold text-white"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {(user.email || "?").charAt(0).toUpperCase()}
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute end-0 z-40 mt-2 grid w-56 gap-1 rounded-xl border border-border-subtle bg-neutral-0 p-2 shadow-lg"
                >
                  <Link
                    href={href("/dashboard")}
                    role="menuitem"
                    className="rounded-md px-3 py-2 text-body-sm text-text-default hover:bg-neutral-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.profile")}
                  </Link>
                  <Link
                    href={href("/dashboard/auftraege")}
                    role="menuitem"
                    className="rounded-md px-3 py-2 text-body-sm text-text-default hover:bg-neutral-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t("nav.orders")}
                  </Link>

                  {isStaff ? (
                    <Link
                      href={href("/admin")}
                      role="menuitem"
                      className="rounded-md px-3 py-2 text-body-sm text-text-default hover:bg-neutral-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t("nav.admin")}
                    </Link>
                  ) : null}

                  <button
                    type="button"
                    role="menuitem"
                    className="rounded-md px-3 py-2 text-start text-body-sm text-text-default hover:bg-neutral-50"
                    onClick={() => void signOut()}
                  >
                    {t("nav.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href={href("/login")}
              className="hidden text-body-sm font-semibold text-text-strong hover:text-brand-red lg:block"
            >
              {t("nav.login")}
            </Link>
          )}

          <Link
            href={href("/rechner")}
            className="hidden items-center gap-2 rounded-md bg-brand-red px-5 py-3 text-body-sm font-bold whitespace-nowrap text-white transition-colors hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow md:inline-flex"
          >
            {t("nav.instantQuote")}
            <CalculatorIcon />
          </Link>

          {/* Below the link row's breakpoint the drawer carries everything. */}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-md border border-border-subtle text-text-strong xl:hidden"
            aria-expanded={drawerOpen}
            aria-controls="site-nav-drawer"
            aria-label={t(drawerOpen ? "nav.closeMenu" : "nav.openMenu")}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            <Bars />
          </button>
        </div>
      </div>

      {drawerOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-neutral-900/45"
            aria-label={t("nav.closeMenu")}
            onClick={() => setDrawerOpen(false)}
          />

          <nav
            id="site-nav-drawer"
            aria-label={t("nav.services")}
            className="fixed inset-y-0 end-0 z-41 flex w-[min(320px,86vw)] flex-col gap-1 overflow-y-auto border-s border-border-subtle bg-neutral-0 p-4 pt-24 shadow-xl"
          >
            {NAV_LINKS.map((link) =>
              link.path === "__services__" ? (
                <div key={link.path} className="grid gap-1">
                  <p className="px-4 pt-3 text-caption font-bold tracking-[0.5px] text-text-muted uppercase">
                    {t(link.labelKey)}
                  </p>

                  {SERVICE_LINKS.map((service) => (
                    <Link
                      key={service.path}
                      href={href(service.path)}
                      className="rounded-md px-4 py-3 text-body-lg font-semibold text-text-default hover:bg-neutral-50 hover:text-text-strong"
                    >
                      {t(service.labelKey)}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={link.path}
                  href={href(link.path)}
                  className="rounded-md px-4 py-3 text-body-lg font-semibold text-text-default hover:bg-neutral-50 hover:text-text-strong"
                >
                  {t(link.labelKey)}
                </Link>
              ),
            )}

            {!user ? (
              <Link
                href={href("/login")}
                className="mt-4 rounded-md border border-border-default px-4 py-3 text-center text-body-lg font-semibold text-text-default"
              >
                {t("nav.login")}
              </Link>
            ) : null}

            <Link
              href={href("/rechner")}
              className="mt-2 rounded-md bg-brand-red px-4 py-3 text-center text-body font-bold text-white"
            >
              {t("nav.instantQuote")}
            </Link>

            {/* The header hides the picker below its own breakpoint. */}
            <div
              className="mt-6 grid grid-cols-2 gap-2 border-t border-border-subtle pt-6 lg:hidden"
              role="group"
              aria-label={t("nav.language")}
            >
              {locales.map((code) => (
                <button
                  key={code}
                  type="button"
                  lang={code}
                  aria-current={code === locale ? "true" : undefined}
                  onClick={() => setLocale(code)}
                  className={`rounded-md border px-3 py-3 text-body-sm font-semibold ${
                    code === locale
                      ? "border-brand-red text-brand-red"
                      : "border-border-subtle text-text-default"
                  }`}
                >
                  {LOCALE_META[code].label}
                </button>
              ))}
            </div>
          </nav>
        </>
      ) : null}
    </header>
  );
}

function Caret({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={open ? "rotate-180 transition-transform" : "transition-transform"}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Search() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4" />
    </svg>
  );
}

function Bars() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
