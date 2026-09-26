import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import {
  CardGrid,
  ChecklistSection,
  CtaBand,
  DarkHero,
  FaqSection,
  NumberedGrid,
  path,
  readList,
  type Copy,
} from "@/app/components/site/Blocks";

/**
 * The clearance and disposal service page.
 *
 * The M.io file draws `service-moving` and `service-cleaning` but has no frame
 * for clearance, even though it is one of the three services on the homepage,
 * an add-on on the moving page, and a footer link. Rather than leave a sold
 * service with no page, this follows the two service pages' structure exactly;
 * the copy is in `service-disposal` and derives from what the design does say
 * about clearance.
 *
 * No photographs: the design supplies none for this service, and a stock image
 * would misrepresent work we have no picture of.
 */

const SECTION = "service-disposal";

export const metadata: Metadata = {
  title: "Entsorgung — m.on",
};

export default async function DisposalPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const included = readList(copy, "included") as Array<{ title: string; body: string }>;
  const factors = readList(copy, "factors") as Array<{ title: string; body: string }>;
  const faq = readList(copy, "faq", ["question", "answer"]) as Array<{
    question: string;
    answer: string;
  }>;

  const addons = readList(copy, "addons").map((entry) => ({
    title: entry.title ?? "",
    body: entry.body ?? "",
    href: path(locale, entry.title === copy["addons.1.title"] ? "/reinigung" : "/umzug"),
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
      />

      <ChecklistSection
        eyebrow={copy["included.eyebrow"]}
        headline={copy["included.headline"]}
        subline={copy["included.subline"]}
        items={included}
      />

      <NumberedGrid
        eyebrow={copy["factors.eyebrow"]}
        headline={copy["factors.headline"]}
        subline={copy["factors.subline"]}
        items={factors}
        columns={4}
      />

      <FaqSection
        eyebrow={copy["faq.eyebrow"]}
        headline={copy["faq.headline"]}
        entries={faq}
        tone="white"
      />

      <CardGrid
        eyebrow={copy["addons.eyebrow"]}
        headline={copy["addons.headline"]}
        cards={addons}
        tone="subtle"
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
