import { parseMoney, type Cents } from "../money.js";

/**
 * The tunable pricing parameters, as stored in `price_settings`.
 *
 * Every key is listed explicitly rather than being read as a loose record, so
 * a missing or renamed row is a startup error with a clear message instead of
 * `undefined` propagating into an arithmetic expression. The legacy code did
 * `prices.grundpreisUmzug.price` with no guard, which crashed the whole page
 * whenever a row was absent.
 */
export const RATE_KEYS = [
  "base_rate_moving",
  "base_rate_disposal",
  "base_rate_cleaning",
  "per_sqm_moving",
  "per_sqm_disposal",
  "per_sqm_cleaning",
  "per_km",
  "per_km_long_distance",
  "long_distance_from_km",
  "floor_surcharge_percent",
  "packing_service",
  "parking_zone",
  "transport_insurance_percent",
  "crew_of_three_surcharge",
  "second_van_surcharge",
  "saturday_surcharge_percent",
  "business_discount_percent",
  "vat_percent",
  "minimum_order_value",
  "deposit_percent",
  "hours_per_sqm",
  "hours_base",
] as const;

export type RateKey = (typeof RATE_KEYS)[number];

/** Percentages stay plain numbers; money becomes integer cents. */
export interface RateCard {
  baseRate: Record<"moving" | "disposal" | "cleaning", Cents>;
  perSqm: Record<"moving" | "disposal" | "cleaning", Cents>;

  perKm: Cents;
  perKmLongDistance: Cents;
  longDistanceFromKm: number;

  floorSurchargePercent: number;
  packingService: Cents;
  parkingZone: Cents;
  transportInsurancePercent: number;

  crewOfThreeSurcharge: Cents;
  secondVanSurcharge: Cents;
  saturdaySurchargePercent: number;
  businessDiscountPercent: number;

  vatPercent: number;
  minimumOrderValue: Cents;
  depositPercent: number;

  hoursPerSqm: number;
  hoursBase: number;
}

export class MissingRateError extends Error {
  constructor(public readonly keys: readonly string[]) {
    super(
      `Rate card is incomplete. Missing price_settings rows: ${keys.join(", ")}. ` +
        "Run `pnpm seed` or add the rows via the admin panel.",
    );
    this.name = "MissingRateError";
  }
}

/**
 * Builds a validated rate card from raw `price_settings` rows.
 * Throws once, listing every missing key, rather than failing on the first.
 */
export function buildRateCard(rows: readonly { key: string; value: string }[]): RateCard {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const missing = RATE_KEYS.filter((key) => !byKey.has(key));

  if (missing.length > 0) {
    throw new MissingRateError(missing);
  }

  const money = (key: RateKey): Cents => parseMoney(byKey.get(key)!);
  const percent = (key: RateKey): number => Number.parseFloat(byKey.get(key)!);

  return {
    baseRate: {
      moving: money("base_rate_moving"),
      disposal: money("base_rate_disposal"),
      cleaning: money("base_rate_cleaning"),
    },
    perSqm: {
      moving: money("per_sqm_moving"),
      disposal: money("per_sqm_disposal"),
      cleaning: money("per_sqm_cleaning"),
    },
    perKm: money("per_km"),
    perKmLongDistance: money("per_km_long_distance"),
    longDistanceFromKm: percent("long_distance_from_km"),
    floorSurchargePercent: percent("floor_surcharge_percent"),
    packingService: money("packing_service"),
    parkingZone: money("parking_zone"),
    transportInsurancePercent: percent("transport_insurance_percent"),
    crewOfThreeSurcharge: money("crew_of_three_surcharge"),
    secondVanSurcharge: money("second_van_surcharge"),
    saturdaySurchargePercent: percent("saturday_surcharge_percent"),
    businessDiscountPercent: percent("business_discount_percent"),
    vatPercent: percent("vat_percent"),
    minimumOrderValue: money("minimum_order_value"),
    depositPercent: percent("deposit_percent"),
    hoursPerSqm: percent("hours_per_sqm"),
    hoursBase: percent("hours_base"),
  };
}
