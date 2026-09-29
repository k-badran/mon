"use client";

import type { OrderStatus } from "@mon/client";
import { useState } from "react";

import { ApiError, useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

/** What each status is allowed to become. Mirrors the server's state machine. */
export const NEXT_STATUSES: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  quoted: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

interface Props {
  order: { id: string; reference: string; status: OrderStatus };
  /** Called once the server has accepted the change, so the caller can refetch. */
  onChanged?: (next: OrderStatus) => void;
  /** The server's message, or a generic one, for the caller to show. */
  onError?: (message: string) => void;
  /** Table rows use the small buttons; the detail header uses full-size ones. */
  compact?: boolean;
}

/**
 * The status moves a staff member may make on one order.
 *
 * Shared by the overview board, the order list and the order detail, so the
 * three cannot disagree about who may do what.
 *
 * Two capabilities, two endpoints. Moving an order forward is `orders.write`
 * through `PATCH /status`; calling it off is `orders.cancel` through
 * `POST /cancel`. Cancelling goes through its own route rather than the status
 * one because the status route demands `orders.write` *as well*, and a role
 * that may cancel but not edit is a combination the permission table allows.
 *
 * Only transitions the state machine would accept are offered, and only to a
 * viewer holding the capability. Neither is the protection — the API checks
 * both again — but a button that answers 403 or 409 is a worse screen than no
 * button.
 */
export function OrderStatusActions({ order, onChanged, onError, compact = false }: Props) {
  const { sdk, can } = useApi();
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [reason, setReason] = useState("");

  const size = compact ? " small" : "";

  const offered = NEXT_STATUSES[order.status].filter((next) =>
    next === "cancelled" ? can("orders.cancel") : can("orders.write"),
  );

  async function run(next: OrderStatus, action: () => Promise<unknown>) {
    setBusy(true);

    try {
      await action();
      setConfirmingCancel(false);
      setReason("");
      onChanged?.(next);
    } catch (caught) {
      // The server's message names the rule it enforced ("an order that is
      // completed cannot be changed"), which is more use than a generic one.
      onError?.(caught instanceof ApiError ? caught.message : t("admin.statusChangeFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (offered.length === 0) return null;

  return (
    <>
      {offered.map((next) =>
        next === "cancelled" ? (
          <button
            key={next}
            type="button"
            className={`btn ghost${size}`}
            disabled={busy}
            onClick={() => setConfirmingCancel(true)}
          >
            {t("orders.cancelOrder")}
          </button>
        ) : (
          <button
            key={next}
            type="button"
            className={`btn primary${size}`}
            disabled={busy}
            onClick={() => void run(next, () => sdk.orders.changeStatus(order.id, next))}
          >
            {t(`adminOrders.moveTo.${next}`)}
          </button>
        ),
      )}

      {/* A real dialog rather than a one-click cancel: it mails the customer,
          may retain a fee and cannot be undone — a cancelled order is re-booked,
          never revived. */}
      {confirmingCancel && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`cancel-${order.id}`}
        >
          <div className="modal">
            <h2 id={`cancel-${order.id}`}>
              {t("orders.cancelTitle", { values: { reference: order.reference } })}
            </h2>
            <p>{t("adminOrders.cancelBody")}</p>

            <label htmlFor={`reason-${order.id}`}>{t("adminOrders.cancelReason")}</label>
            <textarea
              id={`reason-${order.id}`}
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              style={{ inlineSize: "100%" }}
            />

            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setConfirmingCancel(false)}
                disabled={busy}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() =>
                  void run("cancelled", () =>
                    sdk.orders.cancel(order.id, reason.trim() || undefined),
                  )
                }
              >
                {busy ? t("orders.cancelling") : t("orders.cancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
