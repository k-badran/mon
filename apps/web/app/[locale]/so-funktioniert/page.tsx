import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent } from "@/lib/site/theme";
import { PageHero, readList, type Copy } from "@/app/components/site/Blocks";
import { HowItWorksComparison, HowItWorksSteps } from "@/app/components/site/HowItWorksBlocks";

/**
 * The "how it works" page.
 *
 * Replaces a `.js` page that styled itself from the unimported `globals.css`.
 * Built from the M.io "page-how-it-works" frame, which is just three sections:
 * a centred hero, the four-step timeline and the comparison table. The frame
 * carries no closing CTA, so none is invented here.
 *
 * Every string is a `content_blocks` row under the `page-how-it-works` section.
 */

const SECTION = "page-how-it-works";

export const metadata: Metadata = {
  title: "So funktioniert's — m.on",
};

export default async function HowItWorksPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const steps = readList(copy, "steps") as Array<{ title: string; body: string }>;
  const comparison = readList(copy, "compare", ["feature", "ours", "theirs"]) as Array<{
    feature: string;
    ours: string;
    theirs: string;
  }>;

  return (
    <>
      <PageHero
        eyebrow={copy["hero.eyebrow"]}
        headline={copy["hero.headline"]}
        subline={copy["hero.subline"]}
      />

      {/* The frame keeps every photograph to the right of its copy. */}
      <HowItWorksSteps
        steps={steps}
        stepLabel={copy["steps.label"]}
        images={[
          "/images/page-how-it-works/rectangle.jpg",
          "/images/page-how-it-works/rectangle-2.jpg",
          "/images/page-how-it-works/rectangle-3.jpg",
          "/images/page-how-it-works/rectangle-4.jpg",
        ].map((fallback, index) => imageSrc(copy, `steps.${index + 1}.image`, fallback))}
      />

      <HowItWorksComparison
        eyebrow={copy["compare.eyebrow"]}
        headline={copy["compare.headline"]}
        columns={{
          feature: copy["compare.col.feature"] ?? "",
          ours: copy["compare.col.ours"] ?? "",
          theirs: copy["compare.col.theirs"] ?? "",
        }}
        rows={comparison}
      />
    </>
  );
}
