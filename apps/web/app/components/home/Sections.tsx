import Link from "next/link";
import type { ReactNode } from "react";

import { MESSAGES } from "@/lib/i18n/catalogue";
import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";

/**
 * The homepage's sections.
 *
 * Built against the M.io "homepage" frame, measured rather than eyeballed:
 * sections are 100px tall inside and 80px wide, the content column caps at
 * 1280, every section heading is centred, and the backgrounds alternate
 * white / #f8f9fa with a red closing band and an ink footer.
 *
 * Every string comes from the `copy` map, which the page fetches from
 * `/api/site/content`. Nothing here hardcodes marketing text: changing a
 * headline is a dashboard edit, not a deploy. A missing block renders as
 * nothing rather than throwing, so a half-filled CMS degrades quietly.
 *
 * Server components throughout — none of this needs to ship JavaScript.
 */

export type Copy = Record<string, string>;

/**
 * 100px block padding on a 1280 content column, 80px inline.
 *
 * The outer box is the 1440 page frame, not the column — capping at 1280 and
 * padding it 40 gave a 1200 column. The same three steps as `Blocks.SHELL`,
 * which this file deliberately does not import: it is private to the homepage
 * and the footer, and the two are kept in step by hand.
 */
const SHELL = "mx-auto w-full max-w-[1440px] px-5 md:px-10 2xl:px-20";
const PAD = "py-16 md:py-25";

/**
 * Two frame sizes the scale has no rung for, written out at the call site.
 *
 * `theme.css` carries the handbook's published "Typographic Scales" and
 * nothing else — a step the design does not have is deliberately absent, which
 * is what keeps a utility name honest. These two sizes appear only on this
 * page's frame: 22/700 on the service-card and how-it-works step titles, and
 * 13/700 on the hero badge, the add-ons price plate and the CTA guarantees.
 * Adding tokens for them would publish site-wide steps the design system does
 * not have, so they stay literal — the same way this file already writes its
 * headline sizes. `--text-body-md` (15px) is the opposite case: a real token
 * that already existed, so the 15px nodes below use it rather than a literal.
 *
 * Both spell out their line box, because an arbitrary `text-[…]` sets
 * font-size alone; the values are the ones the tokens they replace were
 * already giving these nodes, and the audit flagged only the size.
 */
const CARD_TITLE = "font-display text-[1.375rem] leading-[2rem] font-bold";
const MICRO_BOLD = "text-[0.8125rem] leading-[1.25rem] font-bold";

/**
 * Two line boxes the tokens set tighter than this frame draws them.
 *
 * The frame's body copy inside a card or a disclosure is 14/22; `text-body-sm`
 * carries 14/20. Its section sublines are 18/26; `text-body-lg` carries 18/28.
 * Both tokens are site-wide — `text-body-sm` alone has well over a hundred
 * call sites across `Blocks.tsx`, `Blocks2.tsx` and the dashboard — and the
 * only frame measured here is this page's, so the leading is overridden at the
 * call site rather than moved in `theme.css`. If the other frames turn out to
 * agree, the tokens are the right place and these two go away.
 *
 * Only paragraphs take these. The page's other 14px nodes (hero trust points,
 * coverage tags, the `Learn More` link, the footer links) are single-line
 * labels, where the line box is not what the frame is describing.
 */
const CARD_BODY = "text-body-sm leading-[1.375rem]";
const SUBLINE = "text-body-lg leading-[1.625rem]";

/**
 * Renders `**emphasis**` as brand red.
 *
 * Figma colours part of several headlines — the hero reads "Moving, clearance
 * & cleaning —" in ink and "fair, transparent, instantly calculated" in red.
 * Storing that as two blocks would make the dashboard edit two fields to
 * change one sentence, so the marker travels inside the string instead.
 */
function Emphasise({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/gs);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="text-brand-red">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}

