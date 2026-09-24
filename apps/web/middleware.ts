import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { can, isRole, isStaffRole, type Permission, type Role } from "@umzugplus/core";

import { DEFAULT_LOCALE, isLocale, negotiateLocale } from "./lib/i18n/config";

const LOCALE_COOKIE = "umzugplus_locale";
const HINT_COOKIE = "umzugplus_sh";

/**
 * Locale routing and route protection.
 *
 * ## Why protection lives here
 *
 * The admin area used to be guarded by a `useEffect` inside the dashboard
 * shell that redirected when the signed-in user was not staff. That runs in
 * the browser, after the page has been sent and rendered — so the admin
 * interface was briefly visible to anyone who typed the URL, and the redirect
 * was one devtools breakpoint away from never happening.
 *
 * Middleware runs before anything is rendered. It can only see cookies, which
 * is why the API now issues a short-lived signed session hint alongside the
 * httpOnly refresh cookie.
 *
 * ## What this is and is not
 *
 * This decides *where to send someone*. It is not the authorisation boundary:
 * every endpoint behind these screens re-reads the caller's role from the
 * database and checks the capability itself. A forged or stale hint gets a
 * visitor to a page that will then refuse to load any data.
 *
 * That layering is deliberate. A guard that runs early gives the right
 * experience; a guard that runs at the data gives the right answer.
 */

const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET ?? "");
const issuer = process.env.JWT_ISSUER ?? "umzugplus-api";

/** Route prefixes that require a signed-in staff member with a capability. */
const PROTECTED: Array<{ prefix: string; permission: Permission }> = [
  { prefix: "/admin/nutzer", permission: "users.read" },
  { prefix: "/admin/preise", permission: "pricing.read" },
  { prefix: "/admin/abrechnung", permission: "payments.read" },
  { prefix: "/admin/website", permission: "content.write" },
  { prefix: "/admin/einstellungen", permission: "settings.write" },
  // The rest of the admin area needs staff standing and at least the ability
  // to see the work. More specific prefixes above win, so this is last.
  { prefix: "/admin", permission: "orders.read" },
];

/** Routes that need a session but no particular capability. */
const SIGNED_IN_ONLY = ["/dashboard", "/konto"];

async function readHint(request: NextRequest): Promise<Role | null> {
  const token = request.cookies.get(HINT_COOKIE)?.value;
  if (!token || secret.length === 0) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer,
      audience: `${issuer}:hint`,
    });

    return isRole(payload.role) ? payload.role : null;
  } catch {
    // Expired or tampered with. Treated as signed out rather than as an
    // error: the browser will refresh the session and come back.
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and API calls carry no locale and need no guard.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.[a-z0-9]+$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  const first = pathname.split("/").filter(Boolean)[0];

  // ── Without a locale prefix, add one and come back ─────────────────
  if (!isLocale(first)) {
    const remembered = request.cookies.get(LOCALE_COOKIE)?.value;

    const locale = isLocale(remembered)
      ? remembered
      : negotiateLocale(request.headers.get("accept-language")) || DEFAULT_LOCALE;

    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = first;
  const route = pathname.slice(`/${locale}`.length) || "/";

  const protectedRoute = PROTECTED.find((entry) => route.startsWith(entry.prefix));
  const needsSession = protectedRoute || SIGNED_IN_ONLY.some((p) => route.startsWith(p));

  if (needsSession) {
    const role = await readHint(request);

    if (!role) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      // So the customer lands where they were going once signed in.
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (protectedRoute) {
      // A customer who reaches an admin URL is sent to their own dashboard
      // rather than to a refusal: they are signed in, just not for this.
      if (!isStaffRole(role) || !can(role, protectedRoute.permission)) {
        const url = request.nextUrl.clone();
        url.pathname = isStaffRole(role) ? `/${locale}/admin` : `/${locale}/dashboard`;
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  const response = NextResponse.next();

  // Remember the language so a later visit to "/" lands in the same one.
  response.cookies.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
