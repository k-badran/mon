import Link from "next/link";

import { SHELL, SectionHeading } from "./Blocks";

/**
 * The sections only the cleaning page draws.
 *
 * The shared blocks were close to these but not the same: the guarantee
 * banner there is a green success box and the cross-sell grid a three-column
 * stack with a text link, where `service-cleaning` (136:319) draws a white
 * band with a yellow shield and two horizontal icon cards. Bending the shared
 * blocks would have moved the other pages that use them, so the cleaning
 * frame's own shapes live here.
 *
 * All server components.
 */

const PAD = "py-14 md:py-20";

/* ── Programmes ──────────────────────────────────────────────────────── */

export type CleaningProgramme = {
  title: string;
  body: string;
  image: string;
  badge?: string | undefined;
};

/**
 * "High-End Cleaning Services", measured from `cleaning-services` (136:533).
 *
 * The first programme is the featured card on the left (840 of the 1280
 * column); the rest stack in the 416 column beside it. The featured card is
 * not stretched to the column's height — the frame leaves it at its own 589
 * against a 1306 column — so the grid aligns its items to the start.
 *
 * The frame's side-card photos are drawn 405 wide inside a 368 content box,
 * spilling past the card's padding; that reads as a Figma sizing slip rather
 * than a bleed (the featured photo sits inside its padding), so the photos
 * here fill the content box.
 */
