import type { ReactNode } from "react";

import { SHELL } from "@/app/components/site/Blocks";

/**
 * The three sections only the moving page draws.
 *
 * Measured from the M.io "service-moving" frame 106:10195, which replaced the
 * 3:8166 composition the shared blocks were built from: the included services
 * became a photo banner over four numbered cards, the pricing factors became
 * icon cards, and the gallery became a masonry of one tall and two stacked
 * photographs. They live here rather than as variants of `ChecklistSection`,
 * `NumberedGrid` and `Gallery` because the other service pages still render
 * those shared blocks in the old shape.
 *
 * The frame sets these three sections in Tajawal; the site loads no Tajawal,
 * so headings take the display face and body text the sans face — the same
 * mapping the shared blocks already make for the frames' Geist.
 *
 * All server components.
 */

/* ── Included services ───────────────────────────────────────────────── */

/** The icon on each included-service disc, in the frame's order. */
const INCLUDED_ICONS = ["users", "toolbox", "shield", "file-text"];

/**
 * `checklist-section` (125:93): a 1280x480 photo banner with the heading set
 * over it, a 2x2 grid of red-bordered numbered cards, and a centred row of
 * trust chips — stacked 48 apart inside an 80px pad.
 */
export function IncludedShowcase({
  eyebrow,
  headline,
  subline,
  image,
  items,
  chips,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  image?: string | undefined;
  items: Array<{ title: string; body: string }>;
  chips: Array<{ value: string; label: string }>;
}) {
  if (!headline && items.length === 0 && chips.length === 0) return null;

  return (
    /* The frame fills the section with a diagonal from the #f9fafb canvas to
       #f3f4f6, top-left to bottom-right. */
    <section className="bg-linear-to-br from-surface-page to-neutral-100">
      <div className={`${SHELL} grid gap-12 py-14 md:py-20`}>
        {headline ? (
          /* `hero-banner`: the photograph is the card's own fill with a black
             wash at 35%, and `banner-content` pins the copy to the bottom of
             its 48px pad (primaryAxisAlign MAX). */
          <div className="relative isolate flex min-h-[360px] flex-col justify-end gap-6 overflow-hidden rounded-[32px] bg-text-heading p-6 md:min-h-[480px] md:p-12">
            {image ? (
              <>
                {/* Decorative: the heading carries the meaning. */}
                <img
                  src={image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 -z-10 size-full object-cover"
                />
                <span aria-hidden="true" className="absolute inset-0 -z-10 bg-black/35" />
              </>
            ) : null}

            <div className="grid gap-3">
              {eyebrow ? (
                <p className="text-body-sm leading-[1.2] font-bold text-brand-red uppercase">
                  {eyebrow}
                </p>
              ) : null}

              <h2 className="font-display text-[2rem] leading-[1.1] font-extrabold text-white md:text-[2.75rem] lg:text-[3.5rem]">
                {headline}
              </h2>
            </div>

            {subline ? (
              <p className="max-w-[720px] text-body text-white md:text-body-lg md:leading-[1.8125rem]">
                {subline}
              </p>
            ) : null}
          </div>
        ) : null}

        {items.length > 0 ? (
          /* `checklist-grid`: two rows of two, 32 apart both ways. */
          <ol className="grid gap-6 md:grid-cols-2 md:gap-8 [&>*]:min-w-0">
            {items.map((item, index) => (
              <li
                key={item.title}
                className="grid content-start gap-6 rounded-2xl border-2 border-brand-red bg-neutral-0 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.05)] md:p-8"
              >
                <div className="flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-red text-white">
                    <LineIcon name={INCLUDED_ICONS[index] ?? "dot"} size={24} />
                  </span>
                  <span className="font-display text-[1.5rem] leading-[1.2] font-extrabold text-brand-red">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="grid gap-2">
                  <h3 className="font-display text-[1.25rem] leading-[1.2] font-bold text-text-heading md:text-[1.375rem]">
                    {item.title}
                  </h3>
                  <p className="text-body text-text-default">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        {chips.length > 0 ? (
          <ul className="flex flex-wrap justify-center gap-4">
            {chips.map((chip) => (
              <li
                key={chip.label}
                className="flex items-center gap-2.5 rounded-lg bg-neutral-0 px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
              >
                {/* The frame draws the star as a text glyph on a pale yellow
                    disc with a yellow hairline. */}
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-brand-yellow bg-yellow-tint text-body-sm leading-none font-bold text-text-default"
                >
                  ★
                </span>
                <span className="grid">
                  <span className="font-display text-[1.125rem] leading-[1.4375rem] font-bold text-text-strong">
                    {chip.value}
                  </span>
                  <span className="text-caption tracking-normal text-text-muted">{chip.label}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

/* ── Pricing factors ─────────────────────────────────────────────────── */

/** The icon on each factor card's tile, in the frame's order. */
const FACTOR_ICONS = ["map-pin", "package", "circle-x", "circle-x", "calendar"];

/**
 * `pricing-factors` (106:10271): a centred heading under a 120x4 red band,
 * then five white cards each opening with a red number disc and a pale red
 * icon tile.
 *
 * The frame lays the cards out as three columns — 01 over 03, 02 over 04, and
 * 05 alone in the third — so at the desktop width the fifth card is placed in
 * the top-right cell and the rest flow around it.
 */
export function QuoteFactors({
  eyebrow,
  headline,
  subline,
  items,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  items: Array<{ title: string; body: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <section className="bg-neutral-50">
      <div className={`${SHELL} grid gap-10 py-14 md:gap-14 md:py-20`}>
        <div className="grid justify-items-center gap-5 text-center">
          <span aria-hidden="true" className="h-1 w-30 rounded-xs bg-brand-red" />

          {eyebrow ? (
            <p className="text-body-sm leading-[1.2] font-bold text-brand-red uppercase">
              {eyebrow}
            </p>
          ) : null}

          {headline ? (
            <h2 className="font-display text-[2rem] leading-[1.1] font-extrabold text-text-heading md:text-[3rem]">
              {headline}
            </h2>
          ) : null}

          {subline ? (
            <p className="max-w-[720px] text-body text-text-default md:text-body-lg md:leading-[1.8125rem]">
              {subline}
            </p>
          ) : null}
        </div>

        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
          {items.map((item, index) => (
            <li
              key={item.title}
              className={`grid content-start gap-6 rounded-2xl bg-neutral-0 p-6 shadow-[0_12px_24px_rgba(0,0,0,0.05)] md:p-8 ${
                items.length === 5 && index === 4 ? "lg:col-start-3 lg:row-start-1" : ""
              }`}
            >
              <div className="flex items-center gap-5">
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-red font-display text-[1.75rem] leading-none font-extrabold text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="grid size-18 shrink-0 place-items-center rounded-xl bg-red-50 text-brand-red">
                  <LineIcon name={FACTOR_ICONS[index] ?? "dot"} size={40} />
                </span>
              </div>

              <div className="grid gap-2">
                <h3 className="font-display text-[1.25rem] leading-[1.2] font-bold text-text-heading md:text-[1.375rem]">
                  {item.title}
                </h3>
                <p className="text-body-md leading-6 text-text-default">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Gallery ─────────────────────────────────────────────────────────── */

/**
 * `gallery-section` (106:10297): a left-aligned heading with a pill kicker and
 * a 120x2 red rule, then one 760x620 photograph beside two stacked 496x320
 * ones, each with a frosted caption pill in its top corner.
 *
 * The right column is drawn 688 tall against the hero's 620 — the first card
 * sits in a wrapper with 24 of bottom padding on top of the column's 24 gap —
 * so the two columns do not share a bottom edge in the frame, and do not here.
 */
export function MasonryGallery({
  eyebrow,
  headline,
  subline,
  images,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  images: Array<{ src: string; caption?: string | undefined }>;
}) {
  const [hero, ...rest] = images;
  if (!hero) return null;

  return (
    /* The section clips its content, which is what cuts the blurred accents
       off at its edges. */
    <section className="relative isolate overflow-hidden bg-neutral-50">
      <span
        aria-hidden="true"
        className="absolute -end-30 -top-30 -z-10 size-[420px] rounded-full bg-brand-red/7 blur-[80px]"
      />
      <span
        aria-hidden="true"
        className="absolute -start-20 -bottom-25 -z-10 size-60 rounded-full bg-brand-red/3 blur-[60px]"
      />
      <span aria-hidden="true" className="absolute start-10 top-10 flex gap-2 opacity-30">
        {[0, 1, 2, 3, 4].map((dot) => (
          <span key={dot} className="size-1 rounded-full bg-brand-red" />
        ))}
      </span>

      <div className={`${SHELL} grid gap-12 py-16 md:py-24`}>
        <div className="grid gap-6">
          <div className="grid max-w-[720px] justify-items-start gap-3">
            {eyebrow ? (
              <p className="rounded-full bg-brand-red/8 px-4 py-2 text-body-sm leading-[1.2] font-bold text-brand-red uppercase">
                {eyebrow}
              </p>
            ) : null}

            {headline ? (
              <h2 className="font-display text-[2rem] leading-[1.1] font-extrabold text-text-heading md:text-[2.75rem] lg:text-[3.5rem]">
                {headline}
              </h2>
            ) : null}

            {subline ? (
              <p className="text-body text-text-default md:text-body-lg md:leading-[1.8125rem]">
                {subline}
              </p>
            ) : null}
          </div>

          <span aria-hidden="true" className="h-0.5 w-30 bg-brand-red" />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,760fr)_minmax(0,496fr)]">
          <GalleryCard image={hero} className="aspect-[4/3] lg:aspect-auto lg:h-[620px]" />

          {rest.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 lg:gap-12">
              {rest.map((image) => (
                <GalleryCard
                  key={image.src}
                  image={image}
                  className="aspect-[496/320] lg:aspect-auto lg:h-[320px]"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GalleryCard({
  image,
  className,
}: {
  image: { src: string; caption?: string | undefined };
  className: string;
}) {
  return (
    <figure
      className={`relative overflow-hidden rounded-2xl border border-white bg-neutral-0 shadow-[0_4px_12px_rgba(0,0,0,0.05),0_24px_48px_-12px_rgba(0,0,0,0.08)] ${className}`}
    >
      <img
        src={image.src}
        alt={image.caption ?? ""}
        loading="lazy"
        className="size-full object-cover"
      />
      {image.caption ? (
        /* The caption doubles as the alt text, so the pill is hidden from
           assistive technology rather than read twice. */
        <figcaption
          aria-hidden="true"
          className="absolute start-6 top-6 rounded-full border border-white bg-white/90 px-3 py-2 text-caption leading-[0.875rem] font-medium tracking-normal text-text-heading backdrop-blur-md"
        >
          {image.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────── */

/** The line icons these cards name by key, as the frame's lucide set draws them. */
function LineIcon({ name, size }: { name: string; size: number }) {
  const shapes: Record<string, ReactNode> = {
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    toolbox: (
      <>
        <path d="M16 12v4" />
        <path d="M16 6a2 2 0 0 1 1.414.586l4 4A2 2 0 0 1 22 12v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 .586-1.414l4-4A2 2 0 0 1 8 6z" />
        <path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <path d="M2 14h20" />
        <path d="M8 12v4" />
      </>
    ),
    shield: (
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    ),
    "file-text": (
      <>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
      </>
    ),
    "map-pin": (
      <>
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    package: (
      <>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </>
    ),
    "circle-x": (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    dot: <path d="M12 12h.01" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      /* The frame strokes every icon at 2px whatever its size, so the 40px
         tiles scale the stroke down to keep it 2px on screen. */
      strokeWidth={(2 * 24) / size}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name] ?? shapes["dot"]}
    </svg>
  );
}
