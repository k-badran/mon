import Link from "next/link";
import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";

/**
 * The building blocks every public page is assembled from.
 *
 * Measured from the M.io page frames, which share a small vocabulary: an 80px
 * section pad on a 1280 content column, a dark hero for service pages and a
 * white centred one for content pages, a red closing band, and a handful of
 * card and list shapes. Twelve pages are twelve compositions of these, not
 * twelve bespoke stylesheets.
 *
 * All server components — the public site ships no JavaScript for layout.
 */

export type Copy = Record<string, string>;

/** 1280 content column, 80px inline on desktop. */
export const SHELL = "mx-auto w-full max-w-[1280px] px-5 md:px-10";
const PAD = "py-14 md:py-20";

/** Renders `**emphasis**` in brand red, as several Figma headlines do. */
export function Emphasise({ text }: { text: string }) {
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

/**
 * The hero the service pages open with.
 *
 * Measured from `page-hero`: 480px tall, a photograph as the frame's own fill
 * with a `#111827` wash at 70% over it, and a single 640px column of content
 * centred vertically against the left edge of the 1280 grid.
 *
 * The photograph is the ground rather than a sibling column, so it is a
 * background layer here too — an `<img>` in a second grid cell would be a
 * different composition, which is how the first build of this went wrong.
 */
export function DarkHero({
  eyebrow,
  headline,
  subline,
  primary,
  secondary,
  image,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  primary?: { label: string; href: string } | undefined;
  secondary?: { label: string; href: string } | undefined;
  image?: string | undefined;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-[#111827]">
      {image ? (
        <>
          {/* Decorative: the headline carries the meaning, so it is hidden
              from assistive technology rather than described. */}
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[#111827]/70"
          />
        </>
      ) : null}

      <div className={`${SHELL} flex min-h-[380px] items-center py-14 md:min-h-[480px] md:py-0`}>
        <div className="grid max-w-[640px] gap-5">
          {eyebrow ? (
            <p className="w-fit rounded-full bg-brand-yellow px-3 py-1.5 text-caption font-bold tracking-normal text-text-heading uppercase">
              {eyebrow}
            </p>
          ) : null}

          {headline ? (
            <h1 className="font-display text-[2rem] leading-[1.15] font-extrabold text-white md:text-[3rem]">
              <Emphasise text={headline} />
            </h1>
          ) : null}

          {subline ? <p className="text-body text-neutral-100">{subline}</p> : null}

          {primary || secondary ? (
            <div className="mt-2 flex flex-wrap gap-4">
              {primary ? (
                <Link
                  href={primary.href}
                  className="rounded-md bg-brand-red px-6 py-3.5 text-body-md font-semibold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
                >
                  {primary.label}
                </Link>
              ) : null}

              {secondary ? (
                /* A glass button: white at 12.5% behind a white hairline. */
                <Link
                  href={secondary.href}
                  className="rounded-md border border-white bg-white/12 px-6 py-3.5 text-body-md font-semibold text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
                >
                  {secondary.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** The white, centred hero the content pages open with. */
export function PageHero({
  eyebrow,
  headline,
  subline,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
}) {
  return (
    <section className="bg-neutral-0">
      <div className={`${SHELL} ${PAD}`}>
        {/* 14 / 36 / 16, measured identically on page-pricing, page-about,
            page-how-it-works and page-contact, so it is the frames' h1 scale,
            not a one-off. The rhythm is nested, not flat: the frames put
            all three — eyebrow, headline and subline — in one `section-title`
            at gap 12; the hero's own gap 24 falls between that stack and
            whatever follows it, which on page-pricing is the yellow chip and
            on the others is nothing. Sizes stay literal because the `text-h1`
            token carries -1px tracking and these nodes are set at 0 — the
            token would be a pixel right and a tracking wrong. */}
        <div className="mx-auto grid w-full gap-3 text-center">
          {eyebrow ? (
            <p className="text-body-sm font-bold text-brand-red uppercase">{eyebrow}</p>
          ) : null}

          {headline ? (
            <h1 className="font-display text-[1.75rem] leading-[1.2] font-extrabold text-text-heading md:text-[2.25rem]">
              <Emphasise text={headline} />
            </h1>
          ) : null}

          {subline ? (
            <p className="mx-auto max-w-[720px] text-body text-text-default">{subline}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  headline,
  subline,
  align = "center",
  size = "lg",
  eyebrowSize = "sm",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  align?: "center" | "start";
  /** The frame's two headline sizes: 36/800 ("lg") and 32/800 ("md"). */
  size?: "md" | "lg";
  /**
   * The frame's two eyebrow sizes. The homepage sets its eyebrows 12/700,
   * every sub-page frame sets them 14/700 with no tracking, so the size is a
   * per-frame fact rather than a house style and the caller states it.
   */
  eyebrowSize?: "sm" | "md";
}) {
  const centred = align === "center";

  return (
    /* The frames' `section-title` runs the full 1280 content column; only its
       subline is narrowed, to the 720 box drawn at x=360. Capping the whole
       stack at 800 wrapped 36/800 headlines a line early on every page that
       renders one, which is every content page. The red closing band's 800 is
       not this component's — `CtaBand` sets its own. */
    <div
      className={`grid w-full gap-3 ${centred ? "mx-auto text-center" : "max-w-[640px]"}`}
    >
      {eyebrow ? (
        <p
          className={`font-bold text-brand-red uppercase ${
            eyebrowSize === "md"
              ? "text-body-sm leading-[1.3]"
              : "text-caption tracking-[0.5px]"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}

      {headline ? (
        <h2
          className={`font-display leading-[1.15] font-extrabold text-text-heading ${
            size === "md" ? "text-[1.5rem] md:text-[2rem]" : "text-[1.625rem] md:text-[2.25rem]"
          }`}
        >
          <Emphasise text={headline} />
        </h2>
      ) : null}

      {subline ? (
        <p className={`text-body text-text-default ${centred ? "mx-auto max-w-[720px]" : ""}`}>
          {subline}
        </p>
      ) : null}
    </div>
  );
}

export function Section({
  tone = "white",
  children,
}: {
  tone?: "white" | "subtle";
  children: ReactNode;
}) {
  return (
    <section className={tone === "white" ? "bg-neutral-0" : "bg-neutral-50"}>
      <div className={`${SHELL} ${PAD} grid gap-10`}>{children}</div>
    </section>
  );
}

/** A two-column section: prose on one side, a ticked list on the other. */
export function ChecklistSection({
  eyebrow,
  headline,
  subline,
  items,
  image,
  tone = "white",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  items: Array<{ title: string; body: string }>;
  /** The frame's 640x480 section photograph. Without it the column runs wide. */
  image?: string | undefined;
  tone?: "white" | "subtle";
}) {
  return (
    <section className={tone === "white" ? "bg-neutral-0" : "bg-neutral-50"}>
      {/* The frame's `checklist-section` is a row of two: a 580px column that
          stacks the section-title over the items, and the photograph. Heading
          beside list — the first build's shape — is a different composition. */}
      <div
        className={`${SHELL} ${PAD} grid items-center gap-16 [&>*]:min-w-0 ${
          image ? "md:grid-cols-[minmax(0,580fr)_minmax(0,640fr)]" : ""
        }`}
      >
        <div className="grid gap-8">
          <SectionHeading
            eyebrow={eyebrow}
            headline={headline}
            subline={subline}
            align="start"
            eyebrowSize="md"
          />

          <ul className="grid gap-5">
            {items.map((item) => (
              <li key={item.title} className="flex gap-4">
                {/* A solid emerald disc with a white tick: the frame fills the
                    24px circle #10b981 and strokes the tick #ffffff, not the
                    pale status chip a soft fill would give. */}
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-success text-white">
                  <Tick />
                </span>

                <span className="grid gap-1">
                  <span className="text-h5 font-bold text-text-heading">{item.title}</span>
                  <span className="text-body-sm text-text-default">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {image ? (
          /* Decorative: the checklist beside it carries the meaning. */
          <img
            src={image}
            alt=""
            aria-hidden="true"
            width={640}
            height={480}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl object-cover"
          />
        ) : null}
      </div>
    </section>
  );
}

/** Numbered columns — "01 Distance", "02 Volume", and so on. */
export function NumberedGrid({
  eyebrow,
  headline,
  subline,
  items,
  tone = "subtle",
  columns = 5,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  items: Array<{ title: string; body: string }>;
  tone?: "white" | "subtle";
  columns?: 3 | 4 | 5;
}) {
  const grid =
    columns === 3
      ? "md:grid-cols-3"
      : columns === 4
        ? "sm:grid-cols-2 md:grid-cols-4"
        : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5";

  return (
    <Section tone={tone}>
      <SectionHeading
        eyebrow={eyebrow}
        headline={headline}
        subline={subline}
        eyebrowSize="md"
      />

      {/* Cards, not bare columns: the frame plates each item white at r:12 with
          24px of padding, which is what lifts them off the grey section. */}
      <ol className={`grid gap-5 ${grid}`}>
        {items.map((item, index) => (
          <li
            key={item.title}
            className="grid content-start gap-4 rounded-lg bg-neutral-0 p-6"
          >
            <span className="font-display text-[1.75rem] leading-none font-extrabold text-brand-red">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-h5 font-bold text-text-heading">{item.title}</h3>
            <p className="text-body-sm text-text-default">{item.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/** A grid of photographs. */
export function Gallery({
  eyebrow,
  headline,
  subline,
  images,
  tone = "white",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  images: string[];
  tone?: "white" | "subtle";
}) {
  if (images.length === 0) return null;

  return (
    <Section tone={tone}>
      <SectionHeading
        eyebrow={eyebrow}
        headline={headline}
        subline={subline}
        eyebrowSize="md"
      />

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 [&>*]:min-w-0">
        {images.map((src) => (
          <img
            key={src}
            src={src}
            alt=""
            width={400}
            height={280}
            loading="lazy"
            className="aspect-[10/7] w-full rounded-lg object-cover"
          />
        ))}
      </div>
    </Section>
  );
}

/** A disclosure list. `<details>` so it works without JavaScript. */
export function FaqSection({
  eyebrow,
  headline,
  subline,
  entries,
  tone = "subtle",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  entries: Array<{ question: string; answer: string }>;
  tone?: "white" | "subtle";
}) {
  if (entries.length === 0) return null;

  return (
    <Section tone={tone}>
      <SectionHeading
        eyebrow={eyebrow}
        headline={headline}
        subline={subline}
        eyebrowSize="md"
      />

      <div className="mx-auto grid w-full max-w-[800px] gap-3">
        {entries.map((entry) => (
          <details
            key={entry.question}
            className="group rounded-md border border-neutral-100 bg-neutral-0 p-6"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:content-none">
              <span className="text-h5 font-bold text-text-heading">{entry.question}</span>
              <ChevronDown className="shrink-0 text-text-default transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-body-sm text-text-default">{entry.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

/** Cross-sell cards with a price chip and a link. */
export function CardGrid({
  eyebrow,
  headline,
  subline,
  cards,
  tone = "white",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  cards: Array<{
    title: string;
    body: string;
    price?: string;
    href?: string;
    cta?: string;
    /** The key of the icon on the card's plate — `package`, `sparkles`, `trash-2`. */
    icon?: string;
  }>;
  tone?: "white" | "subtle";
}) {
  return (
    <Section tone={tone}>
      <SectionHeading
        eyebrow={eyebrow}
        headline={headline}
        subline={subline}
        eyebrowSize="md"
      />

      <div className="grid gap-6 md:grid-cols-3 [&>*]:min-w-0">
        {cards.map((card) => (
          <article
            key={card.title}
            className="flex flex-col gap-5 rounded-lg border border-neutral-100 bg-neutral-0 p-8"
          >
            {card.icon || card.price ? (
              /* The frame opens the card with the icon plate and the price
                 pill on one row, pushed to opposite edges. */
              <div className="flex items-center justify-between gap-4">
                {card.icon ? (
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-neutral-100 text-brand-red">
                    <CardIcon name={card.icon} />
                  </span>
                ) : null}

                {card.price ? (
                  <span className="rounded-full bg-brand-yellow px-2.5 py-1 text-caption font-bold tracking-normal text-text-heading">
                    {card.price}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="grid flex-1 content-start gap-2">
              <h3 className="font-display text-h4 font-extrabold text-text-heading">
                {card.title}
              </h3>

              <p className="text-body-sm text-text-default">{card.body}</p>
            </div>

            {card.href && card.cta ? (
              <Link
                href={card.href}
                className="flex w-fit items-center gap-2 pt-3 text-body-sm font-bold text-brand-red hover:underline"
              >
                {card.cta}
                <PlusCircle />
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </Section>
  );
}

/** The dark statistics strip. */
export function StatsBanner({ stats }: { stats: Array<{ value: string; label: string }> }) {
  if (stats.length === 0) return null;

  return (
    <section className="bg-[#111827]">
      <div className={`${SHELL} py-12`}>
        <dl className="grid gap-8 text-center sm:grid-cols-2 md:grid-cols-4 [&>*]:min-w-0">
          {stats.map((stat) => (
            <div key={stat.label} className="grid gap-1">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-display text-[2rem] font-extrabold text-brand-yellow">
                {stat.value}
              </dd>
              <p className="text-body-sm text-neutral-100">{stat.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** The red closing band every page ends on. */
export function CtaBand({
  eyebrow,
  headline,
  subline,
  primary,
  secondary,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  primary?: { label: string; href: string } | undefined;
  secondary?: { label: string; href: string } | undefined;
}) {
  return (
    <section className="bg-brand-red">
      <div className={`${SHELL} ${PAD} grid gap-6 text-center`}>
        {eyebrow ? (
          <p className="mx-auto w-fit rounded-md border border-white/40 px-3 py-1.5 text-caption font-bold text-white">
            {eyebrow}
          </p>
        ) : null}

        {headline ? (
          <h2 className="mx-auto max-w-[800px] font-display text-[1.75rem] leading-[1.15] font-extrabold text-white md:text-[2.25rem]">
            {headline}
          </h2>
        ) : null}

        {subline ? (
          <p className="mx-auto max-w-[720px] text-body text-white">{subline}</p>
        ) : null}

        {primary || secondary ? (
          <div className="mx-auto flex flex-wrap justify-center gap-4">
            {primary ? (
              <Link
                href={primary.href}
                className="rounded-md bg-brand-yellow px-8 py-4 text-body font-bold text-text-heading transition-colors hover:bg-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {primary.label}
              </Link>
            ) : null}

            {secondary ? (
              <Link
                href={secondary.href}
                className="rounded-md border border-white/50 px-7 py-4 text-body font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {secondary.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** A full-width banner with an icon, a claim and a supporting line. */
export function GuaranteeBanner({
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
      <div className={`${SHELL} py-10`}>
        <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-success bg-success-soft p-8">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-success text-white">
            <Tick />
          </span>

          <div className="grid flex-1 gap-1">
            <h2 className="text-h4 font-bold text-success-text">{title}</h2>
            {body ? <p className="text-body-sm text-success-text/90">{body}</p> : null}
          </div>

          {cta ? (
            <Link
              href={cta.href}
              className="rounded-md bg-success-text px-6 py-3 text-body-sm font-bold text-white hover:opacity-90"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Reads a numbered family of blocks out of the CMS.
 *
 * Content is stored as `prefix.1.title` / `prefix.1.body`, so a section grows
 * by adding rows in the dashboard rather than by editing a component. Stops at
 * the first gap, which is what makes "delete the third item" work.
 */
export function readList(
  copy: Copy,
  prefix: string,
  fields: string[] = ["title", "body"],
): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = [];

  for (let index = 1; index <= 12; index += 1) {
    const entry: Record<string, string> = {};
    let found = false;

    // An empty prefix means the slots are bare numbers ("1.title"), which the
    // legal pages use — joining on "." unconditionally would look for ".1.title".
    const base = prefix ? `${prefix}.${index}` : String(index);

    for (const field of fields) {
      const value = copy[`${base}.${field}`];
      if (value) {
        entry[field] = value;
        found = true;
      }
    }

    if (!found) break;
    out.push(entry);
  }

  return out;
}

/** Builds a locale-prefixed href. */
export const path = (locale: Locale, route: string) => `/${locale}${route}`;

/* ── Icons ───────────────────────────────────────────────────────────── */

function Tick() {
  return (
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
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** The disclosure marker: a chevron that points down and flips on open. */
function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ? `${className} shrink-0` : "shrink-0"}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** The circled plus that closes a cross-sell card's link. */
function PlusCircle() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

/** The 24px line icons a cross-sell card names by key. */
function CardIcon({ name }: { name: string }) {
  const paths: Record<string, string[]> = {
    package: [
      "m7.5 4.27 9 5.15",
      "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
      "m3.3 7 8.7 5 8.7-5",
      "M12 22V12",
    ],
    sparkles: [
      "M12 3 10.1 8.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z",
      "M5 3v4",
      "M19 17v4",
      "M3 5h4",
      "M17 19h4",
    ],
    "trash-2": [
      "M3 6h18",
      "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
      "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
      "M10 11v6",
      "M14 11v6",
    ],
    dot: ["M12 12h.01"],
  };

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {(paths[name] ?? paths["dot"] ?? []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

