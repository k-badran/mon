import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";

import { FaqList, type HomeFaq } from "./FaqList";
import { GERMANY_MAP, MAP_CITIES } from "./germany-map";

export type { HomeFaq };

/**
 * The homepage's sections.
 *
 * Built against the M.io "homepage" frame 86:4671, measured rather than
 * eyeballed. It replaced the first homepage frame (3:4) and differs from it in
 * more than copy: the sections are all white now, the hero and the services
 * row run wider than the 1280 column (46px and 32px from the frame edge), the
 * three brand blocks (values, promise, experience) bleed their photos to the
 * page edge, and several headings are start-aligned rather than centred.
 * The why-us, add-ons, reviews and red closing-CTA sections are gone.
 *
 * The narrow layouts follow the brand-values presentation 91:5805, which draws
 * the values blocks at tablet and 390 widths; the other sections have no small
 * frame, so they stack the way the presentation does.
 *
 * Every string comes from the `copy` map, which the page fetches from
 * `/api/site/content`. Nothing here hardcodes marketing text: changing a
 * headline is a dashboard edit, not a deploy. The photos are `image` rows in
 * the same map; the file paths written here are only their fallbacks.
 * A missing block renders as
 * nothing rather than throwing, so a half-filled CMS degrades quietly.
 *
 * Server components, except the FAQ list: its topic tabs filter the
 * questions, which is the one thing on the page that needs a click handler.
 */

export type Copy = Record<string, string>;

/** 100px block padding on a 1280 content column, 80px inline. */
const SHELL = "mx-auto w-full max-w-[1440px] px-5 md:px-10 2xl:px-20";
const PAD = "py-16 md:py-25";

/**
 * Frame sizes the handbook's type scale has no rung for, written out here.
 *
 * `theme.css` carries the published "Typographic Scales" and nothing else, so
 * a size only this frame uses stays literal rather than becoming a site-wide
 * token. Each spells out its line box, because an arbitrary `text-[…]` sets
 * the font size alone.
 */
const CARD_TITLE = "font-display text-[1.375rem] leading-[1.75rem] font-bold"; // 22/28
const CARD_BODY = "text-body-sm leading-[1.375rem]"; // 14/22
const SUBLINE = "text-body-lg leading-[1.625rem]"; // 18/26
/** The 15/20 buttons of the brand blocks (`text-body-md` is 15/19.5). */
const BUTTON_TEXT = "text-[0.9375rem] leading-5 font-bold";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";
const RED_BUTTON = `inline-flex items-center justify-center gap-2 rounded-md bg-brand-red text-white transition-colors hover:bg-red-600 ${FOCUS}`;

/**
 * Renders `**emphasis**` as brand red.
 *
 * "What makes us m.on?" colours "m.on" red. Storing that as two blocks would
 * make the dashboard edit two fields to change one sentence, so the marker
 * travels inside the string instead.
 */
function Emphasise({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/gs);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="text-brand-red">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** A comma-separated CMS row as a list. Arabic rows use the Arabic comma. */
function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,،]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * `section-badge`: a 6px plate, 6/12 padding, 12/16 bold uppercase red on the
 * yellow tint. The FAQ's badges track 0.5px where every other one tracks 1px.
 */
export function Badge({ text, tracking = "wide" }: { text: string; tracking?: "wide" | "tight" }) {
  return (
    <p
      className={`w-fit rounded-[6px] border border-brand-yellow bg-yellow-tint px-3 py-1.5 text-caption font-bold text-brand-red uppercase ${
        tracking === "wide" ? "tracking-[1px]" : "tracking-[0.5px]"
      }`}
    >
      {text}
    </p>
  );
}

/**
 * The eyebrow / headline / subline block, 16px apart.
 *
 * Services and How It Works centre it on the full 1280 column; Where We
 * Operate and the FAQ set it start-aligned in their own column.
 */
