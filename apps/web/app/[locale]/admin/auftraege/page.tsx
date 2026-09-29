"use client";

import type { OrderStatus } from "@mon/client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n/provider";
import { useLiveOrders } from "@/lib/live/useLiveData";
import { LIVE_TRANSPORT, TRACKING_POLL_MS } from "@/lib/live/config";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { OrderStatusActions } from "@/app/components/dashboard/OrderStatusActions";

/**
 * Every order, for staff.
 *
 * The overview at /admin shows the latest page of the queue; this is the whole
 * of it, a page at a time, with the filters that make it workable.
 *
 * ## Why paging walks cursors rather than numbering pages
 *
 * The API pages by keyset — "orders created before this instant" — because
 * OFFSET skips or repeats rows whenever a booking lands between two requests,
 * and on this screen bookings land all the time. A keyset page has no number,
 * so going back means remembering the cursor each page was fetched with.
 *
 * ## What is filtered where
 *
 * Status, text and order are all applied by the server. Filtering the fetched
 * page here would silently hide matches on pages nobody has loaded yet.
 */

const PAGE_SIZE = 25;

const ORDER_STATUSES = ["quoted", "confirmed", "completed", "cancelled"] as const;

type Sort = "newest" | "oldest";

/** Long enough to cover typing a word, short enough not to feel laggy. */
const SEARCH_DEBOUNCE_MS = 300;

export default function AdminOrderListPage() {
  const { t, locale, formatCurrency, formatDate } = useI18n();

  const [status, setStatus] = useState<OrderStatus | "">("");
  const [sort, setSort] = useState<Sort>("newest");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The cursor each visited page was fetched with; the first page has none.
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const page = cursors.length - 1;

  const settledSearch = useDebounced(search.trim(), SEARCH_DEBOUNCE_MS);

  // Any change to what is being asked for starts again from the first page: a
  // cursor from one query means nothing in another.
  useEffect(() => {
    setCursors([undefined]);
  }, [status, sort, settledSearch]);

  const cursor = cursors[page];

  const { data, isLoading, isError, isFetching, refetch } = useLiveOrders({
    limit: PAGE_SIZE,
    sort,
    ...(status ? { status } : {}),
    ...(settledSearch ? { search: settledSearch } : {}),
    ...(cursor ? { cursor } : {}),
  });

  const orders = data?.items ?? [];

  return (
    <DashboardShell title={t("admin.nav.orders")} variant="staff">
      <header className="admin-head">
        <p className="muted" style={{ margin: 0, maxInlineSize: "60ch" }}>
          {t("adminOrders.lead")}
        </p>

        {/* Says what is actually happening, so staff know how fresh this is. */}
        <span
          className={`connection connection-${isFetching ? "connecting" : "connected"}`}
          style={{ marginInlineStart: "auto" }}
        >
          {LIVE_TRANSPORT === "socket"
            ? t("admin.live")
            : t("admin.autoRefresh", { values: { seconds: TRACKING_POLL_MS / 1000 } })}
        </span>
      </header>

      <div className="admin-filters">
        <label htmlFor="order-search" className="sr-only">{t("common.search")}</label>
        <input
          id="order-search"
          type="search"
          placeholder={t("admin.searchOrders")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <label htmlFor="order-status" className="sr-only">{t("common.status")}</label>
        <select
          id="order-status"
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus | "")}
        >
          <option value="">{t("admin.allStatuses")}</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>{t(`status.${value}`)}</option>
          ))}
        </select>

        <label htmlFor="order-sort" className="sr-only">{t("adminOrders.sort")}</label>
        <select
          id="order-sort"
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
        >
          <option value="newest">{t("adminOrders.sort.newest")}</option>
          <option value="oldest">{t("adminOrders.sort.oldest")}</option>
        </select>
      </div>

      <div aria-live="polite">
        {(error || isError) && (
          <div className="calc-error">
            {error ?? t("admin.ordersFailed")}{" "}
            {!error && (
              <button type="button" className="btn ghost small" onClick={() => void refetch()}>
                {t("common.retry")}
              </button>
            )}
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

      {!isLoading && orders.length === 0 && !isError && (
        <p className="auth-sub">{t("admin.noOrders")}</p>
      )}

      {orders.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("orders.reference")}</th>
                <th>{t("admin.customer")}</th>
                <th>{t("orders.service")}</th>
                <th>{t("common.date")}</th>
                <th className="num">{t("calc.total")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.action")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="ref">
                    <Link href={`/${locale}/admin/auftraege/${order.id}`}>{order.reference}</Link>
                    <br />
                    {/* Under the reference rather than in a column of its own:
                        it is what the list is sorted by, but rarely what anyone
                        is looking for, and the actions need the width. */}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {t("adminOrders.bookedOn", {
                        values: { date: formatDate(order.createdAt.slice(0, 10)) },
                      })}
                    </span>
                  </td>
                  <td>
                    {order.contactName}
                    <br />
                    <span className="muted">{order.contactEmail}</span>
                  </td>
                  <td>{t(`service.${order.serviceType}`)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{order.scheduledDate ? formatDate(order.scheduledDate) : t("common.none")}</td>
                  <td className="num">{formatCurrency(order.totalGross)}</td>
                  <td>
                    <span className={`status-pill status-${order.status}`}>
                      {t(`status.${order.status}`)}
                    </span>
                  </td>
                  <td>
                    {/* The reference is the way into the order; the cell holds
                        only the status moves, so they fit on one line. */}
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <OrderStatusActions
                        compact
                        order={order}
                        onChanged={() => {
                          setError(null);
                          // Reconciled from the server rather than assumed, so
                          // the row shows what the database now says.
                          void refetch();
                        }}
                        onError={setError}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pager">
            <span className="count">{t("adminOrders.page", { values: { n: page + 1 } })}</span>

            <button
              type="button"
              onClick={() => setCursors((previous) => previous.slice(0, -1))}
              disabled={page === 0}
            >
              {t("common.previous")}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = data?.nextCursor;
                if (next) setCursors((previous) => [...previous, next]);
              }}
              disabled={!data?.nextCursor}
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

/** Holds a value still until it has stopped changing for `delay`. */
function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
