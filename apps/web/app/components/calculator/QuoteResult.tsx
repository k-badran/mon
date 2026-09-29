"use client";

import type { ReactNode } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import type { CalculatorState } from "@/lib/calculator/machine";
import type { QuoteResult } from "@/lib/calculator/usePriceEstimate";
import { CalcHeader, IconCheckCircle, primaryButton, quietButton, QuoteSummary, type SummaryFacts } from "./CalcChrome";
import { LineCaption } from "./PricePanel";

/**
 * The quote.
 *
 * Two outcomes: a price the customer can book (3:2348 "calc-instant-quote"),
 * or a job that needs a human to look at it (3:2496 "calc-pending-review").
 * The design draws these as separate screens because they ask for different
 * things — one offers a booking, the other asks for a way to reach the
 * customer once the check is done.
 *
 * Both share the header with its five tabs and the summary card on the end
 * side with the booking screen, which is the third frame of the set.
 */
export function QuoteResultView({
  quote,
  state,
  onEdit,
}: {
  quote: QuoteResult;
  state: CalculatorState;
  onEdit: () => void;
}) {
  const { t, locale, formatCurrency } = useI18n();
  const { user } = useApi();

  const pending = quote.requiresReview;
  const breakdown = quote.breakdown;
  const moving = state.serviceType === "moving";

  const facts: SummaryFacts = {
    serviceType: state.serviceType,
    originAddress: state.originAddress.trim(),
    destinationAddress: moving ? state.destinationAddress.trim() || undefined : undefined,
    distanceKm: breakdown.distanceKm,
    scheduledDate: state.scheduledDate || undefined,
    scheduledTime: state.scheduledTime || undefined,
    calculationMethod: state.calculationMethod,
    areaSqm: state.areaSqm,
    itemCount: Object.values(state.selectedItems).reduce((sum, count) => sum + count, 0),
    crewSize: moving ? state.crewSize : undefined,
    secondVan: state.secondVan,
    estimatedHours: breakdown.estimatedHours,
    lines: breakdown.lines,
    vatRate: breakdown.vatRate,
    totalGross: breakdown.totalGross,
  };

  // Signing up with the quote id adopts this very quote into the new account,
  // which is what "Save Quote" can honestly mean for an anonymous visitor.
  const signupHref = `/${locale}/signup?quote=${quote.id}`;

  return (
    <div className="min-h-screen bg-surface-page">
      <CalcHeader
        homeHref={`/${locale}`}
        currentTab={t(pending ? "calc.tab.pending" : "calc.tab.quote")}
      />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start lg:p-12">
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          {pending ? (
            <PendingCard
              quote={quote}
              onEdit={onEdit}
              action={
                user ? (
                  <a className={pendingButton} href={`/${locale}/kontakt`}>
                    {t("nav.contact")}
                  </a>
                ) : (
                  <a className={pendingButton} href={signupHref}>
                    {t("calc.pending.save")}
                  </a>
                )
              }
            />
          ) : (
            <>
              <section className="relative flex flex-col gap-5 overflow-hidden rounded-xl border border-border-subtle bg-surface-card p-6 sm:p-10">
                <Confetti />

                <div className="relative flex flex-col items-center gap-3 text-center">
                  <p className="inline-flex items-center gap-2 rounded-full border border-success bg-success-soft px-4 py-1.5 text-body-sm leading-[15px] font-bold text-success-text">
                    <span className="text-success">
                      <IconCheckCircle size={16} />
                    </span>
                    {t("calc.quote.badge")}
                  </p>

                  <h1 className="font-sans text-[1.375rem] leading-6 font-bold tracking-normal text-text-default">
                    {t("calc.quote.title")}
                  </h1>

                  <p className="py-2 text-[2.5rem] leading-[1.3] font-extrabold tabular-nums text-text-heading sm:text-[3.5rem]">
                    {formatCurrency(breakdown.totalGross)}
                  </p>

                  <p className="max-w-[520px] text-body-sm text-text-default">
                    {t("calc.quote.body", { values: { date: shortDate(quote.expiresAt, locale) } })}
                  </p>
                </div>

                <hr className="relative border-border-subtle" />

                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-3 sm:gap-6">
                    <a
                      className={`${primaryButton} min-h-11 rounded-md px-6 py-3.5 text-[15px] leading-4`}
                      href={`/${locale}/buchen?quote=${quote.id}`}
                    >
                      {t("calc.quote.accept")}
                    </a>

                    {user ? null : (
                      <a
                        className={`${quietButton} min-h-11 rounded-md px-6 py-3.5 text-[15px] leading-4 font-semibold text-text-heading`}
                        href={signupHref}
                      >
                        {t("calc.quote.save")}
                      </a>
                    )}
                  </div>

                  {/* No PDF endpoint exists; the browser's print dialog saves one. */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-sm text-body-sm font-semibold text-text-default hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
                  >
                    <IconDownload />
                    {t("calc.quote.pdf")}
                  </button>
                </div>
              </section>

              <section className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface-card p-6 sm:p-8">
                <h2 className="font-sans text-h5 leading-5 font-bold tracking-normal text-text-heading">
                  {t("calc.quote.breakdown")}
                </h2>

                <ul className="flex flex-col gap-3">
                  {breakdown.lines.map((line, position) => (
                    <li
                      key={`${line.key}-${position}`}
                      className="flex flex-col gap-1 border-b border-border-subtle pb-3 last:border-b-0 last:pb-0"
                    >
                      <span className="flex items-center justify-between gap-4">
                        <span className="text-body-sm font-semibold text-text-heading">
                          {t(`line.${line.key.replace("line.", "")}`)}
                        </span>
                        <span className="text-body-sm font-bold whitespace-nowrap tabular-nums text-text-heading">
                          {formatCurrency(line.amount)}
                        </span>
                      </span>

                      <LineCaption lineKey={line.key} params={line.params} />
                    </li>
                  ))}
                </ul>

                <hr className="border-0 border-t-2 border-text-heading" />

                <dl className="flex flex-col gap-2">
                  <TotalRow label={t("calc.net")} value={formatCurrency(breakdown.netAmount)} />
                  <TotalRow
                    label={t("calc.vat", { values: { rate: breakdown.vatRate } })}
                    value={formatCurrency(breakdown.vatAmount)}
                  />

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <dt className="text-body leading-[17px] font-bold text-text-heading">
                      {t("calc.quote.total")}
                    </dt>
                    <dd className="text-h5 leading-6 font-extrabold tabular-nums text-text-heading">
                      {formatCurrency(breakdown.totalGross)}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Not drawn, but the answers must stay changeable once priced. */}
              <button
                type="button"
                onClick={onEdit}
                className="self-start rounded-sm text-body-sm font-semibold text-brand-red underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
              >
                {t("calc.editAnswers")}
              </button>
            </>
          )}
        </main>

        <QuoteSummary facts={facts} tone={pending ? "pending" : "firm"} />
      </div>
    </div>
  );
}

