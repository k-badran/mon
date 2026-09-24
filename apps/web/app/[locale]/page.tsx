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
 * Published reviews, if there are any.
 *
 * The homepage prefers genuine customer reviews and falls back to the
 * testimonials held in the CMS. A failure is not worth failing the page over —
 * the section simply does not render.
 */
async function fetchReviews(): Promise<HomeReview[]> {
  try {
    const response = await fetch(`${API}/api/reviews?limit=3`, { next: { revalidate: 300 } });
    if (!response.ok) return [];

    const payload = (await response.json()) as { items?: HomeReview[] };
    return payload.items ?? [];
  } catch {
    return [];
  }
}

async function fetchFaq(locale: string): Promise<HomeFaq[]> {
  try {
    const response = await fetch(`${API}/api/faq?locale=${locale}`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as { entries?: HomeFaq[] };
    return (payload.entries ?? []).slice(0, 6);
  } catch {
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
