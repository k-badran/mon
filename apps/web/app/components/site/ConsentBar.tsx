"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * The cookie band from the `page-legal-cookie` frame.
 *
 * The frame gives it `layoutPositioning: ABSOLUTE` with `vertical: BOTTOM` and
 * `horizontal: LEFT_RIGHT` — a full-bleed #111827 bar with a 1px brand-red
 * edge, pinned to the bottom of the viewport and drawn over whatever is under
 * it (in the frame, the footer). So it is `fixed`, not a section in the flow.
 *
 * The three buttons the frame draws are real, not mimed. There is no consent
 * service behind this site, so the decision is recorded in the browser under
 * `CONSENT_KEY` and the bar stays down on later visits; that record is the
 * switch anything non-essential has to read before it runs. Nothing
 * non-essential runs today — the site loads no analytics or advertising
 * script — so "Reject Non-Essential" is already true as it stands rather than
 * a button that quietly sets everything anyway. When a tag does arrive it
 * reads this key; it does not get its own gate.
 *
 * "Manage" is the one control the browser cannot honestly own: per-category
 * toggles over categories nothing yet reads would be the theatre the two
 * plain choices avoid. It goes to the policy, whose closing clause is how a
 * visitor actually changes or withdraws the decision.
 *
 * `href` is where the body's `[[…]]` run points; `manageHref` is the button.
 */

/** Read before anything non-essential runs. `"all"` | `"essential"`. */
export const CONSENT_KEY = "umzugplus.cookie-consent";

/** Reject and Manage are the same 1px-white outline in the frame. */
const OUTLINE =
  "rounded-[6px] border border-white py-2.5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-white hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

export function ConsentBar({
  title,
  body,
  href,
  manageHref,
  labels,
}: {
  title?: string | undefined;
  body?: string | undefined;
  href?: string | undefined;
  manageHref?: string | undefined;
  labels: {
    reject?: string | undefined;
    manage?: string | undefined;
    accept?: string | undefined;
  };
}) {
  // `null` until the browser has been asked, so a visitor who already decided
  // never sees the bar flash past on the way to being dismissed.
  const [decided, setDecided] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDecided(window.localStorage.getItem(CONSENT_KEY) !== null);
    } catch {
      // Storage blocked: ask, and accept that the answer cannot be kept.
      setDecided(false);
    }
  }, []);

  function decide(value: "all" | "essential") {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Nothing to fall back to, and the bar should still get out of the way.
    }
    setDecided(true);
  }

  if (decided !== false) return null;
  if (!title && !body) return null;

  return (
    <section
      aria-label={title}
      className="fixed inset-x-0 bottom-0 z-40 border border-brand-red bg-[#111827]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="grid max-w-[760px] gap-1.5">
          {title ? (
            <p className="text-body font-bold text-white">{title}</p>
          ) : null}
          {/* 13px in the frame, between --text-caption and --text-body-sm. */}
          {body ? (
            <p className="text-[0.8125rem] leading-5 text-neutral-100">
              <InlineLink text={body} href={href} />
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-4">
          {labels.reject ? (
            <button
              type="button"
              onClick={() => decide("essential")}
              className={`${OUTLINE} px-4`}
            >
              {labels.reject}
            </button>
          ) : null}

          {labels.manage && manageHref ? (
            <Link href={manageHref} className={`${OUTLINE} px-4`}>
              {labels.manage}
            </Link>
          ) : null}

          {labels.accept ? (
            <button
              type="button"
              onClick={() => decide("all")}
              className="rounded-[6px] bg-brand-red px-5 py-2.5 text-[0.8125rem] font-bold text-white transition-colors hover:bg-white hover:text-brand-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
            >
              {labels.accept}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the `[[…]]` run of a string as an inline link.
 *
 * A second marker beside `Emphasise`'s `**…**` because the two runs are not
 * the same thing: `**…**` is brand-red emphasis, this is the brand-yellow
 * underlined link the frame draws inside the cookie copy.
 */
function InlineLink({
  text,
  href,
}: {
  text: string;
  href?: string | undefined;
}) {
  const parts = text.split(/\[\[(.+?)\]\]/gs);

  return (
    <>
      {parts.map((part, index) => {
        if (index % 2 === 0) return part;

        return href ? (
          <Link
            key={index}
            href={href}
            className="text-brand-yellow underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
          >
            {part}
          </Link>
        ) : (
          <span
            key={index}
            className="text-brand-yellow underline underline-offset-2"
          >
            {part}
          </span>
        );
      })}
    </>
  );
}
