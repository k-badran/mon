import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { PageHero, readList, type Copy } from "@/app/components/site/Blocks";
import { SplitDetail, SplitFeature, StatsRow, TeamGrid } from "@/app/components/site/Blocks2";

/**
 * The company page.
 *
 * Replaces a `.js` page that referenced classes living only in the unimported
 * `globals.css`, so it rendered unstyled. Built from the M.io "page-about"
 * frame: white hero, the dark figures strip, the three core values beside a
 * photograph, the leadership grid and the fleet split.
 *
 * The frame ends on the fleet section — no closing CTA band, unlike the
 * service pages — so none is invented here.
 */

const SECTION = "page-about";

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

export default async function AboutPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const stats = readList(copy, "stats", ["value", "label"]) as Array<{
    value: string;
    label: string;
  }>;

  const values = readList(copy, "values") as Array<{ title: string; body: string }>;

  // The three portraits sit in frame order beside their names.
  const portraits = [
    "/images/page-about/rectangle-2.jpg",
    "/images/page-about/rectangle-3.jpg",
    "/images/page-about/rectangle-4.jpg",
  ];

  const members = readList(copy, "team", ["name", "role"]).map((entry, index) => ({
    name: entry.name ?? "",
    role: entry.role ?? "",
    photo: portraits[index] ?? "",
  }));

  const fleetPoints = readList(copy, "fleet", ["text"]).map((entry) => entry.text ?? "");

  return (
    <>
      <PageHero
        eyebrow={copy["hero.eyebrow"]}
        headline={copy["hero.headline"]}
        subline={copy["hero.subline"]}
      />

      <StatsRow stats={stats} />

      <SplitDetail
        eyebrow={copy["values.eyebrow"]}
        headline={copy["values.headline"]}
        items={values}
        image="/images/page-about/rectangle.jpg"
        flip
      />

      <TeamGrid
        eyebrow={copy["team.eyebrow"]}
        headline={copy["team.headline"]}
        members={members}
        card
      />

      <SplitFeature
        eyebrow={copy["fleet.eyebrow"]}
        headline={copy["fleet.headline"]}
        body={copy["fleet.body"]}
        points={fleetPoints}
        image="/images/page-about/rectangle-5.jpg"
      />
    </>
  );
}
