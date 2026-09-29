import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ApiProvider } from "@/lib/api";
import { DEFAULT_LOCALE, LOCALES, LOCALE_META, isLocale, type Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import { QueryProvider } from "@/lib/live/query-provider";
import { logoSrc } from "@/lib/site/defaults";
import { fetchSiteContent, fetchSiteTheme, fontHref, themeToCss } from "@/lib/site/theme";
import { Footer as SiteFooter } from "@/app/components/site/Footer";
import { ContentLoadBanner } from "@/app/components/site/ContentLoadBanner";
import { SiteChrome } from "@/app/components/SiteChrome";
import "../theme.css";
import "../base.css";
import "../buttons.css";
import "../site.css";
import "../dashboard.css";
import "../tables.css";

import de from "@/lib/i18n/messages/de.json";
import en from "@/lib/i18n/messages/en.json";
import ar from "@/lib/i18n/messages/ar.json";
import tr from "@/lib/i18n/messages/tr.json";

const MESSAGES = { de, en, ar, tr } as const;

/** Prerenders one static shell per language. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * The homepage's tagline and the fallback description, per locale. The brand
 * part of the title is not here: it is the `seo.titleSuffix` setting.
 */
const TITLES: Record<Locale, { tagline: string; description: string }> = {
  de: {
    tagline: "Ihr Umzug. Einfach organisiert.",
    description:
      "Umzug, Entsorgung und Reinigung zum transparenten Festpreis — online berechnen, online anfragen.",
  },
  en: {
    tagline: "Moving, simply organised.",
    description:
      "Moving, disposal and cleaning at a transparent fixed price — calculate online, request online.",
  },
  ar: {
    tagline: "نقل منظّم ببساطة",
    description: "نقل وتخلّص من الأثاث وتنظيف بسعر ثابت وشفاف — احسب واطلب أونلاين.",
  },
  tr: {
    tagline: "Taşınma, kolayca organize.",
    description:
      "Şeffaf sabit fiyatla nakliye, tasfiye ve temizlik — online hesapla, online talep et.",
  },
};

/**
 * Per-locale metadata plus hreflang alternates, driven by the SEO settings.
 *
 * The previous version had one global title and description for every route in
 * every language, so search engines saw a single German site regardless of what
 * was actually served.
 *
 * `seo.titleSuffix` becomes the title template, so a page names only itself
 * ("Kontakt") and the brand is appended here — renaming the brand in the
 * dashboard retitles every tab. `seo.defaultDescription` is a single value
 * written in German (the site's default locale), so it stands in for the German
 * description only; the other locales keep their translation rather than
 * showing a search engine German prose on an English page.
 *
 * The same cached read as the layout body below, so this adds no request.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) return {};

  const meta = TITLES[locale];
  const site = await fetchSiteTheme();

  const brandName = site.brand["brand.name"]?.trim() || "m.on";
  const suffix = site.seo["seo.titleSuffix"]?.trim() || brandName;
  const settingDescription = site.seo["seo.defaultDescription"]?.trim();
  const description =
    locale === DEFAULT_LOCALE && settingDescription ? settingDescription : meta.description;

  return {
    // Without a base, canonical and hreflang render as relative paths, which
    // search engines treat as ambiguous across hosts.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3200"),
    title: {
      template: `%s — ${suffix}`,
      default: `${suffix} — ${meta.tagline}`,
    },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((code) => [code, `/${code}`])),
    },
    // No og:title here: a page that sets no Open Graph of its own inherits
    // this object whole, and the homepage's title on every shared subpage
    // link would be wrong. Crawlers fall back to <title>.
    openGraph: {
      siteName: brandName,
      description,
      locale: LOCALE_META[locale].tag,
      images: [{ url: logoSrc(site.brand["brand.logo"]), alt: brandName }],
    },
  };
}

/**
 * Root layout, per locale.
 *
 * `lang` and `dir` are rendered by the server from the URL. Arabic therefore
 * arrives right-to-left in the very first byte, rather than being flipped by a
 * `useEffect` after the German version has already painted.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isLocale(locale)) notFound();

  const meta = LOCALE_META[locale];

  /**
   * Theme and branding come from the database, so an admin's change in the
   * dashboard restyles the site without a deploy. A failed fetch falls back to
   * the brand defaults rather than rendering unstyled.
   */
  const [site, sections] = await Promise.all([fetchSiteTheme(), fetchSiteContent(locale)]);

  // The footer's blocks live under their own section; the component reads them
  // with a "footer." prefix, the same shape the homepage builds.
  const footerCopy = Object.fromEntries(
    Object.entries(sections.footer ?? {}).map(([slot, value]) => [`footer.${slot}`, value]),
  );
  const themeCss = themeToCss(site.theme);

  return (
    <html lang={meta.tag} dir={meta.dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={fontHref(site.theme, meta.dir === "rtl")} rel="stylesheet" />

        {/* Emitted after the stylesheets so an admin's values win, and only
            for tokens that actually differ from the defaults. */}
        {themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      </head>
      <body>
        <ApiProvider>
          <QueryProvider>
            <I18nProvider locale={locale} messages={MESSAGES[locale]} fallback={MESSAGES.de}>
              <SiteChrome
                appUrl={site.brand["brand.appUrl"]}
                footer={
                  <SiteFooter
                    copy={footerCopy}
                    locale={locale}
                    brandName={site.brand["brand.name"]}
                    appUrl={site.brand["brand.appUrl"]}
                    logo={logoSrc(site.brand["brand.logo"])}
                  />
                }
              >
                {children}
              </SiteChrome>
            </I18nProvider>
          </QueryProvider>
        </ApiProvider>

        {/* Last, so that by the time it renders the page has started its own
            CMS reads and the banner can name the section that failed rather
            than only the layout's. Renders nothing in production. */}
        <ContentLoadBanner />
      </body>
    </html>
  );
}