function SectionHeading({
  id,
  eyebrow,
  headline,
  subline,
  align = "center",
  badgeTracking,
}: {
  id?: string;
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  align?: "center" | "start";
  badgeTracking?: "wide" | "tight";
}) {
  const centred = align === "center";

  return (
    <div className={`grid gap-4 ${centred ? "justify-items-center text-center" : "text-start"}`}>
      {eyebrow ? <Badge text={eyebrow} {...(badgeTracking ? { tracking: badgeTracking } : {})} /> : null}

      {headline ? (
        <h2
          id={id}
          className="font-display text-[1.75rem] leading-[2.125rem] font-bold text-text-strong md:text-[2.5rem] md:leading-[3rem]"
        >
          <Emphasise text={headline} />
        </h2>
      ) : null}

      {subline ? <p className={`${SUBLINE} text-text-muted`}>{subline}</p> : null}
    </div>
  );
}

/* ── Hero ───────────────────────────────────────────────────────────── */

export function Hero({ copy, locale }: { copy: Copy; locale: Locale }) {
  return (
    <section className="bg-neutral-0">
      {/* 46px from the frame edge, the nav bar's own inset — not the 80px
          column the sections below use. The frame puts the hero 105px under
          the nav and 62px above the services section. */}
      <div
        className={`mx-auto grid w-full max-w-[1440px] items-center gap-10 px-5 pt-10 pb-12 md:px-10 lg:flex lg:justify-between lg:gap-12 lg:pt-[105px] lg:pb-[62px] 2xl:px-[46px]`}
      >
        <div className="grid max-w-[632px] gap-2">
          {/* "move on · Go on" is set in the brand's wordmark face, which the
              site does not ship, so the frame carries it as an image. The CMS
              row is its text, read as the alt. */}
          {copy["hero.tagline"] ? (
            <img
              src={imageSrc(copy, "hero.taglineImage", "/images/home/tagline-move-on-go-on.png")}
              alt={copy["hero.tagline"]}
              width={494}
              height={56}
              className="h-10 w-auto self-start md:h-14"
            />
          ) : null}

          <div className="grid gap-8">
            <h1 className="font-display text-[2.25rem] leading-[2.625rem] font-extrabold text-text-strong md:text-[3.375rem] md:leading-[3.875rem]">
              {copy["hero.headline"]}
            </h1>

            {/* The frame breaks the subline after "Move on. Go on." with a
                line separator; the CMS row keeps it as a newline. */}
            <p className="text-body-lg whitespace-pre-line text-text-muted">
              {copy["hero.subline"]}
            </p>

            <div className="flex flex-wrap gap-4">
              {copy["hero.ctaPrimary"] ? (
                <Link
                  className={`${RED_BUTTON} px-7 py-4 text-base leading-[1.3125rem] font-bold`}
                  href={`/${locale}/rechner`}
                >
                  {copy["hero.ctaPrimary"]}
                  <Arrow />
                </Link>
              ) : null}

              {copy["hero.ctaSecondary"] ? (
                <Link
                  className={`inline-flex items-center rounded-md border-[1.5px] border-brand-red bg-neutral-0 px-7 py-4 text-base leading-[1.3125rem] font-bold text-brand-red transition-colors hover:bg-red-50 ${FOCUS}`}
                  href={`/${locale}/preise`}
                >
                  {copy["hero.ctaSecondary"]}
                </Link>
              ) : null}
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {[copy["hero.trust1"], copy["hero.trust2"]].filter(Boolean).map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-2 text-body-sm leading-[1.125rem] font-semibold text-text-strong"
                >
                  {/* `check-green`: stroked #2e7d32, darker than the system's
                      success green. */}
                  <Check className="text-[#2e7d32]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Decorative: the headline already says what the truck shows. */}
        <img
          src={imageSrc(copy, "hero.image", "/images/home/hero-truck.jpg")}
          alt=""
          width={600}
          height={480}
          className="aspect-[5/4] w-full rounded-3xl object-cover lg:w-[min(600px,46%)] lg:shrink-0"
        />
      </div>
    </section>
  );
}

/* ── Services ───────────────────────────────────────────────────────── */

/**
 * The six service cards, in frame order.
 *
 * The frame's row is 1403 wide from x=32 and clips: three cards and a sliver
 * of the fourth show at 1440, the rest are reached by scrolling. Cards 4–6
 * reuse the first three photos, exactly as the frame does. Each photo is the
 * card's `services.<key>.image` row; the path here is only its fallback.
 */
const SERVICE_CARDS = [
  { key: "moving", href: "/umzug", image: "/images/home/circular-photo-wrapper.jpg" },
  { key: "disposal", href: "/entsorgung", image: "/images/home/circular-photo-wrapper-2.jpg" },
  { key: "cleaning", href: "/reinigung", image: "/images/home/circular-photo-wrapper-3.jpg" },
  { key: "packing", href: "/umzug", image: "/images/home/circular-photo-wrapper.jpg" },
  { key: "assembly", href: "/umzug", image: "/images/home/circular-photo-wrapper-2.jpg" },
  { key: "storage", href: "/umzug", image: "/images/home/circular-photo-wrapper-3.jpg" },
];

export function Services({ copy, locale }: { copy: Copy; locale: Locale }) {
  const cards = SERVICE_CARDS.filter((card) => copy[`services.${card.key}.title`]);

  // The nav's and the footer's "Services" links point at /#services: the
  // design has no services index page, only this section.
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="scroll-mt-24 bg-neutral-0"
    >
      <div className={`${PAD} mx-auto grid w-full max-w-[1440px] gap-14`}>
        <div className="px-5 md:px-10 2xl:px-20">
          <SectionHeading
            id="services-heading"
            eyebrow={copy["services.eyebrow"]}
            headline={copy["services.headline"]}
            subline={copy["services.subline"]}
          />
        </div>

        {/* Scrolls rather than wraps. The clipped next card is the cue that
            there is more; every card holds a link, so keyboard focus scrolls
            it into view without the row needing a tab stop of its own. */}
        <ul className="flex snap-x snap-mandatory scroll-ps-5 gap-8 overflow-x-auto px-5 [scrollbar-width:none] md:scroll-ps-10 md:px-10 2xl:scroll-ps-8 2xl:px-8 [&::-webkit-scrollbar]:hidden">
          {cards.map((card) => (
            <li
              key={card.key}
              className="flex w-[min(405px,82vw)] shrink-0 snap-start flex-col gap-6 rounded-xl border border-border-subtle bg-neutral-50 p-6 md:w-[405px] md:p-8"
            >
              <img
                src={imageSrc(copy, `services.${card.key}.image`, card.image)}
                alt=""
                width={341}
                height={213}
                className="aspect-[341/213] w-full rounded-lg object-cover"
              />

              <div className="grid gap-3">
                {/* cross:CENTER — the 11/14 badge sits on the title's centre
                    line, not on its cap line. */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className={`${CARD_TITLE} text-text-strong`}>
                    {copy[`services.${card.key}.title`]}
                  </h3>

                  {copy[`services.${card.key}.badge`] ? (
                    <span className="rounded-sm bg-yellow-tint px-2 py-1 text-[0.6875rem] leading-[0.875rem] font-bold whitespace-nowrap text-brand-red">
                      {copy[`services.${card.key}.badge`]}
                    </span>
                  ) : null}
                </div>

                <p className={`${CARD_BODY} text-text-muted`}>
                  {copy[`services.${card.key}.body`]}
                </p>
              </div>

              {copy[`services.${card.key}.price`] ? (
                <p className="flex items-center gap-2 rounded-md border border-border-subtle bg-neutral-0 p-4 text-body-sm leading-[1.125rem] font-bold text-text-strong">
                  <Tag />
                  {copy[`services.${card.key}.price`]}
                </p>
              ) : null}

              <Link
                className={`mt-auto flex w-fit items-center gap-1 text-body-sm leading-[1.125rem] font-bold text-brand-red hover:underline ${FOCUS}`}
                href={`/${locale}${card.href}`}
              >
                {copy["services.learnMore"]}
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Values · Promise · Experience ──────────────────────────────────── */

/**
 * The three brand blocks, one frame group (91:5803) in the design.
 *
 * 62px under the services section, 79px between blocks and 63px above How It
 * Works; on a phone the presentation's 390 frame stacks them 48px apart.
 */
export function BrandBlocks({ copy, locale }: { copy: Copy; locale: Locale }) {
  return (
    <div className="grid gap-12 bg-neutral-0 py-16 lg:gap-20 lg:pt-[62px] lg:pb-[63px]">
      <Values copy={copy} locale={locale} />
      <PromiseBlock copy={copy} />
      <Experience copy={copy} />
    </div>
  );
}

function Values({ copy, locale }: { copy: Copy; locale: Locale }) {
  if (!copy["values.headline"]) return null;

  const acronym = [1, 2, 3]
    .map((n) => ({ letter: copy[`values.a${n}.letter`], word: copy[`values.a${n}.word`] }))
    .filter((entry) => entry.letter && entry.word);
  const creed = list(copy["values.creed"]);

  return (
    <section
      aria-labelledby="values-heading"
      className="mx-auto grid w-full max-w-[1440px] gap-6 px-6 lg:grid-cols-[440px_1fr] lg:items-center lg:gap-16 lg:px-0 2xl:grid-cols-[600px_1fr]"
    >
      {/* Bleeds to the page edge on wide screens, so only its inner corners
          are rounded (r 0/24/24/0, mirrored in RTL by the logical radius).
          Past 1440 the frame's edge is no longer the window's, so all four
          corners round again rather than ending in a hard cut mid-page. */}
      <div className="relative">
        <img
          src={imageSrc(copy, "values.image", "/images/home/values-team.jpg")}
          alt={copy["values.imageAlt"] ?? ""}
          width={600}
          height={750}
          className="h-[220px] w-full rounded-2xl object-cover sm:h-[360px] lg:h-[680px] lg:rounded-s-none lg:rounded-e-3xl 2xl:h-[750px] min-[1441px]:rounded-s-3xl"
        />

        {copy["values.reviewsFigure"] ? (
          <p className="absolute end-4 top-4 flex items-center gap-2 rounded-lg bg-neutral-0 p-2.5 shadow-[0_8px_16px_rgba(0,0,0,0.05)] lg:end-6 lg:top-6">
            <span className="grid size-7 place-items-center rounded-full bg-yellow-tint text-brand-yellow">
              <Star />
            </span>
            <span className="grid gap-0.5">
              <bdi className="font-display text-base leading-5 font-extrabold text-text-strong">
                {copy["values.reviewsFigure"]}
              </bdi>
              <span className="text-[0.6875rem] leading-[0.875rem] font-semibold text-text-muted">
                {copy["values.reviewsLabel"]}
              </span>
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid justify-items-start gap-6 lg:gap-8 lg:pe-10 2xl:pe-20">
        {copy["values.eyebrow"] ? <Badge text={copy["values.eyebrow"]} /> : null}

        <h2
          id="values-heading"
          className="font-display text-[1.75rem] leading-[2.125rem] font-extrabold text-text-strong lg:text-[3rem] lg:leading-[3.5rem]"
        >
          <Emphasise text={copy["values.headline"]} />
        </h2>

        {/* `versions-container`: both readings of the name, A over B, split
            by a 1px rule. */}
        {acronym.length > 0 || creed.length > 0 ? (
          <div className="grid w-full gap-4 rounded-xl border border-border-subtle bg-neutral-0 p-4 lg:gap-6 lg:p-6">
            {acronym.length > 0 ? (
              <div className="grid gap-2.5 lg:gap-4">
                <p className={VERSION_LABEL}>{copy["values.acronymLabel"]}</p>
                <dl className="grid grid-cols-3 gap-2 lg:gap-4">
                  {acronym.map((entry) => (
                    <div key={entry.letter} className="grid content-start gap-0.5 lg:gap-1">
                      <dt className="font-display text-2xl leading-[1.875rem] font-black text-brand-red lg:text-[2.25rem] lg:leading-[2.8125rem]">
                        {entry.letter}
                      </dt>
                      <dd className="text-[0.6875rem] leading-[0.875rem] font-bold text-text-strong lg:text-body-sm lg:leading-[1.125rem]">
                        {entry.word}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {acronym.length > 0 && creed.length > 0 ? (
              <hr className="border-border-subtle" />
            ) : null}

            {creed.length > 0 ? (
              <div className="grid gap-2 lg:gap-4">
                <p className={VERSION_LABEL}>{copy["values.creedLabel"]}</p>
                <p className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs leading-4 font-bold text-text-strong lg:gap-x-2 lg:text-body-sm lg:leading-[1.125rem]">
                  <ShieldFilled />
                  {creed.map((word, index) => (
                    <span key={word} className="flex items-center gap-1 lg:gap-2">
                      {index > 0 ? (
                        <span aria-hidden="true" className="font-normal text-brand-red">
                          ·
                        </span>
                      ) : null}
                      {word}
                    </span>
                  ))}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {copy["values.body"] ? (
          <p className="text-body-sm leading-[1.375rem] text-text-muted lg:text-base lg:leading-[1.625rem]">
            {copy["values.body"]}
          </p>
        ) : null}

        {copy["values.cta"] ? (
          <Link
            href={`/${locale}/rechner`}
            className={`${RED_BUTTON} ${BUTTON_TEXT} w-full px-6 py-3.5 lg:w-auto`}
          >
            {copy["values.cta"]}
            <Arrow />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** 12/16 bold uppercase red, 1px tracking; 11/14 at 0.5px on a phone. */
const VERSION_LABEL =
  "text-[0.6875rem] leading-[0.875rem] font-bold tracking-[0.5px] text-brand-red uppercase lg:text-caption lg:tracking-[1px]";

function PromiseBlock({ copy }: { copy: Copy }) {
  if (!copy["promise.headline"]) return null;

  return (
    <section
      aria-labelledby="promise-heading"
      className="mx-auto grid w-full max-w-[1440px] gap-6 px-6 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-16 lg:px-0 2xl:grid-cols-[1fr_506px]"
    >
      <div className="grid justify-items-start gap-6 lg:gap-8 lg:ps-10 2xl:ps-20">
        {copy["promise.eyebrow"] ? <Badge text={copy["promise.eyebrow"]} /> : null}

        <div className="grid gap-6 lg:gap-4">
          <h2
            id="promise-heading"
            className="font-display text-[1.75rem] leading-[2.125rem] font-extrabold text-text-strong lg:text-[2.75rem] lg:leading-[3.25rem]"
          >
            {copy["promise.headline"]}
          </h2>
          {copy["promise.body"] ? (
            <p className="text-body-sm leading-[1.375rem] text-text-muted lg:text-body-lg lg:leading-7">
              {copy["promise.body"]}
            </p>
          ) : null}
        </div>

        {/* Same page: the button scrolls back up to the service cards. */}
        {copy["promise.cta"] ? (
          <a
            href="#services"
            className={`${RED_BUTTON} ${BUTTON_TEXT} w-full px-6 py-3.5 lg:w-auto`}
          >
            {copy["promise.cta"]}
            <Arrow />
          </a>
        ) : null}
      </div>

      {/* Bleeds to the end edge; r 24/0/0/24 on the inner side only. */}
      <img
        src={imageSrc(copy, "promise.image", "/images/home/promise-truck-interior.jpg")}
        alt={copy["promise.imageAlt"] ?? ""}
        width={506}
        height={506}
        className="h-[200px] w-full rounded-2xl object-cover sm:h-[360px] lg:aspect-square lg:h-auto lg:rounded-e-none lg:rounded-s-3xl min-[1441px]:rounded-e-3xl"
      />
    </section>
  );
}

function Experience({ copy }: { copy: Copy }) {
  const photos = [
    { key: "team", image: "/images/home/experience-team.jpg" },
    { key: "work", image: "/images/home/experience-work.jpg" },
    { key: "result", image: "/images/home/experience-result.jpg" },
  ].filter((photo) => copy[`experience.${photo.key}.title`]);

  if (!copy["experience.headline"] || photos.length === 0) return null;

  return (
    <section
      aria-labelledby="experience-heading"
      className="mx-auto grid w-full max-w-[1440px] gap-6 lg:gap-10 lg:px-10 2xl:px-20"
    >
      <div className="grid gap-1.5 px-6 lg:gap-2 lg:px-0">
        <h2
          id="experience-heading"
          className="font-display text-2xl leading-[1.875rem] font-extrabold text-text-strong lg:text-[1.75rem] lg:leading-[2.1875rem]"
        >
          {copy["experience.headline"]}
        </h2>
        {copy["experience.subline"] ? (
          <p className="text-body-sm leading-[1.125rem] text-text-muted lg:text-base lg:leading-[1.3125rem]">
            {copy["experience.subline"]}
          </p>
        ) : null}
      </div>

      {/* A swipeable strip on a phone (91:5805's carousel-track: 280px cards,
          16 apart, 24 in from the edge); three columns from the tablet frame
          up. Focusable, since nothing inside it is. */}
      <ul
        tabIndex={0}
        aria-labelledby="experience-heading"
        className={`flex snap-x snap-mandatory scroll-ps-6 gap-4 overflow-x-auto px-6 [scrollbar-width:none] lg:grid lg:grid-cols-3 lg:gap-8 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden ${FOCUS}`}
      >
        {photos.map((photo) => (
          <li key={photo.key} className="grid w-[280px] shrink-0 snap-start content-start gap-3 lg:w-auto lg:gap-4">
            <img
              src={imageSrc(copy, `experience.${photo.key}.image`, photo.image)}
              alt={copy[`experience.${photo.key}.alt`] ?? ""}
              width={405}
              height={270}
              className="aspect-[280/180] w-full rounded-2xl object-cover lg:aspect-[3/2]"
            />
            <div className="grid gap-1">
              <h3 className="font-display text-[0.9375rem] leading-[1.1875rem] font-bold text-text-strong lg:text-base lg:leading-5">
                {copy[`experience.${photo.key}.title`]}
              </h3>
              <p className="text-[0.8125rem] leading-[1.0625rem] text-text-muted lg:text-body-sm lg:leading-[1.125rem]">
                {copy[`experience.${photo.key}.body`]}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── How it works ───────────────────────────────────────────────────── */

export function HowItWorks({ copy, locale }: { copy: Copy; locale: Locale }) {
  const steps = [
    { key: "step1", icon: <Calculator /> },
    { key: "step2", icon: <CalendarCheck /> },
    { key: "step3", icon: <Truck /> },
  ].filter((step) => copy[`how.${step.key}.title`]);

  return (
    <section aria-labelledby="how-heading" className="bg-neutral-0">
      <div className={`${SHELL} ${PAD} grid gap-14`}>
        <SectionHeading
          id="how-heading"
          eyebrow={copy["how.eyebrow"]}
          headline={copy["how.headline"]}
          subline={copy["how.subline"]}
        />

        {/* `step-card`s. The first is drawn selected — 2px red border and a
            red-tinted shadow — as the step a visitor starts on. */}
        <ol className="grid gap-6 md:grid-cols-3 md:gap-8">
          {steps.map((step, index) => (
            <li
              key={step.key}
              className={`grid content-start gap-6 rounded-xl bg-neutral-0 p-8 ${
                index === 0
                  ? "border-2 border-brand-red shadow-[0_8px_16px_rgba(215,22,53,0.06)]"
                  : "border border-border-subtle"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="font-display text-[4rem] leading-[5.0625rem] font-extrabold text-brand-red/18"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="grid size-11 place-items-center rounded-full bg-brand-red/7 text-brand-red">
                  {step.icon}
                </span>
              </div>

              <div className="grid gap-2">
                <h3 className={`${CARD_TITLE} text-text-strong`}>
                  {copy[`how.${step.key}.title`]}
                </h3>
                <p className="text-body-md leading-[1.375rem] text-text-muted">
                  {copy[`how.${step.key}.body`]}
                </p>
              </div>

              {/* The frame closes every card with a 1px rule. */}
              <hr className="border-border-subtle" />
            </li>
          ))}
        </ol>

        {copy["how.cta"] ? (
          <Link
            href={`/${locale}/rechner`}
            className={`mx-auto inline-flex items-center rounded-full bg-brand-red px-9 py-3.5 font-display text-base leading-5 font-bold text-white transition-colors hover:bg-red-600 ${FOCUS}`}
          >
            {copy["how.cta"]}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/* ── Where we operate ───────────────────────────────────────────────── */

/**
 * How many cities, from the top of the CMS list, get a named pin. The frame
 * names five (Berlin, München, Hamburg, Köln, Frankfurt) and marks the rest
 * with bare dots — naming all fifteen would pile the Ruhr labels on top of
 * one another.
 */
const NAMED_PINS = 5;

const normaliseCity = (name: string) => name.trim().toLocaleLowerCase("de");

/** The map position for a CMS city name, by its name or an alias; none for a city the map does not know. */
function mapCity(name: string) {
  const key = normaliseCity(name);
  return MAP_CITIES.find((city) => [city.name, ...(city.aliases ?? [])].some((n) => normaliseCity(n) === key));
}

/** Keeps a label readable where it crosses a state border or a neighbour's coast. */
const PIN_LABEL_HALO = "[text-shadow:0_0_2px_var(--color-neutral-0),0_0_4px_var(--color-neutral-0)]";

export function Areas({ copy }: { copy: Copy }) {
  const cities = list(copy["areas.cities"]);
  const districts = list(copy["areas.districts"]);

  if (!copy["areas.headline"]) return null;

  /*
   * Pins come from the CMS list, placed at each city's real position on the
   * generated Natural Earth map (see germany-map.ts), so adding or reordering
   * a city moves its pin with it. The first city is the head office — Berlin
   * in the frame — and gets the ringed pin and the star. Drawn in reverse so
   * the named pins sit above the bare dots.
   */
  const pins = cities
    .flatMap((name, index) => {
      const at = mapCity(name);
      return at ? [{ name, index, at }] : [];
    })
    .reverse();

  return (
    <section aria-labelledby="areas-heading" className="bg-neutral-0">
      <div className={`${SHELL} ${PAD} grid items-center gap-10 lg:grid-cols-[minmax(0,580px)_1fr] lg:gap-16`}>
        <div className="w-full rounded-3xl bg-neutral-100 p-6">
          {/*
            The map and its pins share one box locked to the SVG's aspect, so a
            pin's percent position is a point on the drawing at every width.
            `dir="ltr"` and physical `left`: geography does not mirror in RTL.
          */}
          <div dir="ltr" className="relative aspect-[532/572] w-full overflow-hidden rounded">
            <img
              src={GERMANY_MAP.src}
              alt={copy["areas.mapAlt"] ?? ""}
              width={GERMANY_MAP.width}
              height={GERMANY_MAP.height}
              loading="lazy"
              decoding="async"
              className="size-full"
            />

            {/* The city list beside the map names every city; the pins only repeat it. */}
            <ul aria-hidden="true">
              {pins.map(({ name, index, at }) => (
                <li key={name} className="absolute" style={{ left: `${at.x}%`, top: `${at.y}%` }}>
                  {index === 0 ? (
                    <>
                      <span className="absolute grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-brand-red bg-neutral-0 shadow-sm">
                        <span className="size-3 rounded-full bg-brand-yellow" />
                      </span>
                      <span
                        className={`absolute top-3 -translate-x-1/2 text-caption leading-4 font-bold tracking-normal whitespace-nowrap text-text-strong ${PIN_LABEL_HALO}`}
                      >
                        {at.label ?? name} ★
                      </span>
                    </>
                  ) : index < NAMED_PINS ? (
                    <>
                      <span className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-text-strong bg-brand-yellow" />
                      <span
                        className={`absolute top-2 -translate-x-1/2 text-[0.6875rem] leading-[0.875rem] font-semibold whitespace-nowrap text-text-muted ${PIN_LABEL_HALO}`}
                      >
                        {at.label ?? name}
                      </span>
                    </>
                  ) : (
                    <span className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-yellow ring-1 ring-text-strong/60" />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid gap-10">
          <SectionHeading
            id="areas-heading"
            align="start"
            eyebrow={copy["areas.eyebrow"]}
            headline={copy["areas.headline"]}
            subline={copy["areas.subline"]}
          />

          {/* Three columns of five, filled top to bottom. */}
          {cities.length > 0 ? (
            <ul className="columns-2 gap-6 sm:columns-3">
              {cities.map((city, index) => (
                <li
                  key={city}
                  className={`mb-4 flex break-inside-avoid items-center gap-2 text-body-sm leading-[1.125rem] text-text-strong ${
                    index === 0 ? "font-bold" : "font-semibold"
                  }`}
                >
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-[3px] bg-brand-yellow" />
                  {city}
                </li>
              ))}
            </ul>
          ) : null}

          {districts.length > 0 ? (
            <div className="grid gap-2 border-t border-border-subtle pt-4">
              <p className="text-body-sm leading-[1.125rem] font-bold text-text-muted">
                {copy["areas.districtsLabel"]}
              </p>
              <ul className="flex flex-wrap gap-3">
                {districts.map((district) => (
                  <li
                    key={district}
                    className="rounded-full border border-border-subtle bg-neutral-50 px-3 py-1.5 text-[0.8125rem] leading-[1.0625rem] text-text-muted"
                  >
                    {district}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* `trust-chip` (92:324). */}
          {copy["areas.trustFigure"] ? (
            <p className="flex w-fit items-center gap-2.5 rounded-lg bg-neutral-0 px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full border border-brand-yellow bg-yellow-tint text-body-sm leading-[1.125rem] font-bold text-text-strong"
              >
                ★
              </span>
              <span className="grid">
                <bdi className="font-display text-lg leading-[1.4375rem] font-bold text-text-strong">
                  {copy["areas.trustFigure"]}
                </bdi>
                <span className="text-xs leading-4 text-text-muted">
                  {copy["areas.trustLabel"]}
                </span>
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────── */

export function Faq({
  copy,
  entries,
  locale,
}: {
  copy: Copy;
  entries: HomeFaq[];
  locale: Locale;
}) {
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="bg-neutral-0">
      {/* 120px inline here, not the 80 every other section uses. */}
      <div className={`mx-auto grid w-full max-w-[1440px] gap-8 px-5 md:px-10 2xl:px-[120px] ${PAD}`}>
        <SectionHeading
          id="faq-heading"
          align="start"
          badgeTracking="tight"
          eyebrow={copy["faq.eyebrow"]}
          headline={copy["faq.headline"]}
          subline={copy["faq.subline"]}
        />

        <div className="grid gap-6">
          {/* Each entry carries its own `category`; the chips and badges are
              built from it inside the list. */}
          <FaqList entries={entries} allLabel={copy["faq.all"]} />

          {copy["faq.moreTitle"] ? (
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle pt-6">
              <p className="font-display text-base leading-5 font-bold text-text-strong">
                {copy["faq.moreTitle"]}
              </p>
              {copy["faq.contact"] ? (
                <Link
                  href={`/${locale}/kontakt`}
                  className={`${RED_BUTTON} px-6 py-3 text-body-sm leading-[1.125rem] font-bold`}
                >
                  {copy["faq.contact"]}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ── Icons: 24px box, 2px stroke, rounded joins ─────────────────────── */

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

/** Points along the reading direction, so it flips in RTL. */
function Arrow() {
  return icon(
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>,
    "rtl:-scale-x-100",
    16,
  );
}

/** The `Learn More` chevron, 14x14 per the frame; flips in RTL like the arrow. */
function Chevron() {
  return icon(<path d="m9 18 6-6-6-6" />, "rtl:-scale-x-100", 14);
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

/** The chip's star: 14px, stroked yellow, no fill. */
function Star() {
  return icon(<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z" />, undefined, 14);
}

/** The creed's shield — the one filled glyph here, red, 16px (12 on a phone). */
function ShieldFilled() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-3 shrink-0 text-brand-red lg:size-4"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

function Calculator() {
  return icon(
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4" />
    </>,
    undefined,
    20,
  );
}

function CalendarCheck() {
  return icon(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
    </>,
    undefined,
    20,
  );
}

function Truck() {
  return icon(
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>,
    undefined,
    20,
  );
}
