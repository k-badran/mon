import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import {
  Areas,
  BrandBlocks,
  Faq,
  Hero,
  HowItWorks,
  Services,
  type Copy,
  type HomeFaq,
} from "@/app/components/home/Sections";

/**
 * The homepage.
 *
 * A server component: the copy comes from the CMS and the FAQ from its own
 * endpoint. The FAQ's topic chips are the one interactive part, and they live
 * in their own small client component rather than turning this page into one.
 *
 * This page used to be the calculator itself. That moved to `/rechner` when it
 * grew to ten steps, and this became the marketing page the design describes
 * — now frame 86:4671, which dropped the old frame's why-us, add-ons, reviews
 * and red closing-CTA sections. The footer is the layout's, not this page's.
 *
 * Every string is a `content_blocks` row, so the business edits the homepage
 * from the dashboard rather than through a deploy.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Records that the FAQ feed could not be read.
 *
 * The section is allowed to disappear — an FAQ with no questions in it is
 * worse than none — but not silently: an unreachable API and a genuinely empty
 * table would otherwise produce the same page, and a missing section would
 * look like a styling bug rather than an outage.
 *
 * The same shape as `[site-content]` in `lib/site/theme.ts`, so one grep finds
 * every CMS read that failed for a request.
 */
function reportFeedFailure(feed: string, url: string, reason: string) {
  console.error(`[home-feed] "${feed}" could not be loaded from ${url} — ${reason}`);
}

async function fetchFaq(locale: string): Promise<HomeFaq[]> {
  const url = `${API}/api/faq?locale=${locale}`;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      reportFeedFailure("faq", url, `HTTP ${response.status}`);
      return [];
    }

    const payload = (await response.json()) as { entries?: HomeFaq[] };

    // Four: the frame draws four `faq-accordion-item` rows and the section is
    // a teaser — `/${locale}/faq` is where the full list lives.
    return (payload.entries ?? []).slice(0, 4);
  } catch (error) {
    reportFeedFailure("faq", url, error instanceof Error ? error.message : String(error));
    return [];
  }
}

export default async function HomePage({
  params,
}: {
  // Not `Locale`: the segment is whatever the URL held. Typing it as the narrow
  // union said it was already checked, and nothing was checking it.
  params: { locale: string };
}) {
  const { locale } = params;

  /**
   * Reject a segment that is not a language before fetching anything.
   *
   * `[locale]` matches any single path segment, so every request for a file the
   * site does not serve — `/favicon.ico`, `/robots.txt`, and each path a
   * vulnerability scanner tries — arrived here as a "locale" and was forwarded
   * into the API as `?locale=favicon.ico`. That was 260 failed validations in an
   * hour, two API round trips per probe, and a 200 rendering the homepage at a
   * URL that should have been a 404.
   *
   * The layout has this guard already, but a layout and its page render
   * together: by the time the layout aborted, these fetches had been issued.
   */
  if (!isLocale(locale)) notFound();

  const [sections, faq] = await Promise.all([fetchSiteContent(locale), fetchFaq(locale)]);
  const copy: Copy = sections.home ?? {};

  return (
    <>
      <Hero copy={copy} locale={locale} />
      <Services copy={copy} locale={locale} />
      <BrandBlocks copy={copy} locale={locale} />
      <HowItWorks copy={copy} locale={locale} />
      <Areas copy={copy} />
      <Faq copy={copy} entries={faq} locale={locale} />
    </>
  );
}
