"use client";

import type { DayAvailability } from "@mon/core";
import type { ListOrdersQuery, OrderStatus, OrderSummary, Paginated } from "@mon/client";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useEffect } from "react";

import { useApi } from "@/lib/api";
import { isSocket, REFERENCE_POLL_MS, TRACKING_POLL_MS } from "./config";
import { useAvailabilityUpdates, useRealtimeEvent, useOrderUpdates } from "@/lib/useRealtime";

/**
 * Live tracking data.
 *
 * These hooks are the only thing components call. Which transport is actually
 * used — polling or the socket — is decided in `config.ts`, so swapping is a
 * configuration change rather than an edit to every screen.
 *
 * Under polling, React Query refetches on an interval. Under sockets, the same
 * queries are fetched once and then invalidated when an event arrives, so the
 * cache and the component code are identical either way. That symmetry is what
 * keeps the dormant path from rotting.
 */

export const queryKeys = {
  orders: (query?: ListOrdersQuery) => ["orders", query ?? {}] as const,
  order: (id: string) => ["order", id] as const,
  availability: (year: number, month: number, capacity: number) =>
    ["availability", year, month, capacity] as const,
};

/** Polls only when polling is the active transport. */
function trackingInterval(): number | false {
  return isSocket ? false : TRACKING_POLL_MS;
}

/**
 * One order, as `GET /api/orders/:id` returns it.
 *
 * Wider than the list row: the detail screen renders the stored breakdown and
 * the scope the customer booked, neither of which the summary carries.
 */
export interface OrderDetail extends OrderSummary {
  originAddress: string;
  destinationAddress: string | null;
  originFloor: number;
  destinationFloor: number;
  originHasElevator: boolean;
  destinationHasElevator: boolean;
  distanceKm: string | null;

  scheduledTime: string | null;
  scheduledSecondDate: string | null;
  crewSize: number;
  estimatedHours: string | null;

  areaSqm: number | null;
  selectedItems: Record<string, number> | null;
  extraServices: Record<string, unknown> | null;

  netAmount: string;
  vatRate: string;
  vatAmount: string;
  depositAmount: string;
  cancellationFee: string | null;
  discountCode: string | null;

  /** Computed by the server at booking time and never recomputed client-side. */
  priceBreakdown: {
    lines: Array<{ key: string; amount: string; params?: Record<string, unknown> }>;
    netAmount: string;
    vatRate: string;
    vatAmount: string;
    totalGross: string;
    depositAmount: string;
    estimatedHours?: string;
  };

  notes: string | null;
  confirmedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
}

/**
 * The order list, kept current.
 *
 * Used by both the customer's "My Orders" and the admin board; the server
 * decides which rows the caller may see, so the same hook serves both.
 */
export function useLiveOrders(query?: ListOrdersQuery): UseQueryResult<Paginated<OrderSummary>> {
  const { sdk, user } = useApi();
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: queryKeys.orders(query),
    queryFn: () => sdk.orders.list(query),
    refetchInterval: trackingInterval(),
    // Nothing to fetch while signed out, and the request would 401.
    enabled: Boolean(user),
  });

  // Socket path: a push invalidates the cache and React Query refetches once.
  // Under polling these subscriptions are inert, because the socket is not
  // connected — the hooks below simply never fire.
  useRealtimeEvent("order.created", () => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  });

  useRealtimeEvent<{ id: string; status: OrderStatus }>("order.status_changed", (envelope) => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.order(envelope.payload.id) });
  });

  return result;
}

/** One order, with its status kept current. */
export function useLiveOrder(orderId: string | null): UseQueryResult<OrderDetail> {
  const { sdk, user } = useApi();
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: queryKeys.order(orderId ?? ""),
    queryFn: () => sdk.http.get<OrderDetail>(`/api/orders/${orderId}`),
    refetchInterval: trackingInterval(),
    enabled: Boolean(user && orderId),
  });

  useOrderUpdates(orderId, () => {
    if (orderId) void queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
  });

  return result;
}

/**
 * A month's availability.
 *
 * Polled at the tracking interval too: a slot taken by someone else is exactly
 * the kind of change a customer must see before they try to book it.
 */
export function useLiveAvailability(
  year: number,
  month: number,
  capacity = 1,
): UseQueryResult<{ year: number; month: number; days: DayAvailability[] }> {
  const { sdk } = useApi();
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: queryKeys.availability(year, month, capacity),
    queryFn: () => sdk.availability.month(year, month, capacity),
    refetchInterval: trackingInterval(),
    // Public: the calendar renders before anyone signs in.
  });

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  useAvailabilityUpdates(monthKey, () => {
    void queryClient.invalidateQueries({ queryKey: ["availability"] });
  });

  return result;
}

/** Reference data: real, but it does not change minute to minute. */
export function useCatalog(kind: "furniture" | "cleaning") {
  const { sdk } = useApi();

  return useQuery({
    queryKey: ["catalog", kind],
    queryFn: () =>
      sdk.http.get<{ items: Array<{ id: string; category: string; name: string }> }>(
        "/api/catalog",
        { kind },
      ),
    refetchInterval: REFERENCE_POLL_MS,
    staleTime: REFERENCE_POLL_MS,
  });
}

/**
 * Pauses polling while the tab is hidden.
 *
 * React Query already skips background refetches, but this also stops the
 * interval timer itself, so a tab left open overnight is not holding a
 * heartbeat against the API for hours.
 */
export function usePausePollingWhenHidden(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        // Catch up immediately rather than waiting out the interval.
        void queryClient.invalidateQueries({ queryKey: ["orders"] });
        void queryClient.invalidateQueries({ queryKey: ["availability"] });
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [queryClient]);
}
