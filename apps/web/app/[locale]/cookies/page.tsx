import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { path, readList, type Copy } from "@/app/components/site/Blocks";
import { DetailCard, LegalDocument } from "@/app/components/site/Blocks2";
import { ConsentBar } from "@/app/components/site/ConsentBar";

/**
 * The cookie policy, laid out with the M.io "page-legal-cookie" frame: a rail
 * of the legal documents, the document itself, a controller card and the dark
 * cookie band.
 *
 * The frame puts the *terms* in this shell, but the terms already ship at /agb
 * from `page-terms`, and the two texts state different cancellation windows —
 * publishing both would leave the site contradicting itself on a binding term.
 * So the route keeps the frame's layout and carries the document its slug
 * promises: the cookie policy the footer names and the site did not have.
 *
 * Every string is a `content_blocks` row under `page-legal-cookie`, including
 * the rail's routes — an editor who reorders or renames the documents should
 * not have to have a developer re-pair the hrefs.
 */

const SECTION = "page-legal-cookie";
const ROUTE = "/cookies";

export const metadata: Metadata = {
  title: "Cookie-Richtlinie",
};

export default async function CookiesPage({
  params,
}: {
  params: { locale: Locale };
}) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const docs = readList(copy, "nav", ["label", "href"]).map((entry) => {
    // A row left without a route points at this page rather than at some
    // other document: a dead link is better than a confidently wrong one.
    const route = entry.href ?? ROUTE;

    return {
      label: entry.label ?? "",
      href: path(locale, route),
      active: route === ROUTE,
    };
  });

  const clauses = readList(copy, "clause") as Array<{
    title: string;
    body: string;
  }>;

  const card = readList(copy, "card", ["label", "lines"]).map((entry) => ({
    label: entry.label ?? "",
    lines: entry.lines ?? "",
  }));

  return (
    <>
      <LegalDocument
        eyebrow={copy["doc.eyebrow"]}
        docs={docs}
        title={copy["doc.title"]}
        meta={copy["doc.meta"]}
        blocks={clauses}
      >
        <DetailCard title={copy["card.title"]} groups={card} />
      </LegalDocument>

      <ConsentBar
        title={copy["consent.title"]}
        body={copy["consent.body"]}
        href={path(locale, "/datenschutz")}
        manageHref={path(locale, ROUTE)}
        labels={{
          reject: copy["consent.reject"],
          manage: copy["consent.manage"],
          accept: copy["consent.accept"],
        }}
      />
    </>
  );
}
