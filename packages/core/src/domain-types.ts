/**
 * Types for the `jsonb` columns.
 *
 * Drizzle's `.$type<T>()` only asserts a shape at compile time, so these are
 * mirrored by Zod schemas in `@mon/core` and validated at every
 * boundary where the data enters the system.
 */

export interface QuoteInput {
  serviceType: "moving" | "disposal" | "cleaning";
  customerType: "private" | "business";

  originAddress: string;
  destinationAddress?: string;
  originFloor: number;
  destinationFloor: number;
  originHasElevator: boolean;
  destinationHasElevator: boolean;

  calculationMethod: "area" | "items";
  areaSqm?: number;
  /** Catalog item id → quantity. */
  selectedItems?: Record<string, number>;

  extras: {
    packingService: boolean;
    parkingZone: boolean;
    transportInsurance: boolean;
    /** Catalog item id → quantity, for assembly/disassembly. */
    assemblyItems?: Record<string, number>;
    disassemblyItems?: Record<string, number>;
  };

  crewSize: 2 | 3;
  secondVan: boolean;

  /** ISO calendar day, e.g. "2026-07-15". Never a timestamp. */
  scheduledDate?: string;
  discountCode?: string;
}

/** A single priced line in the breakdown. */
export interface PriceLine {
  /** Stable key for translation, e.g. "line.base_rate". */
  key: string;
  /** Amount in EUR, exact to the cent, as a decimal string. */
  amount: string;
  /** Structured values the frontend interpolates into the translated label. */
  params?: Record<string, string | number>;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  netAmount: string;
  vatRate: string;
  vatAmount: string;
  totalGross: string;
  depositAmount: string;
  /** Set when the minimum order value raised the total. */
  minimumApplied?: boolean;
  estimatedHours?: string;
  distanceKm?: string;
  pricingVersion: number;
  /** When the server produced this, for audit and dispute handling. */
  computedAt: string;
}
