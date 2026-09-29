import Link from "next/link";
import type { ReactNode } from "react";

import { Emphasise, SHELL, SectionHeading } from "./Blocks";

/**
 * The block types the content pages need beyond the service-page set.
 *
 * Kept in a second file only so neither grows unwieldy; both are imported
 * the same way and share the same measurements from the M.io frames.
 */

const PAD = "py-14 md:py-20";

/**
 * The 20/700 titles on the business frame: the form title, the four benefit
 * cards and the three service tiles. `text-h4` draws a 28px line box and the
 * frame sets every one of them on 25.2, so the line height is stated here
 * rather than corrected on the token — `text-h4` also carries the LogoStrip
 * wordmarks and a dozen headings measured from other frames, and those keep
 * their 28.
 */
const TITLE_20 =
  "font-display text-h4 leading-[1.575rem] font-bold text-text-strong";


/**
 * The rate card: factor, price, explanation.
 *
 * Measured from "pricing-factors-table". The section carries no fill of its
 * own, so the page ground shows through, and no top padding at all — the
 * heading butts straight against the bottom of the hero, then 24px down to the
 * table. The heading is bare: 24/800, left-aligned at the grid edge, with no
 * eyebrow and no subline, which is why this does not reach for
 * `SectionHeading` (whose headline is the 36px section scale).
 *
 * Both the container stroke and every row divider are #f3f4f6, and the header
 * band is that same tone as a fill — the one step the frame keeps between the
 * white table body and the ground.
 */
