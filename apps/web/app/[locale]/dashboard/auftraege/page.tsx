"use client";

import type { OrderStatus } from "@umzugplus/client";
import Link from "next/link";
import { useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useLiveOrders } from "@/lib/live/useLiveData";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { IconSearch } from "@/app/components/dashboard/Icons";

/**
 * The customer's orders.
 *
 * Filtering happens on the server: the list is paginated, so filtering the
 * fetched page in the browser would silently hide matches on later pages —
 * which is exactly the bug the unbounded legacy queries hid.
 */

const PAGE_SIZE = 8;

/** Windows the list by creation date, as in the design's date filter. */
const RANGES = [
  { id: "3m", months: 3 },
  { id: "6m", months: 6 },
  { id: "12m", months: 12 },
  { id: "all", months: 0 },
] as const;

export default function MyOrdersPage() {
  const { t, locale, formatCurrency, formatDate } = useI18n();

  const [status, setStatus] = useState<OrderStatus | "">("");
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("3m");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useLiveOrders({
    limit: 100,
    ...(status ? { status } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  const all = data?.items ?? [];

  // The date window is applied here because the API filters by status and text
  // but not by age; everything else is server-side.
  const cutoff = (() => {
    const months = RANGES.find((r) => r.id === range)?.months ?? 0;
    if (months === 0) return null;

    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString();
  })();

  const filtered = cutoff ? all.filter((order) => order.createdAt >= cutoff) : all;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <DashboardShell title={t("nav.orders")}>
      <div className="table-toolbar">
        <label htmlFor="status" className="sr-only">{t("common.status")}</label>
        <select
          id="status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | "");
            setPage(0);
          }}
        >
          <option value="">{t("orders.allOrders")}</option>
          {(["quoted", "confirmed", "completed", "cancelled"] as const).map((value) => (
            <option key={value} value={value}>{t(`status.${value}`)}</option>
          ))}
        </select>

        <label htmlFor="range" className="sr-only">{t("orders.dateRange")}</label>
        <select
          id="range"
          value={range}
          onChange={(event) => {
            setRange(event.target.value as typeof range);
            setPage(0);
          }}
        >
          {RANGES.map((option) => (
            <option key={option.id} value={option.id}>{t(`orders.range.${option.id}`)}</option>
          ))}
        </select>

        <div className="dash-search spacer">
          <IconSearch className="search-icon" />
          <label htmlFor="order-search" className="sr-only">{t("common.search")}</label>
          <input
            id="order-search"
            type="search"
            placeholder={t("orders.searchPlaceholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>
      </div>

      <div aria-live="polite">
        {isError && (
          <div className="calc-error">
            {t("orders.loadFailed")}{" "}
            <button type="button" className="btn ghost small" onClick={() => void refetch()}>
              {t("common.retry")}
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && !isError && (
        <div className="card empty-state">
          <p style={{ color: "var(--text-muted)", marginBlockEnd: "var(--space-4)" }}>
            {t("orders.empty")}
          </p>
          <Link className="btn primary" href={`/${locale}`}>{t("orders.calculateNow")}</Link>
        </div>
      )}

      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("orders.reference")}</th>
                <th>{t("orders.dateCreated")}</th>
                <th>{t("orders.service")}</th>
                <th>{t("common.status")}</th>
                <th className="num">{t("orders.amount")}</th>
                <th>{t("common.action")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => (
                <tr key={order.id}>
                  <td data-label={t("orders.reference")} className="ref">
                    {order.reference}
                  </td>
                  <td data-label={t("orders.dateCreated")}>
                    {formatDate(order.createdAt.slice(0, 10))}
                  </td>
                  <td data-label={t("orders.service")}>{t(`service.${order.serviceType}`)}</td>
                  <td data-label={t("common.status")}>
                    <span className={`pill is-${order.status}`}>{t(`status.${order.status}`)}</span>
                  </td>
                  <td className="num" data-label={t("orders.amount")}>
                    {formatCurrency(order.totalGross)}
                  </td>
                  <td className="row-action">
                    <Link
                      className="btn primary small"
                      href={`/${locale}/dashboard/auftraege/${order.id}`}
                    >
                      {t("orders.details")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pager">
            <span className="count">
              {t("orders.showing", {
                values: {
                  from: current * PAGE_SIZE + 1,
                  to: current * PAGE_SIZE + rows.length,
                  total: filtered.length,
                },
              })}
            </span>

            <button
              type="button"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={current === 0}
            >
              {t("common.previous")}
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
              disabled={current >= pageCount - 1}
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
