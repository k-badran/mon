import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent } from "@/lib/site/theme";
import { readList, type Copy } from "@/app/components/site/Blocks";
import { ArticleIndex, FeaturedArticle } from "@/app/components/site/Blocks2";

/**
 * The guide index — the blog.
 *
 * Mounted at the German slug, like every other public route here (`/umzug`,
 * `/preise`, `/rechner`, `/ueber-uns`): one slug serves all four languages and
 * on this site that slug is German, so `/blog` would have been the single
 * English exception rather than a convention. `/blog` redirects here, because
 * the frame is named "page-blog" and an English-speaking visitor guesses it.
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
  title: "Ratgeber",
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
      image: imageSrc(copy, `articles.${index + 1}.image`, ARTICLE_IMAGES[index]),
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
        image={imageSrc(copy, "featured.image", "/images/page-blog/rectangle.jpg")}
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
