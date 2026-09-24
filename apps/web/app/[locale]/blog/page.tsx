import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { readList, type Copy } from "@/app/components/site/Blocks";
import { ArticleIndex, FeaturedArticle } from "@/app/components/site/Blocks2";

/**
 * The guide index — the blog.
 *
 * Mounted at /blog rather than at a German slug: the frame is named
 * "page-blog" and one slug has to serve all four languages, so the German
 * word stays in the nav label ("Ratgeber") where it is actually read. The old
 * /ratgeber path redirects here so the one page keeps one URL.
 *
 * Built from the M.io "page-blog" frame, which is only two sections: one
 * promoted article and a two-column list beside a sidebar. The frame shows no
 * article detail view, so nothing here links to a post — the cards are
 * teasers. The sidebar's checklist PDF does not exist yet either, so the
 * download button is drawn but disabled, with a note underneath; sending a
 * click on "Download Now" to the quote form instead would be a lie about what
 * the button does.
 *
 * Every string is a `content_blocks` row under the `page-blog` section.
 */

const SECTION = "page-blog";

export const metadata: Metadata = {
  title: "Ratgeber — UmzugPlus",
};

const ARTICLE_IMAGES = [
  "/images/page-blog/rectangle-2.jpg",
  "/images/page-blog/rectangle-3.jpg",
  "/images/page-blog/rectangle-4.jpg",
  "/images/page-blog/rectangle-5.jpg",
];

export default async function GuidePage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const articles = readList(copy, "articles", ["title", "category", "date", "readTime"]).map(
    (entry, index) => ({
      title: entry.title ?? "",
      category: entry.category,
      date: entry.date,
      readTime: entry.readTime,
      image: ARTICLE_IMAGES[index],
    }),
  );

  const categoryItems = readList(copy, "categories", ["label", "count"]).map((entry) => ({
    label: entry.label ?? "",
    count: entry.count ?? "",
  }));

  return (
    <>
      <FeaturedArticle
        eyebrow={copy["featured.eyebrow"]}
        category={copy["featured.category"]}
        title={copy["featured.title"]}
        excerpt={copy["featured.excerpt"]}
        date={copy["featured.date"]}
        readTime={copy["featured.readTime"]}
        image="/images/page-blog/rectangle.jpg"
      />

      <ArticleIndex
        headline={copy["articles.headline"]}
        articles={articles}
        categories={{ title: copy["categories.title"], items: categoryItems }}
        promo={{
          title: copy["promo.title"],
          body: copy["promo.body"],
          button: copy["promo.button"],
          note: copy["promo.note"],
        }}
      />
    </>
  );
}
