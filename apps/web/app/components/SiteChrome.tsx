"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import ChatWidget from "./ChatWidget";
import Navbar from "./Navbar";

/**
 * Decides which frame a route gets.
 *
 * Three kinds of page, and they want different chrome:
 *
 *   - **Auth** fills the screen. The split panel *is* the branding, so a site
 *     header above it would compete with it and push it off the fold.
 *   - **Dashboard** brings its own sidebar and header, and a floating chat
 *     bubble would sit on top of the content.
 *   - **Public pages** get the marketing header and the assistant.
 *
 * Done by route prefix rather than by nesting layouts, because the locale
 * segment already owns the providers and splitting it would mean mounting them
 * twice.
 */

const BARE_PREFIXES = [
  "/login",
  "/signup",
  "/passwort-vergessen",
  "/passwort-zuruecksetzen",
  // The booking confirmation brings the calculator's own header and has no
  // footer; the marketing nav above it would offer a way out of a checkout.
  "/buchen",
];
const APP_PREFIXES = ["/dashboard", "/admin"];

export function SiteChrome({
  children,
  footer,
}: {
  children: ReactNode;
  /**
   * Rendered by the layout, which is a server component and can read the CMS.
   * Passed through rather than imported so this file stays client-side.
   */
  footer?: ReactNode;
}) {
  const pathname = usePathname();

  // Strip the locale segment so the comparison is route-shaped.
  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";

  const isBare = BARE_PREFIXES.some((prefix) => route.startsWith(prefix));
  const isApp = APP_PREFIXES.some((prefix) => route.startsWith(prefix));

  if (isBare) {
    return <>{children}</>;
  }

  if (isApp) {
    // The dashboard shell supplies its own navigation; the assistant would
    // overlap the content it floats above.
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {children}
      {footer}
      <ChatWidget />
    </>
  );
}
