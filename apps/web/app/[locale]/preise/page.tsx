import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { PageHero, path, readList, type Copy } from "@/app/components/site/Blocks";
import { EstimatePreview, NoticePill, RateTable } from "@/app/components/site/Blocks2";

/**
 * The pricing page.
 *
 * Built from the M.io "page-pricing" frame: a white centred hero closed by the
 * fixed-price chip, the six billing factors as a rate table, and a worked
 * estimate that hands off to the live calculator. The frame carries no closing
 * CTA band — the estimate's button is the page's call to action — and no
 * imagery, so none is invented here.
 *
 * Every string is a `content_blocks` row under the `page-pricing` section.
 */

const SECTION = "page-pricing";

export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const sections = await fetchSiteContent(params.locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  // This was a hardcoded German string served to all four locales. The
  // `meta.title` row that page-about and page-faq read does not exist under
  // `page-pricing` yet, so the hero headline stands in until an editor adds
  // one — it is at least the page's own name in the reader's language.
  const name = copy["meta.title"] ?? copy["hero.headline"];

  // The layout's template appends the brand; without a name the page
  // inherits the default title rather than a bare brand.
  return name ? { title: name } : {};
}

export default async function PricingPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const factors = readList(copy, "factors", ["factor", "rate", "scope"]).map((entry) => ({
    factor: entry.factor ?? "",
    rate: entry.rate ?? "",
    scope: entry.scope ?? "",
  }));

  // The frame marks the third plate — "Elevator Accessibility" answered
  // "Elevator on both sides" — with a green check, the only green anywhere in
  // it. It is an affirmative state marker rather than copy, so it is set here
  // from the frame rather than carried as a `content_blocks` row an editor
  // would have to translate.
  const fields = readList(copy, "estimate.fields", ["label", "value", "hint"]).map(
    (entry, index) => ({
      label: entry.label ?? "",
      value: entry.value ?? "",
      hint: entry.hint,
      confirmed: index === 2,
    }),
  );

  const lines = readList(copy, "estimate.lines", ["label", "value"]).map((entry) => ({
    label: entry.label ?? "",
    value: entry.value ?? "",
  }));

  return (
    <>
      <PageHero
        eyebrow={copy["hero.eyebrow"]}
        headline={copy["hero.headline"]}
        subline={copy["hero.subline"]}
      />

      <NoticePill text={copy["hero.badge"]} attached />

      <RateTable
        headline={copy["factors.headline"]}
        columns={{
          factor: copy["factors.col.factor"] ?? "",
          rate: copy["factors.col.rate"] ?? "",
          scope: copy["factors.col.scope"] ?? "",
        }}
        rows={factors}
      />

      <EstimatePreview
        eyebrow={copy["estimate.eyebrow"]}
        headline={copy["estimate.headline"]}
        subline={copy["estimate.subline"]}
        fields={fields}
        panelTitle={copy["estimate.panel.title"]}
        lines={lines}
        totalLabel={copy["estimate.total.label"]}
        totalValue={copy["estimate.total.value"]}
        cta={
          copy["estimate.cta"]
            ? { label: copy["estimate.cta"], href: path(locale, "/rechner") }
            : undefined
        }
      />
    </>
  );
}
