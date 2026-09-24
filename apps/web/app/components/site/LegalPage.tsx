import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { PageHero, readList, type Copy } from "./Blocks";
import { ProseSections } from "./Blocks2";

/**
 * The shared frame for imprint, privacy and terms.
 *
 * All three are the same shape — a heading, a review notice, then numbered
 * heading/body pairs — so they share one component and differ only in which
 * CMS section they read. That also means a change to how legal text is
 * presented happens once rather than three times.
 */
export async function LegalPage({
  locale,
  section,
}: {
  locale: Locale;
  section: string;
}) {
  const sections = await fetchSiteContent(locale, section);
  const copy: Copy = sections[section] ?? {};

  const blocks = readList(copy, "", ["title", "body"]) as Array<{
    title: string;
    body: string;
  }>;

  return (
    <>
      <PageHero headline={copy["hero.headline"]} subline={copy["hero.subline"]} />

      {/**
       * The draft notice is deliberately prominent. These pages carry
       * statutory obligations and the company particulars are still
       * placeholders; a quiet footnote would let that ship unnoticed.
       */}
      {copy["notice"] ? (
        <div className="bg-neutral-0">
          <div className="mx-auto w-full max-w-[1280px] px-5 md:px-10">
            <p
              role="note"
              className="mx-auto max-w-[800px] rounded-xl border border-warning bg-warning-soft px-5 py-4 text-body-sm text-warning-text"
            >
              {copy["notice"]}
            </p>
          </div>
        </div>
      ) : null}

      <ProseSections blocks={blocks} />
    </>
  );
}
