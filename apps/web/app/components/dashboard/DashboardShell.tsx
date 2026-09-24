"use client";

import type { Permission } from "@umzugplus/core";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useApi } from "@/lib/api";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { telHref, useSiteSettings } from "@/lib/site/useSiteSettings";
import {
  IconAnalytics,
  IconBell,
  IconDashboard,
  IconDispatch,
  IconDocuments,
  IconLeads,
  IconLogs,
  IconMessages,
  IconOperations,
  IconOrders,
  IconPartners,
  IconPayment,
  IconPhone,
  IconPricing,
  IconQuotes,
  IconReviews,
  IconSearch,
  IconSettings,
  IconSignOut,
  IconSite,
  IconUsers,
} from "./Icons";

/**
 * The dashboard frame: sidebar, header, and a last-resort redirect.
 *
 * ## Three layers, and which one is the boundary
 *
 * `middleware.ts` guards /admin and /dashboard at the edge, before a page is
 * rendered, by checking the signed session-hint cookie. That is what stops the
 * admin interface from flashing on screen for someone who typed the URL — the
 * job the `useEffect` below used to fail at, because it runs only after the
 * page has already been sent and painted.
 *
 * The `useEffect` stays as a last line of defence for the case the edge cannot
 * cover: a session that ends or is demoted while the tab is already open.
 *
 * Neither is the authorisation boundary. The API is. Every endpoint behind
 * these screens re-reads the caller's role from the database and checks the
 * capability itself, so a visitor who defeats both layers above reaches a page
 * that will not load any data. Hiding a control is never securing it.
 */

interface NavItem {
  href: string;
  labelKey: string;
  Icon: (props: { className?: string }) => ReactNode;
  badge?: number | undefined;
  /**
   * The section is in the design but has no backend yet. Rendered dimmed and
   * non-interactive, so the navigation matches the design without a click
   * landing on a 404.
   */
  planned?: boolean | undefined;
  /**
   * The capability this section needs. Without it the entry is not rendered at
   * all — not dimmed — because a disabled Pricing link still tells a
   * customer-service agent that pricing is a thing they are being kept out of,
   * and invites them to go looking for the URL.
   *
   * These mirror the prefixes in `middleware.ts`, so an entry someone can see
   * is an entry the edge will let them open. They are a second copy of the
   * same intent, not the enforcement: the endpoint each screen calls checks
   * the capability again for itself.
   */
  permission?: Permission | undefined;
}

const CUSTOMER_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "dash.overview", Icon: IconDashboard },
  { href: "/dashboard/auftraege", labelKey: "nav.orders", Icon: IconOrders },
  { href: "/dashboard/angebote", labelKey: "dash.savedQuotes", Icon: IconQuotes, planned: true },
  { href: "/dashboard/dokumente", labelKey: "dash.documents", Icon: IconDocuments, planned: true },
  { href: "/dashboard/nachrichten", labelKey: "dash.messages", Icon: IconMessages },
  { href: "/dashboard/bewertungen", labelKey: "nav.reviews", Icon: IconReviews },
  { href: "/dashboard/zahlungen", labelKey: "dash.payment", Icon: IconPayment, planned: true },
  { href: "/dashboard/einstellungen", labelKey: "dash.settings", Icon: IconSettings, planned: true },
];

/**
 * Every entry declares what it needs. A customer-service agent holds
 * `orders.read`, `quotes.read` and `reviews.read`, so they get the overview,
 * leads, orders and quality — and never learn that Pricing, Payments or
 * Settings exist.
 */
const STAFF_NAV: NavItem[] = [
  {
    href: "/admin",
    labelKey: "admin.nav.dashboard",
    Icon: IconDashboard,
    // The overview is the landing page for anyone on the staff side, so it
    // asks for the least any staff role has.
    permission: "orders.read",
  },
  {
    href: "/admin/nutzer",
    labelKey: "admin.nav.users",
    Icon: IconUsers,
    permission: "users.read",
  },
  {
    href: "/admin/leads",
    labelKey: "admin.nav.leads",
    Icon: IconLeads,
    planned: true,
    // A lead is a quote that has not been accepted yet.
    permission: "quotes.read",
  },
  {
    href: "/admin/auftraege",
    labelKey: "admin.nav.orders",
    Icon: IconOrders,
    permission: "orders.read",
  },
  {
    href: "/admin/dispatch",
    labelKey: "admin.nav.dispatch",
    Icon: IconDispatch,
    planned: true,
    // Dispatch exists to put a crew on a job; reading the board without being
    // able to do that is not a screen anyone needs.
    permission: "orders.assign",
  },
  {
    href: "/admin/preise",
    labelKey: "admin.nav.pricing",
    Icon: IconPricing,
    planned: true,
    permission: "pricing.read",
  },
  {
    href: "/admin/zahlungen",
    labelKey: "admin.nav.payments",
    Icon: IconPayment,
    planned: true,
    permission: "payments.read",
  },
  {
    href: "/admin/betrieb",
    labelKey: "admin.nav.operations",
    Icon: IconOperations,
    planned: true,
    // Operations is the capacity calendar — what the company can take on.
    permission: "availability.write",
  },
  {
    href: "/admin/partner",
    labelKey: "admin.nav.partners",
    Icon: IconPartners,
    planned: true,
    // Partners are the subcontractors work gets handed to, so the section
    // belongs to whoever may hand it over.
    permission: "orders.assign",
  },
  {
    href: "/admin/qualitaet",
    labelKey: "admin.nav.quality",
    Icon: IconReviews,
    planned: true,
    // Read, not moderate: complaints handling is customer service's job, and
    // they need to see what was said before they can answer it.
    permission: "reviews.read",
  },
  {
    href: "/admin/analytics",
    labelKey: "admin.nav.analytics",
    Icon: IconAnalytics,
    planned: true,
    // Reporting is mostly revenue, so it is gated with the money it shows
    // rather than with a capability of its own.
    permission: "payments.read",
  },
  {
    href: "/admin/logs",
    labelKey: "admin.nav.logs",
    Icon: IconLogs,
    permission: "audit.read",
  },
  {
    href: "/admin/website",
    labelKey: "site.title",
    Icon: IconSite,
    permission: "content.write",
  },
  {
    href: "/admin/einstellungen",
    labelKey: "admin.nav.settings",
    Icon: IconSettings,
    planned: true,
    permission: "settings.write",
  },
];

