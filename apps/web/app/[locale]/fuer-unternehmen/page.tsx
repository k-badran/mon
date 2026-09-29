import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent } from "@/lib/site/theme";
import { readList, type Copy } from "@/app/components/site/Blocks";
import { ArticleGrid, IconCardGrid, LeadFormHero, LogoStrip } from "@/app/components/site/Blocks2";

/**
 * The business page.
 *
 * Built from the M.io "page-for-business" frame: a dark hero carrying a lead
 * form, the customer trust strip, the four enterprise benefits and the three
 * corporate service tiles. The frame ends there — it has no closing CTA band,
 * so neither does this page.
 *
 * Every string is a `content_blocks` row under the `page-for-business` section.
 */

const SECTION = "page-for-business";

/**
 * Field identity is structure, not copy, so the names live here while the
 * labels come from the CMS.
 */
const FIELDS = [
  { name: "company", type: "text" },
  { name: "email", type: "email" },
  // Deliberately not `month` — a native month picker discards the placeholder,
  // which is a translated string the design shows.
  { name: "moveDate", type: "text" },
] as const;

/** Matches the icon frames inside the benefit cards. */
const BENEFIT_ICONS = ["user", "tag", "shield", "refresh-cw"];

/** The `hero` frame's own image fill, washed with #111827 at 75%. */
const HERO_IMAGE = "/images/page-for-business/page-hero.jpg";

const SERVICE_IMAGES = [
  "/images/page-for-business/rectangle.jpg",
  "/images/page-for-business/rectangle-2.jpg",
  "/images/page-for-business/rectangle-3.jpg",
];

export const metadata: Metadata = {
  title: "Für Unternehmen — m.on",
};

export default async function ForBusinessPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const fields = readList(copy, "form.field", ["label", "placeholder"]).flatMap(
    (entry, index) => {
      const field = FIELDS[index];
      if (!field) return [];

      return [
        {
          name: field.name,
          type: field.type,
          label: entry.label ?? "",
          placeholder: entry.placeholder ?? "",
        },
      ];
    },
  );

  const logos = readList(copy, "logos", ["name"])
    .map((entry) => entry.name ?? "")
    .filter(Boolean);

  const benefits = readList(copy, "benefits").map((entry, index) => ({
    icon: BENEFIT_ICONS[index] ?? "dot",
    title: entry.title ?? "",
    body: entry.body ?? "",
  }));

  const services = readList(copy, "services").map((entry, index) => {
    const image = imageSrc(copy, `services.${index + 1}.image`, SERVICE_IMAGES[index]);

    return {
      title: entry.title ?? "",
      body: entry.body ?? "",
      ...(image ? { image } : {}),
    };
  });

  return (
    <>
      <LeadFormHero
        eyebrow={copy["hero.eyebrow"]}
        headline={copy["hero.headline"]}
        subline={copy["hero.subline"]}
        image={imageSrc(copy, "hero.image", HERO_IMAGE)}
        form={{
          title: copy["form.title"],
          submit: copy["form.submit"],
          // No lead endpoint exists yet, in this app or in `apps/api`. The form
          // used to GET the calculator, which reads only `step` from the URL
          // and keeps its answers in session storage — so every value typed
          // here was dropped on arrival. Until there is somewhere to send it,
          // the form posts nowhere, as the contact form does.
          action: undefined,
          fields,
        }}
      />

      <LogoStrip label={copy["logos.label"]} names={logos} />

      <IconCardGrid
        headline={copy["benefits.headline"]}
        subline={copy["benefits.subline"]}
        items={benefits}
      />

      <ArticleGrid
        headline={copy["services.headline"]}
        articles={services}
        align="start"
        tone="sunken"
        cardRadius="xl"
        headingSize="md"
        stackGap="12"
      />
    </>
  );
}