/** The centred eyebrow / headline / subline block every section opens with. */
function SectionHeading({
  eyebrow,
  headline,
  subline,
  tone = "light",
  width = "full",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  tone?: "light" | "onRed";
  /**
   * The frame's heading width. Eight of the nine `section-heading` frames run
   * the full 1280 content column — their headline and subline text nodes are
   * both w=1280, CENTER — and only `final-cta` is drawn 800 wide. Capping
   * every one of them at 800 wrapped sublines a line earlier than designed,
   * so the cap is now the exception the CTA asks for rather than the default.
   */
  width?: "full" | "narrow";
}) {
  const onRed = tone === "onRed";

  return (
    <div
      className={`mx-auto grid w-full gap-4 text-center ${
        width === "narrow" ? "max-w-[800px]" : ""
      }`}
    >
      {/* `section-badge`: a 6px plate, 6/12 padding, 12/700 uppercase text.
          On the red band the plate is red-on-red, so only the text shows. */}
      {eyebrow ? (
        <p
          className={`mx-auto w-fit rounded-[6px] border px-3 py-1.5 text-caption font-bold tracking-[1px] uppercase ${
            onRed
              ? "border-brand-red bg-brand-red text-white"
              : "border-brand-yellow bg-yellow-tint text-brand-red"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}

      {headline ? (
        <h2
          className={`font-display text-[1.75rem] leading-[1.15] font-bold md:text-[2.5rem] ${
            onRed ? "text-white" : "text-text-strong"
          }`}
        >
          <Emphasise text={headline} />
        </h2>
      ) : null}

      {subline ? (
        <p className={`${SUBLINE} ${onRed ? "text-neutral-50" : "text-text-muted"}`}>
          {subline}
        </p>
      ) : null}
    </div>
  );
}

function Section({
  tone,
  gap = "56",
  children,
}: {
  tone: "white" | "subtle";
  /** The frame's auto-layout gap: 56 everywhere except Coverage, which is 40. */
  gap?: "56" | "40";
  children: ReactNode;
}) {
  return (
    <section className={tone === "white" ? "bg-neutral-0" : "bg-neutral-50"}>
      <div className={`${SHELL} ${PAD} grid ${gap === "40" ? "gap-10" : "gap-14"}`}>
        {children}
      </div>
    </section>
  );
}

export function Hero({ copy, locale }: { copy: Copy; locale: Locale }) {
  return (
    <section className="bg-neutral-50">
      <div className={`${SHELL} grid items-center gap-12 py-14 md:grid-cols-2 md:py-20`}>
        <div className="grid gap-8">
          {copy["hero.badge"] ? (
            <p
              className={`inline-flex w-fit items-center gap-2 rounded-full bg-brand-yellow px-4 py-2 ${MICRO_BOLD} text-text-strong`}
            >
              <Sparkle />
              {copy["hero.badge"]}
            </p>
          ) : null}

          <h1 className="font-display text-[2.25rem] leading-[1.12] font-extrabold text-text-strong md:text-[3.375rem]">
            <Emphasise text={copy["hero.headline"] ?? ""} />
          </h1>

          <p className="max-w-[632px] text-body-lg text-text-muted">{copy["hero.subline"]}</p>

          <div className="flex flex-wrap gap-4">
            <Link
              className="inline-flex items-center gap-2 rounded-md bg-brand-red px-7 py-4 text-body font-bold text-white transition-colors hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
              href={`/${locale}/rechner`}
            >
              {copy["hero.ctaPrimary"]}
              <Arrow />
            </Link>

            <Link
              className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-brand-red bg-neutral-0 px-7 py-4 text-body font-bold text-brand-red transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
              href={`/${locale}/preise`}
            >
              {copy["hero.ctaSecondary"]}
            </Link>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {[copy["hero.trust1"], copy["hero.trust2"]].filter(Boolean).map((point) => (
              <li
                key={point}
                className="flex items-center gap-2 text-body-sm font-semibold text-text-strong"
              >
                {/* `check-green`: the frame strokes these #2e7d32, darker than
                    the system's success green. */}
                <Check className="text-[#2e7d32]" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative: empty alt so a screen reader skips it. The photo is
            the `hero.image` row; the shipped file stands in without one. */}
        <img
          src={imageSrc(copy, "hero.image", "/images/home/hero-right.jpg")}
          alt=""
          width={600}
          height={480}
          className="hidden aspect-[5/4] w-full rounded-3xl object-cover md:block"
        />
      </div>
    </section>
  );
}

export function Services({ copy, locale }: { copy: Copy; locale: Locale }) {
  // The header's "Services" entry points at #services: the design has no
  // services index page, only this section. Each photo is the card's
  // `services.<key>.image` row; `image` is the file it falls back to.
  const cards = [
    { key: "moving", href: "/umzug", image: "/images/home/circular-photo-wrapper.jpg" },
    { key: "disposal", href: "/entsorgung", image: "/images/home/circular-photo-wrapper-2.jpg" },
    { key: "cleaning", href: "/reinigung", image: "/images/home/circular-photo-wrapper-3.jpg" },
  ];

  return (
    <div id="services" className="scroll-mt-24">
    <Section tone="white">
      <SectionHeading
        eyebrow={copy["services.eyebrow"]}
        headline={copy["services.headline"]}
        subline={copy["services.subline"]}
      />

      <div className="grid gap-8 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.key}
            className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-neutral-50 p-8"
          >
            <img
              src={imageSrc(copy, `services.${card.key}.image`, card.image)}
              alt=""
              width={341}
              height={213}
              className="aspect-[341/213] w-full rounded-lg object-cover"
            />

            <div className="grid gap-3">
              {/* cross:CENTER in the frame — the 11/700 badge sits on the
                  title's centre line, not on its cap line. */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={`${CARD_TITLE} text-text-strong`}>
                  {copy[`services.${card.key}.title`]}
                </h3>

                {/* 11/700 with no tracking: `text-caption` is 12px and adds
                    0.5px of letter-spacing this node does not have. */}
                {copy[`services.${card.key}.badge`] ? (
                  <span className="rounded-sm bg-yellow-tint px-2 py-1 text-[0.6875rem] leading-[1rem] font-bold tracking-normal whitespace-nowrap text-brand-red">
                    {copy[`services.${card.key}.badge`]}
                  </span>
                ) : null}
              </div>

              <p className={`${CARD_BODY} text-text-muted`}>
                {copy[`services.${card.key}.body`]}
              </p>
            </div>

            {copy[`services.${card.key}.price`] ? (
              <p className="flex items-center gap-2 rounded-md border border-border-subtle bg-neutral-0 p-4 text-body-sm font-bold text-text-strong">
                <Tag />
                {copy[`services.${card.key}.price`]}
              </p>
            ) : null}

            <Link
              className="mt-auto flex w-fit items-center gap-1 text-body-sm font-bold text-brand-red hover:underline"
              href={`/${locale}${card.href}`}
            >
              {copy["services.learnMore"] ?? "Learn More"}
              <Chevron />
            </Link>
          </article>
        ))}
      </div>
    </Section>
    </div>
  );
}

export function WhyUs({ copy }: { copy: Copy }) {
  // One glyph per card, as the frame names them: users, clock, credit-card,
  // shield — not the same tick four times.
  const points = [
    { key: "team", icon: <Users /> },
    { key: "punctual", icon: <Clock /> },
    { key: "prices", icon: <CreditCard /> },
    { key: "insured", icon: <ShieldOutline /> },
  ];

  return (
    <Section tone="subtle">
      <SectionHeading
        eyebrow={copy["why.eyebrow"]}
        headline={copy["why.headline"]}
        subline={copy["why.subline"]}
      />

      <div className="grid gap-8 md:grid-cols-2">
        {points.map((point) => (
          <div
            key={point.key}
            className="flex gap-5 rounded-xl border border-border-subtle bg-neutral-0 p-8"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-full border-[1.5px] border-brand-yellow bg-yellow-tint text-brand-red">
              {point.icon}
            </span>

            <div className="grid gap-2">
              <h3 className="font-display text-h4 font-bold text-text-strong">
                {copy[`why.${point.key}.title`]}
              </h3>
              <p className={`${CARD_BODY} text-text-muted`}>{copy[`why.${point.key}.body`]}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function HowItWorks({ copy }: { copy: Copy }) {
  const steps = ["step1", "step2", "step3"];

  return (
    <Section tone="white">
      <SectionHeading
        eyebrow={copy["how.eyebrow"]}
        headline={copy["how.headline"]}
        subline={copy["how.subline"]}
      />

      <ol className="grid gap-8 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step} className="grid gap-6">
            {/* No gap: the frame's step row is SPACE_BETWEEN over badge 54 +
                rule 351 = 405, which is the full width of a column in this
                grid, so there is no free space to distribute and the rule
                starts flush against the badge. `gap-4` held it 16px clear. */}
            <div className="flex items-center">
              {/* 54px written out, not `size-14`: the handbook's spacing scale
                  in theme.css has no rung 14, so `size-14` falls through to
                  Tailwind's stock `calc(--spacing * 14)` = 56px. The frame's
                  step-badge is 54. (The why-us icon wrapper keeps `size-14` —
                  it is a different node and the audit did not measure it.) */}
              <span className="grid size-[54px] shrink-0 place-items-center rounded-full bg-brand-red font-display text-h4 font-extrabold text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              {/* The 2px yellow rule the frame draws from each badge to the
                  next step. The last step has none, so it is not rendered. */}
              {index < steps.length - 1 ? (
                <span aria-hidden="true" className="hidden h-0.5 flex-1 bg-brand-yellow md:block" />
              ) : null}
            </div>

            <div className="grid gap-2">
              <h3 className={`${CARD_TITLE} text-text-strong`}>
                {copy[`how.${step}.title`]}
              </h3>
              <p className="text-body-md text-text-muted">{copy[`how.${step}.body`]}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function Addons({ copy }: { copy: Copy }) {
  const items = ["packing", "assembly", "parking", "storage"];

  return (
    <Section tone="subtle">
      <SectionHeading
        eyebrow={copy["addons.eyebrow"]}
        headline={copy["addons.headline"]}
        subline={copy["addons.subline"]}
      />

      <div className="grid gap-4">
        {items.map((item, index) => {
          const body = copy[`addons.${item}.body`];
          const price = copy[`addons.${item}.price`];

          // The frame gives only the first add-on a body; the other three are
          // heads. A head with nothing behind it is not a disclosure, so it is
          // rendered as one rather than as a control that opens on nothing.
          const head = (
            <>
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-brand-red" />
                <span className="font-display text-h5 font-bold text-text-strong">
                  {copy[`addons.${item}.title`]}
                </span>
              </span>
              {body ? (
                <ChevronDown className="shrink-0 text-brand-red transition-transform group-open:rotate-180" />
              ) : (
                <ChevronDown className="shrink-0 text-brand-red" />
              )}
            </>
          );

          const shell = "rounded-lg border border-border-subtle bg-neutral-0 p-6";

          if (!body) {
            return (
              <div key={item} className={`flex items-center justify-between gap-4 ${shell}`}>
                {head}
              </div>
            );
          }

          return (
            <details key={item} open={index === 0} className={`group ${shell}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:content-none">
                {head}
              </summary>

              <p className={`mt-4 ${CARD_BODY} text-text-muted`}>{body}</p>

              {price ? (
                <p
                  className={`mt-4 flex w-fit items-center gap-2 rounded-[6px] bg-neutral-50 px-4 py-2.5 ${MICRO_BOLD} text-brand-red`}
                >
                  <Info />
                  {price}
                </p>
              ) : null}
            </details>
          );
        })}
      </div>
    </Section>
  );
}

