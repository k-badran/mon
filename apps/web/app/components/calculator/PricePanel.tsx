"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n/provider";
import type { CalculatorState, StepId } from "@/lib/calculator/machine";
import type { PriceEstimate, QuoteResult } from "@/lib/calculator/usePriceEstimate";

/**
 * The running price, beside every input step.
 *
 * The design draws it two ways: a flush rail on the first five screens, which
 * summarises what has been answered, and a card on the later ones, which
 * itemises what is being charged. Same data, two readings of it, so one
 * component with two layouts rather than two components that drift.
 *
 * Nothing in here does arithmetic on money. Every figure is a string the
 * server put in `breakdown`, and the rows beside it echo the customer's own
 * answers back — a floor number, an area, a count of items. The moment this
 * file starts adding amounts together it has become a second, private copy of
 * the rate card, which is the bug the rewrite exists to remove.
 */

/**
 * The steps the design gives the rail rather than the card: Figma's first five
 * screens, which are these four here because one screen asks two of the
 * wizard's questions and two screens are one step in its two modes.
 */
export const RAIL_STEPS: ReadonlySet<StepId> = new Set<StepId>([
  "service",
  "route",
  "property",
  "volume",
]);

interface PanelProps {
  stepId: StepId;
  state: CalculatorState;
  estimate: PriceEstimate;
  /** The card screens put the wizard's two buttons at the foot of the card. */
  children?: ReactNode;
}

export function PricePanel({ stepId, state, estimate, children }: PanelProps) {
  return RAIL_STEPS.has(stepId) ? (
    <SummaryRail state={state} estimate={estimate} />
  ) : (
    <BreakdownCard estimate={estimate}>{children}</BreakdownCard>
  );
}

/**
 * The flush rail of 3:696. The page draws the column and its border; this is
 * what sits in it.
 */
