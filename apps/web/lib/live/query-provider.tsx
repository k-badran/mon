"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api";

/**
 * React Query setup.
 *
 * The client is created inside state rather than at module scope: a module-level
 * client is shared across every request on the server, which would leak one
 * user's cached orders into another user's render.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            /**
             * Polling is the live mechanism, so data is stale almost
             * immediately by design. A short staleTime still prevents a burst
             * of duplicate fetches when several components mount at once.
             */
            staleTime: 2_000,

            // A hidden tab has nobody watching it; polling it burns the
            // server for nothing. It refetches on focus instead.
            refetchIntervalInBackground: false,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,

            retry: (failureCount, error) => {
              // Retrying an authorisation or validation failure cannot help —
              // the answer will be the same. Only transient faults are worth
              // a second attempt.
              if (error instanceof ApiError && !error.isRetryable) return false;

              return failureCount < 2;
            },

            retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
          },

          mutations: {
            // A failed write must surface, not silently retry and possibly
            // double-apply.
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
