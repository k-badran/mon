"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useApi } from "@/lib/api";
import { useLiveOrders } from "@/lib/live/useLiveData";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The customer's orders.
 *
 * The server restricts the result to this customer — the request carries no
 * user id to be tampered with. Status changes arrive over the socket, so a
 * confirmation from the office appears here without a reload.
 */
export default function MyOrdersPage() {
  const { user, loading: authLoading } = useApi();
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const router = useRouter();

  /**
   * Tracking data, refreshed on an interval.
   *
   * The page does not know whether that comes from polling or a socket push —
   * useLiveOrders decides, so the transport can change without touching this.
   */
  const { data, isLoading, isError, refetch } = useLiveOrders({ limit: 50 });
  const orders = data?.items ?? [];

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace(`/${locale}/login?next=/${locale}/konto/auftraege`);
  }, [authLoading, user, router, locale]);

  if (authLoading || isLoading) {
    return (
      <div className="page-wrap">
        {/* A skeleton, not bare "Lade…" text — the layout does not jump. */}
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton-row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <h1>{t("orders.title")}</h1>

      <div aria-live="polite">
        {isError && (
          <div className="calc-error">
            {t("orders.loadFailed")}{" "}
            <button type="button" className="btn ghost" onClick={() => void refetch()}>
              {t("common.retry")}
            </button>
          </div>
        )}
      </div>

      {!isError && orders.length === 0 && (
        <div className="empty-state">
          <p>{t("orders.empty")}</p>
          <Link className="btn primary" href={`/${locale}`}>
            {t("orders.calculateNow")}
          </Link>
        </div>
      )}

      {orders.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("orders.reference")}</th>
                <th>{t("orders.service")}</th>
                <th>{t("common.date")}</th>
                <th>{t("common.status")}</th>
                <th>{t("calc.total")}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/${locale}/konto/auftraege/${order.id}`}>{order.reference}</Link>
                  </td>
                  <td>{t(`service.${order.serviceType}`)}</td>
                  <td>{order.scheduledDate ? formatDate(order.scheduledDate) : t("common.none")}</td>
                  <td>
                    <span className={`status-pill status-${order.status}`}>
                      {t(`status.${order.status}`)}
                    </span>
                  </td>
                  <td className="num">{formatCurrency(order.totalGross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

