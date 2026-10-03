import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent } from "@/lib/site/theme";
import { readList, type Copy } from "@/app/components/site/Blocks";
import { FilterBar, RatingSummary, ReviewFeed } from "@/app/components/site/Blocks2";

/**
 * The public customer-reviews page.
 *
 * The M.io "page-reviews" frame is an editorial page — a rating summary, the
 * service taxonomy and review cards with the team's published replies. The
 * cards are the customers' own reviews once moderation has published any,
 * read on the server from `GET /api/reviews` so the page still costs the
 * visitor no JavaScript; until then they are the hand-picked testimonials in
 * `content_blocks`. Before this, publishing a review in moderation changed
 * nothing a visitor could see.
 *
 * Every string is a row under the `page-reviews` section — including the name
 * shown on a customer's review, since the public feed carries no identity.
 */

const SECTION = "page-reviews";

/** In frame order, paired with `reviews.1…3` by index. */
const AVATARS = [
  "/images/page-reviews/rectangle.jpg",
  "/images/page-reviews/rectangle-2.jpg",
  "/images/page-reviews/rectangle-3.jpg",
];

/**
 * Stars lit per review, in frame order.
 *
 * The middle review is a four-star one in the frame — it says as much in its
 * own words ("price was slightly higher") — so the score is not copy to be
 * translated but a fact about the review, and it lives beside the avatars.
 */
const RATINGS = [5, 4, 5];

export const metadata: Metadata = {
  title: "Kundenstimmen",
};

export default async function ReviewsPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const [sections, published] = await Promise.all([
    fetchSiteContent(locale, SECTION),
    fetchPublishedReviews(),
  ]);
  const copy: Copy = sections[SECTION] ?? {};

  const chips = readList(copy, "filters", ["label"])
    .map((entry) => entry.label ?? "")
    .filter(Boolean);

  const testimonials = readList(copy, "reviews", ["name", "meta", "body", "response"]).map(
    (entry, index) => ({
      name: entry.name ?? "",
      meta: entry.meta,
      body: entry.body,
      response: entry.response,
      avatar: imageSrc(copy, `reviews.${index + 1}.avatar`, AVATARS[index]),
      rating: RATINGS[index] ?? 5,
    }),
  );

  // Real reviews once moderation has published any; the CMS testimonials are
  // what a new site shows until then, and what it falls back to if the API is
  // unreachable. The two are not mixed: a hand-picked quote beside real ones
  // would read as one of them.
  const customerName = copy["feed.customerName"] ?? "";
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
  const reviews =
    published.length > 0
      ? published.map((review) => ({
          id: review.id,
          name: customerName,
          monogram: customerName.charAt(0).toUpperCase() || undefined,
          meta: date.format(new Date(review.createdAt)),
          body: review.comment || undefined,
          response: review.adminReply || undefined,
          rating: review.rating,
        }))
      : testimonials;

  return (
    <>
      <RatingSummary
        eyebrow={copy["hero.eyebrow"]}
        headline={copy["hero.headline"]}
        subline={copy["hero.subline"]}
        score={copy["rating.score"]}
        scoreNote={copy["rating.outOf"]}
        basis={copy["rating.basis"]}
        note={copy["rating.audited"]}
      />

      <FilterBar
        label={copy["filters.label"]}
        chips={chips}
        sortLabel={copy["filters.sortLabel"]}
        sortValue={copy["filters.sortValue"]}
      />

      <ReviewFeed
        reviews={reviews}
        verifiedLabel={copy["feed.verified"]}
        responseLabel={copy["feed.responseLabel"]}
        more={copy["feed.more"]}
      />
    </>
  );
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * A minute: publishing a review in moderation should show on the site while
 * the moderator is still looking, and the page is otherwise static enough
 * that one request a minute is all it costs.
 */
const REVIEWS_REVALIDATE_SECONDS = 60;

/** What `GET /api/reviews` returns — deliberately nothing about the reviewer. */
interface PublishedReview {
  id: string;
  rating: number;
  comment: string | null;
  adminReply: string | null;
  createdAt: string;
}

/**
 * Records that the review feed could not be read.
 *
 * The page falls back to the CMS testimonials, which is the right thing for a
 * visitor and exactly why it must not happen silently: an unreachable API and
 * no published reviews would otherwise produce the same page. The same shape
 * as the homepage's `[home-feed]`, so one grep finds every failed feed.
 */
function reportFeedFailure(feed: string, url: string, reason: string) {
  console.error(`[reviews-feed] "${feed}" could not be loaded from ${url} — ${reason}`);
}

async function fetchPublishedReviews(): Promise<PublishedReview[]> {
  const url = `${API}/api/reviews?limit=20`;

  try {
    const response = await fetch(url, { next: { revalidate: REVIEWS_REVALIDATE_SECONDS } });
    if (!response.ok) {
      reportFeedFailure("reviews", url, `HTTP ${response.status}`);
      return [];
    }

    const payload = (await response.json()) as { items?: PublishedReview[] };
    return payload.items ?? [];
  } catch (error) {
    reportFeedFailure("reviews", url, error instanceof Error ? error.message : String(error));
    return [];
  }
}
