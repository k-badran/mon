import { AppError } from "../../lib/errors.js";
import type { RealtimeEvent } from "../../realtime/gateway.js";

/**
 * Order lifecycle, enforced as an explicit state machine.
 *
 * The legacy app set `status` to whatever the admin panel's dropdown sent, so
 * an order could go from "completed" back to "quoted", or from "cancelled" to
 * "confirmed" — silently, with a confirmation email fired by the database
 * webhook on the way through.
 */

export type OrderStatus = "quoted" | "confirmed" | "cancelled" | "completed";

/** Which statuses each status may move to. */
const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  quoted: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  // Terminal states. A cancelled job is re-booked as a new order, never
  // resurrected, so its cancellation record stays accurate.
  cancelled: [],
  completed: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (from === to) {
    throw AppError.conflict(
      "INVALID_STATE_TRANSITION",
      `The order is already ${from}.`,
    );
  }

  if (!canTransition(from, to)) {
    const allowed = TRANSITIONS[from];

    throw AppError.conflict(
      "INVALID_STATE_TRANSITION",
      allowed.length === 0
        ? `An order that is ${from} cannot be changed.`
        : `An order that is ${from} can only become ${allowed.join(" or ")}.`,
      { from, to, allowed },
    );
  }
}

/** Which events each transition should emit, for the real-time layer. */
export function eventsFor(to: OrderStatus): readonly RealtimeEvent[] {
  switch (to) {
    case "confirmed":
      return ["order.confirmed", "order.status_changed", "availability.changed"];
    case "cancelled":
      // Cancelling frees capacity, so open calendars must re-render.
      return ["order.cancelled", "order.status_changed", "availability.changed"];
    case "completed":
      return ["order.completed", "order.status_changed"];
    default:
      return ["order.status_changed"];
  }
}
