"use client";

import { useState } from "react";

/**
 * The homepage FAQ: topic chips over an accordion.
 *
 * The only client component on the homepage, because the chips filter the
 * list. It still renders every question on the server — "All" is the initial
 * state — so the answers are in the HTML for search engines and for a visitor
 * whose JavaScript has not arrived yet.
 *
 * Frame 86:4671 (`faq-section-desktop`): chips 8 apart, 8/16 padding, the
 * active one brand red; each `faq-accordion-item` is a #f8f9fa card with its
 * topic badge over the question, a minus when open and a plus when closed,
 * and the first one open. The frame also carries a designer's note under the
 * chips ("filters appear once listing exceeds 8 items") — an annotation, not
 * copy, so it is not rendered.
 */

export interface HomeFaq {
  id: string;
  question: string;
  answer: string;
}

export function FaqList({
  entries,
  allLabel,
}: {
  entries: (HomeFaq & { tag?: string | undefined })[];
  allLabel?: string | undefined;
}) {
  const [topic, setTopic] = useState<string | null>(null);

  // Topics in the order their questions appear, once each. No tags at all —
  // an FAQ nobody categorised — means no chips rather than a lone "All".
  const topics = [...new Set(entries.map((entry) => entry.tag).filter(Boolean))] as string[];
  const visible = topic ? entries.filter((entry) => entry.tag === topic) : entries;

  return (
    <div className="grid gap-6">
      {topics.length > 0 ? (
        // Toggle buttons rather than a tablist: they filter one list in place
        // instead of switching between panels.
        <div className="flex flex-wrap gap-2">
          {[null, ...topics].map((value) => {
            const active = topic === value;
            return (
              <button
                key={value ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setTopic(value)}
                className={`rounded-full px-4 py-2 text-body-sm leading-[1.125rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow ${
                  active
                    ? "bg-brand-red font-bold text-white"
                    : "bg-neutral-100 font-medium text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {value ?? allLabel ?? "All"}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* <details> rather than a scripted accordion: keyboard accessible,
          findable by the browser's in-page search, and it works before
          hydration. */}
      <div className="grid gap-4">
        {visible.map((entry, index) => (
          <details
            key={entry.id}
            open={index === 0}
            className="group rounded-lg bg-neutral-50 p-6"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm marker:content-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow [&::-webkit-details-marker]:hidden">
              <span className="grid justify-items-start gap-2">
                {entry.tag ? (
                  <span className="rounded-[6px] border border-brand-yellow bg-yellow-tint px-3 py-1.5 text-caption font-bold tracking-[0.5px] text-brand-red uppercase">
                    {entry.tag}
                  </span>
                ) : null}
                <span className="font-display text-lg leading-6 font-bold text-text-strong">
                  {entry.question}
                </span>
              </span>

              <span className="grid size-6 shrink-0 place-items-center text-text-strong">
                <Glyph open />
                <Glyph />
              </span>
            </summary>

            <p className="mt-4 max-w-[540px] text-body-sm leading-[1.375rem] text-text-muted">
              {entry.answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Minus while open, plus while closed — the frame swaps the glyph, it does not rotate it. */
function Glyph({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={`col-start-1 row-start-1 ${open ? "hidden group-open:block" : "group-open:hidden"}`}
    >
      {open ? <path d="M5 12h14" /> : <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}