export function CleaningPrograms({
  eyebrow,
  headline,
  programmes,
  features,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  programmes: CleaningProgramme[];
  /** The four chips the frame repeats verbatim on every card. */
  features: string[];
}) {
  const [featured, ...rest] = programmes;
  if (!featured) return null;

  return (
    <section className="bg-neutral-50">
      <div className={`${SHELL} ${PAD} grid gap-12`}>
        <SectionHeading eyebrow={eyebrow} headline={headline} eyebrowSize="md" />

        {/* 840 : 416 with a 24 gutter. Below lg the columns fold into one;
            between md and lg the side cards pair up under the featured one
            rather than running 1300px of single column. */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,105fr)_minmax(0,52fr)]">
          <article className="grid gap-6 rounded-2xl bg-neutral-0 p-6 shadow-[0_12px_32px_rgba(0,0,0,0.05)] md:p-8">
            <div className="grid gap-3">
              {/* Tajawal 800 28/34 in the frame; the site sets its display
                  face (Outfit) for every heading, so the face is mapped and
                  the size kept. */}
              <h3 className="font-display text-[1.5rem] leading-[1.2] font-extrabold text-text-heading md:text-[1.75rem] md:leading-[34px]">
                {featured.title}
              </h3>
              <p className="text-[0.9375rem] leading-6 text-text-default">{featured.body}</p>
            </div>

            <div className="relative overflow-hidden rounded-xl">
              <img
                src={featured.image}
                alt=""
                width={776}
                height={320}
                className="aspect-[4/3] w-full object-cover sm:aspect-[97/40]"
              />

              {featured.badge ? (
                <span className="absolute start-4 top-4 rounded-full bg-neutral-0 px-4 py-2 text-caption leading-[14px] font-bold tracking-normal text-text-heading uppercase shadow-[0_4px_12px_rgba(0,0,0,0.1)] sm:start-6 sm:top-6">
                  {featured.badge}
                </span>
              ) : null}
            </div>

            <FeatureChips features={features} />
          </article>

          {rest.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
              {rest.map((programme) => (
                <article
                  key={programme.title}
                  className="grid content-start gap-5 rounded-2xl bg-neutral-0 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
                >
                  <div className="grid gap-3">
                    <img
                      src={programme.image}
                      alt=""
                      width={368}
                      height={245}
                      loading="lazy"
                      className="aspect-[3/2] w-full rounded-xl object-cover"
                    />

                    <div className="grid gap-1 pt-1">
                      <h3 className="font-display text-body leading-5 font-bold text-text-strong">
                        {programme.title}
                      </h3>
                      <p className="text-body-sm text-text-muted">{programme.body}</p>
                    </div>
                  </div>

                  <FeatureChips features={features} />
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * The frame's `trust-chip`: a yellow star capsule beside a tick over a label.
 *
 * Both glyphs are decoration — the label says what is included — so they are
 * hidden from assistive technology and the chips are read as a plain list.
 */
function FeatureChips({ features }: { features: string[] }) {
  if (features.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-3">
      {features.map((feature) => (
        <li
          key={feature}
          className="flex items-center gap-2.5 rounded-lg bg-neutral-0 px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-4 shrink-0 place-items-center rounded-full border border-brand-yellow bg-yellow-tint text-body-sm leading-[18px] font-bold text-[#cc8c00]"
          >
            ★
          </span>

          <span className="grid">
            <span aria-hidden="true" className="font-display text-h5 leading-[23px] font-bold text-text-strong">
              ✓
            </span>
            <span className="text-caption tracking-normal text-text-muted">{feature}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Programmes as text cards ────────────────────────────────────────── */

export type TextProgramme = {
  title: string;
  body: string;
  /** A rate or "Request quote" on a red pill; drawn only when the CMS has one. */
  price?: string | undefined;
  checks: string[];
};

/**
 * Three text cards, measured from the original `cleaning-services` section
 * (3:8412): a #f9fafb card with 16 corners and 32 padding, the title at 22/800
 * beside an optional red price pill, 14/21 body, and 13/17 items after a 14px
 * green check with no plate. The clearance page uses it — its design is this
 * layout without the prices, and the pill comes back if the dashboard sets one.
 */
export function ProgramTextCards({
  eyebrow,
  headline,
  programmes,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  programmes: TextProgramme[];
}) {
  if (programmes.length === 0) return null;

  return (
    <section className="bg-neutral-0">
      <div className={`${SHELL} ${PAD} grid gap-12`}>
        <SectionHeading eyebrow={eyebrow} headline={headline} eyebrowSize="md" />

        <div className="grid gap-6 md:grid-cols-3 [&>*]:min-w-0">
          {programmes.map((programme) => (
            <article key={programme.title} className="grid content-start gap-5 rounded-2xl bg-surface-page p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-[1.375rem] leading-[1.75rem] font-extrabold text-text-heading">
                  {programme.title}
                </h3>

                {programme.price ? (
                  <span className="rounded-full bg-brand-red px-3 py-1.5 text-caption leading-4 font-bold tracking-normal whitespace-nowrap text-white">
                    {programme.price}
                  </span>
                ) : null}
              </div>

              <p className="text-body-sm leading-[1.3125rem] text-text-default">{programme.body}</p>

              {programme.checks.length > 0 ? (
                <ul className="grid gap-2 pt-3">
                  {programme.checks.map((check) => (
                    <li
                      key={check}
                      className="flex items-center gap-2 text-[0.8125rem] leading-[1.0625rem] text-neutral-800"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="shrink-0 text-success"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {check}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Before / after ──────────────────────────────────────────────────── */

/**
 * `before-after-gallery` (136:433): two 628×320 photographs with their label
 * set 16 below each, not over it — a dark plate for "before", the success
 * green for "after". Both images are decorative; the heading says what is
 * being compared.
 */
export function CleaningBeforeAfter({
  eyebrow,
  headline,
  subline,
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  before: string;
  after: string;
  beforeLabel?: string | undefined;
  afterLabel?: string | undefined;
}) {
  const panels = [
    { src: before, label: beforeLabel, plate: "bg-[#111827]" },
    { src: after, label: afterLabel, plate: "bg-success" },
  ];

  return (
    <section className="bg-surface-page">
      <div className={`${SHELL} ${PAD} grid gap-12`}>
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          subline={subline}
          eyebrowSize="md"
        />

        <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
          {panels.map((panel) => (
            <figure key={panel.src} className="grid gap-4">
              <img
                src={panel.src}
                alt=""
                width={628}
                height={320}
                loading="lazy"
                className="aspect-[157/80] w-full rounded-lg object-cover"
              />

              {panel.label ? (
                <figcaption
                  className={`w-fit rounded-sm px-3 py-1.5 text-caption leading-[1.3] font-bold tracking-normal text-white uppercase ${panel.plate}`}
                >
                  {panel.label}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Guarantee ───────────────────────────────────────────────────────── */

/**
 * `guarantee-banner` (136:447): a white band, an 80px yellow disc with a
 * shield, the claim in an 800-wide column and the red button straight after
 * it — the frame packs the row from the start rather than pushing the button
 * to the far edge.
 *
 * The frame pads this band 60 where every other section sits on the 80 edge;
 * that is kept at the full width, where it is visible as drawn.
 */
export function CleaningGuarantee({
  title,
  body,
  cta,
}: {
  title?: string | undefined;
  body?: string | undefined;
  cta?: { label: string; href: string } | undefined;
}) {
  if (!title) return null;

  return (
    <section className="bg-neutral-0">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-6 px-5 py-12 md:flex-row md:items-center md:gap-10 md:px-10 md:py-[60px] 2xl:px-[60px]">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-yellow text-text-heading md:size-20">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-8 md:size-10"
          >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>

        <div className="grid max-w-[800px] flex-1 gap-2">
          <h2 className="font-display text-[1.5rem] leading-[1.26] font-extrabold text-text-heading">
            {title}
          </h2>
          {body ? <p className="text-[0.9375rem] leading-[1.5] text-text-default">{body}</p> : null}
        </div>

        {cta ? (
          <Link
            href={cta.href}
            className="shrink-0 rounded-md bg-brand-red px-6 py-3.5 text-body-md font-semibold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
          >
            {cta.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/* ── Cross-sell ──────────────────────────────────────────────────────── */

const CROSS_SELL_ICONS = {
  truck: (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </>
  ),
  "trash-2": (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>
  ),
  // Lucide "sparkles", for the clearance page's card pointing at cleaning.
  sparkles: (
    <>
      <path d="M9.94 14.06 4 21" />
      <path d="M11.02 2.27a1 1 0 0 1 1.96 0l.97 4.67a4 4 0 0 0 3.11 3.11l4.67.97a1 1 0 0 1 0 1.96l-4.67.97a4 4 0 0 0-3.11 3.11l-.97 4.67a1 1 0 0 1-1.96 0l-.97-4.67a4 4 0 0 0-3.11-3.11l-4.67-.97a1 1 0 0 1 0-1.96l4.67-.97a4 4 0 0 0 3.11-3.11z" />
    </>
  ),
} as const;

export type CrossSellIcon = keyof typeof CROSS_SELL_ICONS;

/**
 * `cleaning-cross-sell` (136:456): two horizontal cards, a 56px grey plate
 * with a red line icon beside the title and the offer.
 *
 * The frame draws no link text on these cards, yet each one points at a
 * service, so the whole card is the link and its title is the link's name.
 */
export function CleaningCrossSell({
  eyebrow,
  headline,
  subline,
  cards,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  cards: Array<{ title: string; body: string; href: string; icon: CrossSellIcon }>;
}) {
  if (cards.length === 0) return null;

  return (
    <section className="bg-surface-page">
      <div className={`${SHELL} ${PAD} grid gap-10`}>
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          subline={subline}
          eyebrowSize="md"
        />

        <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="flex items-center gap-6 rounded-xl border border-neutral-100 bg-neutral-0 p-6 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red md:p-8"
            >
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-neutral-100 text-brand-red">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {CROSS_SELL_ICONS[card.icon]}
                </svg>
              </span>

              <span className="grid gap-1.5">
                <h3 className="font-display text-[1.25rem] leading-[1.26] font-extrabold text-text-heading">
                  {card.title}
                </h3>
                <span className="text-body-sm leading-[1.3] text-text-default">{card.body}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