export function DashboardShell({
  title,
  children,
  variant = "customer",
  unreadCount,
}: {
  title: string;
  children: ReactNode;
  variant?: "customer" | "staff";
  unreadCount?: number;
}) {
  const { user, loading, isStaff, can, signOut } = useApi();
  const { t, locale, setLocale } = useI18n();
  const site = useSiteSettings();
  const pathname = usePathname();
  const router = useRouter();

  // Not the guard — see the note at the top of this file. This catches the
  // session ending or being demoted in a tab that is already open, which the
  // edge never sees because no navigation happens.
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (variant === "staff" && !isStaff) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [loading, user, isStaff, variant, router, locale, pathname]);

  // Customer entries carry no permission — a customer holds none by design —
  // so the filter passes them through untouched.
  const items = (variant === "staff" ? STAFF_NAV : CUSTOMER_NAV).filter(
    (item) => !item.permission || can(item.permission),
  );
  const href = (path: string) => `/${locale}${path}`;

  // While the session is resolving, render the frame with placeholders rather
  // than nothing — the layout does not jump when the data lands.
  const initial = (user?.fullName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="dash">
      <aside className="dash-sidebar">
        <Link href={href("/")} className="dash-brand">
          {/* The logo is a brand setting, so swapping it is a dashboard edit. */}
          <img src={site.logo} alt={site.brandName} />
        </Link>

        <nav className="dash-nav" aria-label={t("dash.mainNavigation")}>
          {items.map(({ href: path, labelKey, Icon, planned }) => {
            const target = href(path);
            // Exact match for the index, prefix match for the rest, so a
            // detail page still highlights its section.
            const isCurrent =
              path === "/dashboard" || path === "/admin"
                ? pathname === target
                : pathname.startsWith(target);

            if (planned) {
              return (
                <span key={path} className="nav-planned" title={t("dash.comingSoon")}>
                  <Icon className="nav-icon" />
                  <span className="nav-label">{t(labelKey)}</span>
                </span>
              );
            }

            return (
              <Link key={path} href={target} aria-current={isCurrent ? "page" : undefined}>
                <Icon className="nav-icon" />
                <span className="nav-label">{t(labelKey)}</span>
                {labelKey === "dash.messages" && unreadCount ? (
                  <span className="nav-badge">{unreadCount}</span>
                ) : null}
              </Link>
            );
          })}

          {/* Staff see a link across to the other side rather than a second app. */}
          {isStaff && variant === "customer" && (
            <Link href={href("/admin")} style={{ marginBlockStart: "var(--space-4)" }}>
              <IconSite className="nav-icon" />
              <span className="nav-label">{t("nav.admin")}</span>
            </Link>
          )}
          {variant === "staff" && (
            <Link href={href("/dashboard")} style={{ marginBlockStart: "var(--space-4)" }}>
              <IconDashboard className="nav-icon" />
              <span className="nav-label">{t("dash.overview")}</span>
            </Link>
          )}
        </nav>

        <div className="dash-user">
          <span className="avatar" aria-hidden="true">{initial}</span>
          <div className="who">
            <div className="name">{user?.fullName ?? "—"}</div>
            <div className="mail">{user?.email ?? ""}</div>
          </div>
          <button
            type="button"
            className="signout"
            onClick={() => void signOut().then(() => router.push(`/${locale}`))}
            aria-label={t("nav.logout")}
            title={t("nav.logout")}
          >
            <IconSignOut />
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <h1>{title}</h1>

          <div className="dash-search">
            <IconSearch className="search-icon" />
            <label htmlFor="dash-search" className="sr-only">{t("common.search")}</label>
            <input id="dash-search" type="search" placeholder={t("dash.searchPlaceholder")} />
          </div>

          {/*
            The number is Latin digits inside what may be an RTL page. Without
            the isolation the bidi algorithm reorders it and "+49 30 123456"
            renders as "123456 30 49+".
          */}
          {site.phone && (
            <a className="dash-phone" href={telHref(site.phone)}>
              <IconPhone />
              <bdi dir="ltr">{site.phone}</bdi>
            </a>
          )}

          {/* Language is switchable from inside the dashboard, not only from
              the public site's header. */}
          <div className="locale-switcher" role="group" aria-label={t("nav.language")}>
            {(Object.keys(LOCALE_META) as Locale[]).map((code) => (
              <button
                key={code}
                type="button"
                lang={code}
                className={code === locale ? "active" : ""}
                aria-current={code === locale ? "true" : undefined}
                onClick={() => setLocale(code)}
                title={LOCALE_META[code].label}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <button type="button" className="dash-bell" aria-label={t("dash.notifications")}>
            <IconBell />
            {unreadCount ? <span className="count">{unreadCount}</span> : null}
          </button>
        </header>

        <main className="dash-body">{children}</main>
      </div>
    </div>
  );
}
