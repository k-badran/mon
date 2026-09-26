import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import {
  CardGrid,
  ChecklistSection,
  CtaBand,
  DarkHero,
  FaqSection,
  Gallery,
  NumberedGrid,
  path,
  readList,
  type Copy,
} from "@/app/components/site/Blocks";

/**
 * The residential moving service page.
 *
 * Replaces a `.js` page that referenced classes living only in the unimported
 * `globals.css`, so it rendered unstyled. Built from the M.io "service-moving"
 * frame: dark hero, included-services checklist, the five pricing factors, a
 * gallery, the FAQ and the three add-on cards.
 *
 * Every string is a `content_blocks` row under the `service-moving` section.
 */

const SECTION = "service-moving";

export const metadata: Metadata = {
  title: "Umzug — m.on",
};

export default async function MovingPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const included = readList(copy, "included") as Array<{ title: string; body: string }>;
  const factors = readList(copy, "factors") as Array<{ title: string; body: string }>;
  const faq = readList(copy, "faq", ["question", "answer"]) as Array<{
    question: string;
    answer: string;
  }>;

  /* The icon on each cross-sell card's plate. Design, not copy, so the frame's
     order is kept here rather than in a content row. */
  const ADDON_ICONS = ["package", "sparkles", "trash-2"];

  const addons = readList(copy, "addons", ["title", "body", "price"]).map((entry, index) => ({
    title: entry.title ?? "",
    body: entry.body ?? "",
    ...(entry.price ? { price: entry.price } : {}),
    ...(ADDON_ICONS[index] ? { icon: ADDON_ICONS[index] } : {}),
    href: path(locale, "/rechner"),
    ...(copy["addons.cta"] ? { cta: copy["addons.cta"] } : {}),
  }));

  return (
    <>
      <DarkHero
        eyebrow={copy["hero.eyebrow"]}
        headline={copy["hero.headline"]}
        subline={copy["hero.subline"]}
        primary={
          copy["hero.ctaPrimary"]
            ? { label: copy["hero.ctaPrimary"], href: path(locale, "/rechner") }
            : undefined
        }
        secondary={
          copy["hero.ctaSecondary"]
            ? { label: copy["hero.ctaSecondary"], href: path(locale, "/preise") }
            : undefined
        }
        image="/images/service-moving/page-hero.jpg"
      />

      <ChecklistSection
        eyebrow={copy["included.eyebrow"]}
        headline={copy["included.headline"]}
        subline={copy["included.subline"]}
        items={included}
        image="/images/service-moving/checklist-photo.jpg"
      />

      <NumberedGrid
        eyebrow={copy["factors.eyebrow"]}
        headline={copy["factors.headline"]}
        subline={copy["factors.subline"]}
        items={factors}
        columns={5}
      />

      <Gallery
        eyebrow={copy["gallery.eyebrow"]}
        headline={copy["gallery.headline"]}
        subline={copy["gallery.subline"]}
        images={[
          "/images/service-moving/rectangle.jpg",
          "/images/service-moving/rectangle-2.jpg",
          "/images/service-moving/rectangle-3.jpg",
        ]}
      />

      <FaqSection
        eyebrow={copy["faq.eyebrow"]}
        headline={copy["faq.headline"]}
        entries={faq}
      />

      <CardGrid
        eyebrow={copy["addons.eyebrow"]}
        headline={copy["addons.headline"]}
        subline={copy["addons.subline"]}
        cards={addons}
      />

      <CtaBand
        headline={copy["cta.headline"]}
        subline={copy["cta.body"]}
        primary={
          copy["cta.button"]
            ? { label: copy["cta.button"], href: path(locale, "/rechner") }
            : undefined
        }
      />
    </>
  );
}
