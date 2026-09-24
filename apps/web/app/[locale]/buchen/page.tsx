"use client";

import { Suspense } from "react";

import { BookingConfirmation } from "@/app/components/calculator/BookingConfirmation";

/**
 * The booking confirmation.
 *
 * The destination of "Book this now" on the quote screen, which linked here
 * before the route existed. The quote id travels in the URL, so the page can be
 * reopened, shared with a partner or reached after a login round-trip.
 */
export default function BookingPage() {
  return (
    // useSearchParams needs a boundary, and the quote id is the whole input.
    <Suspense fallback={<div className="min-h-screen bg-surface-page" aria-busy="true" />}>
      <BookingConfirmation />
    </Suspense>
  );
}
