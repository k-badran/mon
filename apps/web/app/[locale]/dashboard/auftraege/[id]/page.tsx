"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { useLiveOrder } from "@/lib/live/useLiveData";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { IconCheck } from "@/app/components/dashboard/Icons";

/**
 * One order.
 *
 * The price breakdown is rendered from `priceBreakdown`, which the server
 * computed and stored when the quote was booked — it is not recomputed here.
 * Recomputing in the browser is how the legacy app ended up with an invoice
 * that disagreed with what was charged.
 */

type Tab = "overview" | "documents" | "messages";

/** Extras a customer selected, rendered as the included-services list. */
const EXTRA_LABELS: Record<string, string> = {
  packingService: "calc.packing",
  parkingZone: "calc.parkingZone",
  transportInsurance: "calc.insurance",
};

export default function OrderDetailPage() {
  const { sdk } = useApi();
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [tab, setTab] = useState<Tab>("overview");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: order, isLoading, isError, refetch } = useLiveOrder(orderId);

  async function cancel() {
    setCancelling(true);
    setError(null);

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

  if (isLoading) {
    return (
      <DashboardShell title={t("orders.detailTitle")}>
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </DashboardShell>
    );
  }

  if (isError || !order) {
    return (
      <DashboardShell title={t("orders.detailTitle")}>
        <div className="calc-error">{t("orders.notFound")}</div>
        <Link className="btn ghost" href={`/${locale}/dashboard/auftraege`}>
          {t("orders.title")}
        </Link>
      </DashboardShell>
    );
  }

  const canCancel = order.status === "quoted" || order.status === "confirmed";

  const paid = Number.parseFloat(order.paidAmount || "0");
  const total = Number.parseFloat(order.totalGross || "0");
  const remaining = Math.max(0, total - paid);

  const extras = Object.entries(order.extraServices ?? {})
    .filter(([key, value]) => value === true && key in EXTRA_LABELS)
    .map(([key]) => EXTRA_LABELS[key]!);

  return (
    <DashboardShell title={t("orders.detailTitle")}>
      <header className="detail-head">
        <Link
          className="back"
          href={`/${locale}/dashboard/auftraege`}
          aria-label={t("common.back")}
        >
          ←
        </Link>

        <div className="titles">
          <div className="title-row">
            <h2>{order.reference}</h2>
            <span className={`pill is-${order.status}`}>{t(`status.${order.status}`)}</span>
          </div>
          <div className="route">
            {t(`service.${order.serviceType}`)}
            {order.destinationAddress
              ? ` · ${shortenAddress(order.originAddress)} → ${shortenAddress(order.destinationAddress)}`
              : ` · ${shortenAddress(order.originAddress)}`}
            {order.scheduledDate ? ` · ${formatDate(order.scheduledDate)}` : ""}
          </div>
        </div>

        <div className="actions">
          {/* Invoices are generated server-side and that endpoint does not
              exist yet, so the control says so rather than failing on click. */}
          <button type="button" className="btn ghost" disabled title={t("dash.comingSoon")}>
            {t("orders.downloadInvoice")}
          </button>
          <button type="button" className="btn ghost" disabled title={t("dash.comingSoon")}>
            {t("orders.reschedule")}
          </button>
          {canCancel && (
            <button type="button" className="btn primary" onClick={() => setConfirmOpen(true)}>
              {t("orders.cancelOrder")}
            </button>
          )}
        </div>
      </header>

      <div className="tabs" role="tablist">
        {(["overview", "documents", "messages"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {t(`orders.tab.${id}`)}
          </button>
        ))}
      </div>

      <div aria-live="polite">{error && <div className="calc-error">{error}</div>}</div>

      {tab === "overview" && (
        <div className="dash-split">
          <div style={{ display: "grid", gap: "var(--space-5)" }}>
            <section className="card">
              <div className="card-head"><h2>{t("orders.includedServices")}</h2></div>

              <ul className="checklist" style={{ padding: 0, margin: 0 }}>
                {/* Always true of every booking, so they are stated rather
                    than inferred from an empty extras object. */}
                <li>
                  <span className="tick" aria-hidden="true"><IconCheck /></span>
                  <span>{t("orders.included.transport")}</span>
                </li>
                <li>
                  <span className="tick" aria-hidden="true"><IconCheck /></span>
                  <span>
                    {t("orders.included.crew", { values: { count: order.crewSize ?? 2 } })}
                  </span>
                </li>
                {extras.map((key) => (
                  <li key={key}>
                    <span className="tick" aria-hidden="true"><IconCheck /></span>
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card">
              <div className="card-head"><h2>{t("orders.coordinates")}</h2></div>

              <div className="coords">
                <div className="coord is-origin">
                  <div className="kind">{t("orders.origin")}</div>
                  <div className="street">{shortenAddress(order.originAddress)}</div>
                  <div className="meta">
                    {cityOf(order.originAddress)}
                    {order.originFloor ? ` · ${t("orders.floorN", { values: { n: order.originFloor } })}` : ` · ${t("orders.groundFloor")}`}
                  </div>
                </div>

                {order.destinationAddress && (
                  <div className="coord is-destination">
                    <div className="kind">{t("orders.destination")}</div>
                    <div className="street">{shortenAddress(order.destinationAddress)}</div>
                    <div className="meta">
                      {cityOf(order.destinationAddress)}
                      {order.destinationFloor ? ` · ${t("orders.floorN", { values: { n: order.destinationFloor } })}` : ` · ${t("orders.groundFloor")}`}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="card">
            <div className="card-head"><h2>{t("orders.breakdown")}</h2></div>

            {order.priceBreakdown.lines.map((line, index) => (
              <div className="breakdown-row" key={`${line.key}-${index}`}>
                <span className="label">{t(`line.${line.key.replace("line.", "")}`)}</span>
                <span className="amount">{formatCurrency(line.amount)}</span>
              </div>
            ))}

            <div className="breakdown-row">
              <span className="label">
                {t("calc.vat", { values: { rate: order.priceBreakdown.vatRate } })}
              </span>
              <span className="amount">{formatCurrency(order.priceBreakdown.vatAmount)}</span>
            </div>

            <div className="breakdown-total">
              <span className="label">{t("orders.grandTotal")}</span>
              <span className="amount">{formatCurrency(order.totalGross)}</span>
            </div>

            {paid > 0 && (
              <div className="breakdown-row is-credit">
                <span className="label">{t("orders.depositPaid")}</span>
                <span className="amount">− {formatCurrency(order.paidAmount)}</span>
              </div>
            )}

            <div className="breakdown-total">
              <span className="label">{t("orders.remaining")}</span>
              <span className="amount" style={{ color: "var(--text-strong)" }}>
                {formatCurrency(remaining.toFixed(2))}
              </span>
            </div>

            {remaining > 0 && order.status !== "cancelled" && (
              <button type="button" className="btn pay" disabled title={t("dash.comingSoon")}>
                {t("orders.settleBalance")}
              </button>
            )}
          </section>
        </div>
      )}

      {tab !== "overview" && (
        <section className="card empty-state">
          <p style={{ color: "var(--text-muted)", margin: 0 }}>{t("dash.comingSoon")}</p>
        </section>
      )}

      {confirmOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="modal">
            <h2 id="cancel-title">
              {t("orders.cancelTitle", { values: { reference: order.reference } })}
            </h2>
            <p>{t("orders.cancelBody")}</p>

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
                onClick={() => void cancel()}
                disabled={cancelling}
              >
                {cancelling ? t("orders.cancelling") : t("orders.cancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

/** "Königsallee 1, 40212 Düsseldorf" → "Königsallee 1" */
function shortenAddress(address: string): string {
  return address.split(",")[0]?.trim() ?? address;
}

/** The part after the first comma, which is where the city sits. */
function cityOf(address: string): string {
  const parts = address.split(",");
  return parts.length > 1 ? parts.slice(1).join(",").trim() : "";
}