export function RateTable({
  headline,
  columns,
  rows,
}: {
  headline?: string | undefined;
  columns: { factor: string; rate: string; scope: string };
  rows: Array<{ factor: string; rate: string; scope: string }>;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="bg-surface-page">
      <div className={`${SHELL} grid gap-6 pb-14 md:pb-20`}>
        {headline ? (
          <h2 className="font-display text-[1.375rem] leading-[1.25] font-extrabold text-text-heading md:text-[1.5rem]">
            <Emphasise text={headline} />
          </h2>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-neutral-100 bg-neutral-0">
          {/* The frame's header row is SPACE_BETWEEN at 340 / 180 / 720 across
              the table's 1240 inner width, so the split is a measured ratio,
              not whatever the longest cell happens to need. Held as
              percentages of that 1240 rather than pixels so the ratio survives
              the fluid shell, and paired with `table-fixed` because automatic
              layout treats a `col` width as a suggestion content may overrule.
              The colgroup is inert while the table is `block` on mobile — a
              stacked card has no columns to size. */}
          <table className="block w-full border-collapse md:table md:table-fixed">
            <colgroup>
              <col className="md:w-[27.42%]" />
              <col className="md:w-[14.52%]" />
              <col className="md:w-[58.06%]" />
            </colgroup>

            <thead
              className={`border-b border-neutral-100 bg-neutral-100 ${"absolute h-px w-px overflow-hidden [clip-path:inset(50%)] whitespace-nowrap md:static md:h-auto md:w-auto md:[clip-path:none]"}`}
            >
              <tr>
                <th
                  scope="col"
                  className="p-5 text-start text-body font-bold text-text-heading"
                >
                  {columns.factor}
                </th>
                <th
                  scope="col"
                  className="p-5 text-start text-body font-bold text-text-heading"
                >
                  {columns.rate}
                </th>
                <th
                  scope="col"
                  className="p-5 text-start text-body font-bold text-text-heading"
                >
                  {columns.scope}
                </th>
              </tr>
            </thead>

            <tbody className="block md:table-row-group">
              {rows.map((row) => (
                <tr
                  key={row.factor}
                  className="block border-b border-neutral-100 last:border-b-0 md:table-row"
                >
                  <th
                    scope="row"
                    className="block p-5 pb-1 text-start text-body font-bold text-text-heading md:table-cell md:pb-5"
                  >
                    {row.factor}
                  </th>
                  <td className="block px-5 pb-1 text-body font-bold text-brand-red md:table-cell md:p-5">
                    {row.rate}
                  </td>
                  <td className="block px-5 pb-5 text-body-sm text-text-default md:table-cell md:p-5">
                    {row.scope}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/**
 * Portrait, name, role.
 *
 * `card` draws the white panel the "page-about" frame puts around each member
 * (r:12, 24px padding, the photograph itself at r:8). It is opt-in so a frame
 * that lists people straight on the page ground keeps the bare treatment.
 */
export function TeamGrid({
  eyebrow,
  headline,
  members,
  card = false,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  members: Array<{ name: string; role: string; photo?: string }>;
  card?: boolean;
}) {
  if (members.length === 0) return null;

  return (
    /* The frame gives team-section no fill of its own, so it shows the page
       canvas #f9fafb. That is `surface-page`, which theme.css keeps one step
       off the ramp's #f8f9fa (`neutral-50`) on purpose. */
    <section className="bg-surface-page">
      <div className={`${SHELL} ${PAD} grid gap-10`}>
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          eyebrowSize="md"
        />

        <ul className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 [&>*]:min-w-0">
          {members.map((member) => (
            <li
              key={member.name}
              className={`grid content-start gap-4 ${
                /* The frame strokes each card 1px #f3f4f6 — barely there on
                   the #f9fafb canvas, but it is what separates the white
                   panels from the ground. An inset ring rather than a border,
                   because a Figma stroke takes no layout space and a border
                   would narrow the 363 photograph by two pixels. */
                card ? "rounded-lg bg-neutral-0 p-6 ring-1 ring-neutral-100 ring-inset" : ""
              }`}
            >
              {member.photo ? (
                <img
                  src={member.photo}
                  alt=""
                  width={363}
                  height={260}
                  loading="lazy"
                  /* 363x260 exactly; 7/5 drew it a pixel short. */
                  className={`aspect-[363/260] w-full object-cover ${
                    card ? "rounded-md" : "rounded-2xl"
                  }`}
                />
              ) : null}

              <div className="grid gap-1">
                <p className="font-display text-h5 leading-[1.26] font-bold text-text-heading">
                  {member.name}
                </p>
                {/* 14 on an 18.2 line box in the frame (the card is 369 tall),
                    not the body-sm token's 20. */}
                <p className="text-body-sm leading-[1.3] text-brand-red">{member.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The dark figures strip, centred on however many figures it is given.
 *
 * `StatsBanner` in `Blocks.tsx` fixes four columns, which leaves a dead fourth
 * column under a three-figure frame; the "page-about" strip is `row gap:60
 * main:CENTER` with three 400px children, so the row is centred and each
 * figure is capped rather than stretched to a column of its own.
 */
export function StatsRow({
  stats,
}: {
  stats: Array<{ value: string; label: string }>;
}) {
  if (stats.length === 0) return null;

  return (
    <section className="bg-[#111827]">
      {/* The strip is padded 60 all round, not the 80 of the content
          column: three 400 figures + two 60 gaps = 1320, which the 1280
          column squeezed to 387 each and pulled the outer two figures
          inwards. The same steps as `SHELL` below 1440, 60 at 1440. */}
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 md:px-10 md:py-15 2xl:px-15">
        <dl className="flex flex-wrap justify-center gap-x-15 gap-y-10 text-center">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="grid flex-1 basis-[220px] gap-3 sm:max-w-[400px]"
            >
              {/* The label is the term and the figure its description, so the
                  visible label is itself the <dt>. It used to be emitted
                  twice — once hidden here, once as a <p> — which a screen
                  reader announced twice and which is not a legal child of
                  `dl > div` in any case. `order` keeps the figure on top
                  while the markup keeps the dt-before-dd order a <dl>
                  requires. The frame sets these labels UPPER and pure
                  #ffffff. */}
              <dt className="order-2 text-body-sm leading-[1.3] text-neutral-0 uppercase">
                {stat.label}
              </dt>
              {/* 48/800 at lineHeight 60.48 in the frame. The 1.26 ratio is
                  what makes each figure block 90 tall (60 + 12 + 18) and the
                  strip 210; `leading-none` collapsed it to 48. */}
              <dd className="order-1 font-display text-[2.25rem] leading-[1.26] font-extrabold text-brand-yellow md:text-[3rem]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/** Image on one side, a headline and a ticked list on the other. */
export function SplitFeature({
  eyebrow,
  headline,
  body,
  points,
  image,
  flip = false,
  tone = "white",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  body?: string | undefined;
  points: string[];
  image?: string | undefined;
  flip?: boolean;
  tone?: "white" | "subtle";
}) {
  return (
    <section className={tone === "white" ? "bg-neutral-0" : "bg-neutral-50"}>
      <div className={`${SHELL} ${PAD}`}>
        {/* 520 copy + 60 gutter + 640 image = 1220 inside the 1280 content
            box. The frame MIN-aligns the row and leaves 60px of slack at the
            right rather than stretching the pair across the column, so the cap
            is a max-width on the row itself: the ratio still holds at every
            width below 1220, and the row stays flush with the left edge the
            rest of the page aligns to. */}
        <div className="grid items-center gap-15 md:max-w-[1220px] md:grid-cols-[13fr_16fr] [&>*]:min-w-0">
          <div className={`grid gap-6 ${flip ? "md:order-2" : ""}`}>
            <div className="grid gap-3">
              {eyebrow ? (
                <p className="text-body-sm leading-[1.3] font-bold text-brand-red uppercase">
                  {eyebrow}
                </p>
              ) : null}

              {headline ? (
                <h2 className="font-display text-[1.625rem] leading-[1.2] font-extrabold text-text-heading md:text-[2.25rem]">
                  {headline}
                </h2>
              ) : null}
            </div>

            {body ? <p className="text-[0.9375rem] leading-[1.5] text-text-default">{body}</p> : null}

            {points.length > 0 ? (
              <ul className="grid gap-3">
                {points.map((point) => (
                  /* Each row is 18 tall in the frame (14 on 18.2), so the
                     three ticks stack to 78, not the token's 84. */
                  <li key={point} className="flex items-center gap-2 text-body-sm leading-[1.3] text-[#1f2937]">
                    {/* A bare 14px glyph stroked in brand red. No check mark in the
                        design document sits on a plate, so none is drawn here. */}
                    <svg
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="size-3.5 shrink-0 text-brand-red"
                    >
                      <path d="m2.33 7.4 3.09 3.02 6.25-6.42" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {image ? (
            <img
              src={image}
              alt=""
              width={640}
              height={400}
              loading="lazy"
              className={`aspect-[8/5] w-full rounded-xl object-cover ${flip ? "md:order-1" : ""}`}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** A contact panel: details on one side, the ways to reach us on the other. */
export function ContactPanel({
  headline,
  body,
  items,
  image,
}: {
  headline?: string | undefined;
  body?: string | undefined;
  items: Array<{ label: string; value: string; href?: string }>;
  image?: string | undefined;
}) {
  return (
    <section className="bg-neutral-50">
      <div
        className={`${SHELL} ${PAD} grid items-start gap-10 md:grid-cols-2 [&>*]:min-w-0`}
      >
        <div className="grid gap-5">
          {headline ? (
            <h2 className="font-display text-h2 font-extrabold text-text-strong">
              {headline}
            </h2>
          ) : null}
          {body ? <p className="text-body text-text-muted">{body}</p> : null}

          <dl className="mt-2 grid gap-5">
            {items.map((item) => (
              <div key={item.label} className="grid gap-1">
                <dt className="text-caption font-bold tracking-[0.5px] text-text-muted uppercase">
                  {item.label}
                </dt>
                <dd className="text-body font-semibold text-text-strong">
                  {item.href ? (
                    <a className="hover:text-brand-red" href={item.href}>
                      <bdi dir="ltr">{item.value}</bdi>
                    </a>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {image ? (
          <img
            src={image}
            alt=""
            width={640}
            height={340}
            loading="lazy"
            className="aspect-[32/17] w-full rounded-2xl object-cover"
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * A phone number as a dial string.
 *
 * Stripping everything but digits and `+` is not enough. The numbers are
 * written in the German convention `+49 (0) 800 123 4567`, where the
 * parenthesised 0 is the *national* trunk prefix — dialled instead of the
 * country code, never after it. Keeping it emits `tel:+4908001234567`,
 * which fails from any foreign network. Dropping it first lets the one
 * printed string serve both readings.
 *
 * Only `(0)` goes. A wider pattern would also swallow a parenthesised area
 * code — an editor writing `+49 (30) 901820` in the CMS would get a dial
 * string three digits short, and nothing would say so.
 */
function telHref(phone: string) {
  return phone.replace(/\(0\)/g, "").replace(/[^\d+]/g, "");
}

/**
 * The red hotline strip.
 *
 * The frame sets the number as yellow display text rather than a button; it
 * stays an anchor here because a phone number a visitor cannot tap is not the
 * same affordance on the device most of them read this on.
 */
export function HotlineBanner({
  title,
  phone,
  note,
}: {
  title?: string | undefined;
  phone?: string | undefined;
  note?: string | undefined;
}) {
  if (!title) return null;

  return (
    <section className="bg-brand-red">
      <div
        className={`${SHELL} flex flex-wrap items-center justify-center gap-6 py-10 text-center md:gap-10 md:py-[3.75rem] md:text-start`}
      >
        <span
          className="grid size-16 shrink-0 place-items-center rounded-full bg-white/[0.125] text-brand-yellow"
          aria-hidden="true"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 2 16 8 22 8" />
            <path d="m16 8 6-6" />
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.09 4.18 2 2 0 0 1 4.08 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
          </svg>
        </span>

        <div className="grid max-w-[800px] gap-1">
          {/* 126% in the frame, where `text-h3`'s fixed 32px line box is 30.24. */}
          <h2 className="font-display text-h3 leading-[1.26] font-extrabold text-white">
            {title}
          </h2>
          {/*
            The note's fill is solid white, but the frame drops the text node
            itself to 90% — that is what sets it back from the title over the
            red. Opacity on the element, not a lighter colour, so it is the
            same relationship the frame draws.
          */}
          {note ? (
            <p className="text-body-md text-white/90">{note}</p>
          ) : null}
        </div>

        {phone ? (
          <a
            href={`tel:${telHref(phone)}`}
            className="font-display text-[1.75rem] font-extrabold text-brand-yellow underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow"
          >
            <bdi dir="ltr">{phone}</bdi>
          </a>
        ) : null}
      </div>
    </section>
  );
}

/** A simple prose page: legal text, one heading and body per block. */
export function ProseSections({
  blocks,
}: {
  blocks: Array<{ title: string; body: string }>;
}) {
  if (blocks.length === 0) return null;

  return (
    <section className="bg-neutral-0">
      <div className={`${SHELL} ${PAD}`}>
        <div className="mx-auto grid w-full max-w-[800px] gap-8">
          {blocks.map((block) => (
            <article key={block.title} className="grid gap-3">
              <h2 className="font-display text-h3 font-bold text-text-strong">
                {block.title}
              </h2>
              <p className="text-body text-text-muted whitespace-pre-line">
                {block.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Article teasers for the guide index.
 *
 * `tone`, `cardRadius`, `headingSize` and `stackGap` exist because the frames
 * that use this row disagree on each: the guide index sits on #f8f9fa with
 * 24px cards under a 40px stack gap, the business service tiles on #f3f4f6
 * with 16px ones, a 32/800 headline and a 48px stack gap. The defaults are the
 * guide index, so an existing caller keeps its measurements. Both frames set
 * the gap between cards to 24px, so that one is not a variant.
 */
export function ArticleGrid({
  eyebrow,
  headline,
  subline,
  articles,
  readMore,
  align = "center",
  tone = "subtle",
  cardRadius = "2xl",
  headingSize = "lg",
  stackGap = "10",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  articles: Array<{
    title: string;
    body: string;
    image?: string;
    href?: string;
  }>;
  readMore?: string | undefined;
  align?: "center" | "start";
  tone?: "subtle" | "sunken";
  cardRadius?: "xl" | "2xl";
  headingSize?: "md" | "lg";
  stackGap?: "10" | "12";
}) {
  if (articles.length === 0) return null;

  return (
    <section className={tone === "sunken" ? "bg-neutral-100" : "bg-neutral-50"}>
      <div
        className={`${SHELL} ${PAD} grid ${stackGap === "12" ? "gap-12" : "gap-10"}`}
      >
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          subline={subline}
          align={align}
          size={headingSize}
        />

        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 [&>*]:min-w-0">
          {articles.map((article) => (
            <article
              key={article.title}
              className={`flex flex-col overflow-hidden border border-border-subtle bg-neutral-0 ${
                cardRadius === "xl" ? "rounded-xl" : "rounded-2xl"
              }`}
            >
              {article.image ? (
                <img
                  src={article.image}
                  alt=""
                  width={360}
                  height={180}
                  loading="lazy"
                  className="aspect-2/1 w-full object-cover"
                />
              ) : null}

              <div className="flex flex-1 flex-col gap-3 p-6">
                <h3 className={TITLE_20}>
                  {article.title}
                </h3>
                <p className="flex-1 text-body-sm text-text-muted">
                  {article.body}
                </p>

                {article.href && readMore ? (
                  <Link
                    href={article.href}
                    className="text-body-sm font-bold text-brand-red hover:underline"
                  >
                    {readMore}
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The single promoted article at the top of the guide index.
 *
 * A wide card rather than a hero: the M.io "page-blog" frame opens on the
 * article itself, not on a page title, so the eyebrow is the only chrome
 * above it. The category chip is the brand red at 8% — a tint, not a fill.
 */
export function FeaturedArticle({
  eyebrow,
  category,
  title,
  excerpt,
  date,
  readTime,
  image,
}: {
  eyebrow?: string | undefined;
  category?: string | undefined;
  title?: string | undefined;
  excerpt?: string | undefined;
  date?: string | undefined;
  readTime?: string | undefined;
  image?: string | undefined;
}) {
  if (!title) return null;

  return (
    <section className="bg-neutral-50">
      <div className={`${SHELL} ${PAD} grid gap-8`}>
        {eyebrow ? (
          <p className="text-body-sm font-bold text-brand-red uppercase">{eyebrow}</p>
        ) : null}

        <article className="grid overflow-hidden rounded-xl border border-border-subtle bg-neutral-0 md:grid-cols-2 [&>*]:min-w-0">
          {image ? (
            <img
              src={image}
              alt=""
              width={600}
              height={400}
              className="aspect-[3/2] h-full w-full object-cover"
            />
          ) : null}

          <div className="flex flex-col justify-center gap-5 p-8 md:p-10">
            {/* Uppercased, unlike the chips on the four cards below in
                `ArticleIndex`: the "page-blog" frame sets textCase UPPER on
                this one node and leaves the card chips at none. The
                asymmetry is the frame's — do not tidy it into consistency. */}
            {category ? (
              <span className="w-fit rounded-sm bg-brand-red/8 px-2.5 py-1 text-caption font-bold text-brand-red uppercase">
                {category}
              </span>
            ) : null}

            <h2 className="font-display text-[1.5rem] leading-[1.2] font-extrabold text-text-strong md:text-[1.75rem]">
              {title}
            </h2>

            {excerpt ? (
              <p className="text-body text-text-muted">{excerpt}</p>
            ) : null}

            {date || readTime ? (
              <p className="flex flex-wrap items-center gap-4 text-body-sm text-text-muted">
                {date ? <span>{date}</span> : null}
                {date && readTime ? (
                  <span aria-hidden="true">&bull;</span>
                ) : null}
                {readTime ? <span>{readTime}</span> : null}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}

/**
 * The guide index: a two-column card list beside a sticky-less sidebar.
 *
 * Distinct from `ArticleGrid`, which is a full-width teaser row with its own
 * centred heading and a "read more" link. Here the cards carry a category
 * chip, a date and a reading time but no link — the frame shows no article
 * detail page, and a card that goes nowhere should not look clickable.
 */
export function ArticleIndex({
  headline,
  articles,
  categories,
  promo,
}: {
  headline?: string | undefined;
  articles: Array<{
    title: string;
    category?: string | undefined;
    date?: string | undefined;
    readTime?: string | undefined;
    image?: string | undefined;
  }>;
  categories?:
    | {
        title?: string | undefined;
        items: Array<{ label: string; count: string }>;
      }
    | undefined;
  promo?:
    | {
        title?: string | undefined;
        body?: string | undefined;
        button?: string | undefined;
        /** Omit when the promised download does not exist yet. */
        href?: string | undefined;
        /** Shown in place of a working link, when `href` is omitted. */
        note?: string | undefined;
      }
    | undefined;
}) {
  return (
    <section className="bg-neutral-0">
      <div
        className={`${SHELL} ${PAD} grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]`}
      >
        <div className="grid gap-10">
          {headline ? (
            <h2 className="font-display text-h3 font-extrabold text-text-strong">
              {headline}
            </h2>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2 [&>*]:min-w-0">
            {articles.map((article) => (
              <article
                key={article.title}
                className="flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-neutral-0"
              >
                {article.image ? (
                  <img
                    src={article.image}
                    alt=""
                    width={360}
                    height={180}
                    loading="lazy"
                    className="aspect-2/1 w-full object-cover"
                  />
                ) : null}

                <div className="flex flex-1 flex-col gap-3 p-5">
                  {article.category || article.date ? (
                    <div className="flex items-center justify-between gap-3">
                      {article.category ? (
                        <span className="rounded-sm bg-neutral-100 px-2 py-1 text-caption font-bold text-text-strong">
                          {article.category}
                        </span>
                      ) : (
                        <span />
                      )}
                      {article.date ? (
                        <span className="text-caption text-text-muted">
                          {article.date}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <h3 className="flex-1 text-body font-bold text-text-strong">
                    {article.title}
                  </h3>

                  {article.readTime ? (
                    <p className="text-caption text-text-muted">
                      {article.readTime}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-8">
          {categories && categories.items.length > 0 ? (
            <div className="grid gap-4 rounded-lg bg-neutral-100 p-6">
              {categories.title ? (
                <h2 className="text-body font-bold text-text-strong">
                  {categories.title}
                </h2>
              ) : null}

              <ul className="grid gap-4">
                {categories.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <span className="text-body-sm text-text-strong">
                      {item.label}
                    </span>
                    <span className="text-caption font-bold text-brand-red">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {promo?.title ? (
            <div className="grid gap-4 rounded-lg bg-brand-red p-6">
              <DocumentIcon />

              <h2 className="text-h5 font-bold text-white">{promo.title}</h2>

              {promo.body ? (
                <p className="text-caption text-white">{promo.body}</p>
              ) : null}

              {/*
                The frame's button fills the card's inner width (252px of the
                300px card) with its label centred — not a chip hugging its
                text. Radius 6, between --radius-sm and --radius-md.

                With no `href` there is no file to serve: the bar is drawn as
                the frame draws it but disabled, and the note says why. A live
                "Download Now" that opens something other than the checklist
                would be worse than one that admits it is not ready.
              */}
              {promo.button ? (
                promo.href ? (
                  <Link
                    href={promo.href}
                    className={
                      PROMO_BUTTON +
                      " transition-colors hover:bg-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    }
                  >
                    {promo.button}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={PROMO_BUTTON + " cursor-not-allowed opacity-70"}
                  >
                    {promo.button}
                  </button>
                )
              ) : null}

              {!promo.href && promo.note ? (
                <p className="text-caption text-white">{promo.note}</p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

const PROMO_BUTTON =
  "block w-full rounded-[6px] bg-brand-yellow px-4 py-2.5 text-center text-caption font-bold text-text-strong";

function DocumentIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-white"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

/**
 * The dark hero that carries a lead-capture panel.
 *
 * Built like `DarkHero`: the `hero` frame's own fills are a photograph at
 * `scaleMode: FILL` with a `#111827` wash at 75% over it, so the picture is the
 * section's ground rather than a sibling column. The frame adds a white form
 * card beside the copy and its badge is brand red rather than yellow, and the
 * band is a fixed 540px tall with a 64px gutter between the two columns.
 *
 * `action` is optional, as on `ContactFormSection`: without an endpoint the
 * form posts nowhere rather than to a route that would discard what was typed.
 */
export function LeadFormHero({
  eyebrow,
  headline,
  subline,
  image,
  form,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  image?: string | undefined;
  form: {
    title?: string | undefined;
    submit?: string | undefined;
    action?: string | undefined;
    fields: Array<{
      name: string;
      label: string;
      placeholder: string;
      type?: "text" | "email" | "month";
    }>;
  };
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
            className="absolute inset-0 -z-10 bg-[#111827]/75"
          />
        </>
      ) : null}

      {/* The frame does not spread the two columns across the content width:
          hero-left is a fixed 640, the form a fixed 420, the gutter 64, and the
          band stops short of the right margin. `1fr_420px` pinned the form to
          that margin and stretched the copy column past its 640 measure. The
          fixed tracks start at xl, where the 1200 column is wide enough to
          leave slack behind them; below that the column is narrower than
          640 + 64 + 420, so there is no slack to leave and 1fr still holds. */}
      <div
        className={`${SHELL} grid items-center gap-10 py-14 md:py-20 lg:min-h-[540px] lg:grid-cols-[1fr_420px] lg:gap-16 lg:py-0 xl:grid-cols-[640px_420px]`}
      >
        <div className="grid gap-6">
          {/* The frame's badge is textCase UPPER at letterSpacing 0. The row
              stores sentence case and `text-caption` brings 0.5px of tracking
              the node does not have, so both are corrected here rather than by
              rewriting the copy or the token — the token's 0.5px is right for
              the sub-page eyebrows that opt into it. */}
          {eyebrow ? (
            <p className="w-fit rounded-full bg-brand-red px-3 py-1.5 text-caption font-bold tracking-normal text-white uppercase">
              {eyebrow}
            </p>
          ) : null}

          {/* 48/800 over a 60.5px line box in the frame, which is 1.26. At 1.1
              the three-line headline came out ~23px short. */}
          {headline ? (
            <h1 className="max-w-[640px] font-display text-[2rem] leading-[1.26] font-extrabold text-white md:text-[3rem]">
              <Emphasise text={headline} />
            </h1>
          ) : null}

          {subline ? (
            <p className="max-w-[640px] text-body-lg text-neutral-100">
              {subline}
            </p>
          ) : null}
        </div>

        <form
          {...(form.action ? { action: form.action, method: "get" } : {})}
          className="grid gap-5 rounded-lg bg-neutral-0 p-8"
        >
          {form.title ? (
            <h2 className={TITLE_20}>
              {form.title}
            </h2>
          ) : null}

          <div className="grid gap-3">
            {form.fields.map((field) => (
              <div key={field.name} className="grid gap-1.5">
                <label
                  htmlFor={`lead-${field.name}`}
                  className="text-caption font-semibold text-neutral-500"
                >
                  {field.label}
                </label>
                <input
                  id={`lead-${field.name}`}
                  name={field.name}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  className="rounded-[6px] bg-neutral-100 p-3 text-body-sm text-text-strong placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
                />
              </div>
            ))}
          </div>

          {form.submit ? (
            <button
              type="submit"
              className="rounded-md bg-brand-red p-3 text-body-sm font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
            >
              {form.submit}
            </button>
          ) : null}
        </form>
      </div>
    </section>
  );
}

/**
 * The pale trust strip of customer wordmarks.
 *
 * The frame sets these as text, not logo images, so they are stored as copy
 * and stay legible at any zoom. `<bdi dir="ltr">` keeps the Latin brand names
 * from being reordered inside the Arabic layout.
 */
export function LogoStrip({
  label,
  names,
}: {
  label?: string | undefined;
  names: string[];
}) {
  if (names.length === 0) return null;

  return (
    <section className="bg-neutral-100">
      <div
        className={`${SHELL} flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-8 lg:flex-nowrap`}
      >
        {label ? (
          <p className="shrink-0 text-caption font-bold tracking-normal text-neutral-600 uppercase">
            {label}
          </p>
        ) : null}

        {/* The frame spreads the wordmarks across the full content width, so
            the list takes the remaining space and distributes inside it
            rather than clustering behind the label at a fixed gap. */}
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 lg:w-full lg:flex-nowrap lg:justify-between">
          {names.map((name) => (
            <li
              key={name}
              className="font-display text-h4 font-extrabold text-neutral-600"
            >
              <bdi dir="ltr">{name}</bdi>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Cards fronted by a red icon tile.
 *
 * `NumberedGrid` is the same shape with a numeral instead, but the ordinals it
 * prints imply a sequence these cards do not have. The icon key is a plain
 * string so it can sit beside the copy; an unknown key degrades to a dot
 * rather than rendering nothing.
 */
export function IconCardGrid({
  eyebrow,
  headline,
  subline,
  items,
  columns = 4,
  tone = "white",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  items: Array<{ icon: string; title: string; body: string }>;
  columns?: 3 | 4;
  tone?: "white" | "subtle";
}) {
  if (items.length === 0) return null;

  const grid =
    columns === 3 ? "md:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className={tone === "white" ? "bg-neutral-0" : "bg-neutral-50"}>
      <div className={`${SHELL} ${PAD} grid gap-12`}>
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          subline={subline}
        />

        <ul className={`grid gap-8 ${grid}`}>
          {items.map((item) => (
            <li
              key={item.title}
              className="grid content-start gap-4 rounded-lg border border-border-subtle bg-neutral-50 p-8"
            >
              <span className="grid size-12 place-items-center rounded-lg bg-brand-red text-white">
                <BlockIcon name={item.icon} />
              </span>
              <h3 className={TITLE_20}>
                {item.title}
              </h3>
              <p className="text-body-sm text-text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The 24px line icons `IconCardGrid` names by key. */
function BlockIcon({ name }: { name: string }) {
  const paths: Record<string, string[]> = {
    user: [
      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2",
      "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    ],
    tag: [
      "M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z",
      "M7.5 7.5h.01",
    ],
    shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"],
    "refresh-cw": [
      "M21 2v6h-6",
      "M3 22v-6h6",
      "M3.5 9a9 9 0 0 1 14.9-3.4L21 8",
      "M20.5 15a9 9 0 0 1-14.9 3.4L3 16",
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

/**
 * The chip that closes a hero, such as the fixed-price guarantee on "preise".
 *
 * Its own band rather than a `PageHero` slot, because that hero is shared by
 * every content page while the chip belongs to one. `attached` eats the hero's
 * bottom padding so the chip reads as part of it, which is how the Figma frame
 * draws it: 24px under the subline, inside the same white section.
 */
export function NoticePill({
  text,
  tone = "white",
  attached = false,
}: {
  text?: string | undefined;
  tone?: "white" | "subtle";
  attached?: boolean;
}) {
  if (!text) return null;

  return (
    <section className={tone === "white" ? "bg-neutral-0" : "bg-neutral-50"}>
      <div
        className={`${SHELL} flex justify-center ${
          attached ? "-mt-10 pb-14 md:-mt-14 md:pb-20" : "py-8"
        }`}
      >
        {/* 13/700 — the chip is set a step below body-sm in the frame. */}
        <p className="flex items-center gap-2 rounded-full bg-brand-yellow px-4 py-2 text-[0.8125rem] font-bold text-text-heading">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="m8.5 12.5 2.5 2.5 4.5-5" />
          </svg>
          {text}
        </p>
      </div>
    </section>
  );
}

/**
 * A worked pricing example: the inputs on one side, the itemised total on the
 * other.
 *
 * The inputs are a `<dl>`, not form controls. The frame draws them as select
 * boxes, but nothing here is interactive — a control that answers no click is
 * worse than plain text, and the live calculator it advertises lives behind
 * the call to action. The chevron on the first plate is therefore dropped: it
 * is a control affordance for a control that is not here. `confirmed` is not —
 * it is the affirmative state marker the frame puts on the elevator plate, and
 * the only green anywhere in it, so it is drawn.
 *
 * Both columns start at the top: the frame aligns them on the cross axis at
 * START even though the form column is 52px taller than the panel.
 */
export function EstimatePreview({
  eyebrow,
  headline,
  subline,
  fields,
  panelTitle,
  lines,
  totalLabel,
  totalValue,
  cta,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  fields: Array<{
    label: string;
    value: string;
    hint?: string | undefined;
    confirmed?: boolean | undefined;
  }>;
  panelTitle?: string | undefined;
  lines: Array<{ label: string; value: string }>;
  totalLabel?: string | undefined;
  totalValue?: string | undefined;
  cta?: { label: string; href: string } | undefined;
}) {
  return (
    <section className="bg-neutral-0">
      <div
        className={`${SHELL} ${PAD} grid items-start gap-10 md:grid-cols-2 md:gap-15 [&>*]:min-w-0`}
      >
        <div className="grid gap-6">
          {/* The frame's calculator-preview column is 520 wide, not the 640
              the start-aligned heading defaults to. */}
          <SectionHeading
            eyebrow={eyebrow}
            headline={headline}
            subline={subline}
            align="start"
            startWidth="narrow"
            eyebrowSize="md"
          />

          {fields.length > 0 ? (
            <dl className="grid gap-4">
              {fields.map((field) => (
                <div key={field.label} className="grid gap-2">
                  <dt className="text-body-sm font-bold text-text-heading">
                    {field.label}
                  </dt>
                  <dd className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-page px-3.5 py-3.5 text-[0.9375rem] text-text-heading">
                    <span>{field.value}</span>
                    {field.hint ? (
                      <span className="text-body-sm text-brand-red">
                        {field.hint}
                      </span>
                    ) : null}
                    {field.confirmed ? (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="shrink-0 text-success"
                      >
                        <path d="m3 8.5 3.5 3.5L13 5" />
                      </svg>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="grid gap-6 rounded-xl bg-[#111827] p-8 md:p-10">
          {panelTitle ? (
            <h3 className="font-display text-h3 font-extrabold text-white">
              {panelTitle}
            </h3>
          ) : null}

          {lines.length > 0 ? (
            <dl className="grid gap-3">
              {lines.map((line) => (
                <div
                  key={line.label}
                  className="flex flex-wrap items-baseline justify-between gap-3"
                >
                  <dt className="text-body-sm text-neutral-300">
                    {line.label}
                  </dt>
                  <dd className="text-body-sm font-bold text-white">
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {totalLabel || totalValue ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#4b5563] pt-6">
              {totalLabel ? (
                <p className="text-h4 font-bold text-white">{totalLabel}</p>
              ) : null}
              {totalValue ? (
                <p className="font-display text-[2rem] leading-[1.25] font-extrabold text-brand-yellow">
                  {totalValue}
                </p>
              ) : null}
            </div>
          ) : null}

          {cta ? (
            <Link
              href={cta.href}
              className="rounded-md bg-brand-red px-6 py-3.5 text-center text-[0.9375rem] font-bold text-white transition-colors hover:bg-neutral-0 hover:text-brand-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
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
 * `legal-split` is drawn in a narrower column than the rest of the site: 120px
 * gutters on the 1440 canvas leave 1200 for the content (260 rail + 64 gap +
 * 876 document), and it pads 64 rather than 80 top and bottom. Hence its own
 * shell instead of the site-wide `SHELL`/`PAD` pair.
 */
const LEGAL_SHELL = "mx-auto w-full max-w-[1200px] px-5 md:px-10 py-16";

/**
 * The two-column shell the legal documents share.
 *
 * A rail naming the sibling documents next to the document itself, as the
 * `legal-split` frame lays it out: a plain static column, which is what the
 * frame draws — below `lg` it collapses above the text.
 *
 * Anything page-specific — the imprint card, an appendix — arrives as
 * `children` so the shell itself stays free of a single document's content.
 */
export function LegalDocument({
  eyebrow,
  docs,
  title,
  meta,
  blocks,
  children,
}: {
  eyebrow?: string | undefined;
  docs: Array<{ label: string; href: string; active?: boolean }>;
  title?: string | undefined;
  meta?: string | undefined;
  blocks: Array<{ title: string; body: string }>;
  children?: ReactNode;
}) {
  return (
    <section className="bg-neutral-0">
      <div
        className={`${LEGAL_SHELL} grid gap-12 lg:grid-cols-[260px_1fr] lg:gap-16 [&>*]:min-w-0`}
      >
        <nav aria-label={eyebrow} className="grid content-start gap-3">
          {eyebrow ? (
            <p className="text-body-sm font-bold tracking-[0.5px] text-brand-red uppercase">
              {eyebrow}
            </p>
          ) : null}

          {/* Keyed by position, not by label or href: both are editor-owned
              and two rows can hold the same string. */}
          {docs.map((doc, index) => (
            <Link
              key={index}
              href={doc.href}
              aria-current={doc.active ? "page" : undefined}
              className={`rounded-[6px] px-4 py-2.5 text-body-sm text-text-strong transition-colors hover:bg-neutral-100 ${
                doc.active ? "bg-neutral-100 font-bold" : "font-medium"
              }`}
            >
              {doc.label}
            </Link>
          ))}
        </nav>

        <div className="grid content-start gap-8">
          {title || meta ? (
            <div className="grid gap-3">
              {/* 32px in the frame, which falls between --text-h2 (30) and
                  --text-h1 (36); the literal keeps the document title at the
                  designed size rather than rounding it to a neighbour. */}
              {title ? (
                <h1 className="font-display text-[2rem] leading-[1.15] font-extrabold text-text-strong">
                  {title}
                </h1>
              ) : null}
              {meta ? (
                <p className="text-caption text-text-muted">{meta}</p>
              ) : null}
            </div>
          ) : null}

          {blocks.length > 0 ? (
            <div className="grid gap-5">
              {blocks.map((block, index) => (
                <article key={index} className="grid gap-2.5">
                  <h2 className="text-h5 font-bold text-text-strong">
                    {block.title}
                  </h2>
                  <p className="text-body-sm text-text-muted whitespace-pre-line">
                    {block.body}
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * A facts panel: a title over labelled groups of lines.
 *
 * `lines` is newline-separated and each line carries `dir="auto"`, so an
 * Arabic label above a German street address or a Latin email renders in the
 * right direction without splitting the copy into more rows than an editor
 * wants to maintain.
 */
export function DetailCard({
  title,
  groups,
}: {
  title?: string | undefined;
  groups: Array<{ label: string; lines: string }>;
}) {
  if (groups.length === 0) return null;

  return (
    <div className="grid gap-5 rounded-xl border border-border-subtle bg-neutral-50 p-8">
      {title ? (
        <h2 className="font-display text-h4 font-extrabold text-text-strong">
          {title}
        </h2>
      ) : null}

      {/* The frame sets the groups apart rather than sharing the width out:
          two 300px columns pushed to the ends of the row. Below `sm` they
          stack full width, where space-between has nothing to distribute. */}
      <dl className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:justify-between [&>*]:min-w-0">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="grid gap-1 sm:w-[300px]">
            <dt className="text-caption font-bold tracking-[0.5px] text-text-muted uppercase">
              {group.label}
            </dt>
            <dd className="grid gap-1">
              {/* Keyed by position: the lines are editor-owned free text and
                  two of them can legitimately be identical. */}
              {group.lines.split("\n").map((line, lineIndex) => (
                <span
                  key={lineIndex}
                  dir="auto"
                  className="block text-body-sm text-text-strong"
                >
                  {line}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── Reviews ─────────────────────────────────────────────────────────── */

/**
 * The outlined five-star row.
 *
 * A rating, not an ornament. The frame strokes the first `filled` stars
 * #ffcb08 and the remainder #e5e7eb — that is how the summary card draws 4.8
 * and how Laura Hoffmann's four-star review is drawn. Where the row carries a
 * number no neighbouring line repeats it is labelled; `decorative` covers the
 * other case — the summary card, where the score is already set in text right
 * beside the stars. Announcing the graphic there would read out a second,
 * rounded figure ("4 / 5") contradicting the "4.8" a sighted visitor sees.
 */
function Stars({
  filled,
  decorative = false,
}: {
  filled: number;
  decorative?: boolean;
}) {
  return (
    <span
      className="flex gap-1"
      {...(decorative
        ? { "aria-hidden": true as const }
        : { role: "img" as const, "aria-label": `${filled} / 5` })}
    >
      {[1, 2, 3, 4, 5].map((index) => (
        <svg
          key={index}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          aria-hidden="true"
          className={
            index <= filled ? "text-brand-yellow" : "text-border-subtle"
          }
        >
          <path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1.1 6.1-5.5-2.9-5.5 2.9 1.1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/*
 * 13px, written literally rather than added to the scale.
 *
 * The page-reviews frame sets its filter chips, its sort control and the
 * operator replies at 13px. `theme.css` states its own doctrine that it holds
 * the handbook's published scale and nothing else, and 13px is not a rung of
 * it — it appears on this one frame. `Sections.tsx` writes its own 13px nodes
 * the same way (`MICRO_BOLD`), so this follows the house pattern instead of
 * minting a token for a single page. The line box is spelled out because an
 * arbitrary `text-[…]` sets the font size alone, and dropping `text-caption`
 * is also what takes these nodes off its 0.5px tracking — the frame sets 0.
 */
const MICRO = "text-[0.8125rem] leading-[1.25rem]";
const MICRO_SEMI = `${MICRO} font-semibold`;

/**
 * A page opening that pairs a headline with an aggregate-rating card.
 *
 * The score is a claim about the business, so it is carried by `basis` and
 * `note` in text rather than left to the star graphic.
 */
export function RatingSummary({
  eyebrow,
  headline,
  subline,
  score,
  scoreNote,
  basis,
  note,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  subline?: string | undefined;
  score?: string | undefined;
  scoreNote?: string | undefined;
  basis?: string | undefined;
  note?: string | undefined;
}) {
  return (
    <section className="bg-neutral-100">
      <div
        className={`${SHELL} grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 md:py-16`}
      >
        <div className="grid gap-4 md:max-w-[420px]">
          {/* Outfit, not the body face: the frame sets this eyebrow in the
              display family at 14/700. */}
          {eyebrow ? (
            <p className="font-display text-body-sm font-bold text-brand-red uppercase">
              {eyebrow}
            </p>
          ) : null}

          {headline ? (
            <h1 className="font-display text-[1.75rem] leading-[1.15] font-extrabold text-text-strong md:text-[2.5rem]">
              {headline}
            </h1>
          ) : null}

          {subline ? (
            <p className="text-body-md text-text-muted">{subline}</p>
          ) : null}
        </div>

        {score || basis ? (
          <div className="flex flex-wrap items-center gap-8 rounded-xl border border-border-subtle bg-neutral-0 p-8 md:w-[438px]">
            {score ? (
              <div className="grid gap-1 text-center">
                <p className="font-display text-[3rem] leading-none font-extrabold text-text-strong">
                  {score}
                </p>
                {scoreNote ? (
                  <p className="text-body-sm text-text-muted">{scoreNote}</p>
                ) : null}
              </div>
            ) : null}

            <span className="hidden w-px self-stretch bg-border-subtle sm:block" />

            <div className="grid flex-1 gap-2">
              {/*
               * The frame lights four of five here — the graphic form of
               * "4.8". Decorative whenever that number is on the page in
               * words, which is the frame's own arrangement.
               */}
              <Stars filled={4} decorative={Boolean(score)} />

              {basis ? (
                <p className="text-body-md font-semibold text-text-strong">
                  {basis}
                </p>
              ) : null}

              {note ? (
                <p className="flex items-center gap-2 text-caption font-semibold tracking-normal text-success">
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success text-white">
                    <Check />
                  </span>
                  {note}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The taxonomy strip above a feed.
 *
 * A list, not buttons: the page is a server component with no filtering
 * endpoint behind it, and controls that look interactive but do nothing are
 * worse than an honest statement of the categories.
 */
export function FilterBar({
  label,
  chips,
  sortLabel,
  sortValue,
}: {
  label?: string | undefined;
  chips: string[];
  sortLabel?: string | undefined;
  sortValue?: string | undefined;
}) {
  if (chips.length === 0) return null;

  return (
    <section className="border-y border-border-subtle bg-neutral-0">
      <div
        className={`${SHELL} flex flex-wrap items-center gap-x-6 gap-y-4 py-6`}
      >
        {label ? (
          <p className="text-body-sm font-bold text-text-strong">{label}</p>
        ) : null}

        <ul className="flex flex-wrap items-center gap-3">
          {chips.map((chip, index) => (
            <li
              key={chip}
              {...(index === 0 ? { "aria-current": true as const } : {})}
              className={
                index === 0
                  ? `rounded-full bg-brand-red px-4 py-2 ${MICRO_SEMI} text-white`
                  : `rounded-full border border-border-subtle px-4 py-2 ${MICRO_SEMI} text-text-strong`
              }
            >
              {chip}
            </li>
          ))}
        </ul>

        {sortValue ? (
          <p className="flex items-center gap-3 md:ms-auto">
            {sortLabel ? (
              <span className={`${MICRO} text-text-muted`}>{sortLabel}</span>
            ) : null}
            {/* r:6 sits below `--radius-md` (8px), so it is written out. */}
            <span
              className={`rounded-[6px] border border-border-subtle px-4 py-2 ${MICRO_SEMI} text-text-strong`}
            >
              {sortValue}
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The customer-review feed: one card per review, each able to carry the
 * operator reply published alongside it.
 */
export function ReviewFeed({
  reviews,
  verifiedLabel,
  responseLabel,
  more,
}: {
  reviews: Array<{
    name: string;
    meta?: string | undefined;
    body?: string | undefined;
    response?: string | undefined;
    avatar?: string | undefined;
    /** Stars lit, out of five. The frame draws these per review. */
    rating: number;
  }>;
  verifiedLabel?: string | undefined;
  responseLabel?: string | undefined;
  more?: string | undefined;
}) {
  if (reviews.length === 0) return null;

  return (
    <section className="bg-neutral-0">
      <div className={`${SHELL} grid gap-8 py-12 md:py-16`}>
        <ul className="grid gap-8">
          {reviews.map((review) => (
            <li
              key={review.name}
              className="grid gap-5 rounded-lg border border-border-subtle bg-neutral-50 p-6 md:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {review.avatar ? (
                    <img
                      src={review.avatar}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      className="size-12 shrink-0 rounded-full object-cover"
                    />
                  ) : null}

                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-body font-bold text-text-strong">
                        {review.name}
                      </p>

                      {verifiedLabel ? (
                        <span className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[0.625rem] font-bold text-success">
                          <Check className="shrink-0" />
                          {verifiedLabel}
                        </span>
                      ) : null}
                    </div>

                    {review.meta ? (
                      <p className="text-caption tracking-normal text-text-muted">
                        {review.meta}
                      </p>
                    ) : null}
                  </div>
                </div>

                <Stars filled={review.rating} />
              </div>

              {review.body ? (
                /* 15/400 on a 24px line box — `text-body-md` carries 19.5px,
                   which is the button/placeholder line the token was cut for,
                   so the paragraph states its own. */
                <p className="text-body-md leading-[1.5rem] text-text-strong">
                  {review.body}
                </p>
              ) : null}

              {review.response ? (
                <div className="grid gap-2 rounded-md border border-border-subtle bg-neutral-0 p-4">
                  {responseLabel ? (
                    <p className="text-caption font-bold tracking-normal text-brand-red">
                      {responseLabel}
                    </p>
                  ) : null}
                  <p className={`${MICRO} text-text-strong`}>
                    {review.response}
                  </p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {more ? (
          <div className="flex justify-center pt-6">
            <p className="rounded-md border border-brand-red px-6 py-3 text-body-sm font-semibold text-brand-red">
              {more}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Image on one side, labelled points on the other.
 *
 * `SplitFeature`'s points are bare strings under a green tick; the frames that
 * use this one instead give each point its own bold label over a muted
 * paragraph, and no tick. Collapsing the two into one string would lose the
 * typographic distinction the design states explicitly.
 */
export function SplitDetail({
  eyebrow,
  headline,
  body,
  items,
  image,
  flip = false,
  tone = "white",
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  body?: string | undefined;
  items: Array<{ title: string; body: string }>;
  image?: string | undefined;
  flip?: boolean;
  tone?: "white" | "subtle";
}) {
  return (
    <section className={tone === "white" ? "bg-neutral-0" : "bg-neutral-50"}>
      {/* 580 image + 60 gutter + 640 copy across the 1280 box, top-aligned:
          the frame's row sets no cross-axis alignment, so both start at 0. */}
      <div
        className={`${SHELL} ${PAD} grid items-start gap-15 [&>*]:min-w-0 ${
          flip ? "md:grid-cols-[29fr_32fr]" : "md:grid-cols-[32fr_29fr]"
        }`}
      >
        <div className={`grid gap-6 ${flip ? "md:order-2" : ""}`}>
          <div className="grid gap-3">
            {eyebrow ? (
              <p className="text-body-sm leading-[1.3] font-bold text-brand-red uppercase">
                {eyebrow}
              </p>
            ) : null}

            {headline ? (
              <h2 className="font-display text-[1.625rem] leading-[1.2] font-extrabold text-text-heading md:text-[2.25rem]">
                {headline}
              </h2>
            ) : null}

            {body ? <p className="text-body text-text-muted">{body}</p> : null}
          </div>

          {items.length > 0 ? (
            <dl className="grid gap-4">
              {items.map((item) => (
                <div key={item.title} className="grid gap-1.5">
                  <dt className="font-display text-h5 leading-[1.26] font-bold text-text-heading">
                    {item.title}
                  </dt>
                  <dd className="text-body-sm text-text-default">{item.body}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {image ? (
          <img
            src={image}
            alt=""
            width={580}
            height={400}
            loading="lazy"
            className={`aspect-[29/20] w-full rounded-xl object-cover ${flip ? "md:order-1" : ""}`}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * A centred hero on the dark ground, with an optional search affordance.
 *
 * `DarkHero` is a two-column, left-aligned hero built around an eyebrow chip,
 * an image and two buttons; the FAQ frame is a centred column on the same
 * `#111827` ground with none of those. The `searchHint` bar is presentational:
 * there is no search backend, so the bar is drawn at the frame's 600x54 but
 * takes no input rather than promising a behaviour the page does not have.
 */
export function CenteredHero({
  tone = "dark",
  headline,
  subline,
  searchHint,
}: {
  tone?: "dark" | "white";
  headline?: string | undefined;
  subline?: string | undefined;
  searchHint?: string | undefined;
}) {
  const dark = tone === "dark";

  return (
    <section className={dark ? "bg-[#111827]" : "bg-neutral-0"}>
      <div className={`${SHELL} ${PAD}`}>
        <div className="mx-auto grid w-full max-w-[800px] justify-items-center gap-6 text-center">
          {headline ? (
            <h1
              className={`font-display text-[2rem] leading-[1.15] font-extrabold md:text-[2.5rem] ${
                dark ? "text-white" : "text-text-strong"
              }`}
            >
              <Emphasise text={headline} />
            </h1>
          ) : null}

          {subline ? (
            <p
              className={`text-body ${dark ? "text-neutral-100" : "text-text-muted"}`}
            >
              {subline}
            </p>
          ) : null}

          {searchHint ? (
            <p
              aria-hidden="true"
              className="flex h-[54px] w-full max-w-[600px] items-center gap-3 rounded-md bg-neutral-0 px-4 text-start text-body-sm text-neutral-500"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="truncate">{searchHint}</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * The quiet closing band: light ground, red primary, outlined secondary.
 *
 * `CtaBand` is the loud red one with a yellow button and `GuaranteeBanner` is
 * the green strip; neither fits a page that ends on a soft grey "still stuck?"
 * note. `secondary` is a bare anchor rather than a route link so it can carry
 * a `tel:` or `mailto:` scheme.
 */
export function SoftCtaBand({
  headline,
  subline,
  primary,
  secondary,
}: {
  headline?: string | undefined;
  subline?: string | undefined;
  primary?: { label: string; href: string } | undefined;
  secondary?: { label: string; href: string } | undefined;
}) {
  return (
    <section className="bg-neutral-100">
      <div
        className={`${SHELL} ${PAD} grid justify-items-center gap-6 text-center`}
      >
        {headline ? (
          <h2 className="max-w-[720px] font-display text-h3 font-extrabold text-text-strong">
            {headline}
          </h2>
        ) : null}

        {subline ? (
          <p className="max-w-[640px] text-[0.9375rem] leading-[18px] text-neutral-500">
            {subline}
          </p>
        ) : null}

        {primary || secondary ? (
          <div className="flex flex-wrap justify-center gap-4">
            {primary ? (
              <Link
                href={primary.href}
                className="rounded-md bg-brand-red px-6 py-3 text-body-sm font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
              >
                {primary.label}
              </Link>
            ) : null}

            {secondary ? (
              <a
                href={secondary.href}
                className="rounded-md border border-text-strong px-6 py-3 text-body-sm font-bold text-text-strong transition-colors hover:bg-neutral-900 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
              >
                {secondary.label}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * The contact form beside its detail cards.
 *
 * Native controls with one `<label>` each, so the page stays a server
 * component and the form is complete before any JavaScript arrives. The select
 * keeps its own popup — the chevron is decoration layered over it rather than
 * a re-implementation of the control.
 *
 * `required` and `type="email"` are the whole validation story: with no client
 * JavaScript, the browser's own constraint check is the only thing standing
 * between an empty field and a submit.
 */
export function ContactFormSection({
  formTitle,
  fields,
  submitLabel,
  action,
  image,
  cards,
}: {
  formTitle?: string | undefined;
  fields: Array<{
    name: string;
    label: string;
    type: "text" | "email" | "select" | "textarea";
    placeholder?: string | undefined;
    options?: string[] | undefined;
    required?: boolean | undefined;
  }>;
  submitLabel?: string | undefined;
  action?: string | undefined;
  image?: string | undefined;
  cards: Array<{ title: string; body: string }>;
}) {
  /**
   * Figma leaves the controls borderless — a #f9fafb fill on a white card,
   * which is barely 1:1 against it. The 1px border is what carries the field
   * boundary past the 3:1 non-text contrast floor.
   */
  const control =
    "w-full rounded-md border border-border-subtle bg-surface-page p-3.5 text-body-md text-text-heading placeholder:text-text-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red";

  return (
    /*
      #f9fafb, the page canvas — one unit off the ramp's #f8f9fa, and the two
      are separate tokens on purpose (see theme.css), so this ground names the
      one the frame actually paints.
    */
    <section className="bg-surface-page">
      <div
        className={`${SHELL} ${PAD} grid items-start gap-10 lg:grid-cols-[minmax(0,29fr)_minmax(0,32fr)] lg:gap-[3.75rem]`}
      >
        {/*
          The method is unconditional. Defaulting to GET would serialise the
          visitor's name, e-mail and message into the query string, where they
          reach browser history, the Referer header of every later request and
          the access log — a privacy leak that survives long after the
          submission fails.
        */}
        <form
          method="post"
          {...(action ? { action } : {})}
          className="grid gap-8 rounded-xl bg-neutral-0 p-6 md:p-10"
        >
          {/*
            The leadings on this form are stated as ratios rather than left to
            the tokens: the frame sets them as percentages (126% here, 130% on
            the labels, 140% on the card bodies), and the tokens' fixed line
            boxes round each one up a pixel or two. The type scale is shared
            with every other page, so the correction belongs on these nodes.
          */}
          {formTitle ? (
            <h2 className="font-display text-h3 leading-[1.26] font-extrabold text-text-heading">
              {formTitle}
            </h2>
          ) : null}

          <div className="grid gap-5">
            {fields.map((field) => {
              const id = `contact-${field.name}`;

              return (
                <div key={field.name} className="grid gap-2">
                  <label
                    htmlFor={id}
                    className="text-body-sm leading-[1.3] font-bold text-text-heading"
                  >
                    {field.label}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      id={id}
                      name={field.name}
                      rows={4}
                      required={field.required ?? false}
                      placeholder={field.placeholder}
                      className={`${control} min-h-[120px] resize-y`}
                    />
                  ) : field.type === "select" ? (
                    <div className="relative">
                      {/*
                        The empty first option is the selected one, so a
                        visitor who never opens the popup submits no service
                        rather than whichever option happened to sort first.
                        Figma shows a real service there only because that is
                        how it draws the collapsed control.
                      */}
                      <select
                        id={id}
                        name={field.name}
                        defaultValue=""
                        required={field.required ?? false}
                        className={`${control} appearance-none pe-11`}
                      >
                        <option value="" disabled>
                          {field.placeholder ?? ""}
                        </option>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      {/*
                        #4b5563 — the frame strokes the chevron a step darker
                        than its secondary text. It is not text, so it does not
                        follow `text-muted` (#5a5e66) the way the labels and
                        card bodies do; the arrow has to hold its own against
                        the plate behind it.
                      */}
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
                        className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-text-default"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  ) : (
                    <input
                      id={id}
                      name={field.name}
                      type={field.type}
                      required={field.required ?? false}
                      placeholder={field.placeholder}
                      className={control}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {submitLabel ? (
            <button
              type="submit"
              className="rounded-md bg-brand-red px-6 py-4 text-body-md font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red"
            >
              {submitLabel}
            </button>
          ) : null}
        </form>

        <div className="grid gap-10">
          {image ? (
            <img
              src={image}
              alt=""
              width={640}
              height={340}
              className="aspect-[32/17] w-full rounded-xl object-cover"
            />
          ) : null}

          {cards.length > 0 ? (
            <ul className="grid gap-6 sm:grid-cols-2 [&>*]:min-w-0">
              {cards.map((card) => (
                <li
                  key={card.title}
                  className="grid gap-3 rounded-lg bg-neutral-0 p-6"
                >
                  <h3 className="font-display text-body font-bold text-text-heading">
                    {card.title}
                  </h3>
                  <p className="text-body-sm leading-[1.4] whitespace-pre-line text-text-default">
                    {card.body}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * The brand-red band a page can open on, instead of a photograph.
 *
 * `CtaBand` is the same ground but closes a page, so it emits an `<h2>`, and
 * `CenteredHero` owns the `<h1>` but only on the dark or white grounds. This
 * is the red opener; neither of the other two can stand in for it.
 */
export function RedHero({
  headline,
  subline,
  primary,
  secondary,
}: {
  headline?: string | undefined;
  subline?: string | undefined;
  primary?: { label: string; href: string } | undefined;
  secondary?: { label: string; href: string } | undefined;
}) {
  return (
    <section className="bg-brand-red">
      {/* The frame aligns every text node LEFT inside a CENTER-aligned band,
          so the blocks are centred but their lines are not. */}
      <div className={`${SHELL} ${PAD} grid gap-5`}>
        {headline ? (
          <h1 className="mx-auto w-fit max-w-[900px] text-left font-display text-[2rem] leading-[1.15] font-extrabold text-white md:text-[2.5rem]">
            <Emphasise text={headline} />
          </h1>
        ) : null}

        {subline ? (
          <p className="mx-auto w-fit max-w-[820px] text-left text-body text-white">
            {subline}
          </p>
        ) : null}

        {primary || secondary ? (
          <div className="mx-auto flex flex-wrap justify-center gap-4">
            {primary ? (
              <Link
                href={primary.href}
                className="rounded-md bg-brand-yellow px-7 py-4 text-body font-bold text-text-strong transition-colors hover:bg-yellow-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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

/**
 * A "make your case, then apply" section: stacked argument modules on one
 * side, the application form on the other.
 *
 * The four groups are independent — each disappears when its data is empty —
 * so a page can use the form alone, or the arguments alone. The form is plain
 * HTML controls with no client state; `action` is left for whoever wires the
 * endpoint, and the fields' `kind` is structure supplied by the page, not
 * translatable copy.
 */
/** The "partner-split" frame pads 64 top and bottom, not the shared 80. */
const SPLIT_PAD = "py-14 md:py-16";

export function ApplicationSection({
  benefits,
  requirements,
  timeline,
  form,
  idPrefix = "application",
}: {
  benefits: {
    headline?: string | undefined;
    items: Array<{ title: string; body: string }>;
  };
  requirements: { headline?: string | undefined; items: string[] };
  timeline: {
    headline?: string | undefined;
    steps: Array<{ title: string; body: string }>;
  };
  form: {
    headline?: string | undefined;
    fields: Array<{
      label: string;
      placeholder: string;
      kind: "text" | "select" | "file";
      options?: string[] | undefined;
    }>;
    submit?: string | undefined;
    action?: string | undefined;
    notice?: string | undefined;
  };
  idPrefix?: string;
}) {
  // Named so the submit button can point at the notice that explains it.
  const noticeId = `${idPrefix}-form-notice`;

  return (
    <section className="bg-neutral-0">
      <div
        className={`${SHELL} ${SPLIT_PAD} grid items-start gap-12 lg:grid-cols-[1fr_496px] lg:gap-16`}
      >
        <div className="grid gap-10">
          {benefits.items.length > 0 ? (
            <div className="grid gap-5">
              {benefits.headline ? (
                <h2 className="font-display text-h3 font-extrabold text-text-strong">
                  {benefits.headline}
                </h2>
              ) : null}

              <ul className="grid gap-5">
                {benefits.items.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success text-white">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>

                    <span className="grid gap-1">
                      {/* Outfit 16/700 in the frame; without font-display it
                          would fall back to the body face. */}
                      <span className="font-display text-body font-bold text-text-strong">
                        {item.title}
                      </span>
                      <span className="text-body-sm text-text-muted">
                        {item.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {requirements.items.length > 0 ? (
            <div className="grid gap-5 rounded-lg bg-neutral-100 p-7">
              {requirements.headline ? (
                <h2 className="font-display text-h5 font-extrabold text-text-strong">
                  {requirements.headline}
                </h2>
              ) : null}

              <ul className="grid gap-5">
                {requirements.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-body-sm text-text-strong"
                  >
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
                      className="shrink-0 text-brand-red"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m15 9-6 6" />
                      <path d="m9 9 6 6" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {timeline.steps.length > 0 ? (
            <div className="grid gap-5">
              {timeline.headline ? (
                <h2 className="font-display text-h4 font-extrabold text-text-strong">
                  {timeline.headline}
                </h2>
              ) : null}

              {/* The step number is part of the transcribed label, so nothing is auto-numbered. */}
              {/* SPACE_BETWEEN in the frame: four fixed 130px items across the
                  640px column, i.e. 40px gutters rather than an even grid. */}
              <ol className="grid gap-6 sm:grid-cols-2 lg:flex lg:justify-between lg:gap-x-10 [&>*]:min-w-0">
                {timeline.steps.map((step) => (
                  <li key={step.title} className="grid gap-1.5 lg:w-[130px]">
                    <span className="font-display text-body-sm font-bold text-brand-red">
                      {step.title}
                    </span>
                    <span className="text-caption tracking-normal text-text-muted">
                      {step.body}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>

        {form.fields.length > 0 ? (
          <form
            action={form.action}
            className="grid gap-5 rounded-lg border border-border-subtle bg-neutral-0 p-8"
          >
            {form.headline ? (
              <h2 className="font-display text-h4 font-bold text-text-strong">
                {form.headline}
              </h2>
            ) : null}

            <div className="grid gap-3">
              {form.fields.map((field, index) => {
                const id = `${idPrefix}-field-${index + 1}`;
                const control =
                  // r:6 and 13/400 per the frame; 10px of padding either side
                  // of the 20px line box is what makes the plate 40px tall.
                  "w-full rounded-[6px] bg-neutral-100 px-3 py-2.5 text-[0.8125rem] leading-[1.25rem] text-text-strong placeholder:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red";

                return (
                  <div key={id} className="grid gap-1.5">
                    <label
                      htmlFor={id}
                      className="text-caption tracking-normal font-semibold text-text-muted"
                    >
                      {field.label}
                    </label>

                    {field.kind === "select" ? (
                      <select
                        id={id}
                        name={id}
                        defaultValue=""
                        className={control}
                      >
                        <option value="" disabled>
                          {field.placeholder}
                        </option>
                        {(field.options ?? []).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.kind === "file" ? (
                      /* The box is a second label for the same input, so the whole
                         dropzone opens the picker while the input stays native. */
                      <label
                        htmlFor={id}
                        className="flex h-[70px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md bg-neutral-100 text-caption tracking-normal text-text-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-red"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <path d="M17 8l-5-5-5 5" />
                          <path d="M12 3v12" />
                        </svg>
                        {field.placeholder}
                        <input
                          id={id}
                          name={id}
                          type="file"
                          className="sr-only"
                        />
                      </label>
                    ) : (
                      <input
                        id={id}
                        name={id}
                        type="text"
                        placeholder={field.placeholder}
                        className={control}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {form.submit ? (
              <button
                /* A form with no `action` submits a same-page GET, which would
                   push everything the visitor typed into the URL and the back
                   history and read as though it had been sent. Until an
                   endpoint is wired the control is inert rather than lying. */
                type={form.action ? "submit" : "button"}
                disabled={!form.action}
                aria-describedby={form.notice ? noticeId : undefined}
                className="w-full rounded-md bg-brand-red px-5 py-3 text-body-sm font-bold text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-red"
              >
                {form.submit}
              </button>
            ) : null}

            {/* The standing-in-for-an-endpoint line, when the CMS supplies one. */}
            {form.notice ? (
              <p
                id={noticeId}
                className="text-caption tracking-normal text-text-muted"
              >
                {form.notice}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  );
}

/**
 * A before/after pair.
 *
 * The labels sit on the images, as the frame draws them. Both are decorative —
 * the heading above says what is being compared — so neither carries alt text
 * that would be read out as a filename.
 */
export function BeforeAfter({
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
  return (
    <section className="bg-neutral-50">
      <div className={`${SHELL} ${PAD} grid gap-12`}>
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          subline={subline}
        />

        <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
          {[
            { src: before, label: beforeLabel },
            { src: after, label: afterLabel },
          ].map((panel) => (
            <figure
              key={panel.src}
              className="relative overflow-hidden rounded-2xl"
            >
              <img
                src={panel.src}
                alt=""
                width={628}
                height={320}
                loading="lazy"
                className="aspect-[157/80] w-full object-cover"
              />

              {panel.label ? (
                <figcaption className="absolute start-4 top-4 rounded-md bg-[#111827]/85 px-3 py-1.5 text-caption font-bold tracking-[0.5px] text-white uppercase">
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
