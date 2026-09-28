"use client";

import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { telHref, useSiteSettings } from "@/lib/site/useSiteSettings";

/**
 * The chrome every calculator frame shares.
 *
 * All fifteen calculator frames in the design (the ten wizard screens and the
 * three result screens, 3:618 … 3:2640) draw the same 72px header — logo on
 * one side, "Need help booking?" and the hotline on the other — and none of
 * them draws the marketing nav or a footer. The three result frames add a row
 * of five tabs under it, and all three draw the same summary card on the end
 * side. Those pieces live here so the wizard, the quote and the booking screen
 * cannot drift apart.
 */

/**
 * The design's two button styles, as utilities rather than `.btn`, whose
 * unlayered rules would win over them. Size, corner, type and (for the quiet
 * one) ink are left to the caller: the frames draw these at 41, 44 and 48px,
 * with 6 or 8px corners, and two utilities for one property cannot be ordered.
 */
export const primaryButton =
  "inline-flex items-center justify-center gap-2 bg-brand-red " +
  "font-bold text-text-on-brand transition-colors " +
  "hover:bg-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

export const quietButton =
  "inline-flex items-center justify-center gap-2 border border-border-subtle " +
  "bg-surface-card transition-colors " +
  "hover:border-border-strong hover:text-text-strong disabled:cursor-not-allowed disabled:text-text-faint " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

/** The five chips the three result frames share. */
const TABS = ["calc.tab.route", "calc.tab.inventory", "calc.tab.special", "calc.tab.schedule"];

/**
 * The calculator's own header: no marketing nav, and the hotline is the CMS's.
 *
 * `currentTab` turns on the result frames' tab row; its value is the label of
 * the fifth, current chip ("Your Quote" or "Pending Estimate"). Everything
 * before it has been answered, so the first four are always ticked.
 */
