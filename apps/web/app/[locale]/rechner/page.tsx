"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import {
  activeSteps,
  calculatorReducer,
  furthestReachable,
  INITIAL_STATE,
  isPriceable,
  toQuoteInput,
  type CalculatorState,
  type StepId,
} from "@/lib/calculator/machine";
import { STEP_COMPONENTS } from "@/app/components/calculator/Steps";
import { PricePanel, RAIL_STEPS } from "@/app/components/calculator/PricePanel";
import { CalcHeader, IconCheck, primaryButton, quietButton } from "@/app/components/calculator/CalcChrome";
import { QuoteResultView } from "@/app/components/calculator/QuoteResult";
import { usePriceEstimate, type QuoteResult } from "@/lib/calculator/usePriceEstimate";

/**
 * The calculator.
 *
 * Ten steps, one per screen in the design. Three things are deliberate:
 *
 *   1. The step lives in the URL. Refreshing, sharing or using the browser's
 *      back button all work, which none of them did when the step was React
 *      state inside one long component.
 *   2. The price is quoted by the server on demand, never computed here. The
 *      app this replaces had two browser copies of the pricing rules that had
 *      drifted from each other and from the invoice.
 *   3. Answers are kept in session storage, so a customer who follows a link
 *      away and comes back has not lost twenty answers.
 */

const STORAGE_KEY = "mon.calculator.v1";

/**
 * The primary button's label on the card-layout screens, which the design
 * words per screen ("Continue to Special Items" on 3:1526 …). Steps missing
 * here say "Save & Continue", as the add-ons screen does.
 */
const CONTINUE_KEY: Partial<Record<StepId, string>> = {
  workers: "calc.cta.toSpecial",
  special: "calc.cta.toPhotos",
  photos: "calc.cta.toDates",
  date: "calc.cta.toReview",
};

export default function CalculatorPage() {
  return (
    // useSearchParams needs a boundary, and the frame is worth showing while
    // the URL resolves.
    <Suspense fallback={<div className="min-h-screen bg-surface-page" aria-busy="true" />}>
      <Calculator />
    </Suspense>
  );
}

