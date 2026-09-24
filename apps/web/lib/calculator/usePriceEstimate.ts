"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { ApiError, useApi } from "@/lib/api";
import { isPriceable, toQuoteInput, type CalculatorState } from "./machine";

/**
 * The price the panel shows, kept current as answers change.
 *
 * The one rule this hook exists to protect: the number on screen is the number
 * the server stated. Nothing here adds, multiplies or estimates — it asks
 * `POST /api/quotes` again whenever the answers change and renders whatever
 * comes back. The app this replaces kept its own copy of the rate card in the
 * browser, which drifted from the invoice.
 *
 * Three consequences of that rule, all deliberate:
 *
 *   1. Every distinct set of answers costs one request, and the endpoint
 *      persists a quote row per request. The answers are the cache key, so
 *      re-reading a step or stepping back costs nothing, and `pruneExpiredQuotes`
 *      already clears the rows a visitor abandons. A non-persisting
 *      `POST /api/quotes/preview` would remove the cost entirely; until that
 *      exists this is the honest price of a live panel.
 *   2. The request is debounced, so typing an address is one request rather
 *      than one per keystroke — which also keeps a long session clear of the
 *      endpoint's 30-per-minute limit.
 *   3. A superseded request is aborted and its answer discarded: it was priced
 *      from answers the customer has already changed.
 */

/** The shape of `POST /api/quotes`, as the service returns it. */
export interface QuoteResult {
  id: string;
  expiresAt: string;
  /** Set by the server when a human has to confirm the estimate. */
  requiresReview: boolean;
  reviewReasons: string[];
  breakdown: {
    lines: Array<{ key: string; amount: string; params?: Record<string, unknown> }>;
    netAmount: string;
    vatRate: string;
    vatAmount: string;
    totalGross: string;
    depositAmount: string;
    estimatedHours?: string;
    distanceKm?: string;
  };
}

export interface PriceEstimate {
  /**
   * The last price the server stated for answers that are still current, or
   * null when there is none. Null while the answers cannot be priced yet, so
   * the panel says so rather than showing a number from earlier answers.
   */
  quote: QuoteResult | null;
  /** True while a newer price is on its way; the old one stays readable. */
  refreshing: boolean;
  /** True when too few answers have been given to ask for a price at all. */
  awaitingAnswers: boolean;
  /** Set when the last attempt failed. The wizard carries on regardless. */
  error: string | null;
  /**
   * True when `quote` was priced from exactly the answers now held. The final
   * step reuses that quote instead of asking the server to price the same job
   * a second time and store a second row for it.
   */
  isCurrent: boolean;
}

const DEBOUNCE_MS = 600;

export function usePriceEstimate(state: CalculatorState): PriceEstimate {
  const { sdk } = useApi();

  const priceable = isPriceable(state);

  // The serialized request doubles as the cache key: two runs of answers that
  // describe the same job are the same quote, so they cost one request.
  const payload = useMemo(
    () => (priceable ? JSON.stringify(toQuoteInput(state)) : null),
    [priceable, state],
  );

  const settled = useDebounced(payload, DEBOUNCE_MS);

  const query = useQuery({
    queryKey: ["calculator-estimate", settled],
    queryFn: ({ signal }) =>
      sdk.http.post<QuoteResult>(
        "/api/quotes",
        { input: JSON.parse(settled!) as unknown },
        { signal },
      ),
    enabled: settled !== null,
    // Answers do not change on their own: the key changes when they do, and
    // nothing else can make this price stale within a session.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // A rejected job is rejected for a reason the customer has to fix; retrying
    // spends quota to be told the same thing.
    retry: false,
    // Keeps the last stated price on screen while the next one is in flight,
    // so the panel never flickers to zero between two real numbers.
    placeholderData: keepPreviousData,
  });

  const current = settled !== null && settled === payload;

  return {
    // An answer that can no longer be priced drops the price rather than
    // leaving the last one on screen attached to a job nobody described.
    quote: priceable ? (query.data ?? null) : null,
    // Waiting out the debounce is part of the refresh as far as the customer
    // is concerned: the answers on screen are newer than the price.
    refreshing: priceable && (query.isFetching || !current),
    awaitingAnswers: !priceable,
    error: query.isError ? messageFor(query.error) : null,
    isCurrent: current && query.isSuccess && !query.isFetching,
  };
}

function messageFor(error: unknown): string | null {
  return error instanceof ApiError && error.message ? error.message : null;
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
