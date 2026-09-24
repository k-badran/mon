"use client";

import type { PriceBreakdown, QuoteInput } from "@umzugplus/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, useApi } from "@/lib/api";

/**
 * Live price estimate.
 *
 * The browser no longer calculates anything. It describes the job; the server
 * prices it and returns a breakdown plus a `quoteId`. Booking later references
 * that id, so the total cannot be altered on the way through — which is what
 * made the old design unsound, since the insert stored whatever price the page
 * had computed.
 *
 * Requests are debounced and superseded: while someone is still adjusting the
 * square metres, only the last value is priced.
 */

const DEBOUNCE_MS = 450;

export interface QuoteState {
  quoteId: string | null;
  breakdown: PriceBreakdown | null;
  loading: boolean;
  /** Human-readable, already mapped from the API's error code. */
  error: string | null;
  /** True while the shown price belongs to an older input. */
  stale: boolean;
}

export function useQuote(input: QuoteInput | null): QuoteState & { retry: () => void } {
  const { sdk } = useApi();

  const [state, setState] = useState<QuoteState>({
    quoteId: null,
    breakdown: null,
    loading: false,
    error: null,
    stale: false,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Guards against an older response overwriting a newer one.
  const requestIdRef = useRef(0);

  const price = useCallback(
    async (payload: QuoteInput) => {
      const requestId = ++requestIdRef.current;

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState((previous) => ({ ...previous, loading: true, error: null, stale: true }));

      try {
        const result = await sdk.quotes.create(payload);

        // A response that has been superseded is discarded rather than shown.
        if (requestId !== requestIdRef.current) return;

        setState({
          quoteId: result.id,
          breakdown: result.breakdown,
          loading: false,
          error: null,
          stale: false,
        });
      } catch (caught) {
        if (requestId !== requestIdRef.current) return;

        setState((previous) => ({
          ...previous,
          loading: false,
          error: describeError(caught),
        }));
      }
    },
    [sdk],
  );

  useEffect(() => {
    if (!input) {
      setState({ quoteId: null, breakdown: null, loading: false, error: null, stale: false });
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => void price(input), DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [input, price]);

  return {
    ...state,
    retry: () => {
      if (input) void price(input);
    },
  };
}

function describeError(caught: unknown): string {
  if (!(caught instanceof ApiError)) {
    return "Der Preis konnte nicht berechnet werden.";
  }

  switch (caught.code) {
    case "PRICING_FAILED": {
      const reason = (caught.details as { reason?: string } | undefined)?.reason;

      if (reason === "MISSING_AREA") return "Bitte gib die Fläche an.";
      if (reason === "MISSING_ITEMS") return "Bitte wähle mindestens eine Position.";
      if (reason === "UNKNOWN_CATALOG_ITEM") return "Eine gewählte Position ist nicht mehr verfügbar.";

      return "Die Angaben reichen für eine Berechnung nicht aus.";
    }

    case "UNPROCESSABLE":
      // Covers an invalid discount code and an address outside the service area.
      return caught.message;

    case "VALIDATION_FAILED":
      return caught.fieldIssues[0]?.message ?? "Bitte prüfe deine Eingaben.";

    case "RATE_LIMITED":
      return "Zu viele Berechnungen. Bitte warte einen Moment.";

    case "NETWORK_ERROR":
      return "Keine Verbindung zum Server.";

    default:
      return "Der Preis konnte nicht berechnet werden.";
  }
}