export function Areas({ copy }: { copy: Copy }) {
  const cities = (copy["areas.cities"] ?? "")
    .split(",")
    .map((city) => city.trim())
    .filter(Boolean);

  return (
    <Section tone="white" gap="40">
      <SectionHeading
        eyebrow={copy["areas.eyebrow"]}
        headline={copy["areas.headline"]}
        subline={copy["areas.subline"]}
      />

      <ul className="mx-auto flex max-w-[1000px] flex-wrap justify-center gap-3">
        {cities.map((city) => (
          <li
            key={city}
            className="flex items-center gap-1.5 rounded-full border border-border-subtle bg-neutral-50 px-5 py-2.5 text-body-sm font-semibold text-text-strong"
          >
            {/* The 6px yellow square each tag opens with. */}
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-[3px] bg-brand-yellow" />
            {city}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export interface HomeReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string | null;
  serviceType: string | null;
  avatar?: string | undefined;
}

export function Reviews({ copy, reviews }: { copy: Copy; reviews: HomeReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <Section tone="subtle">
      <SectionHeading
        eyebrow={copy["reviews.eyebrow"]}
        headline={copy["reviews.headline"]}
        subline={copy["reviews.subline"]}
      />

      <div className="grid gap-8 md:grid-cols-3">
        {reviews.slice(0, 3).map((review, index) => (
          <figure
            key={review.id}
            className="flex flex-col justify-between gap-4 rounded-xl border border-border-subtle bg-neutral-0 p-8"
          >
            <div className="grid gap-4">
              <Stars rating={review.rating} />
              <blockquote className="text-body-md text-text-strong">
                {review.comment}
              </blockquote>
            </div>

            {/* 16px of top padding, no rule: the frame draws no divider. */}
            <figcaption className="flex items-center gap-3 pt-4">
              <img
                src={imageSrc(
                  copy,
                  `reviews.${index + 1}.avatar`,
                  `/images/home/avatar-frame${index === 0 ? "" : `-${index + 1}`}.jpg`,
                )}
                alt=""
                width={48}
                height={48}
                className="size-12 shrink-0 rounded-full object-cover"
              />

              <span className="grid gap-0.5">
                <span className="text-body font-bold text-text-strong">
                  {review.authorName}
                </span>
                {/* 13/600 with no tracking: `text-caption` is 12px and adds
                    0.5px of letter-spacing the frame does not have. */}
                {review.serviceType ? (
                  <span className="text-[0.8125rem] leading-[1rem] font-semibold tracking-normal text-brand-red">
                    {review.serviceType}
                  </span>
                ) : null}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

export interface HomeFaq {
  id: string;
  question: string;
  answer: string;
}

export function Faq({ copy, entries }: { copy: Copy; entries: HomeFaq[] }) {
  if (entries.length === 0) return null;

  return (
    <Section tone="white">
      <SectionHeading
        eyebrow={copy["faq.eyebrow"]}
        headline={copy["faq.headline"]}
        subline={copy["faq.subline"]}
      />

      {/* <details> rather than a scripted accordion: keyboard accessible,
          findable by the browser's in-page search, and no JavaScript. */}
      <div className="grid gap-4">
        {entries.map((entry) => (
          <details key={entry.id} className="group rounded-lg bg-neutral-50 p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:content-none">
              <span className="font-display text-h5 font-bold text-text-strong">
                {entry.question}
              </span>
              {/* The frame's disclosure glyph here is a plus, stroked #121214. */}
              <Plus className="shrink-0 text-text-strong transition-transform group-open:rotate-45" />
            </summary>

            <p className={`mt-4 ${CARD_BODY} text-text-muted`}>{entry.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function FinalCta({ copy, locale }: { copy: Copy; locale: Locale }) {
  return (
    <section className="bg-brand-red">
      <div className={`${SHELL} ${PAD} grid gap-10`}>
        <SectionHeading
          eyebrow={copy["cta.eyebrow"]}
          headline={copy["cta.headline"]}
          subline={copy["cta.body"]}
          tone="onRed"
          width="narrow"
        />

        {/**
         * The calculator pill.
         *
         * A link dressed as an input rather than a real field: the area is
         * asked for on the wizard's fifth step, and a second place to type it
         * would either have to be carried across or silently ignored.
         */}
        <Link
          href={`/${locale}/rechner`}
          className="mx-auto flex w-full max-w-[640px] flex-wrap items-center gap-4 rounded-xl bg-neutral-0 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
        >
          <Calculator />
          <span className="flex-1 text-start text-body-md font-semibold text-text-muted">
            {copy["cta.placeholder"]}
          </span>
          <span className="rounded-md bg-brand-yellow px-7 py-4 text-body font-bold whitespace-nowrap text-text-strong">
            {copy["cta.button"]}
          </span>
        </Link>

        {/* One glyph per guarantee — shield, credit-card, award — all yellow. */}
        <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2">
          {[
            { text: copy["cta.trust1"], icon: <Shield /> },
            { text: copy["cta.trust2"], icon: <CreditCard size={16} /> },
            { text: copy["cta.trust3"], icon: <Award /> },
          ]
            .filter((entry) => Boolean(entry.text))
            .map((entry) => (
              <li
                key={entry.text}
                className={`flex items-center gap-2 ${MICRO_BOLD} text-white`}
              >
                <span className="text-brand-yellow">{entry.icon}</span>
                {entry.text}
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The keys the footer reads from the catalogue rather than from the CMS.
 *
 * Narrow rather than `MessageKey`, so `chrome()` can only be handed a key that
 * really is a plain string in every locale — the catalogue also holds plural
 * objects, which would render as `[object Object]`.
 */
type ChromeKey =
  | "footer.companyTitle"
  | "nav.howItWorks"
  | "nav.guide"
  | "nav.business"
  | "nav.partner";

/**
 * A footer label, preferring the CMS row so an admin can still rename it.
 *
 * The three columns the design draws are CMS-only, because the content seed
 * created their rows. The fourth column below is not in the design, so its
 * rows do not exist yet; the catalogue already carries every one of its labels
 * in all four locales, because the pages it points at use the same keys.
 *
 * `||` rather than `??`: a row that exists but is blank should fall back too,
 * since a blank label renders a link nobody can see or click.
 */
function chrome(copy: Copy, slot: string, key: ChromeKey, locale: Locale): string {
  return copy[slot] || MESSAGES[key][locale];
}

export function Footer({ copy, locale }: { copy: Copy; locale: Locale }) {
  const services = [
    { href: "/umzug", key: "footer.link.residential" },
    { href: "/umzug", key: "footer.link.corporate" },
    { href: "/entsorgung", key: "footer.link.clearance" },
    { href: "/umzug", key: "footer.link.senior" },
    { href: "/reinigung", key: "footer.link.cleaning" },
    { href: "/umzug", key: "footer.link.storage" },
  ];

  /**
   * The four pages the design draws but never links to.
   *
   * All fourteen page frames carry the same navbar — Calculator, Services,
   * Reviews, About Us, FAQ, Contact — and the same three-column footer, so the
   * frames put "page-blog", "page-partner", "page-for-business" and
   * "page-how-it-works" nowhere at all. They are real pages that return 200,
   * and a page a visitor cannot reach does not exist to them, so they are
   * gathered here rather than left to a homepage anchor.
   *
   * This column is the one part of the footer with no frame behind it. If the
   * design later gives these links a home, that is where they should move.
   */
  const company = [
    { href: "/so-funktioniert", slot: "footer.company.howItWorks", key: "nav.howItWorks" },
    { href: "/ratgeber", slot: "footer.company.guide", key: "nav.guide" },
    { href: "/fuer-unternehmen", slot: "footer.company.business", key: "nav.business" },
    { href: "/partner", slot: "footer.company.partner", key: "nav.partner" },
  ] as const;

  /**
   * The frame draws four legal links, the last of them "Cookie Policy" — a
   * separate destination from the "Privacy Policy" beside it, and the frame
   * "page-legal-cookie" exists for it. Both used to point at /datenschutz,
   * which left /cookies unreachable and the two labels doing the same thing.
   */
  const legal = [
    { href: "/impressum", key: "footer.legal.imprint" },
    { href: "/datenschutz", key: "footer.legal.privacy" },
    { href: "/agb", key: "footer.legal.terms" },
    { href: "/cookies", key: "footer.legal.cookies" },
  ];

  return (
    <footer className="bg-neutral-900 text-neutral-50">
      <div className={`${SHELL} grid gap-16 pt-20 pb-10`}>
        <div className="grid gap-16 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid content-start gap-6">
            <img
              src="/images/brand/logo.png"
              alt={copy["footer.brand"] ?? "m.on"}
              width={86}
              height={47}
              className="h-12 w-auto brightness-0 invert"
            />
            <p className="text-body-sm text-neutral-50">{copy["footer.tagline"]}</p>

            <ul className="flex gap-4">
              {SOCIALS.map((social) => (
                <li key={social.key}>
                  <a
                    href={copy[`footer.social.${social.key}`] || "#"}
                    aria-label={social.label}
                    className="grid size-9 place-items-center rounded-full bg-neutral-800 text-neutral-50 transition-colors hover:bg-brand-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid content-start gap-5">
            <h2 className="text-h6 font-bold text-brand-yellow">
              {copy["footer.servicesTitle"]}
            </h2>
            <ul className="grid gap-3">
              {services.map((item, index) => (
                <li key={`${item.key}-${index}`}>
                  <Link
                    className="text-body-sm text-neutral-50 hover:text-brand-yellow"
                    href={`/${locale}${item.href}`}
                  >
                    {copy[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid content-start gap-5">
            <h2 className="text-h6 font-bold text-brand-yellow">
              {chrome(copy, "footer.companyTitle", "footer.companyTitle", locale)}
            </h2>
            <ul className="grid gap-3">
              {company.map((item) => (
                <li key={item.href}>
                  <Link
                    className="text-body-sm text-neutral-50 hover:text-brand-yellow"
                    href={`/${locale}${item.href}`}
                  >
                    {chrome(copy, item.slot, item.key, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid content-start gap-5">
            <h2 className="text-h6 font-bold text-brand-yellow">
              {copy["footer.contactTitle"]}
            </h2>

            <ul className="grid gap-4 text-body-sm text-neutral-50">
              {copy["footer.phone"] ? (
                <li className="flex items-center gap-3">
                  <span className="text-brand-red">
                    <Phone />
                  </span>
                  <a
                    className="font-bold hover:text-brand-yellow"
                    href={`tel:${copy["footer.phone"].replace(/[^\d+]/g, "")}`}
                  >
                    {/* Latin digits keep their order inside Arabic text. */}
                    <bdi dir="ltr">{copy["footer.phone"]}</bdi>
                  </a>
                </li>
              ) : null}

              {copy["footer.email"] ? (
                <li className="flex items-center gap-3">
                  <span className="text-brand-red">
                    <Mail />
                  </span>
                  <a className="hover:text-brand-yellow" href={`mailto:${copy["footer.email"]}`}>
                    {copy["footer.email"]}
                  </a>
                </li>
              ) : null}

              {copy["footer.address"] ? (
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 text-brand-red">
                    <MapPin />
                  </span>
                  {copy["footer.address"]}
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="grid gap-4 border-t border-white/10 pt-6 md:flex md:items-center md:justify-between">
          <p className="text-caption text-neutral-50">
            © {new Date().getFullYear()} {copy["footer.brand"] ?? "m.on GmbH"}.{" "}
            {copy["footer.rights"]}
          </p>

          <ul className="flex flex-wrap gap-6">
            {legal.map((item, index) => (
              <li key={`${item.key}-${index}`}>
                <Link
                  className="text-caption text-neutral-50 hover:text-brand-yellow"
                  href={`/${locale}${item.href}`}
                >
                  {copy[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* ── Icons: 24px box, 2px stroke, rounded joins ─────────────────────── */

/* ── Footer icons ────────────────────────────────────────────────────── */

/**
 * The contact icons are brand red rather than inheriting, per the footer
 * frame. Their 2px stroke is the whole set's — every vector in the homepage
 * and footer frames is strokeWeight 2, which `icon()` now applies.
 */
function Phone() {
  return icon(
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />,
    undefined,
    16,
  );
}

function Mail() {
  return icon(
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </>,
    undefined,
    16,
  );
}

function MapPin() {
  return icon(
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>,
    undefined,
    16,
  );
}

/**
 * The four social marks, drawn rather than pulled from an icon package.
 *
 * Brand glyphs are paths, not strokes, so these are filled shapes — the only
 * icons in the system that are.
 */
const SOCIALS = [
  {
    key: "instagram",
    label: "Instagram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4 1.3-.1 1.7-.1 4.8-.1Zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2.1.3-.5.2-.9.4-1.2.8-.4.3-.6.7-.8 1.2-.1.4-.3 1-.3 2.1-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.3 2.1.2.5.4.9.8 1.2.3.4.7.6 1.2.8.4.1 1 .3 2.1.3 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2.1-.3.5-.2.9-.4 1.2-.8.4-.3.6-.7.8-1.2.1-.4.3-1 .3-2.1.1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.3-2.1-.2-.5-.4-.9-.8-1.2-.3-.4-.7-.6-1.2-.8-.4-.1-1-.3-2.1-.3-1.2-.1-1.6-.1-4.7-.1Zm0 3.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 8.1a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm6.3-8.3a1.2 1.2 0 1 1-2.3 0 1.2 1.2 0 0 1 2.3 0Z" />
      </svg>
    ),
  },
  {
    key: "x",
    label: "X",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.5 3h3l-6.6 7.5L21.8 21h-6l-4.7-6.1L5.6 21H2.5l7-8L2.4 3h6.2l4.3 5.6L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z" />
      </svg>
    ),
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
      </svg>
    ),
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z" />
      </svg>
    ),
  },
];


function icon(path: ReactNode, className?: string, size = 18) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ? `${className} shrink-0` : "shrink-0"}
    >
      {path}
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return icon(<path d="M20 6 9 17l-5-5" />, className);
}

function Arrow() {
  return icon(
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>,
    undefined,
    16,
  );
}

/**
 * The `Learn More` chevron, 14x14 per the frame.
 *
 * Its one call site is the services card. `ChevronDown` below is a separate
 * component at 20 because the add-ons disclosure glyph really is that size —
 * these two are not one icon at two sizes.
 */
function Chevron({ className }: { className?: string }) {
  return icon(<path d="m9 18 6-6-6-6" />, className, 14);
}

function ChevronDown({ className }: { className?: string }) {
  return icon(<path d="m6 9 6 6 6-6" />, className, 20);
}

function Plus({ className }: { className?: string }) {
  return icon(<path d="M12 5v14M5 12h14" />, className, 20);
}

function Info() {
  return icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </>,
    "text-brand-red",
    14,
  );
}

function Users() {
  return icon(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>,
    undefined,
    24,
  );
}

function Clock() {
  return icon(
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>,
    undefined,
    24,
  );
}

function CreditCard({ size = 24 }: { size?: number }) {
  return icon(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>,
    undefined,
    size,
  );
}

function ShieldOutline() {
  return icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />, undefined, 24);
}

function Award() {
  return icon(
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="m8.2 13.4-1.4 8 5.2-3.1 5.2 3.1-1.4-8" />
    </>,
    undefined,
    16,
  );
}

function Tag() {
  return icon(
    <>
      <path d="M12.6 2.7a2 2 0 0 0-1.4-.6H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.3 8.3a2 2 0 0 0 2.8 0l6.8-6.8a2 2 0 0 0 0-2.8Z" />
      <circle cx="7" cy="7" r="1.2" />
    </>,
    "text-brand-red",
    16,
  );
}

function Shield() {
  return icon(
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    undefined,
    16,
  );
}

function Sparkle() {
  return icon(
    <path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.8 2.8m7.2 7.2 2.8 2.8m0-12.8-2.8 2.8M8.4 15.6l-2.8 2.8" />,
    undefined,
    16,
  );
}

function Calculator() {
  return icon(
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4" />
    </>,
    "text-brand-red",
    24,
  );
}

/** Five stars, drawn hollow: the frame's stars carry a 2px stroke and no fill. */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-1" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className={n <= rating ? "text-brand-yellow" : "text-neutral-300"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />
        </svg>
      ))}
    </span>
  );
}