function Calculator() {
  const { sdk } = useApi();
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const [state, dispatch] = useReducer(calculatorReducer, INITIAL_STATE);
  const [restored, setRestored] = useState(false);

  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [pricing, setPricing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The panel prices in the background as answers change; it never gates the
  // wizard, so a slow or failed estimate cannot stop anyone continuing.
  const estimate = usePriceEstimate(state);

  const steps = useMemo(() => activeSteps(state), [state]);
  const limit = furthestReachable(state);

  const requested = Number.parseInt(params.get("step") ?? "1", 10) - 1;
  // Clamped rather than trusted: the step is in the URL, so it is user input.
  const index = Math.min(Math.max(0, Number.isNaN(requested) ? 0 : requested), Math.min(limit, steps.length - 1));
  const step = steps[index]!;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(0, next), steps.length - 1);
      router.push(`/${locale}/rechner?step=${clamped + 1}`, { scroll: false });
    },
    [router, locale, steps.length],
  );

  // Restore once, before the first paint the customer interacts with.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) dispatch({ type: "set", patch: JSON.parse(saved) as Partial<CalculatorState> });
    } catch {
      // A blocked or corrupt store is not a reason to fail the page.
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing; the wizard still works, it just will not survive.
    }
  }, [state, restored]);

  /** Asks the server for a price. The browser never computes one. */
  async function requestQuote() {
    if (!isPriceable(state)) return;

    // The panel has already had these exact answers priced, and that quote is
    // a stored, bookable row. Asking again would write a second row for the
    // same job and risk showing a different number than the one on screen.
    if (estimate.isCurrent && estimate.quote) {
      setQuote(estimate.quote);
      return;
    }

    setPricing(true);
    setError(null);

    try {
      const result = await sdk.http.post<QuoteResult>("/api/quotes", {
        input: toQuoteInput(state),
      });
      setQuote(result);
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.message ? caught.message : t("error.generic"),
      );
    } finally {
      setPricing(false);
    }
  }

  const isLast = index === steps.length - 1;
  const canAdvance = step.complete(state);

  if (quote) {
    return (
      <QuoteResultView
        quote={quote}
        state={state}
        onEdit={() => {
          setQuote(null);
          goTo(steps.length - 1);
        }}
      />
    );
  }

  const heading = t(step.labelKey);
  const lead = t(step.leadKey);

  const body = (
    <>
      <section aria-labelledby="step-title">
        <h2 id="step-title" className="sr-only">
          {heading}
        </h2>

        <StepBody id={step.id} state={state} dispatch={dispatch} />
      </section>

      <div aria-live="polite">
        {error ? (
          <p className="rounded-md border border-danger bg-danger-soft px-4 py-3 text-body-sm text-danger-text">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );

  const advance = isLast ? (
    <button
      type="button"
      className={`${primaryButton} min-h-12 w-full rounded-md px-6 py-3.5 text-[15px] leading-5`}
      onClick={() => void requestQuote()}
      disabled={!canAdvance || pricing}
      data-loading={pricing ? "true" : undefined}
    >
      {pricing ? t("calc.pricing") : t("calc.getPrice")}
    </button>
  ) : null;

  /**
   * The design has two layouts for the wizard.
   *
   * The first five screens (3:618 … 3:1107) sit under a five-node rail, split
   * the page 1080/360 with a flush price rail on the end side, and put Back
   * and Next Step under the questions. The later ones (3:1381 … 3:2018) sit in
   * a 64px-padded page under the ten-segment rail, with the price as a
   * floating card that also carries the two buttons.
   */
  if (RAIL_STEPS.has(step.id)) {
    return (
      <div className="flex min-h-screen flex-col bg-surface-page">
        <CalcHeader homeHref={`/${locale}`} />

        <NodeRail
          index={index}
          limit={limit}
          reviewIndex={steps.length - 1}
          onSelect={goTo}
        />

        <div className="flex flex-1 flex-col lg:flex-row">
          <main className="flex min-w-0 flex-1 flex-col gap-8 px-4 py-8 sm:p-10">
            <StepHeading size="rail" heading={heading} lead={lead} />

            {body}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              {index > 0 ? (
                <button
                  type="button"
                  className={`${quietButton} min-h-[41px] rounded-[6px] px-6 py-2.5 text-body-sm font-bold text-text-default`}
                  onClick={() => goTo(index - 1)}
                >
                  {t("common.back")}
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                className={`${primaryButton} min-h-[41px] rounded-[6px] px-6 py-2.5 text-body-sm`}
                onClick={() => goTo(index + 1)}
                disabled={!canAdvance}
              >
                {t("calc.nextStep")}
              </button>
            </div>
          </main>

          <div className="shrink-0 border-t border-border-subtle bg-surface-card lg:w-[360px] lg:border-s lg:border-t-0">
            <div className="lg:sticky lg:top-0">
              <PricePanel stepId={step.id} state={state} estimate={estimate} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <CalcHeader homeHref={`/${locale}`} />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 lg:p-16">
        <SegmentRail
          steps={steps.map((entry) => ({ id: entry.id, label: t(entry.railKey) }))}
          index={index}
          limit={limit}
          onSelect={goTo}
        />

        <StepHeading size="card" heading={heading} lead={lead} />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <main className="flex min-w-0 flex-1 flex-col gap-6">{body}</main>

          <div className="lg:sticky lg:top-6 lg:w-[360px] lg:shrink-0">
            <PricePanel stepId={step.id} state={state} estimate={estimate}>
              <div className="flex flex-col gap-2.5">
                {advance ?? (
                  <button
                    type="button"
                    className={`${primaryButton} min-h-12 w-full rounded-md px-6 py-3.5 text-[15px] leading-5`}
                    onClick={() => goTo(index + 1)}
                    disabled={!canAdvance}
                  >
                    {step.optional && !canAdvance
                      ? t("common.skip")
                      : t(CONTINUE_KEY[step.id] ?? "calc.cta.continue")}
                    <ArrowIcon />
                  </button>
                )}

                <button
                  type="button"
                  className={`${quietButton} min-h-[42px] w-full rounded-md px-6 py-3 text-body-sm font-semibold text-text-default`}
                  onClick={() => goTo(index - 1)}
                >
                  {t("calc.cta.back")}
                </button>
              </div>
            </PricePanel>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeading({
  size,
  heading,
  lead,
}: {
  size: "rail" | "card";
  heading: string;
  lead: string;
}) {
  // 24/29 on the rail screens, 32/40 in the display face on the card screens.
  return (
    <header className="flex flex-col gap-2">
      <h1
        className={
          size === "rail"
            ? "font-sans text-[1.5rem] leading-[1.8rem] font-extrabold tracking-normal text-text-heading"
            : "font-display text-[1.75rem] leading-9 font-extrabold tracking-normal text-text-heading sm:text-[2rem] sm:leading-10"
        }
      >
        {heading}
      </h1>
      <p className={size === "rail" ? "text-body-sm text-text-default" : "text-body text-text-default"}>
        {lead}
      </p>
    </header>
  );
}

/**
 * The five-node rail of the first screens (3:634).
 *
 * Four nodes are the four rail steps; the fifth, "Final Review", is the
 * wizard's last step, reachable once everything before it is answered.
 */
function NodeRail({
  index,
  limit,
  reviewIndex,
  onSelect,
}: {
  index: number;
  limit: number;
  reviewIndex: number;
  onSelect: (position: number) => void;
}) {
  const { t } = useI18n();

  const nodes: Array<{ key: string; target: number }> = [
    { key: "calc.rail.service", target: 0 },
    { key: "calc.rail.route", target: 1 },
    { key: "calc.rail.property", target: 2 },
    { key: "calc.node.volume", target: 3 },
    { key: "calc.step.review", target: reviewIndex },
  ];

  return (
    <nav aria-label={t("calc.progress")} className="px-4 pt-6 pb-2 sm:px-10">
      <ol className="flex items-center justify-between gap-3 overflow-x-auto">
        {nodes.map((node, position) => {
          const current = node.target === index;
          const done = node.target < index;
          const last = position === nodes.length - 1;

          return (
            <li key={node.key} className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(node.target)}
                disabled={node.target > limit}
                aria-current={current ? "step" : undefined}
                className="flex items-center gap-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-caption font-bold ${
                    current
                      ? "bg-brand-red text-text-on-brand"
                      : done
                        ? "bg-success text-text-on-brand"
                        : "border border-border-subtle bg-surface-card text-text-default"
                  }`}
                >
                  {done ? <IconCheck /> : position + 1}
                </span>

                <span
                  className={`text-[13px] leading-4 ${current ? "" : "hidden md:inline"} ${
                    current
                      ? "font-bold text-text-heading"
                      : done
                        ? "font-medium text-text-default"
                        : "font-medium text-text-faint"
                  }`}
                >
                  {t(node.key)}
                </span>
              </button>

              {last ? null : (
                <span aria-hidden="true" className="hidden h-0.5 w-10 bg-border-subtle md:block" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The ten-segment rail of the later screens (3:1392).
 *
 * "of 10" is `steps.length`, not the literal ten in the mock — a cleaning job
 * has no crew or handling step and so runs to eight. Every segment up to the
 * current one is red, as drawn; only the current label is.
 */
function SegmentRail({
  steps,
  index,
  limit,
  onSelect,
}: {
  steps: Array<{ id: string; label: string }>;
  index: number;
  limit: number;
  onSelect: (position: number) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-display text-body-sm leading-[18px] font-bold text-brand-red uppercase">
            {t("calc.progress")}
          </p>

          <p className="rounded-sm bg-brand-red/6 px-2 py-0.5 text-caption font-semibold text-brand-red">
            {t("calc.stepOf", { values: { current: index + 1, total: steps.length } })}
          </p>
        </div>

        <p className="text-[13px] leading-[17px] font-medium text-text-default">
          {t("calc.percentComplete", {
            values: { percent: Math.round(((index + 1) / steps.length) * 100) },
          })}
        </p>
      </div>

      <ol className="grid grid-flow-col auto-cols-fr gap-2" aria-label={t("calc.progress")}>
        {steps.map((entry, position) => {
          const reached = position <= index;
          const current = position === index;

          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onSelect(position)}
                disabled={position > limit}
                aria-current={current ? "step" : undefined}
                aria-label={entry.label}
                className="grid w-full gap-1.5 text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow disabled:cursor-not-allowed"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-[3px] transition-colors ${
                    reached ? "bg-brand-red" : "bg-border-subtle"
                  }`}
                />

                <span
                  aria-hidden="true"
                  className={`hidden truncate text-[10px] leading-[13px] sm:block ${
                    current
                      ? "font-bold text-brand-red"
                      : reached
                        ? "font-medium text-text-heading"
                        : "font-medium text-text-faint"
                  }`}
                >
                  {entry.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ArrowIcon(): ReactNode {
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
      // Points the way the reader is going, in either direction of text.
      className="rtl:-scale-x-100"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function StepBody({
  id,
  state,
  dispatch,
}: {
  id: keyof typeof STEP_COMPONENTS;
  state: CalculatorState;
  dispatch: React.Dispatch<Parameters<typeof calculatorReducer>[1]>;
}) {
  const Component = STEP_COMPONENTS[id];
  return <Component state={state} dispatch={dispatch} />;
}