/**
 * The review orange of 3:2496. The palette has no token for it, so it is
 * written once here; the text shade is a step darker than the drawn #ea580c,
 * which is too light for 14px text on white.
 */
const pendingButton =
  "inline-flex min-h-[39px] items-center justify-center rounded-md bg-[#ea580c] px-6 py-3 " +
  "text-body-sm leading-[15px] font-bold text-text-on-brand transition-colors hover:bg-neutral-900 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

function PendingCard({
  quote,
  onEdit,
  action,
}: {
  quote: QuoteResult;
  onEdit: () => void;
  action: ReactNode;
}) {
  const { t, formatCurrency } = useI18n();

  const timeline = [
    { key: "calc.pending.step1", sub: "calc.pending.step1Sub", state: "done" },
    { key: "calc.pending.step2", sub: "calc.pending.step2Sub", state: "current" },
    { key: "calc.pending.step3", sub: "calc.pending.step3Sub", state: "next" },
    { key: "calc.pending.step4", sub: "calc.pending.step4Sub", state: "next" },
  ] as const;

  return (
    <section className="flex flex-col gap-6 rounded-xl border border-border-subtle bg-surface-card p-6 sm:p-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#ea580c] bg-[#fff7ed] px-4 py-1.5 text-body-sm leading-[15px] font-bold text-[#c2410c]">
          <span className="text-[#ea580c]">
            <IconClock />
          </span>
          {t("calc.pending.badge")}
        </p>

        <h1 className="font-sans text-[1.375rem] leading-6 font-bold tracking-normal text-text-default">
          {t("calc.pending.title")}
        </h1>

        {/**
         * The design prints a range ("€2,800 – €3,400"). The engine returns one
         * figure and nothing that bounds it, so the figure is shown and called
         * an estimate rather than inventing the two ends.
         */}
        <p className="flex flex-wrap items-baseline justify-center gap-2 py-2">
          <span className="text-[2.5rem] leading-[53px] font-extrabold tabular-nums text-text-heading">
            {formatCurrency(quote.breakdown.totalGross)}
          </span>
          <span className="text-body leading-[17px] font-semibold text-text-default">
            {t("calc.pending.estimate")}
          </span>
        </p>

        <p className="max-w-[540px] text-body-sm text-text-default">{t("calc.pending.body")}</p>
      </div>

      <hr className="border-border-subtle" />

      <div className="flex items-center gap-4 rounded-[10px] bg-surface-page p-5">
        <span className="shrink-0 text-[#ea580c]">
          <IconInfo />
        </span>

        <div className="flex flex-col gap-1">
          <p className="text-body-sm leading-[15px] font-bold text-text-heading">
            {t("calc.pending.whyTitle")}
          </p>
          <p className="text-[13px] leading-[14px] text-text-default">{t("calc.pending.whyBody")}</p>

          {/* The server's own reasons, so the box says what is actually being checked. */}
          {quote.reviewReasons.length > 0 ? (
            <ul className="mt-1 flex list-disc flex-col gap-0.5 ps-4 text-[13px] leading-4 text-text-default">
              {quote.reviewReasons.map((reason) => (
                <li key={reason}>{t(`calc.review.${reason}`)}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-3">
        <h2 className="font-sans text-[13px] leading-[14px] font-bold tracking-normal text-text-default uppercase">
          {t("calc.pending.timeline")}
        </h2>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {timeline.map((entry, position) => (
            <li key={entry.key} className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`grid h-6 w-5 shrink-0 place-items-center rounded-[10px] text-[11px] font-bold tabular-nums ${
                      entry.state === "done"
                        ? "bg-success text-text-on-brand"
                        : entry.state === "current"
                          ? "bg-[#ea580c] text-text-on-brand"
                          : "bg-surface-page text-text-faint"
                    }`}
                  >
                    {position + 1}
                  </span>

                  <span
                    className={`text-[13px] leading-[14px] font-bold ${
                      entry.state === "current" ? "text-[#c2410c]" : "text-text-heading"
                    }`}
                  >
                    {t(entry.key)}
                  </span>
                </span>

                <span className="text-caption leading-[13px] text-text-default">{t(entry.sub)}</span>
              </span>

              {position < timeline.length - 1 ? (
                <span aria-hidden="true" className="hidden h-px w-6 shrink-0 bg-border-subtle lg:block" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      <hr className="border-border-subtle" />

      {/**
       * The design's footer line says a copy was emailed. Nothing is sent for
       * an anonymous quote, so the start side offers the way back instead.
       */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={onEdit} className={`${quietButton} min-h-[39px] rounded-md px-6 py-3 text-body-sm font-semibold text-text-default`}>
          {t("calc.editAnswers")}
        </button>

        {action}
      </div>
    </section>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-body-sm text-text-default">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** "24 Oct 2025": the day the quote row stops being bookable. */
function shortDate(timestamp: string, locale: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

/**
 * The five scattered shapes on the instant-quote card (3:2392 … 3:2396),
 * placed as drawn on the 892px card. Pure decoration.
 */
function Confetti() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="absolute start-10 top-[30px] size-3 rounded-full bg-brand-yellow" />
      <span className="absolute start-10 top-[160px] hidden size-3 bg-success [clip-path:polygon(50%_0,100%_100%,0_100%)] sm:block" />
      <span className="absolute start-[109px] top-[220px] hidden size-[23px] bg-brand-red [clip-path:polygon(50%_0,100%_100%,0_100%)] sm:block" />
      <span className="absolute end-[200px] top-10 hidden size-[19px] rotate-12 bg-success sm:block" />
      <span className="absolute end-[172px] top-[190px] hidden size-2.5 rounded-full bg-brand-red sm:block" />
    </span>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconDownload() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg {...stroke} width="16" height="16" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg {...stroke} width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
