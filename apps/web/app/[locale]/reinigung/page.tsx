import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import {
  CardGrid,
  DarkHero,
  GuaranteeBanner,
  path,
  readList,
  type Copy,
} from "@/app/components/site/Blocks";
import { BeforeAfter, ProgrammeCards } from "@/app/components/site/Blocks2";

/**
 * The cleaning service page.
 *
 * Its five sections come straight from the M.io `service-cleaning` frame:
 * the hero, three priced programmes each with the same four guarantees, a
 * before/after gallery, the handover-guarantee banner, and the cross-sell.
 *
 * An earlier version of this page carried copy that had been written rather
 * than transcribed — different headline, different programmes, invented rates.
 * Everything here is the designer's wording, held in `service-cleaning`.
 *
 * There is deliberately no closing call-to-action band: the frame ends at the
 * cross-sell, and the guarantee banner already carries the booking action.
 */

const SECTION = "service-cleaning";

export const metadata: Metadata = {
  title: "Reinigung — UmzugPlus",
};

export default async function CleaningPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  // The four guarantees are shared by all three cards, as the frame draws them.
  const checks = [1, 2, 3, 4]
    .map((n) => copy[`programs.check.${n}`])
    .filter((value): value is string => Boolean(value));

  const programmes = readList(copy, "programs", ["title", "body", "price"]).map((entry) => ({
    title: entry.title ?? "",
    body: entry.body ?? "",
    ...(entry.price ? { price: entry.price } : {}),
    checks,
  }));

  const crossSell = readList(copy, "crossSell").map((entry) => ({
    title: entry.title ?? "",
    body: entry.body ?? "",
    href: path(locale, entry.title === copy["crossSell.2.title"] ? "/entsorgung" : "/umzug"),
    ...(copy["crossSell.cta"] ? { cta: copy["crossSell.cta"] } : {}),
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
        image="/images/service-cleaning/page-hero.jpg"
      />

      <ProgrammeCards
        eyebrow={copy["programs.eyebrow"]}
        headline={copy["programs.headline"]}
        programmes={programmes}
        cta={copy["programs.cta"]}
        href={path(locale, "/rechner")}
      />

      <BeforeAfter
        eyebrow={copy["gallery.eyebrow"]}
        headline={copy["gallery.headline"]}
        subline={copy["gallery.subline"]}
        beforeLabel={copy["gallery.before"]}
        afterLabel={copy["gallery.after"]}
        before="/images/service-cleaning/rectangle.jpg"
        after="/images/service-cleaning/rectangle-2.jpg"
      />

      <GuaranteeBanner
        title={copy["guarantee.title"]}
        body={copy["guarantee.body"]}
        cta={
          copy["guarantee.cta"]
            ? { label: copy["guarantee.cta"], href: path(locale, "/rechner") }
            : undefined
        }
      />

      <CardGrid
        eyebrow={copy["crossSell.eyebrow"]}
        headline={copy["crossSell.headline"]}
        subline={copy["crossSell.subline"]}
        cards={crossSell}
        tone="subtle"
      />

    </>
  );
}
