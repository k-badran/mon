import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { readList, type Copy } from "@/app/components/site/Blocks";
import { FilterBar, RatingSummary, ReviewFeed } from "@/app/components/site/Blocks2";

/**
 * The public customer-reviews page.
 *
 * Replaces a client component that read `/api/reviews` at runtime. The M.io
 * "page-reviews" frame is an editorial page — a rating summary, the service
 * taxonomy and three hand-picked testimonials with the team's published
 * replies — so it is served from `content_blocks` like the rest of the site
 * and costs the visitor no JavaScript.
 *
 * Every string is a row under the `page-reviews` section.
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
  title: "Kundenstimmen — m.on",
};

export default async function ReviewsPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const chips = readList(copy, "filters", ["label"])
    .map((entry) => entry.label ?? "")
    .filter(Boolean);

  const reviews = readList(copy, "reviews", ["name", "meta", "body", "response"]).map(
    (entry, index) => ({
      name: entry.name ?? "",
      meta: entry.meta,
      body: entry.body,
      response: entry.response,
      avatar: AVATARS[index],
      rating: RATINGS[index] ?? 5,
    }),
  );

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
