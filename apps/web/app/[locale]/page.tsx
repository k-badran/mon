import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import {
  Addons,
  Areas,
  Faq,
  FinalCta,
  Hero,
  HowItWorks,
  Reviews,
  Services,
  WhyUs,
  type Copy,
  type HomeFaq,
  type HomeReview,
} from "@/app/components/home/Sections";

/**
 * The homepage.
 *
 * A server component, because none of it is interactive: the copy comes from
 * the CMS, the FAQ and the reviews come from their own endpoints, and the only
 * thing a visitor clicks is a link to the calculator. Nothing here needs to
 * ship JavaScript.
 *
 * This page used to be the calculator itself. That moved to `/rechner` when it
 * grew to ten steps, and this became the marketing page the design describes.
 *
 * Every string is a `content_blocks` row, so the business edits the homepage
 * from the dashboard rather than through a deploy.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * Records that one of this page's two feeds could not be read.
 *
 * Both sections below are allowed to disappear, which is the right behaviour —
 * a reviews strip with no reviews in it is worse than no strip. What was wrong
 * is that they disappeared *silently*: an unreachable API and a genuinely
 * empty table produced the same page, so "the homepage is missing two of its
 * nine sections" looked like a styling bug rather than an outage.
 *
 * The same shape as `[site-content]` in `lib/site/theme.ts`, so one grep finds
 * every CMS read that failed for a request.
 */
function reportFeedFailure(feed: string, url: string, reason: string) {
  console.error(`[home-feed] "${feed}" could not be loaded from ${url} — ${reason}`);
}

/**
 * Published reviews, if there are any.
 *
 * The homepage prefers genuine customer reviews and falls back to the
 * testimonials held in the CMS. A failure is not worth failing the page over —
 * the section simply does not render.
 */
async function fetchReviews(): Promise<HomeReview[]> {
  const url = `${API}/api/reviews?limit=3`;

  try {
    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) {
      reportFeedFailure("reviews", url, `HTTP ${response.status}`);
      return [];
    }

    const payload = (await response.json()) as { items?: HomeReview[] };
    return payload.items ?? [];
  } catch (error) {
    reportFeedFailure("reviews", url, error instanceof Error ? error.message : String(error));
    return [];
  }
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

    // Four, not six: the frame draws four `faq-item` rows here and the section
    // is a teaser — `/${locale}/faq` is where the full list lives.
    return (payload.entries ?? []).slice(0, 4);
  } catch (error) {
    reportFeedFailure("faq", url, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/** The CMS testimonials, used when no real review has been published yet. */
function testimonialsFrom(copy: Copy): HomeReview[] {
  return [1, 2, 3]
    .map((n) => ({
      id: `cms-${n}`,
      rating: 5,
      comment: copy[`reviews.t${n}.quote`] ?? null,
      authorName: copy[`reviews.t${n}.name`] ?? null,
      serviceType: copy[`reviews.t${n}.service`] ?? null,
    }))
    .filter((entry) => Boolean(entry.comment));
}

export default async function HomePage({
  params,
}: {
  params: { locale: Locale };
}) {
  const locale = params.locale;

  const [sections, published, faq] = await Promise.all([
    fetchSiteContent(locale),
    fetchReviews(),
    fetchFaq(locale),
  ]);

  // The footer lives in its own section, so both maps are merged into one
  // lookup with the footer keys prefixed the way the component reads them.
  const copy: Copy = {
    ...(sections.home ?? {}),
    ...Object.fromEntries(
      Object.entries(sections.footer ?? {}).map(([slot, value]) => [`footer.${slot}`, value]),
    ),
  };
  const reviews = published.length > 0 ? published : testimonialsFrom(copy);

  return (
    <>
      <Hero copy={copy} locale={locale} />
      <Services copy={copy} locale={locale} />
      <WhyUs copy={copy} />
      <HowItWorks copy={copy} />
      <Addons copy={copy} />
      <Areas copy={copy} />
      <Reviews copy={copy} reviews={reviews} />
      <Faq copy={copy} entries={faq} />
      <FinalCta copy={copy} locale={locale} />
    </>
  );
}