function SummaryRail({ state, estimate }: { state: CalculatorState; estimate: PriceEstimate }) {
  const { t } = useI18n();
  const rows = specRows(state, estimate.quote, t);

  return (
    <aside
      aria-label={t("calc.panel.liveEstimate")}
      aria-busy={estimate.refreshing || undefined}
      className="flex flex-col gap-5 p-6"
    >
      <header className="grid gap-1.5">
        <p className="text-[12px] leading-[15px] font-bold text-text-faint uppercase">
          {t("calc.panel.liveEstimate")}
        </p>
        <Total estimate={estimate} size="rail" />
      </header>

      <Rule />

      <section className="grid gap-2.5">
        <h3 className="font-sans text-[13px] leading-4 font-bold text-text-heading">
          {t("calc.panel.selectedServices")}
        </h3>

        {/* One service, because a quote carries one. The design's second
            bullet comes from a multi-select the data model cannot hold yet. */}
        <ul className="grid gap-2.5">
          <li className="flex items-center gap-2 text-[13px] leading-4 text-text-default">
            <span className="size-1.5 shrink-0 rounded-[3px] bg-brand-yellow" aria-hidden="true" />
            {t(`service.${state.serviceType}`)}
          </li>
        </ul>
      </section>

      <Rule />

      <section className="grid gap-3">
        <h3 className="font-sans text-[13px] leading-4 font-bold text-text-heading">
          {t("calc.panel.routeSpecs")}
        </h3>

        {rows.length > 0 ? (
          <dl className="grid gap-3">
            {rows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-3">
                <dt className="text-[12px] leading-[15px] text-text-default">{row.label}</dt>
                <dd className="text-[12px] leading-[15px] font-semibold text-text-heading">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[12px] leading-[15px] text-text-faint">
            {t("calc.panel.awaitingSpecs")}
          </p>
        )}
      </section>

      <Rule />

      <Guarantee />
    </aside>
  );
}

/** The floating card of 3:1483, with the wizard's buttons at its foot. */
function BreakdownCard({ estimate, children }: { estimate: PriceEstimate; children?: ReactNode }) {
  const { t, formatCurrency } = useI18n();
  const lines = estimate.quote?.breakdown.lines ?? [];

  return (
    <aside
      aria-label={t("calc.panel.instantLivePrice")}
      aria-busy={estimate.refreshing || undefined}
      className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-neutral-0 p-6 shadow-[0_8px_24px_rgba(0,0,0,0.02)]"
    >
      <header className="grid gap-1">
        <p className="font-display text-h5 leading-[23px] font-bold text-brand-red">
          {t("brand.name")}
        </p>
        <p className="font-display text-h4 leading-[25px] font-bold text-text-heading">
          {t("calc.panel.instantLivePrice")}
        </p>
      </header>

      <Rule />

      <section className="grid gap-3.5">
        <h3 className="font-sans text-[12px] leading-4 font-bold text-text-faint uppercase">
          {t("calc.panel.breakdown")}
        </h3>

        {lines.length > 0 ? (
          <ul className="grid gap-3.5">
            {lines.map((line, position) => (
              <li key={`${line.key}-${position}`} className="flex items-start justify-between gap-4">
                <span className="grid gap-0.5">
                  <span className="text-body-sm leading-[18px] font-medium text-text-heading">
                    {t(line.key)}
                  </span>
                  <LineCaption lineKey={line.key} params={line.params} />
                </span>

                <span className="font-display text-body-sm leading-[18px] font-bold whitespace-nowrap tabular-nums text-text-heading">
                  {formatCurrency(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[12px] leading-4 text-text-faint">{t("calc.panel.awaitingSpecs")}</p>
        )}
      </section>

      <Rule />

      <div className="flex items-center justify-between gap-4">
        <span className="grid gap-0.5">
          <span className="font-display text-body-sm leading-[18px] font-semibold text-text-default">
            {t("calc.panel.estimatedTotal")}
          </span>
          <span className="text-[11px] leading-[14px] text-text-faint">
            {t("calc.panel.totalNote")}
          </span>
        </span>

        <Total estimate={estimate} size="card" />
      </div>

      <p className="flex items-center gap-2 rounded-md bg-success/6 p-3 text-[11px] leading-[14px] font-semibold text-success-text">
        <span className="text-success">
          <ShieldCheck size={16} />
        </span>
        {t("calc.panel.bestPrice")}
      </p>

      {children}
    </aside>
  );
}

/** The headline figure, on the rail or in the card. */
function Total({ estimate, size }: { estimate: PriceEstimate; size: "rail" | "card" }) {
  const { t, locale, formatCurrency } = useI18n();
  const { quote, refreshing, awaitingAnswers, error } = estimate;

  if (!quote) {
    return (
      <p className="text-body-sm text-text-muted">
        {error
          ? t("calc.panel.refreshFailed")
          : awaitingAnswers
            ? t("calc.panel.noPriceYet")
            : t("calc.panel.calculating")}
      </p>
    );
  }

  // Dimmed while a newer price is on its way: what is on screen is the last
  // figure the server stated, not a guess at the next one.
  const fade = `transition-opacity ${refreshing ? "opacity-50" : "opacity-100"}`;

  const failed = error ? (
    <span className="text-caption text-danger-text">{t("calc.panel.refreshFailed")}</span>
  ) : null;

  if (size === "card") {
    return (
      <span className="grid gap-1 text-end">
        <span
          aria-live="polite"
          className={`font-display text-[1.75rem] leading-[35px] font-extrabold tabular-nums text-brand-red ${fade}`}
        >
          {formatCurrency(quote.breakdown.totalGross)}
        </span>
        {failed}
      </span>
    );
  }

  /**
   * The rail draws a small ink "€", a large red amount and "incl. VAT" on one
   * baseline (3:699). The split comes from `formatToParts`, so where the
   * symbol sits — and which side of it the digits fall on — stays the
   * locale's decision; this wizard ships in Arabic.
   */
  return (
    <span className="grid gap-1">
      <span aria-live="polite" className={`flex flex-wrap items-baseline gap-1 ${fade}`}>
        {currencyParts(quote.breakdown.totalGross, locale).map((part, position) =>
          part.type === "currency" ? (
            <span key={position} className="text-h5 leading-[22px] font-bold text-text-heading">
              {part.value}
            </span>
          ) : (
            <span
              key={position}
              className="text-[2.25rem] leading-[44px] font-extrabold tabular-nums text-brand-red"
            >
              {part.value}
            </span>
          ),
        )}

        <span className="text-[12px] leading-[15px] text-text-default">
          {t("calc.panel.inclVat")}
        </span>
      </span>
      {failed}
    </span>
  );
}

/**
 * The total as the locale writes it, in two kinds of piece: the currency sign,
 * and the amount with its digits, separators and sign merged. Spacing
 * literals are dropped because the flex gap does their job.
 */
function currencyParts(amount: string, locale: string): Array<{ type: "currency" | "amount"; value: string }> {
  const value = Number.parseFloat(amount);
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).formatToParts(
    Number.isFinite(value) ? value : 0,
  );

  const merged: Array<{ type: "currency" | "amount"; value: string }> = [];

  for (const part of parts) {
    if (part.type === "literal" && part.value.trim() === "") continue;

    const kind = part.type === "currency" ? "currency" : "amount";
    const last = merged[merged.length - 1];

    if (last && last.type === kind) last.value += part.value;
    else merged.push({ type: kind, value: part.value });
  }

  return merged;
}

/**
 * The sub-caption under a breakdown line.
 *
 * The engine already ships the numbers that describe each line in `params`, so
 * the caption is copy around them rather than anything computed. A line whose
 * copy has not been written yet renders without a caption instead of printing
 * its own key at the customer.
 */
export function LineCaption({
  lineKey,
  params,
}: {
  lineKey: string;
  params?: Record<string, unknown> | undefined;
}) {
  const { t } = useI18n();

  const captionKey = `${lineKey}.caption`;
  const caption = t(
    captionKey,
    params ? { values: params as Record<string, string | number> } : {},
  );

  if (caption === captionKey) return null;

  return <span className="text-caption leading-4 tracking-normal text-text-default">{caption}</span>;
}

/** The trust badge at the foot of the rail (3:717): a green shield on a sunken chip. */
function Guarantee() {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2.5 rounded-md bg-surface-page p-3">
      <span className="text-success">
        <ShieldCheck size={20} />
      </span>

      <span className="grid gap-0.5">
        <span className="text-[11px] leading-[13px] font-bold text-text-heading">
          {t("calc.panel.guaranteeTitle")}
        </span>
        <span className="text-[10px] leading-3 text-text-default">
          {t("calc.panel.guaranteeBody")}
        </span>
      </span>
    </div>
  );
}

function Rule() {
  return <hr className="border-0 border-t border-border-subtle" />;
}

function ShieldCheck({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

interface SpecRow {
  key: string;
  label: string;
  value: string;
}

/**
 * The "Route & Specs" rows.
 *
 * Two sources only: figures the server stated, and answers the customer gave.
 * The design also asks for an estimated driving time and an estimated cargo
 * volume; both are derived from the pricing model's own constants, the quote
 * response carries neither, and deriving them here would put a second copy of
 * those constants in the browser. They are left out until the server returns
 * them.
 */
function specRows(
  state: CalculatorState,
  quote: QuoteResult | null,
  t: ReturnType<typeof useI18n>["t"],
): SpecRow[] {
  const rows: SpecRow[] = [];

  const distanceKm = quote?.breakdown.distanceKm;

  if (distanceKm && Number.parseFloat(distanceKm) > 0) {
    rows.push({
      key: "distance",
      label: t("calc.panel.distance"),
      value: t("calc.panel.kmValue", { values: { km: Number.parseFloat(distanceKm) } }),
    });
  }

  rows.push({
    key: "customerType",
    label: t("calc.panel.customerType"),
    value: t(`calc.customer.${state.customerType}`),
  });

  rows.push({
    key: "originFloor",
    label: t("calc.panel.fromFloor"),
    value: floorValue(state.originFloor, state.originHasElevator, t),
  });

  if (state.serviceType === "moving") {
    rows.push({
      key: "destinationFloor",
      label: t("calc.panel.toFloor"),
      value: floorValue(state.destinationFloor, state.destinationHasElevator, t),
    });
  }

  if (state.calculationMethod === "area") {
    const sqm = Number.parseFloat(state.areaSqm);

    if (sqm > 0) {
      rows.push({
        key: "area",
        label: t("calc.panel.livingArea"),
        value: t("calc.panel.sqmValue", { values: { sqm } }),
      });
    }
  } else {
    const count = Object.values(state.selectedItems).reduce(
      (total, quantity) => total + quantity,
      0,
    );

    rows.push({
      key: "method",
      label: t("calc.panel.calcMethod"),
      value: t("calc.methodItems"),
    });

    if (count > 0) {
      rows.push({
        key: "items",
        label: t("calc.panel.totalItems"),
        value: t("calc.panel.itemsValue", { count }),
      });
    }
  }

  return rows;
}

function floorValue(
  floor: number,
  hasElevator: boolean,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const where = floor === 0 ? t("calc.panel.groundFloor") : t("calc.panel.floorNumber", { values: { floor } });

  return `${where} / ${hasElevator ? t("common.yes") : t("common.no")}`;
}
