"use client";

import { useState, useEffect, useCallback } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";

interface MonthlyReport {
  year: number;
  month: number;
  total: string;
  payments: number;
}


/**
 * Monthly revenue.
 *
 * The figure is aggregated in Postgres in the business time zone. The previous
 * version built month boundaries in the browser with `toISOString()`, which
 * shifted them by an hour and moved orders at the edge of a month into the
 * neighbouring one — so two adjacent months could each be wrong while their
 * sum looked right.
 */
export default function BillingPage() {
  const { sdk, user, loading: authLoading } = useApi();
  const { t, locale, formatCurrency } = useI18n();

  /**
   * Month names for the active locale.
   *
   * The previous hardcoded German array meant the Arabic and Turkish builds
   * showed "Januar" — Intl already knows every language's month names.
   */
  const monthName = (month: number) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(Date.UTC(2000, month - 1, 1)));

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setReport(
        await sdk.http.get<MonthlyReport>("/api/payments/reports/monthly", { year, month }),
      );
    } catch {
      setError(t("admin.reportFailed"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [sdk, year, month]);

  // Loading only — the shell handles access, and the API enforces it.
  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <DashboardShell title={t("admin.billing")} variant="staff">
      <div className="calendar-head" style={{ maxWidth: 360 }}>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => shiftMonth(-1)}
          aria-label={t("calc.prevMonth")}
        >
          ‹
        </button>

        <strong aria-live="polite">
          {monthName(month)} {year}
        </strong>

        <button
          type="button"
          className="btn ghost small"
          onClick={() => shiftMonth(1)}
          // Future months have no revenue to report.
          disabled={isCurrentMonth}
          aria-label={t("calc.nextMonth")}
        >
          ›
        </button>
      </div>

      {loading && (
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          <div className="skeleton-row" />
        </div>
      )}

      <div aria-live="polite">
        {error && (
          <div className="calc-error">
            {error}{" "}
            <button type="button" className="btn ghost" onClick={() => void load()}>
              {t("common.retry")}
            </button>
          </div>
        )}
      </div>

      {report && !loading && (
        <>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-value">{formatCurrency(report.total)}</span>
              <span className="stat-label">{t("admin.paymentsReceived")}</span>
            </div>

            <div className="stat">
              <span className="stat-value">{report.payments}</span>
              <span className="stat-label">
                {t("admin.bookingCount", { count: report.payments })}
              </span>
            </div>
          </div>

          <p className="field-hint">{t("admin.billingNote")}</p>

          {report.payments === 0 && (
            <p className="auth-sub">{t("admin.noPayments")}</p>
          )}
        </>
      )}
    </DashboardShell>
  );
}
