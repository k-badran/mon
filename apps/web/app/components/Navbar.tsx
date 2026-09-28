"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageMenu, ProfileIcon } from "@/app/components/site/ChromeControls";
import { appLink } from "@/app/components/site/appLink";
import { useApi } from "@/lib/api";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Site navigation.
 *
 * Rebuilt from the nav-bar of the new homepage (86:5275 in 86:4671) and the new
 * moving page (125:55 in 106:10195) — the two are the same component, only
 * placed 20px apart vertically (y 43 vs 23). The logo stands on its own; every
 * link and control sits in one light-grey pill (r88): About Us, Calculator,
 * Services, Reviews, FAQ, Contact, then Login with a profile icon, a shopping
 * cart, a black "GET APP" pill and the language as "العربية" + globe.
 *
 * Gone against the previous frame (3:4): the search control, the rule, the
 * pipe-separated DE | EN | AR | TR list and the red "Instant Quote" button.
 * The calculator stays one click away: it is the second link, and the cart.
 *
 * Labels come from the catalogue rather than the CMS: they are interface
 * chrome, and a missing one should fail the build rather than leave the header
 * with a gap in it.
 */

/**
 * The three services, in the order the homepage lists them.
 * Figma has pages for moving and cleaning; clearance follows their pattern.
 */
const SERVICE_LINKS = [
  { path: "/umzug", labelKey: "service.moving" },
  { path: "/entsorgung", labelKey: "service.disposal" },
  { path: "/reinigung", labelKey: "service.cleaning" },
] as const;

/** The frame's order: About Us first, Contact last. */
const NAV_LINKS = [
  { path: "/ueber-uns", labelKey: "nav.about" },
  { path: "/rechner", labelKey: "nav.calculator" },
  { path: "__services__", labelKey: "nav.services" },
  { path: "/kundenstimmen", labelKey: "nav.reviews" },
  { path: "/faq", labelKey: "nav.faq" },
  { path: "/kontakt", labelKey: "nav.contact" },
] as const;

const LINK = "text-body-sm font-semibold whitespace-nowrap text-text-strong hover:text-brand-red";

export default function Navbar({ appUrl }: { appUrl?: string | undefined }) {
  const { user, loading, isStaff, signOut } = useApi();
  const { t, locale, setLocale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const pathname = usePathname();

  const href = (path: string) =>
    path.startsWith("/#") ? `/${locale}${path.slice(1)}` : `/${locale}${path === "/" ? "" : path}`;

  const app = appLink(appUrl, locale);
  const appTarget = app.external ? { target: "_blank", rel: "noopener noreferrer" } : {};

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
    if (!servicesOpen && !menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setServicesOpen(false);
        setMenuOpen(false);
      }
    }

    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-services-menu]")) setServicesOpen(false);
      if (!target?.closest("[data-account-menu]")) setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [servicesOpen, menuOpen]);

  const locales = Object.keys(LOCALE_META) as Locale[];

  return (
    <header className="sticky top-0 z-30 bg-neutral-0">
      {/* 1440 frame: 46px inline, the 65px pill 23px from the top (106:10195). */}
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 py-4 md:px-10 md:py-6 2xl:px-[46px]">
        {/* ── Mark ───────────────────────────────────────────────────── */}
        <Link href={href("/")} className="flex shrink-0 items-center">
          <img
            src="/images/brand/logo.png"
            alt={t("brand.name")}
            width={86}
            height={47}
            className="h-10 w-auto md:h-[47px]"
          />
        </Link>

        {/* ── The pill: links + controls ─────────────────────────────── */}
        <div className="flex min-w-0 items-center gap-12 rounded-full border border-neutral-100 bg-neutral-100 px-4 py-2 md:px-6 md:py-3">
          <nav className="hidden items-center gap-6 xl:flex" aria-label={t("nav.services")}>
            {NAV_LINKS.map((link) =>
              link.path === "__services__" ? (
                <div key={link.path} className="relative" data-services-menu>
                  <button
                    type="button"
                    aria-expanded={servicesOpen}
                    aria-haspopup="menu"
                    onClick={() => setServicesOpen((open) => !open)}
                    className={`flex items-center gap-1 ${LINK}`}
                  >
                    {t(link.labelKey)}
                    <Caret open={servicesOpen} />
                  </button>

                  {servicesOpen ? (
                    <div
                      role="menu"
                      className="absolute start-0 z-40 mt-5 grid w-56 gap-1 rounded-xl border border-border-subtle bg-neutral-0 p-2 shadow-lg"
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
                <Link key={link.path} href={href(link.path)} className={LINK}>
                  {t(link.labelKey)}
                </Link>
              ),
            )}
          </nav>

          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            {loading ? (
              <span aria-hidden="true" className="hidden h-[18px] w-[57px] rounded bg-neutral-200 lg:block" />
            ) : user ? (
              <div className="relative" data-account-menu>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-full bg-brand-red text-body-sm font-bold text-white"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  aria-label={t("nav.profile")}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {(user.email || "?").charAt(0).toUpperCase()}
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute end-0 z-40 mt-3 grid w-56 gap-1 rounded-xl border border-border-subtle bg-neutral-0 p-2 shadow-lg"
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
              <Link href={href("/login")} className={`hidden items-center gap-[3px] lg:flex ${LINK}`}>
                <ProfileIcon />
                {t("nav.login")}
              </Link>
            )}

            {/**
             * The frame's shopping cart. There is no basket in this product —
             * a quote is built in the calculator — so the cart opens that, and
             * says so to assistive technology.
             */}
            <Link
              href={href("/rechner")}
              aria-label={t("nav.cart")}
              title={t("nav.cart")}
              className="hidden text-text-strong hover:text-brand-red sm:block"
            >
              <Cart />
            </Link>

            <a
              href={app.href}
              {...appTarget}
              className="hidden items-center rounded-full bg-neutral-900 px-6 py-2.5 text-body leading-[21px] whitespace-nowrap text-white uppercase transition-colors hover:bg-brand-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow sm:inline-flex"
            >
              {t("nav.getApp")}
            </a>

            {/* Below lg the drawer carries the full language list. */}
            <div className="hidden lg:block">
              <LanguageMenu />
            </div>

            {/* Below the link row's breakpoint the drawer carries everything. */}
            <button
              type="button"
              className="grid size-9 place-items-center rounded-full text-text-strong hover:bg-neutral-200 xl:hidden"
              aria-expanded={drawerOpen}
              aria-controls="site-nav-drawer"
              aria-label={t(drawerOpen ? "nav.closeMenu" : "nav.openMenu")}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <Bars />
            </button>
          </div>
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
                className="mt-4 flex items-center justify-center gap-2 rounded-full border border-border-default px-4 py-3 text-body-lg font-semibold text-text-default"
              >
                <ProfileIcon />
                {t("nav.login")}
              </Link>
            ) : null}

            <a
              href={app.href}
              {...appTarget}
              className="mt-2 rounded-full bg-neutral-900 px-4 py-3 text-center text-body text-white uppercase"
            >
              {t("nav.getApp")}
            </a>

            {/* The header hides the language menu below its own breakpoint. */}
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

/** vuesax/linear/shopping-cart, 18px, 1.4px stroke. */
function Cart() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 2h1.74c1.08 0 1.93.93 1.84 2l-.83 9.96a2.8 2.8 0 0 0 2.79 3.03h10.65c1.44 0 2.7-1.18 2.81-2.61l.54-7.5c.12-1.66-1.14-3.01-2.81-3.01H5.82" />
      <path d="M16.25 22a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM8.25 22a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5ZM9 8h12" />
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
