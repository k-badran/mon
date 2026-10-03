import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent, fetchSiteTheme } from "@/lib/site/theme";
import { PageHero, readList, type Copy } from "@/app/components/site/Blocks";
import { ContactFormSection, HotlineBanner, telHref } from "@/app/components/site/Blocks2";

/**
 * The contact page.
 *
 * Built from the M.io "page-contact" frame: the centred white hero, the form
 * beside the office and support-hours cards, and the red emergency hotline.
 *
 * The form carries no `action`. There is no contact endpoint yet — neither in
 * `apps/api` nor in this app — and posting to a route that silently drops a
 * customer's enquiry is worse than a form that visibly does nothing. It still
 * posts rather than gets: a GET would push the visitor's name, e-mail and
 * message into the URL, and from there into history and the logs. Wiring it is
 * a one-line change here once the endpoint exists.
 *
 * The service list is longer than the frame's, which draws only the collapsed
 * control and so shows a single value. The options are the services the site
 * actually sells — the same list the footer carries — because a one-entry
 * select asks the visitor to choose with nothing to choose from. They are CMS
 * rows, so the list follows the product without a deploy.
 */

const SECTION = "page-contact";

export const metadata: Metadata = {
  title: "Kontakt",
};

export default async function ContactPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale, SECTION);
  const copy: Copy = sections[SECTION] ?? {};

  const services = readList(copy, "form.service", ["title"])
    .map((entry) => entry.title ?? "")
    .filter(Boolean);

  /*
   * The phone, e-mail, address and hours are the contact settings, not copy:
   * one value an admin edits in the Website editor, the same one the calculator
   * header and the dashboard show. The cards used to carry their own address
   * and hours as CMS text, so the page and the settings could disagree. The
   * cards' titles stay copy, since they are translated and the details are not.
   */
  const { contact } = await fetchSiteTheme();
  const phone = contact["contact.phone"]?.trim() ?? "";
  const email = contact["contact.email"]?.trim() ?? "";

  const titles = readList(copy, "info", ["title"]).map((entry) => entry.title ?? "");
  const cards = [
    {
      title: titles[0] ?? "",
      body: contact["contact.address"]?.trim() ?? "",
      links: [
        ...(phone ? [{ label: phone, href: `tel:${telHref(phone)}` }] : []),
        ...(email ? [{ label: email, href: `mailto:${email}` }] : []),
      ],
    },
    { title: titles[1] ?? "", body: contact["contact.hours"]?.trim() ?? "" },
  ].filter((card) => card.title && (card.body || (card.links?.length ?? 0) > 0));

  return (
    <>
      <PageHero
        eyebrow={copy["hero.eyebrow"]}
        headline={copy["hero.headline"]}
        subline={undefined}
      />

      <ContactFormSection
        formTitle={copy["form.title"]}
        fields={[
          {
            name: "name",
            label: copy["form.name.label"] ?? "",
            type: "text",
            placeholder: copy["form.name.placeholder"],
            required: true,
          },
          {
            name: "email",
            label: copy["form.email.label"] ?? "",
            type: "email",
            placeholder: copy["form.email.placeholder"],
            required: true,
          },
          {
            name: "service",
            label: copy["form.service.label"] ?? "",
            type: "select",
            placeholder: copy["form.service.placeholder"],
            options: services,
            required: true,
          },
          {
            name: "message",
            label: copy["form.message.label"] ?? "",
            type: "textarea",
            placeholder: copy["form.message.placeholder"],
            required: true,
          },
        ]}
        submitLabel={copy["form.submit"]}
        image={imageSrc(copy, "form.image", `/images/${SECTION}/rectangle.jpg`)}
        cards={cards}
      />

      <HotlineBanner
        title={copy["hotline.title"]}
        note={copy["hotline.body"]}
        phone={phone}
      />
    </>
  );
}
