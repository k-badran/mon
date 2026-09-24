import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { path, readList, type Copy } from "@/app/components/site/Blocks";
import { CenteredHero, SoftCtaBand } from "@/app/components/site/Blocks2";
import { FaqDirectory, type FaqCategory } from "@/app/components/site/FaqDirectory";

/**
 * The FAQ page, built from the M.io "page-faq" frame.
 *
 * Three sections and nothing else: the centred hero on `#111827` with its
 * search bar, the split of category rail beside answers, and the grey closing
 * band. Every string is a `page-faq` row, including the six category headings
 * and all eighteen question/answer pairs — the frame's rail promises six
 * groups, so all six are seeded rather than three drawn ones plus whatever the
 * homepage's `faq_entries` table happens to hold.
 *
 * The hero's search bar is presentational: there is no search endpoint, so it
 * renders as the frame draws it but takes no input rather than pretending to.
 */

const SECTION = "page-faq";

/** The tab title is user-visible, so it comes from the CMS like the rest. */
export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const sections = await fetchSiteContent(params.locale, SECTION);
  const name = sections[SECTION]?.["meta.title"];

  return { title: name ? `${name} — UmzugPlus` : "UmzugPlus" };
}

export default async function FaqPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;

  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  // `cat.N.label` / `cat.N.heading` name the rail rows; `catN.M.*` are their
  // entries. A category with no entries left is dropped rather than rendered
  // as an empty panel.
  const categories: FaqCategory[] = readList(copy, "cat", ["label", "heading"])
    .map((category, index) => ({
      label: category.label ?? "",
      heading: category.heading ?? category.label ?? "",
      entries: (
        readList(copy, `cat${index + 1}`, ["question", "answer"]) as Array<{
          question?: string;
          answer?: string;
        }>
      )
        .filter((entry) => entry.question)
        .map((entry) => ({ question: entry.question ?? "", answer: entry.answer ?? "" })),
    }))
    .filter((category) => category.label && category.entries.length > 0);

  const phone = copy["cta.phone"];

  return (
    <>
      <CenteredHero
        headline={copy["hero.headline"]}
        subline={copy["hero.subline"]}
        searchHint={copy["hero.searchHint"]}
      />

      {/* The frame draws the second rail row — Pricing — as the selected one. */}
      <FaqDirectory
        navLabel={copy["directory.navLabel"]}
        categories={categories}
        defaultIndex={1}
      />

      <SoftCtaBand
        headline={copy["cta.headline"]}
        subline={copy["cta.subline"]}
        primary={
          copy["cta.primary"]
            ? { label: copy["cta.primary"], href: path(locale, "/kontakt") }
            : undefined
        }
        secondary={
          copy["cta.secondary"] && phone
            ? { label: copy["cta.secondary"], href: `tel:${phone.replace(/\s+/g, "")}` }
            : undefined
        }
      />
    </>
  );
}
