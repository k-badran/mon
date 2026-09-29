import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { readList, type Copy } from "@/app/components/site/Blocks";
import { ApplicationSection, RedHero } from "@/app/components/site/Blocks2";

/**
 * The partner-recruitment page.
 *
 * Built from the M.io "page-partner" frame, which is two sections and nothing
 * else: a solid red banner, then one split — benefits, the requirements plate
 * and the onboarding row down a 640px column, with the application card beside
 * them. The frame runs straight from there into the footer, so no closing CTA
 * band is invented here.
 *
 * The form's controls are real and the fields are named, but `action` is left
 * undefined: there is no partner-application endpoint yet, so the card submits
 * nowhere rather than pretending to deliver what someone typed.
 */

const SECTION = "page-partner";

/** The tab title is user-visible, so it comes from the CMS like the rest. */
export async function generateMetadata({
  params,
}: {
  params: { locale: Locale };
}): Promise<Metadata> {
  const sections = await fetchSiteContent(params.locale, SECTION);
  const name = sections[SECTION]?.["meta.title"];

  // The layout's template appends the brand; without a name the page
  // inherits the default title rather than a bare brand.
  return name ? { title: name } : {};
}

export default async function PartnerPage({ params }: { params: { locale: Locale } }) {
  const sections = await fetchSiteContent(params.locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const benefits = readList(copy, "benefits").map((entry) => ({
    title: entry.title ?? "",
    body: entry.body ?? "",
  }));

  const requirements = readList(copy, "requirements", ["title"]).map((entry) => entry.title ?? "");

  const timeline = readList(copy, "timeline").map((entry) => ({
    title: entry.title ?? "",
    body: entry.body ?? "",
  }));

  // The frame draws four controls; only their shapes differ, and a shape is
  // structure rather than copy, so it is supplied here instead of being seeded.
  const kinds: Array<"text" | "select" | "file"> = ["text", "select", "text", "file"];
  const fleetSizes = (copy["form.2.options"] ?? "")
    .split("|")
    .map((option) => option.trim())
    .filter(Boolean);

  const fields = readList(copy, "form", ["label", "placeholder"]).map((entry, index) => ({
    label: entry.label ?? "",
    placeholder: entry.placeholder ?? "",
    kind: kinds[index] ?? "text",
    options: index === 1 ? fleetSizes : undefined,
  }));

  return (
    <>
      <RedHero headline={copy["hero.headline"]} subline={copy["hero.subline"]} />

      <ApplicationSection
        idPrefix="partner"
        benefits={{ headline: copy["benefits.headline"], items: benefits }}
        requirements={{ headline: copy["requirements.headline"], items: requirements }}
        timeline={{ headline: copy["timeline.headline"], steps: timeline }}
        form={{
          headline: copy["form.headline"],
          fields,
          submit: copy["form.submit"],
          // No `action`: there is no partner-application endpoint yet, so the
          // section renders the submit inert. `form.notice` is the CMS slot
          // that would explain that; it has no row seeded yet, so nothing is
          // shown rather than a sentence invented here.
          notice: copy["form.notice"],
        }}
      />
    </>
  );
}
