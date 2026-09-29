import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent } from "@/lib/site/theme";
import { DarkHero, path, readList, type Copy } from "@/app/components/site/Blocks";
import {
  CleaningBeforeAfter,
  CleaningCrossSell,
  CleaningGuarantee,
  ProgramTextCards,
  type CrossSellIcon,
} from "@/app/components/site/CleaningBlocks";

/**
 * The clearance and disposal service page.
 *
 * The M.io file has no clearance frame, so the page takes the layout the user
 * supplied for it: the cleaning page's sections (`service-cleaning`, 3:8379),
 * with the programmes as three text cards and no prices — hero, programmes,
 * before/after, the handover guarantee and the cross-sell. The copy is in
 * `service-disposal` and draws on what the design does say about clearance:
 * the homepage service card, the moving page's add-on and the footer.
 *
 * The before/after pair shows only once both photos are set. The design has
 * no clearance photos, and an unrelated one in the "before" frame would claim
 * a result nobody photographed; the "after" defaults to the cleared loft the
 * homepage's clearance card already uses.
 */

const SECTION = "service-disposal";

/** The cross-sell cards in order: relocation, then final cleaning. */
const CROSS_SELL_TARGETS: Array<{ route: string; icon: CrossSellIcon }> = [
  { route: "/umzug", icon: "truck" },
  { route: "/reinigung", icon: "sparkles" },
];

export const metadata: Metadata = {
  title: "Entsorgung",
};

export default async function DisposalPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const programmes = readList(copy, "programs", ["title", "body", "price"]).map((entry, index) => ({
    title: entry.title ?? "",
    body: entry.body ?? "",
    price: entry.price,
    checks: [1, 2, 3, 4]
      .map((n) => copy[`programs.${index + 1}.check.${n}`])
      .filter((value): value is string => Boolean(value)),
  }));

  const before = imageSrc(copy, "gallery.beforeImage");
  const after = imageSrc(copy, "gallery.afterImage", "/images/home/circular-photo-wrapper-2.jpg");

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
        image={imageSrc(copy, "hero.image", "/images/entsorgung.jpg")}
      />

      <ProgramTextCards
        eyebrow={copy["programs.eyebrow"]}
        headline={copy["programs.headline"]}
        programmes={programmes}
      />

      {before ? (
        <CleaningBeforeAfter
          eyebrow={copy["gallery.eyebrow"]}
          headline={copy["gallery.headline"]}
          subline={copy["gallery.subline"]}
          beforeLabel={copy["gallery.before"]}
          afterLabel={copy["gallery.after"]}
          before={before}
          after={after}
        />
      ) : null}

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
