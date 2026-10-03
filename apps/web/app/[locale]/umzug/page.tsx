import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent } from "@/lib/site/theme";
import { CardGrid, DarkHero, path, readList, type Copy } from "@/app/components/site/Blocks";
import {
  IncludedShowcase,
  MasonryGallery,
  QuoteFactors,
} from "@/app/components/site/MovingBlocks";

/**
 * The residential moving service page.
 *
 * Built from the M.io "service-moving" frame 106:10195: the dark hero, the
 * included services as a photo banner over four numbered cards and a row of
 * trust chips, the five pricing factors as icon cards, a masonry gallery and
 * the three add-on cards. That frame replaced 3:8166 and drops the FAQ block
 * and the red closing band, so neither is rendered here.
 *
 * Every string is a `content_blocks` row under the `service-moving` section.
 */

const SECTION = "service-moving";

export const metadata: Metadata = {
  title: "Umzug",
};

/* The gallery's photographs, in the frame's order: the tall one, then the two
   stacked beside it. Each is the `gallery.N.image` row; these are the files
   the page falls back to without one. The frame's own fill for the tall card
   shows a truck in the old UmzugPlus livery, so its default is the m.on truck
   from the homepage hero, cropped to the 760×620 card. */
const GALLERY_IMAGES = [
  "/images/service-moving/gallery-residential-mon.jpg",
  "/images/service-moving/rectangle-2.jpg",
  "/images/service-moving/rectangle-3.jpg",
];

export default async function MovingPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const included = readList(copy, "included") as Array<{ title: string; body: string }>;
  const chips = readList(copy, "trust", ["value", "label"]).map((entry) => ({
    value: entry.value ?? "",
    label: entry.label ?? "",
  }));
  const factors = readList(copy, "factors") as Array<{ title: string; body: string }>;
  const captions = readList(copy, "gallery", ["caption"]);

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
        image={imageSrc(copy, "hero.image", "/images/service-moving/page-hero.jpg")}
      />

      <IncludedShowcase
        eyebrow={copy["included.eyebrow"]}
        headline={copy["included.headline"]}
        subline={copy["included.subline"]}
        image={imageSrc(copy, "included.image", "/images/service-moving/checklist-photo.jpg")}
        items={included}
        chips={chips}
      />

      <QuoteFactors
        eyebrow={copy["factors.eyebrow"]}
        headline={copy["factors.headline"]}
        subline={copy["factors.subline"]}
        items={factors}
      />

      <MasonryGallery
        eyebrow={copy["gallery.eyebrow"]}
        headline={copy["gallery.headline"]}
        subline={copy["gallery.subline"]}
        images={GALLERY_IMAGES.map((fallback, index) => ({
          src: imageSrc(copy, `gallery.${index + 1}.image`, fallback),
          caption: captions[index]?.caption,
        }))}
      />

      <CardGrid
        eyebrow={copy["addons.eyebrow"]}
        headline={copy["addons.headline"]}
        subline={copy["addons.subline"]}
        cards={addons}
      />
    </>
  );
}
