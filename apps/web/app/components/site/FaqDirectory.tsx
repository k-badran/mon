"use client";

import { useState } from "react";

import { SHELL } from "./Blocks";

const PAD = "py-14 md:py-20";

export interface FaqCategory {
  label: string;
  heading: string;
  entries: Array<{ question: string; answer: string }>;
}

/**
 * The categorised FAQ directory: a filter rail beside the answers.
 *
 * The M.io "faq-split" frame is one horizontal section — a 260px rail on the
 * left with one row filled `#d71635`, and beside it the heading of the chosen
 * group with its accordion cards. The selected row governs which group shows,
 * so this is the one block on the page that genuinely needs state; everything
 * else stays server-rendered.
 *
 * `FaqSection` in Blocks.tsx is a single centred column with no category
 * dimension, which is why this exists rather than reusing it.
 */
export function FaqDirectory({
  navLabel,
  categories,
  defaultIndex = 0,
}: {
  navLabel?: string | undefined;
  categories: FaqCategory[];
  defaultIndex?: number;
}) {
  const start = defaultIndex >= 0 && defaultIndex < categories.length ? defaultIndex : 0;
  const [active, setActive] = useState(start);

  if (categories.length === 0) return null;

  const group = categories[active] ?? categories[0];
  if (!group) return null;

  return (
    <section className="bg-neutral-0">
      <div className={`${SHELL} ${PAD} grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-16`}>
        {/* 260px fixed rail, 42px rows, 8px apart — the frame's left column. */}
        <div
          role="tablist"
          aria-label={navLabel}
          aria-orientation="vertical"
          className="flex flex-wrap gap-2 lg:grid lg:w-[260px] lg:self-start"
        >
          {categories.map((category, index) => {
            const selected = index === active;

            return (
              <button
                key={category.label}
                type="button"
                role="tab"
                id={`faq-tab-${index}`}
                aria-selected={selected}
                aria-controls={`faq-panel-${index}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                  event.preventDefault();
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  const next = (index + step + categories.length) % categories.length;
                  setActive(next);
                  document.getElementById(`faq-tab-${next}`)?.focus();
                }}
                className={`h-[42px] rounded-md px-5 text-start text-[0.9375rem] leading-[18px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-red ${
                  selected
                    ? "bg-brand-red text-white"
                    : "text-text-strong hover:bg-neutral-100"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {/* The answer column: the group's own left-aligned heading, then cards. */}
        <div
          role="tabpanel"
          id={`faq-panel-${active}`}
          aria-labelledby={`faq-tab-${active}`}
          className="grid content-start gap-5"
        >
          <h2 className="font-display text-h3 font-extrabold text-text-strong">{group.heading}</h2>

          {/* Keyed on the group so the first card re-opens when the rail moves. */}
          <div key={group.label} className="grid gap-5">
            {group.entries.map((entry, position) => (
              <details
                key={entry.question}
                open={position === 0}
                className="group rounded-lg border border-border-subtle p-6 open:bg-neutral-50"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:content-none">
                  <span className="text-body font-bold text-text-strong">{entry.question}</span>

                  {/* Plus closed, minus open — both stroked in the brand red. */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="shrink-0 text-brand-red"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" className="group-open:hidden" />
                  </svg>
                </summary>

                <p className="mt-3 text-body-sm text-neutral-500">{entry.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