export function CalcHeader({
  currentTab,
  homeHref,
}: {
  currentTab?: string | undefined;
  homeHref?: string | undefined;
}) {
  const { t } = useI18n();
  const { phone, brandName, logo: logoUrl } = useSiteSettings();

  const logo = <img src={logoUrl} alt={brandName} className="h-[47px] w-auto" />;

  return (
    <header className="border-b border-border-subtle bg-surface-card">
      <div
        className={`flex h-[72px] items-center justify-between gap-4 px-4 lg:px-10 ${
          currentTab ? "border-b border-border-subtle" : ""
        }`}
      >
        {homeHref ? (
          <a
            href={homeHref}
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
          >
            {logo}
          </a>
        ) : (
          logo
        )}

        {phone ? (
          <div className="flex items-center gap-4">
            <div className="hidden flex-col items-end gap-0.5 sm:flex">
              <span className="text-caption text-text-default">{t("calc.confirm.needHelp")}</span>
              <a className="text-body-sm font-bold text-brand-red" href={telHref(phone)} dir="ltr">
                {phone}
              </a>
            </div>

            <a
              href={telHref(phone)}
              aria-label={t("calc.confirm.callUs")}
              className="grid size-10 place-items-center rounded-full border border-border-subtle bg-surface-page text-brand-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
            >
              <IconPhone />
            </a>
          </div>
        ) : null}
      </div>

      {currentTab ? (
        <ol className="flex h-9 gap-4 overflow-x-auto px-4 lg:gap-8 lg:px-12">
          {[...TABS.map((key) => t(key)), currentTab].map((label, position) => {
            const current = position === TABS.length;

            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className={`flex shrink-0 items-start gap-2 border-b pb-3 ${
                  current ? "border-brand-red" : "border-transparent"
                }`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full text-caption font-bold text-text-on-brand ${
                    current ? "bg-brand-red" : "bg-success"
                  }`}
                  aria-hidden="true"
                >
                  {current ? position + 1 : <IconCheck size={12} />}
                </span>

                <span
                  className={`text-body-sm leading-6 font-semibold ${
                    current ? "text-text-strong" : "text-text-default"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </header>
  );
}

/** What the summary card needs, whichever screen it sits on. */
export interface SummaryFacts {
  serviceType: string;
  originAddress: string;
  destinationAddress?: string | undefined;
  distanceKm?: string | undefined;
  scheduledDate?: string | undefined;
  scheduledTime?: string | undefined;
  calculationMethod: "area" | "items";
  areaSqm?: number | string | undefined;
  itemCount: number;
  /** Only a move has a crew; the row is left out otherwise. */
  crewSize?: number | undefined;
  secondVan?: boolean | undefined;
  estimatedHours?: string | undefined;
  lines: Array<{ key: string }>;
  vatRate: string;
  totalGross: string;
}

/**
 * The summary card on the end side of the three result frames (3:2452,
 * 3:2596, 3:2767).
 *
 * The design fills it with a plan name, "3-Room Apartment" and "45 Boxes".
 * Plans, rooms and boxes are not modelled anywhere in `QuoteInput`, so the
 * rows carry what the customer actually answered and the list under
 * "Services Included" is the engine's own lines — exactly what the stored
 * price pays for, rather than a hand-written list of promises.
 *
 * `tone` colours the total: ink for a bookable price, the design's orange for
 * an estimate still waiting on a person.
 */
export function QuoteSummary({
  facts,
  tone = "firm",
  priceLabel,
}: {
  facts: SummaryFacts;
  tone?: "firm" | "pending";
  /** Replaces the formatted total, for a figure the caller has already dressed. */
  priceLabel?: ReactNode;
}) {
  const { t, locale, formatCurrency } = useI18n();

  const km = facts.distanceKm ? Number.parseFloat(facts.distanceKm) : 0;
  const moving = facts.crewSize !== undefined;

  const hours = facts.estimatedHours
    ? t("calc.confirm.loadingEstimate", { values: { hours: facts.estimatedHours } })
    : undefined;

  return (
    <aside className="flex w-full flex-col gap-6 rounded-xl border border-border-subtle bg-surface-card p-7 lg:w-[420px] lg:shrink-0">
      <div className="flex flex-col gap-1.5">
        <p className="text-caption font-semibold text-text-default uppercase">
          {t("calc.confirm.service")}
        </p>
        <p className="text-h4 font-bold text-text-strong">{t(`service.${facts.serviceType}`)}</p>
      </div>

      <hr className="border-border-subtle" />

      <dl className="flex flex-col gap-4">
        <SummaryRow
          label={t("calc.confirm.route")}
          value={
            facts.destinationAddress
              ? `${facts.originAddress} → ${facts.destinationAddress}`
              : facts.originAddress
          }
          sub={km > 0 ? t("calc.confirm.distance", { values: { km: Math.round(km) } }) : undefined}
        />

        <SummaryRow
          label={t("calc.confirm.moveDate")}
          value={facts.scheduledDate ? longDate(facts.scheduledDate, locale) : t("common.none")}
          sub={
            facts.scheduledTime
              ? t("calc.confirm.startingAt", { values: { time: facts.scheduledTime } })
              : undefined
          }
        />

        <SummaryRow
          label={t("calc.confirm.inventory")}
          value={
            facts.calculationMethod === "area"
              ? t("calc.confirm.areaValue", { values: { area: facts.areaSqm ?? 0 } })
              : t("calc.confirm.itemsValue", { count: facts.itemCount })
          }
          // The design puts the loading estimate under the crew; a job with
          // no crew row still has hours, so they fall back to here.
          sub={moving ? undefined : hours}
        />

        {moving ? (
          <SummaryRow
            label={t("calc.confirm.crew")}
            value={t("calc.confirm.crewValue", {
              values: { crew: facts.crewSize ?? 2, vans: facts.secondVan ? 2 : 1 },
            })}
            sub={hours}
          />
        ) : null}
      </dl>

      <hr className="border-border-subtle" />

      <div className="flex flex-col gap-3">
        <p className="text-caption font-semibold text-text-faint uppercase">
          {t("calc.confirm.included")}
        </p>

        <ul className="flex flex-col gap-3">
          {facts.lines.map((line, position) => (
            <li
              key={`${line.key}-${position}`}
              className="flex items-center gap-2 text-[13px] leading-[14px] text-text-default"
            >
              <span className="shrink-0 text-success">
                <IconCheckCircle />
              </span>
              {t(`line.${line.key.replace("line.", "")}`)}
            </li>
          ))}
        </ul>
      </div>

      <hr className="border-border-subtle" />

      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex flex-col gap-0.5">
          <p className="text-body-sm font-bold text-text-strong">{t("calc.confirm.total")}</p>
          <p className="text-[11px] leading-3 text-text-default">
            {t("calc.confirm.vatIncluded", { values: { rate: facts.vatRate } })}
          </p>
        </div>

        <p
          className={`text-h3 font-extrabold tabular-nums ${
            // The design's review orange; the palette has no token for it.
            tone === "pending" ? "text-[#ea580c]" : "text-text-strong"
          }`}
        >
          {priceLabel ?? formatCurrency(facts.totalGross)}
        </p>
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption font-semibold text-text-faint uppercase">{label}</dt>
      <dd className="flex flex-col gap-1">
        <span className="text-body-sm font-semibold text-text-strong">{value}</span>
        {sub ? <span className="text-caption text-text-default">{sub}</span> : null}
      </dd>
    </div>
  );
}

/** "Friday, Oct 24, 2025", as the summary writes the move date — in the reader's locale. */
export function longDate(day: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
}

/* Inline SVG rather than an icon package, as everywhere else in this app. */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconPhone() {
  return (
    <svg {...stroke} width="18" height="18" viewBox="0 0 24 24">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

export function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg {...stroke} width={size} height={size} viewBox="0 0 24 24">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

export function IconCheckCircle({ size = 14 }: { size?: number }) {
  return (
    <svg {...stroke} width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
