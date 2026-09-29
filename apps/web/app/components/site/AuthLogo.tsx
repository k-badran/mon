"use client";

import { useSiteSettings } from "@/lib/site/useSiteSettings";

/**
 * The brand logo above the sign-in forms, from the `brand.logo` setting.
 *
 * These pages used to name /images/logo.svg directly, so a logo changed in the
 * dashboard reached the header and footer but not the pages people sign in on.
 */
export function AuthLogo() {
  const { logo, brandName } = useSiteSettings();

  return <img className="auth-logo" src={logo} alt={brandName} />;
}
