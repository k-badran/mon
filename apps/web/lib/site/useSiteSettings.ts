"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api";
import { DEFAULT_THEME, type SiteTheme } from "./theme";
import { REFERENCE_POLL_MS } from "@/lib/live/config";

/**
 * Brand and contact details, from the settings an admin edits.
 *
 * Client-side counterpart to the server-side `fetchSiteTheme` the layout uses.
 * Components that show a phone number or the company name read it from here
 * rather than hardcoding it, so changing it in the dashboard changes it
 * everywhere — which is the whole point of having the setting.
 *
 * Cached hard: this changes a few times a year, not a few times a minute.
 */
export function useSiteSettings() {
  const { sdk } = useApi();

  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: () => sdk.http.get<SiteTheme>("/api/site/theme"),
    staleTime: REFERENCE_POLL_MS,
    // A failed fetch must not blank out the header, so the defaults stand in.
    placeholderData: DEFAULT_THEME,
  });

  const settings = data ?? DEFAULT_THEME;

  return {
    brandName: settings.brand["brand.name"] ?? "UmzugPlus",
    legalName: settings.brand["brand.legalName"] ?? "UmzugPlus GmbH",
    logo: settings.brand["brand.logo"] ?? "/images/logo.svg",
    tagline: settings.brand["brand.tagline"] ?? "",
    phone: settings.contact["contact.phone"] ?? "",
    email: settings.contact["contact.email"] ?? "",
    address: settings.contact["contact.address"] ?? "",
    hours: settings.contact["contact.hours"] ?? "",
  };
}

/** Strips a phone number down to what `tel:` accepts. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
