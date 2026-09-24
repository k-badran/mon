"use client";

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
const RAIL_STEPS: ReadonlySet<StepId> = new Set<StepId>([
  "service",
  "route",
  "property",
  "volume",
]);

interface PanelProps {
  stepId: StepId;
  state: CalculatorState;
  estimate: PriceEstimate;
}

export function PricePanel({ stepId, state, estimate }: PanelProps) {
  return RAIL_STEPS.has(stepId) ? (
    <SummaryRail state={state} estimate={estimate} />
  ) : (
    <BreakdownCard estimate={estimate} />
  );
}

function SummaryRail({ state, estimate }: { state: CalculatorState; estimate: PriceEstimate }) {
  const { t } = useI18n();
  const rows = specRows(state, estimate.quote, t);

  return (
    <aside
      aria-label={t("calc.panel.liveEstimate")}
      aria-busy={estimate.refreshing || undefined}
      className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-neutral-0 p-6 lg:rounded-none lg:border-0 lg:border-l"
    >
      <header className="grid gap-1.5">
        <p className="text-caption font-bold text-text-faint">{t("calc.panel.liveEstimate")}</p>
        <Total estimate={estimate} size="rail" />
      </header>

      <Rule />

      <section className="grid gap-2.5">
        <h3 className="text-body-sm font-bold text-text-strong">
          {t("calc.panel.selectedServices")}
        </h3>

        {/* One service, because a quote carries one. The design's second
            bullet comes from a multi-select the data model cannot hold yet. */}
        <ul className="grid gap-2">
          <li className="flex items-center gap-2 text-body-sm text-text-default">
            <span className="size-1.5 shrink-0 rounded-[3px] bg-brand-yellow" aria-hidden="true" />
            {t(`service.${state.serviceType}`)}
          </li>
        </ul>
      </section>

      <Rule />

      <section className="grid gap-3">
        <h3 className="text-body-sm font-bold text-text-strong">{t("calc.panel.routeSpecs")}</h3>

        {rows.length > 0 ? (
          <dl className="grid gap-3">
            {rows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-3">
                <dt className="text-caption text-text-default">{row.label}</dt>
                <dd className="text-caption font-semibold text-text-strong">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-caption text-text-faint">{t("calc.panel.awaitingSpecs")}</p>
        )}
      </section>

      <Rule />

      <Guarantee />
    </aside>
  );
}

function BreakdownCard({ estimate }: { estimate: PriceEstimate }) {
  const { t, formatCurrency } = useI18n();
  const lines = estimate.quote?.breakdown.lines ?? [];

  return (
    <aside
      aria-label={t("calc.panel.instantLivePrice")}
      aria-busy={estimate.refreshing || undefined}
      className="flex flex-col gap-5 rounded-xl bg-neutral-0 p-6 shadow-lg"
    >
      <header className="grid gap-1">
        <p className="text-h6 font-bold text-brand-red">{t("brand.name")}</p>
        <p className="text-h5 font-bold text-text-strong">{t("calc.panel.instantLivePrice")}</p>
      </header>

      <Rule />

      <section className="grid gap-3.5">
        <h3 className="text-caption font-bold text-text-faint uppercase">
          {t("calc.panel.breakdown")}
        </h3>

        {lines.length > 0 ? (
          <ul className="grid gap-3.5">
            {lines.map((line, position) => (
              <li key={`${line.key}-${position}`} className="flex items-start justify-between gap-4">
                <span className="grid gap-0.5">
                  <span className="text-body-sm font-medium text-text-strong">{t(line.key)}</span>
                  <LineCaption lineKey={line.key} params={line.params} />
                </span>

                <span className="text-body-sm font-bold tabular-nums whitespace-nowrap text-text-strong">
                  {formatCurrency(line.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-caption text-text-faint">{t("calc.panel.awaitingSpecs")}</p>
        )}
      </section>

      <Rule />

      <div className="flex items-center justify-between gap-4">
        <span className="grid gap-0.5">
          <span className="text-body-sm font-semibold text-text-default">
            {t("calc.panel.estimatedTotal")}
          </span>
          <span className="text-caption text-text-faint">{t("calc.panel.totalNote")}</span>
        </span>

        <Total estimate={estimate} size="card" />
      </div>

      <p className="flex items-center gap-2 rounded-md bg-success-soft px-3 py-3 text-caption font-semibold text-success-text">
        <ShieldCheck />
        {t("calc.panel.bestPrice")}
      </p>
    </aside>
  );
}

/**
 * The headline figure.
 *
 * Rendered through `formatCurrency` rather than the design's split "€" and
 * amount: where the symbol sits, and which side of it the digits fall on, is a
 * locale's decision — and this wizard ships in Arabic.
 */
function Total({ estimate, size }: { estimate: PriceEstimate; size: "rail" | "card" }) {
  const { t, formatCurrency } = useI18n();
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

  return (
    <span className="grid gap-1 text-end">
      <span
        aria-live="polite"
        // Dimmed while a newer price is on its way: what is on screen is the
        // last figure the server stated, not a guess at the next one.
        className={[
          size === "rail" ? "text-h1 font-extrabold" : "text-h2 font-extrabold",
          "tabular-nums text-brand-red transition-opacity",
          refreshing ? "opacity-50" : "opacity-100",
        ].join(" ")}
      >
        {formatCurrency(quote.breakdown.totalGross)}
      </span>

      {size === "rail" ? (
        <span className="text-caption text-text-default">{t("calc.panel.inclVat")}</span>
      ) : null}

      {error ? (
        <span className="text-caption text-danger-text">{t("calc.panel.refreshFailed")}</span>
      ) : null}
    </span>
  );
}

/**
 * The sub-caption under a breakdown line.
 *
 * The engine already ships the numbers that describe each line in `params`, so
 * the caption is copy around them rather than anything computed. A line whose
 * copy has not been written yet renders without a caption instead of printing
 * its own key at the customer.
 */
function LineCaption({
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

  return <span className="text-caption text-text-default">{caption}</span>;
}

function Guarantee() {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2.5 rounded-md bg-neutral-50 p-3">
      <span className="text-brand-red">
        <ShieldCheck />
      </span>

      <span className="grid gap-0.5">
        <span className="text-caption font-bold text-text-strong">
          {t("calc.panel.guaranteeTitle")}
        </span>
        <span className="text-caption text-text-default">{t("calc.panel.guaranteeBody")}</span>
      </span>
    </div>
  );
}

function Rule() {
  return <hr className="border-0 border-t border-border-subtle" />;
}

function ShieldCheck() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
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
