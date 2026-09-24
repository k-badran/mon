"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useReducer, useState } from "react";

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
} from "@/lib/calculator/machine";
import { STEP_COMPONENTS } from "@/app/components/calculator/Steps";
import { PricePanel } from "@/app/components/calculator/PricePanel";
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

const STORAGE_KEY = "umzugplus.calculator.v1";

export default function CalculatorPage() {
  return (
    // useSearchParams needs a boundary, and the frame is worth showing while
    // the URL resolves.
    <Suspense fallback={<div className="mx-auto min-h-[60vh] w-full max-w-3xl px-4 py-10" aria-busy="true" />}>
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
        onEdit={() => {
          setQuote(null);
          goTo(steps.length - 1);
        }}
      />
    );
  }

  return (
    // The price panel is its own column from lg up, where the design puts it,
    // and stacks under the step below that — still live either way.
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <header className="mb-8 grid gap-6 lg:col-start-1">
        {/**
         * The design's progress rail: one filled segment per step, the count,
         * and how far along the customer is. "of 10" is `steps.length`, not the
         * literal ten in the mock — a cleaning job has no crew or handling step
         * and so runs to eight.
         */}
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-body-sm font-bold tracking-[1px] text-brand-red uppercase">
              {t("calc.progress")}
            </p>

            <p className="rounded-full bg-red-50 px-3 py-1 text-caption font-semibold text-brand-red">
              {t("calc.stepOf", { values: { current: index + 1, total: steps.length } })}
            </p>

            <p className="ms-auto text-body-sm text-text-default">
              {t("calc.percentComplete", {
                values: { percent: Math.round(((index + 1) / steps.length) * 100) },
              })}
            </p>
          </div>

          <ol className="grid grid-flow-col auto-cols-fr gap-2" aria-label={t("calc.progress")}>
            {steps.map((entry, position) => {
              const done = position < index;
              const current = position === index;

              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => goTo(position)}
                    disabled={position > limit}
                    aria-current={current ? "step" : undefined}
                    className={[
                      "grid w-full gap-2 text-start",
                      "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow",
                      position > limit ? "cursor-not-allowed" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={`block h-1.5 rounded-full transition-colors ${
                        current ? "bg-brand-red" : done ? "bg-text-strong" : "bg-surface-sunken"
                      }`}
                    />

                    <span
                      className={`truncate text-caption ${
                        current
                          ? "font-bold text-brand-red"
                          : done
                            ? "font-medium text-text-strong"
                            : "font-medium text-text-faint"
                      }`}
                    >
                      {t(entry.railKey)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid gap-3">
          <h1 className="text-h1 text-text-strong">{t(step.labelKey)}</h1>
          <p className="text-body-lg text-text-default">{t(step.leadKey)}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:col-start-1">
        <section aria-labelledby="step-title">
          <h2 id="step-title" className="sr-only">
            {t(step.labelKey)}
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

        <div className="btn-row border-t border-border-subtle pt-6">
          <button
            type="button"
            className="btn secondary"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
          >
            {t("common.back")}
          </button>

          {isLast ? (
            <button
              type="button"
              className="btn primary large"
              onClick={() => void requestQuote()}
              disabled={!canAdvance || pricing}
              data-loading={pricing ? "true" : undefined}
            >
              {pricing ? t("calc.pricing") : t("calc.getPrice")}
            </button>
          ) : (
            <button
              type="button"
              className="btn primary large"
              onClick={() => goTo(index + 1)}
              disabled={!canAdvance}
            >
              {step.optional && !canAdvance ? t("common.skip") : t("common.next")}
            </button>
          )}
        </div>
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6">
        <PricePanel stepId={step.id} state={state} estimate={estimate} />
      </div>
    </div>
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

/**
 * The quote.
 *
 * Two outcomes: a price the customer can book, or a job that needs a human to
 * look at it. The design draws these as separate screens because they ask for
 * different things — one offers a booking, the other promises a callback.
 */
function QuoteResultView({ quote, onEdit }: { quote: QuoteResult; onEdit: () => void }) {
  const { t, locale, formatCurrency } = useI18n();
  const breakdown = quote.breakdown;

  if (quote.requiresReview) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
        <section className="grid gap-4 rounded-2xl border border-border-subtle bg-surface-card p-8 text-center">
          <p className="text-overline text-brand-red">{t("calc.title")}</p>
          <h1 className="text-h1 text-text-strong">{t("calc.reviewTitle")}</h1>
          <p className="text-body-lg text-text-muted">{t("calc.reviewBody")}</p>

          {quote.reviewReasons.length > 0 ? (
            <ul className="mx-auto grid max-w-md gap-1 text-body-sm text-text-muted">
              {quote.reviewReasons.map((reason) => (
                <li key={reason}>{t(`calc.review.${reason}`)}</li>
              ))}
            </ul>
          ) : null}

          <div className="btn-row">
            <button type="button" className="btn secondary" onClick={onEdit}>
              {t("calc.editAnswers")}
            </button>
            <a className="btn primary large" href={`/${locale}/kontakt`}>
              {t("nav.contact")}
            </a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
      <section className="grid gap-4 rounded-2xl border border-border-subtle bg-surface-card p-8">
        <p className="text-overline text-brand-red">{t("calc.title")}</p>
        <h1 className="text-h1 text-text-strong">{t("calc.quoteTitle")}</h1>

        <p className="text-display text-brand-red">{formatCurrency(breakdown.totalGross)}</p>
        <p className="text-body-sm text-text-muted">{t("calc.vatIncluded")}</p>

        <div className="mt-2 grid gap-2 border-t border-border-subtle pt-4">
          {breakdown.lines.map((line, position) => (
            <div
              key={`${line.key}-${position}`}
              className="flex items-baseline justify-between gap-4 text-body-sm"
            >
              <span className="text-text-muted">
                {t(`line.${line.key.replace("line.", "")}`)}
              </span>
              <span className="tabular-nums text-text-default">
                {formatCurrency(line.amount)}
              </span>
            </div>
          ))}

          <div className="flex items-baseline justify-between gap-4 text-body-sm">
            <span className="text-text-muted">
              {t("calc.vat", { values: { rate: breakdown.vatRate } })}
            </span>
            <span className="tabular-nums text-text-default">
              {formatCurrency(breakdown.vatAmount)}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border-subtle pt-3">
            <span className="text-h6 text-text-strong">{t("orders.grandTotal")}</span>
            <span className="text-h4 font-bold tabular-nums text-brand-red">
              {formatCurrency(breakdown.totalGross)}
            </span>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={onEdit}>
            {t("calc.editAnswers")}
          </button>
          <a className="btn primary large" href={`/${locale}/buchen?quote=${quote.id}`}>
            {t("calc.bookNow")}
          </a>
        </div>
      </section>
    </div>
  );
}
