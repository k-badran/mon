"use client";

import type { DayAvailability } from "@umzugplus/core";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useApi } from "@/lib/api";
import { useAvailabilityUpdates } from "@/lib/useRealtime";

/**
 * Booking calendar data.
 *
 * Two changes from the version this replaces:
 *
 *  1. **The classification happens on the server.** The old hook fetched every
 *     order for the month into the browser and counted capacity there — and
 *     derived each day with `toISOString().slice(0, 10)`, which in Germany
 *     shifted every date back by one.
 *
 *  2. **It updates live.** When another customer takes the last slot, this
 *     calendar re-fetches, instead of offering a day that is already full and
 *     failing at submit.
 */

export const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

export const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
] as const;

export interface UseAvailabilityResult {
  loading: boolean;
  error: string | null;
  days: DayAvailability[];
  /** Look up one day without scanning the array. */
  statusFor: (date: string) => DayAvailability | undefined;
  isBookable: (date: string) => boolean;
  reload: () => void;
}

export function useAvailability(month: Date, requiredCapacity = 1): UseAvailabilityResult {
  const { sdk } = useApi();
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await sdk.availability.month(year, monthNumber, requiredCapacity);
      setDays(result.days);
    } catch {
      // An empty calendar with an error beats one that silently shows every
      // day as bookable.
      setError("Die Verfügbarkeit konnte nicht geladen werden.");
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [sdk, year, monthNumber, requiredCapacity]);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-fetch when capacity changes anywhere for this month.
  const monthKey = `${year}-${String(monthNumber).padStart(2, "0")}`;
  useAvailabilityUpdates(monthKey, () => void load());

  // Keyed by plain string: callers look up with an ISO day from the UI, not a
  // branded CalendarDate, and widening here keeps the brand where it matters —
  // in the domain logic that must never receive an unvalidated date.
  const byDate = useMemo(
    () => new Map<string, DayAvailability>(days.map((day) => [day.date as string, day])),
    [days],
  );

  return {
    loading,
    error,
    days,
    statusFor: useCallback((date: string) => byDate.get(date), [byDate]),
    isBookable: useCallback((date: string) => byDate.get(date)?.status === "free", [byDate]),
    reload: () => void load(),
  };
}

/**
 * Formats a Date as a calendar day in local terms.
 *
 * Deliberately not `toISOString()`: that converts to UTC, and a Date built at
 * local midnight in Germany rolls back to the previous day. This is the bug
 * that made customers book the day before the one they clicked.
 */
export function toCalendarDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

