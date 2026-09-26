import { toLocale } from "@mon/core";
import { env } from "@mon/config";
import type { OrderStage } from "@mon/mailer";

import { logger } from "../../lib/logger.js";
import { mailer } from "../../lib/mailer.js";

/**
 * The customer-facing email for each point in an order's life.
 *
 * Kept beside the orders module rather than inside `@mon/mailer`, because the
 * package's job is rendering and delivery — which stage of which domain object
 * deserves an email is a decision about this product.
 *
 * Every function here is fire-and-forget by design, and the reason is worth
 * stating: these are called *after* the database transaction has committed.
 * Sending inside the transaction would mean either holding it open across a
 * network call, or emailing a customer about an order that then rolled back —
 * and there is no way to un-send an email. So the write lands first and the mail
 * follows, which makes a failed send a logged incident rather than a lost order.
 *
 * `trySend` rather than `send` for the same reason. A confirmed booking must not
 * fail because the mail provider was briefly unreachable.
 */

/** The shape these emails need, taken from the orders row. */
export interface OrderMailSubject {
  id: string;
  reference: string;
  contactEmail: string;
  contactName: string;
  /** Plain `text` in the database, so narrowed rather than trusted. */
  locale: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  totalGross: string;
  depositAmount: string;
  paidAmount: string;
  cancellationFee: string | null;
}

/**
 * Where the customer can see the order.
 *
 * `/konto/auftraege/:id` is the customer-facing route; `/dashboard` is the staff
 * board. Getting this wrong sends a customer to a page they cannot open.
 */
function orderUrl(order: OrderMailSubject, locale: string): string {
  return `${env.WEB_ORIGIN}/${locale}/konto/auftraege/${order.id}`;
}

/**
 * Maps an order status to the stage the customer is told about.
 *
 * `quoted` returns null rather than "submitted": that email is sent once, on
 * creation. An order can only reach `quoted` by being created, so a status
 * change never needs to announce it — and returning "submitted" here would mean
 * a re-save could tell a customer their request had just arrived again.
 */
export function stageForStatus(status: string): OrderStage | null {
  switch (status) {
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

export async function sendOrderStageMail(
  order: OrderMailSubject,
  stage: OrderStage | null,
): Promise<void> {
  // Null means this status has no customer-facing email. Handled here rather
  // than at each call site, so a route cannot forget the check.
  if (stage === null) return;

  const locale = toLocale(order.locale);

  const sent = await mailer.trySend({
    template: "order-status",
    to: order.contactEmail,
    locale,
    payload: {
      stage,
      reference: order.reference,
      totalGross: order.totalGross,
      depositAmount: order.depositAmount,
      url: orderUrl(order, locale),
      ...(order.contactName ? { name: order.contactName } : {}),
      ...(order.scheduledDate ? { scheduledDate: order.scheduledDate } : {}),
      ...(order.scheduledTime ? { scheduledTime: order.scheduledTime } : {}),
      // Only on a cancellation, and only when one was charged.
      ...(stage === "cancelled" && order.cancellationFee
        ? { cancellationFee: order.cancellationFee }
        : {}),
    },
  });

  if (!sent) {
    // The order is already saved and the customer has not been told. Logged at
    // warn with the reference so it can be followed up by hand.
    logger.warn(
      { orderId: order.id, reference: order.reference, stage },
      "Order stage email was not sent",
    );
  }
}

export async function sendPaymentReceiptMail(
  order: OrderMailSubject,
  payment: { amount: string; kind: "deposit" | "balance" | "refund"; method?: string | null },
): Promise<void> {
  const locale = toLocale(order.locale);

  const sent = await mailer.trySend({
    template: "payment-receipt",
    to: order.contactEmail,
    locale,
    payload: {
      reference: order.reference,
      // The ledger stores a refund as a negative amount; the customer should
      // read the size of the refund, with the direction carried by `kind`.
      amount: payment.amount.replace(/^-/, ""),
      kind: payment.kind,
      paidAmount: order.paidAmount,
      totalGross: order.totalGross,
      url: orderUrl(order, locale),
      ...(order.contactName ? { name: order.contactName } : {}),
      ...(payment.method ? { method: payment.method } : {}),
    },
  });

  if (!sent) {
    logger.warn(
      { orderId: order.id, reference: order.reference, kind: payment.kind },
      "Payment receipt email was not sent",
    );
  }
}
