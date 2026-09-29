"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";
import { useCatalog, useLiveOrder } from "@/lib/live/useLiveData";
import { DashboardShell } from "@/app/components/dashboard/DashboardShell";
import { NEXT_STATUSES, OrderStatusActions } from "@/app/components/dashboard/OrderStatusActions";

/**
 * One order, as staff see it.
 *
 * The customer's version of this screen is about what they bought; this one is
 * about what the crew has to do and who to call — contact details, the scope,
 * both addresses with their floors and lifts, and when the order moved.
 *
 * The price is rendered from the breakdown the server stored at booking time.
 * It is never recomputed here: a figure worked out again in the browser is how
 * the legacy panel showed staff a total that disagreed with the invoice.
 *
 * The page updates itself. A colleague confirming the order elsewhere moves the
 * status here too, so two people cannot both act on a stale view for long.
 */

/** Extras a customer can book, and the label each is shown under. */
const EXTRA_LABELS: Record<string, string> = {
  packingService: "calc.packing",
  parkingZone: "calc.parkingZone",
  transportInsurance: "calc.insurance",
};

export default function AdminOrderDetailPage() {
  const { can } = useApi();
  const { t, locale, formatCurrency, formatDate } = useI18n();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [error, setError] = useState<string | null>(null);

  const { data: order, isLoading, isError, refetch } = useLiveOrder(orderId);

  // Only fetched for a job priced by the piece; the ids are all the order
  // itself stores.
  const catalog = useCatalog("furniture");

  const listHref = `/${locale}/admin/auftraege`;

  if (isLoading) {
    return (
      <DashboardShell title={t("orders.detailTitle")} variant="staff">
        <div className="skeleton-list" aria-busy="true" aria-label={t("common.loading")}>
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </DashboardShell>
    );
  }

  if (isError || !order) {
    return (
      <DashboardShell title={t("orders.detailTitle")} variant="staff">
        <div className="calc-error">{t("orders.notFound")}</div>
        <Link className="btn ghost" href={listHref}>{t("admin.nav.orders")}</Link>
      </DashboardShell>
    );
  }

  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const stamp = (value: string | null) => (value ? dateTime.format(new Date(value)) : null);

  const paid = Number.parseFloat(order.paidAmount || "0");
  const total = Number.parseFloat(order.totalGross || "0");
  const remaining = Math.max(0, total - paid);

  const extras = Object.entries(order.extraServices ?? {})
    .filter(([, value]) => value === true)
    .map(([key]) => EXTRA_LABELS[key] ?? key);

  const items = Object.entries(order.selectedItems ?? {}).filter(([, count]) => count > 0);
  const itemName = (id: string) =>
    catalog.data?.items.find((item) => item.id === id)?.name ?? id;

  // The order's own record of when it moved, oldest first. Each timestamp is
  // written by the same transaction that changed the status, so this is a
  // history rather than a guess.
  const history = [
    { key: "adminOrders.event.booked", at: order.createdAt },
    { key: "status.confirmed", at: order.confirmedAt },
    { key: "status.completed", at: order.completedAt },
    { key: "status.cancelled", at: order.cancelledAt },
  ].filter((entry): entry is { key: string; at: string } => Boolean(entry.at));

  // Whether this viewer could move the order on at all, were it movable. Tells
  // a read-only role why there are no buttons, rather than leaving them to
  // wonder whether the page failed to load them.
  const mayAct = can("orders.write") || can("orders.cancel");
  const isTerminal = NEXT_STATUSES[order.status].length === 0;

  return (
    <DashboardShell title={t("orders.detailTitle")} variant="staff">
      <header className="detail-head">
        <Link className="back" href={listHref} aria-label={t("common.back")}>
          ←
        </Link>

        <div className="titles">
          <div className="title-row">
            <h2>{order.reference}</h2>
            <span className={`status-pill status-${order.status}`}>
              {t(`status.${order.status}`)}
            </span>
          </div>
          <div className="route">
            {t(`service.${order.serviceType}`)} · {order.contactName}
            {order.scheduledDate ? ` · ${formatDate(order.scheduledDate)}` : ""}
          </div>
        </div>

        <div className="actions">
          <OrderStatusActions
            order={order}
            onChanged={() => {
              setError(null);
              void refetch();
            }}
            onError={setError}
          />
          {!mayAct && !isTerminal && <span className="muted">{t("adminOrders.readOnly")}</span>}
        </div>
      </header>

      <div aria-live="polite">{error && <div className="calc-error">{error}</div>}</div>

      <div className="dash-split">
        <div style={{ display: "grid", gap: "var(--space-5)", alignContent: "start" }}>
          <section className="card">
            <div className="card-head"><h2>{t("admin.customer")}</h2></div>

            <Row label={t("common.name")}>{order.contactName}</Row>
            <Row label={t("common.email")}>
              <a dir="ltr" href={`mailto:${order.contactEmail}`}>{order.contactEmail}</a>
            </Row>
            <Row label={t("common.phone")}>
              <a dir="ltr" href={`tel:${order.contactPhone.replace(/\s+/g, "")}`}>{order.contactPhone}</a>
            </Row>
            <Row label={t("adminOrders.language")}>{order.locale.toUpperCase()}</Row>
          </section>

          <section className="card">
            <div className="card-head"><h2>{t("adminOrders.schedule")}</h2></div>

            <Row label={t("common.date")}>
              {order.scheduledDate ? formatDate(order.scheduledDate) : t("common.none")}
            </Row>
            <Row label={t("adminOrders.time")}>
              {order.scheduledTime ? order.scheduledTime.slice(0, 5) : t("common.none")}
            </Row>
            {order.scheduledSecondDate && (
              <Row label={t("adminOrders.secondDay")}>{formatDate(order.scheduledSecondDate)}</Row>
            )}
            <Row label={t("adminOrders.crew")}>
              {t("adminOrders.crewCount", { count: order.crewSize, values: { count: order.crewSize } })}
            </Row>
            {order.estimatedHours && (
              <Row label={t("adminOrders.hours")}>
                {t("adminOrders.hoursValue", { values: { hours: order.estimatedHours } })}
              </Row>
            )}
            {Number(order.distanceKm) > 0 && (
              <Row label={t("adminOrders.distance")}>
                {t("adminOrders.distanceValue", { values: { km: order.distanceKm ?? "" } })}
              </Row>
            )}
          </section>

          <section className="card">
            <div className="card-head"><h2>{t("orders.coordinates")}</h2></div>

            <div className="coords">
              <Address
                kind="origin"
                label={t("orders.origin")}
                address={order.originAddress}
                floor={order.originFloor}
                elevator={order.originHasElevator}
              />
              {order.destinationAddress && (
                <Address
                  kind="destination"
                  label={t("orders.destination")}
                  address={order.destinationAddress}
                  floor={order.destinationFloor}
                  elevator={order.destinationHasElevator}
                />
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2>{t("adminOrders.scope")}</h2></div>

            {order.areaSqm !== null && (
              <Row label={t("adminOrders.area")}>
                {t("adminOrders.areaValue", { values: { sqm: order.areaSqm } })}
              </Row>
            )}

            {items.map(([id, count]) => (
              <Row key={id} label={itemName(id)}>× {count}</Row>
            ))}

            <Row label={t("orders.includedServices")}>
              {extras.length > 0 ? extras.map((key) => t(key)).join(", ") : t("common.none")}
            </Row>

            {order.notes && (
              <>
                <h3 style={{ marginBlock: "var(--space-4) var(--space-2)" }}>
                  {t("adminOrders.notes")}
                </h3>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{order.notes}</p>
              </>
            )}
          </section>
        </div>

        <div style={{ display: "grid", gap: "var(--space-5)", alignContent: "start" }}>
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

            {order.discountCode && (
              <Row label={t("adminOrders.discountCode")}>{order.discountCode}</Row>
            )}

            <div className="breakdown-total">
              <span className="label">{t("orders.grandTotal")}</span>
              <span className="amount">{formatCurrency(order.totalGross)}</span>
            </div>

            <Row label={t("adminOrders.deposit")}>{formatCurrency(order.depositAmount)}</Row>
            <Row label={t("orders.paid")}>{formatCurrency(order.paidAmount)}</Row>
            <Row label={t("orders.remaining")}>{formatCurrency(remaining.toFixed(2))}</Row>
          </section>

          <section className="card">
            <div className="card-head"><h2>{t("adminOrders.history")}</h2></div>

            {history.map((entry) => (
              <Row key={entry.key} label={t(entry.key)}>{stamp(entry.at)}</Row>
            ))}

            {order.status === "cancelled" && (
              <>
                {order.cancellationReason && (
                  <Row label={t("adminOrders.cancelReasonShort")}>{order.cancellationReason}</Row>
                )}
                {order.cancellationFee !== null && (
                  <p className="muted" style={{ marginBlockEnd: 0 }}>
                    {t("orders.cancellationFee", {
                      values: { amount: formatCurrency(order.cancellationFee) },
                    })}
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}

/** A label and its value, on one line. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="breakdown-row">
      <span className="label">{label}</span>
      <span className="amount" style={{ whiteSpace: "normal", textAlign: "end" }}>{children}</span>
    </div>
  );
}

function Address(props: {
  kind: "origin" | "destination";
  label: string;
  address: string;
  floor: number;
  elevator: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className={`coord is-${props.kind}`}>
      <div className="kind">{props.label}</div>
      {/* The full line, not the shortened street the customer screen shows:
          this is what the crew navigates to. */}
      <div className="street">{props.address}</div>
      <div className="meta">
        {props.floor
          ? t("orders.floorN", { values: { n: props.floor } })
          : t("orders.groundFloor")}
        {" · "}
        {props.elevator ? t("adminOrders.elevator") : t("adminOrders.noElevator")}
      </div>
    </div>
  );
}
