import { SHELL, SectionHeading } from "./Blocks";

/**
 * The two sections of the M.io "page-how-it-works" frame (3:8708) below its
 * hero: the four-step roadmap and the m.on-versus-traditional-movers table.
 *
 * Page-specific rather than the shared `StepsTimeline` / `ComparisonTable`
 * because the frame's measurements differ from what those blocks draw, and
 * because a real `<table>` on the public site is restyled by the admin
 * `tables.css`, which `[locale]/layout.tsx` imports unlayered and so beats
 * every Tailwind utility (it turned the ink header row into a pale 12px
 * uppercase strip and made the last cell of each row a flex box).
 */

const PAD = "py-14 md:py-20";

/**
 * The step rows.
 *
 * 580 copy · 80 gap · 560 photograph inside the 1280 track, as percentages of
 * it so the proportion holds at every width; the frame leaves the remaining
 * 60px empty after the photograph, and keeps every photograph on the right.
 * The pill is 14/800 Outfit on its intrinsic 17.6px line box with 8px of
 * padding, i.e. 34 tall — on `text-body-sm`'s 20px line box it came out 36.
 */
export function HowItWorksSteps({
  steps,
  images,
  stepLabel,
}: {
  steps: Array<{ title: string; body: string }>;
  images: string[];
  stepLabel?: string | undefined;
}) {
  if (steps.length === 0) return null;

  return (
    <section className="bg-surface-page">
      <div className={`${SHELL} ${PAD}`}>
        <ol className="grid gap-12">
          {steps.map((step, index) => {
            const number = String(index + 1).padStart(2, "0");

            return (
              <li
                key={step.title}
                className="grid items-center gap-8 md:grid-cols-[45.3125%_43.75%] md:gap-x-[6.25%] [&>*]:min-w-0"
              >
                <div className="grid gap-5">
                  <span className="w-fit rounded-full bg-brand-yellow px-4 py-2 font-display text-[0.875rem] leading-[1.26] font-extrabold text-text-heading uppercase">
                    {stepLabel ? `${stepLabel} ${number}` : number}
                  </span>
                  {/* 32/800 on 40.3 — the display face's intrinsic 1.26. */}
                  <h2 className="font-display text-[1.5rem] leading-[1.26] font-extrabold text-text-heading md:text-[2rem]">
                    {step.title}
                  </h2>
                  <p className="text-body text-text-default">{step.body}</p>
                </div>

                {images[index] ? (
                  <img
                    src={images[index]}
                    alt=""
                    width={560}
                    height={360}
                    loading="lazy"
                    className="aspect-[14/9] w-full rounded-xl object-cover"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/**
 * The comparison plate.
 *
 * Drawn as an ARIA table (table / row / columnheader / rowheader / cell) so it
 * still reads as a table to a screen reader while staying out of reach of the
 * element selectors in `tables.css`. The frame's plate is 1280x408: a 68px
 * #111827 header row and five 68px body rows, each ruled 1px #d1d5db along its
 * bottom (the last rule coincides with the plate's border, so it is dropped).
 * Each row is 24px of padding either side of a 20px line, with Figma's inside
 * strokes eating a pixel of that — so a body row pads 24 / 23 over its rule,
 * and the header 23 / 24 under the plate's top border. The columns are
 * 360 / 320 / 552 of the 1232 left inside the 24px inline padding. On a phone each row stacks into a labelled
 * block, the only way three columns fit 320px.
 */
export function HowItWorksComparison({
  eyebrow,
  headline,
  columns,
  rows,
}: {
  eyebrow?: string | undefined;
  headline?: string | undefined;
  columns: { feature: string; ours: string; theirs: string };
  rows: Array<{ feature: string; ours: string; theirs: string }>;
}) {
  if (rows.length === 0) return null;

  const ROW =
    "md:grid md:grid-cols-[minmax(0,360fr)_minmax(0,320fr)_minmax(0,552fr)] md:px-6";
  const HEAD =
    "pt-[23px] pb-6 text-start font-display text-[1rem] leading-[1.26] font-bold";

  return (
    <section className="bg-neutral-0">
      <div className={`${SHELL} ${PAD} grid gap-10`}>
        <SectionHeading
          eyebrow={eyebrow}
          headline={headline}
          eyebrowSize="md"
        />

        <div
          role="table"
          aria-label={headline}
          className="overflow-hidden rounded-lg border border-border-default bg-surface-page"
        >
          {/* The header row is only drawn at md and up; below that each cell
              repeats its column name, so the row is hidden visually but kept
              for assistive technology. */}
          <div
            role="rowgroup"
            className="absolute h-px w-px overflow-hidden whitespace-nowrap [clip-path:inset(50%)] md:static md:h-auto md:w-auto md:[clip-path:none] md:bg-text-heading"
          >
            <div role="row" className={ROW}>
              <span role="columnheader" className={`${HEAD} text-white`}>
                {columns.feature}
              </span>
              <span role="columnheader" className={`${HEAD} text-brand-yellow`}>
                {columns.ours}
              </span>
              <span role="columnheader" className={`${HEAD} text-white`}>
                {columns.theirs}
              </span>
            </div>
          </div>

          <div role="rowgroup">
            {rows.map((row) => (
              <div
                key={row.feature}
                role="row"
                className={`${ROW} grid border-b border-border-default p-5 last:border-b-0 md:items-center md:pt-6 md:pb-[23px]`}
              >
                <span
                  role="rowheader"
                  className="pb-2 font-display text-[1rem] leading-[1.26] font-bold text-text-heading md:pb-0"
                >
                  {row.feature}
                </span>

                <span role="cell" className="pb-2 md:pb-0">
                  <span className="mb-1 block text-caption font-bold text-brand-red uppercase md:hidden">
                    {columns.ours}
                  </span>
                  <span className="flex items-center gap-2 text-[0.9375rem] leading-[1.3] font-bold text-text-heading">
                    {/* The frame's 16px check-circle, stroked in the success green. */}
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
                      className="shrink-0 text-success"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
                    </svg>
                    {row.ours}
                  </span>
                </span>

                <span
                  role="cell"
                  className="text-[0.9375rem] leading-[1.3] text-text-default"
                >
                  <span className="mb-1 block text-caption font-bold text-text-faint uppercase md:hidden">
                    {columns.theirs}
                  </span>
                  {row.theirs}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
