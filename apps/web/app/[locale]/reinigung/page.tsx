import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { DarkHero, path, readList, type Copy } from "@/app/components/site/Blocks";
import {
  CleaningBeforeAfter,
  CleaningCrossSell,
  CleaningGuarantee,
  CleaningPrograms,
  type CrossSellIcon,
} from "@/app/components/site/CleaningBlocks";

/**
 * The cleaning service page.
 *
 * Its five sections come straight from the M.io `service-cleaning` frame
 * (136:319): the hero, the programmes, a before/after gallery, the
 * handover-guarantee banner, and the cross-sell. The programmes are the newer
 * `cleaning-services` section (136:533) — a featured photographed card and two
 * stacked ones — which replaced the three priced text cards.
 *
 * An earlier version of this page carried copy that had been written rather
 * than transcribed — different headline, different programmes, invented rates.
 * Everything here is the designer's wording, held in `service-cleaning`.
 *
 * There is deliberately no closing call-to-action band: the frame ends at the
 * cross-sell, and the guarantee banner already carries the booking action.
 */

const SECTION = "service-cleaning";

/**
 * The programme photographs, in card order. They are the frame's own image
 * fills; a programme added in the dashboard beyond these reuses the last one
 * rather than rendering an empty frame.
 */
const PROGRAMME_IMAGES = [
  "/images/service-cleaning/program-end-of-tenancy.jpg",
  "/images/service-cleaning/program-deep-home.jpg",
  "/images/service-cleaning/program-commercial-office.jpg",
];

/** The cross-sell cards in frame order: relocation, then clearance. */
const CROSS_SELL_TARGETS: Array<{ route: string; icon: CrossSellIcon }> = [
  { route: "/umzug", icon: "truck" },
  { route: "/entsorgung", icon: "trash-2" },
];

export const metadata: Metadata = {
  title: "Reinigung — m.on",
};

export default async function CleaningPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  // The four feature chips are shared by all three cards, as the frame draws them.
  const features = [1, 2, 3, 4]
    .map((n) => copy[`programs.check.${n}`])
    .filter((value): value is string => Boolean(value));

  const programmes = readList(copy, "programs", ["title", "body", "badge"]).map(
    (entry, index) => ({
      title: entry.title ?? "",
      body: entry.body ?? "",
      badge: entry.badge,
      image: PROGRAMME_IMAGES[Math.min(index, PROGRAMME_IMAGES.length - 1)]!,
    }),
  );

  const crossSell = readList(copy, "crossSell")
    .slice(0, CROSS_SELL_TARGETS.length)
    .map((entry, index) => ({
      title: entry.title ?? "",
      body: entry.body ?? "",
      href: path(locale, CROSS_SELL_TARGETS[index]!.route),
      icon: CROSS_SELL_TARGETS[index]!.icon,
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

      <CleaningPrograms
        eyebrow={copy["programs.eyebrow"]}
        headline={copy["programs.headline"]}
        programmes={programmes}
        features={features}
      />

      <CleaningBeforeAfter
        eyebrow={copy["gallery.eyebrow"]}
        headline={copy["gallery.headline"]}
        subline={copy["gallery.subline"]}
        beforeLabel={copy["gallery.before"]}
        afterLabel={copy["gallery.after"]}
        before="/images/service-cleaning/rectangle.jpg"
        after="/images/service-cleaning/rectangle-2.jpg"
      />

      <CleaningGuarantee
        title={copy["guarantee.title"]}
        body={copy["guarantee.body"]}
        cta={
          copy["guarantee.cta"]
            ? { label: copy["guarantee.cta"], href: path(locale, "/rechner") }
            : undefined
        }
      />

      <CleaningCrossSell
        eyebrow={copy["crossSell.eyebrow"]}
        headline={copy["crossSell.headline"]}
        subline={copy["crossSell.subline"]}
        cards={crossSell}
      />
    </>
  );
}
