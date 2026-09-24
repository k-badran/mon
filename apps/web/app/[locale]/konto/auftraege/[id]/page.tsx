"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { useLiveOrder } from "@/lib/live/useLiveData";

const STEPS = ["quoted", "confirmed", "completed"] as const;

/**
 * One order.
 *
 * The status stepper updates live: when the office confirms the booking, this
 * page moves without the customer refreshing. Previously the only way to learn
 * of a change was to reload and hope.
 */
export default function OrderDetailPage() {
  const { sdk, user, loading: authLoading } = useApi();
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  // Status updates arrive on the same interval as everywhere else.
  const { data: order, isLoading, isError, refetch } = useLiveOrder(orderId);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace(`/${locale}/login?next=/${locale}/konto/auftraege/${orderId}`);
  }, [authLoading, user, router, orderId, locale]);

  async function handleCancel() {
    setCancelling(true);

    try {
      await sdk.orders.cancel(orderId);
      setConfirmOpen(false);
      await refetch();
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "INVALID_STATE_TRANSITION"
          ? caught.message
          : t("error.generic"),
      );
    } finally {
      setCancelling(false);
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="page-wrap">
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </div>
    );
  }

  if ((isError || error) && !order) {
    return (
      <div className="page-wrap">
        <div className="calc-error">{error}</div>
        <Link className="btn ghost" href={`/${locale}/konto/auftraege`}>
          {t("orders.title")}
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const canCancel = order.status === "quoted" || order.status === "confirmed";
  const currentStep = STEPS.indexOf(order.status as (typeof STEPS)[number]);

  return (
    <div className="page-wrap">
      <Link href={`/${locale}/konto/auftraege`} className="back-link">
        â† Meine Aufträge
      </Link>

      <h1>{order.reference}</h1>

      <span className={`status-pill status-${order.status}`}>
        {t(`status.${order.status}`)}
      </span>

      {/* aria-live so the live status change is announced, not just repainted. */}
      {order.status !== "cancelled" && (
        <ol
          className="mt-4 grid grid-flow-col auto-cols-fr gap-2"
          aria-live="polite"
        >
          {STEPS.map((step, index) => {
            const reached = index <= currentStep;

            return (
              <li
                key={step}
                className="grid gap-2"
                aria-current={index === currentStep ? "step" : undefined}
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full transition-colors ${
                    index === currentStep
                      ? "bg-brand-red"
                      : reached
                        ? "bg-text-strong"
                        : "bg-surface-sunken"
                  }`}
                />

                <span
                  className={`truncate text-caption ${
                    index === currentStep
                      ? "font-bold text-brand-red"
                      : reached
                        ? "font-medium text-text-strong"
                        : "font-medium text-text-faint"
                  }`}
                >
                  {t(`status.${step}`)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <section className="detail-grid">
        <div>
          <h2>{t("common.date")}</h2>
          <p>
            {order.scheduledDate ? formatDate(order.scheduledDate) : t("common.none")}
            {order.scheduledTime ? `, ${order.scheduledTime.slice(0, 5)} Uhr` : ""}
          </p>
        </div>

        <div>
          <h2>{t("common.address")}</h2>
          <p>{order.originAddress}</p>
          {order.destinationAddress && <p>â†’ {order.destinationAddress}</p>}
        </div>
      </section>

      <section>
        <h2>{t("orders.breakdown")}</h2>

        <div className="table-wrap">
          <table>
            <tbody>
              {order.priceBreakdown.lines.map((line, index) => (
                <tr key={`${line.key}-${index}`}>
                  <td>{line.key.replace("line.", "").replace(/_/g, " ")}</td>
                  <td className="num">{line.amount} â‚¬</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>{t("calc.net")}</td>
                <td className="num">{formatCurrency(order.priceBreakdown.netAmount)}</td>
              </tr>
              <tr>
                <td>{t("calc.vat", { values: { rate: order.priceBreakdown.vatRate } })}</td>
                <td className="num">{formatCurrency(order.priceBreakdown.vatAmount)}</td>
              </tr>
              <tr className="total-row">
                <td>
                  <strong>{t("calc.total")}</strong>
                </td>
                <td className="num">
                  <strong>{formatCurrency(order.totalGross)}</strong>
                </td>
              </tr>
              <tr>
                <td>{t("orders.paid")}</td>
                <td className="num">{formatCurrency(order.paidAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {order.status === "cancelled" && order.cancellationFee && (
        <p className="calc-error">{t("orders.cancellationFee", { values: { amount: formatCurrency(order.cancellationFee) } })}</p>
      )}

      <div aria-live="polite">{error && <div className="calc-error">{error}</div>}</div>

      {canCancel && (
        <button type="button" className="btn danger" onClick={() => setConfirmOpen(true)}>
          {t("orders.cancelOrder")}
        </button>
      )}

      {/* A real dialog rather than window.confirm: styled, translatable, shows
          what is being cancelled, and cannot be suppressed by the browser. */}
      {confirmOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="modal">
            <h2 id="cancel-title">{t("orders.cancelTitle", { values: { reference: order.reference } })}</h2>
            <p>
              {t("orders.cancelBody")}
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={cancelling}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={() => void handleCancel()}
                disabled={cancelling}
              >
                {cancelling ? t("orders.cancelling") : t("orders.cancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

