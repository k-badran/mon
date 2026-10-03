"use client";

import type { OrderStatus } from "@mon/client";
import Link from "next/link";
import { useState } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { OrderStatusActions } from "@/app/components/dashboard/OrderStatusActions";
import { useLiveOrders } from "@/lib/live/useLiveData";
import { LIVE_TRANSPORT, TRACKING_POLL_MS } from "@/lib/live/config";

/** The statuses a filter can select. */
const ORDER_STATUSES = ["quoted", "confirmed", "cancelled", "completed"] as const;

/**
 * The order board.
 *
 * Two things the previous admin panel could not do:
 *
 *  - **It loads a page at a time.** The old one issued six unbounded
 *    `select("*")` queries and filtered in the browser, so it downloaded every
 *    order, customer and review in the database on each visit.
 *
 *  - **It updates itself.** The queue refreshes on an interval, so new orders
 *    appear without a reload. Whether that is polling or a socket push is
 *    decided in lib/live/config.ts, not here.
 *
 * Access is enforced by the API, not by this component. The redirect below is
 * only so a non-admin sees something sensible — it is not the security boundary,
 * which is precisely the mistake the old client-side guard made.
 */
export default function AdminOrdersPage() {
  const { loading: authLoading } = useApi();
  const { t, locale, formatCurrency, formatDate } = useI18n();

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  /**
   * The queue, refreshed every few seconds.
   *
   * New orders appear without anyone reloading, which is the point — the
   * mechanism behind it is the transport's business, not this component's.
   */
  const { data, isLoading, isError, refetch, isFetching } = useLiveOrders({
    limit: 25,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  const orders = data?.items ?? [];

  if (authLoading || isLoading) {
    return (
      <DashboardShell title={t("admin.orders")} variant="staff">
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={t("admin.orders")} variant="staff">
      <header className="admin-head">
          {/* Says what is actually happening, so staff know how fresh this is. */}
        <span className={`connection connection-${isFetching ? "connecting" : "connected"}`}>
          {LIVE_TRANSPORT === "socket"
            ? t("admin.live")
            : t("admin.autoRefresh", { values: { seconds: TRACKING_POLL_MS / 1000 } })}
        </span>
      </header>

      <div className="admin-filters">
        <label htmlFor="search" className="sr-only">{t("common.search")}</label>
        <input
          id="search"
          type="search"
          placeholder={t("admin.searchOrders")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <label htmlFor="status" className="sr-only">{t("common.status")}</label>
        <select
          id="status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "")}
        >
          <option value="">{t("admin.allStatuses")}</option>
          {ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`status.${value}`)}
            </option>
          ))}
        </select>
      </div>

      <div aria-live="polite">{(error || isError) && <div className="calc-error">{error ?? t("admin.ordersFailed")}</div>}</div>

      {orders.length === 0 && !isError && (
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
                <th>{t("calc.total")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.action")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><Link href={`/${locale}/admin/auftraege/${order.id}`}>{order.reference}</Link></td>
                  <td>
                    {order.contactName}
                    <br />
                    <span className="muted">{order.contactEmail}</span>
                  </td>
                  <td>{t(`service.${order.serviceType}`)}</td>
                  <td>{order.scheduledDate ? formatDate(order.scheduledDate) : t("common.none")}</td>
                  <td className="num">{formatCurrency(order.totalGross)}</td>
                  <td>
                    <span className={`status-pill status-${order.status}`}>
                      {t(`status.${order.status}`)}
                    </span>
                  </td>
                  <td>
                    {/* The same control the order list and detail use, so the
                        board offers only what the viewer's role may do. */}
                    <OrderStatusActions
                      compact
                      order={order}
                      onChanged={() => {
                        setError(null);
                        // Reconciled from the server rather than assumed. The
                        // legacy panel set React state first and never checked
                        // the write, so the board could show "confirmed" while
                        // the database — and the customer's email — said otherwise.
                        void refetch();
                      }}
                      onError={setError}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The overview is the latest page only. The rest of the queue, with
          paging and sorting, is on the orders screen. */}
      {data?.nextCursor && (
        <Link className="btn ghost" href={`/${locale}/admin/auftraege`}>
          {t("adminOrders.viewAll")}
        </Link>
      )}
    </DashboardShell>
  );
}

