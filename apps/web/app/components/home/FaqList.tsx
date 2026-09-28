"use client";

import { FAQ_CATEGORIES, toFaqCategory, type FaqCategory } from "@mon/core";
import { useState } from "react";

import { useTranslate } from "@/lib/i18n/provider";

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
 *
 * The chips are the topics the entries actually carry (`faq_entries.category`),
 * in FAQ_CATEGORIES order rather than the order the questions happen to come
 * in, so the row reads the same whatever the sort order of the list. Their
 * labels, and each card's badge, are interface messages keyed by topic.
 */

export interface HomeFaq {
  id: string;
  question: string;
  answer: string;
  /** Always set by the API; anything unrecognised reads as "general". */
  category?: string | null;
}

export function FaqList({
  entries,
  allLabel,
}: {
  entries: HomeFaq[];
  allLabel?: string | undefined;
}) {
  const t = useTranslate();
  const [topic, setTopic] = useState<FaqCategory | null>(null);

  const filed = entries.map((entry) => ({ ...entry, topic: toFaqCategory(entry.category) }));
  const present = new Set(filed.map((entry) => entry.topic));
  const topics = FAQ_CATEGORIES.filter((key) => present.has(key));
  const visible = topic ? filed.filter((entry) => entry.topic === topic) : filed;

  const label = (key: FaqCategory) => t(`faq.category.${key}`);

  return (
    <div className="grid gap-6">
      {/* One topic only — say an FAQ nobody categorised, all "general" —
          means no chips: "All" and that topic would show the same list. */}
      {topics.length > 1 ? (
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
                {value ? label(value) : allLabel || t("faq.category.all")}
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
                <span className="rounded-[6px] border border-brand-yellow bg-yellow-tint px-3 py-1.5 text-caption font-bold tracking-[0.5px] text-brand-red uppercase">
                  {label(entry.topic)}
                </span>
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
