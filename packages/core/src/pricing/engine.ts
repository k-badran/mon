import type { PriceBreakdown, PriceLine, QuoteInput } from "../domain-types.js";

import { isSaturday, toCalendarDate } from "../calendar-date.js";
import {
  atLeast,
  atLeastZero,
  formatMoney,
  multiply,
  parseMoney,
  percentOf,
  sum,
  type Cents,
} from "../money.js";
import type { RateCard } from "./rate-card.js";

/**
 * The pricing engine — the single place a price is ever calculated.
 *
 * Two things about the legacy implementation this replaces:
 *
 *   1. It ran in the browser. The total was computed client-side and the
 *      insert stored whatever the browser sent, so anyone could set their own
 *      price from the console. This function runs only on the server.
 *
 *   2. It existed twice. `computeBreakdown()` and `computeExtraBreakdown()`
 *      each re-implemented base rate, area, business discount, VAT and the
 *      minimum order value, and they had already drifted — the add-on path
 *      silently omitted the floor and Saturday surcharges. There is now one
 *      implementation, used by both the primary service and its add-ons.
 *
 * The function is pure: same inputs, same output, no I/O. That is what makes
 * it unit-testable and what lets a disputed invoice be reproduced exactly.
 */

export const PRICING_VERSION = 1;

export interface CatalogItemRate {
  id: string;
  price: Cents;
  disposalPrice: Cents;
  assemblyPrice: Cents;
  disassemblyPrice: Cents;
  volumeM3: number | null;
}

export interface DiscountRate {
  code: string;
  kind: "percentage" | "fixed";
  value: Cents | number;
}

export interface PricingContext {
  rates: RateCard;
  /** Catalog rows relevant to this service, keyed by id. */
  catalog: ReadonlyMap<string, CatalogItemRate>;
  /** Road distance in km. Only meaningful for moving jobs. */
  distanceKm: number;
  /** Already validated against usage limits and date window by the caller. */
  discount?: DiscountRate | undefined;
}

export class PricingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNKNOWN_CATALOG_ITEM"
      | "MISSING_AREA"
      | "MISSING_ITEMS"
      | "INVALID_INPUT",
  ) {
    super(message);
    this.name = "PricingError";
  }
}

export function calculatePrice(input: QuoteInput, context: PricingContext): PriceBreakdown {
  const { rates } = context;
  const lines: PriceLine[] = [];

  const service = input.serviceType;

  // ── 1. Base rate ──────────────────────────────────────────────────────
  const baseRate = rates.baseRate[service];
  lines.push(line("line.base_rate", baseRate, { service }));

  // ── 2. Scope: either floor area or individually selected items ─────────
  const scopeAmount = calculateScope(input, context, lines);

  // The surcharge base excludes travel: a longer drive should not inflate the
  // floor surcharge, which is about carrying, not distance.
  const surchargeBase = baseRate + scopeAmount;

  // ── 3. Floor surcharge, per floor without a lift ──────────────────────
  const floorsWithoutLift = countFloorsWithoutLift(input);

  if (floorsWithoutLift > 0 && rates.floorSurchargePercent > 0) {
    const perFloor = percentOf(surchargeBase, rates.floorSurchargePercent);
    const floorSurcharge = multiply(perFloor, floorsWithoutLift);

    lines.push(
      line("line.floor_surcharge", floorSurcharge, {
        floors: floorsWithoutLift,
        percent: rates.floorSurchargePercent,
      }),
    );
  }

  // ── 4. Travel, moving only ────────────────────────────────────────────
  const travelAmount = calculateTravel(input, context, lines);

  // ── 5. Extras ─────────────────────────────────────────────────────────
  const extrasAmount = calculateExtras(input, context, surchargeBase, lines);

  // ── 6. Crew and vehicles ──────────────────────────────────────────────
  let staffingAmount: Cents = 0;

  if (input.crewSize === 3) {
    staffingAmount += rates.crewOfThreeSurcharge;
    lines.push(line("line.crew_of_three", rates.crewOfThreeSurcharge));
  }

  if (input.secondVan) {
    staffingAmount += rates.secondVanSurcharge;
    lines.push(line("line.second_van", rates.secondVanSurcharge));
  }

  // ── 7. Running subtotal before date- and customer-based adjustments ────
  let net = sum([baseRate, scopeAmount, floorSurchargeOf(lines), travelAmount, extrasAmount, staffingAmount]);

  // ── 8. Saturday surcharge ─────────────────────────────────────────────
  if (input.scheduledDate && rates.saturdaySurchargePercent > 0) {
    const scheduled = toCalendarDate(input.scheduledDate);

    if (isSaturday(scheduled)) {
      const saturdaySurcharge = percentOf(net, rates.saturdaySurchargePercent);
      net += saturdaySurcharge;
      lines.push(
        line("line.saturday_surcharge", saturdaySurcharge, {
          percent: rates.saturdaySurchargePercent,
        }),
      );
    }
  }

  // ── 9. Business discount ──────────────────────────────────────────────
  if (input.customerType === "business" && rates.businessDiscountPercent > 0) {
    const businessDiscount = percentOf(net, rates.businessDiscountPercent);
    net -= businessDiscount;
    lines.push(
      line("line.business_discount", -businessDiscount, {
        percent: rates.businessDiscountPercent,
      }),
    );
  }

  // ── 10. Discount code ─────────────────────────────────────────────────
  if (context.discount) {
    const discountAmount =
      context.discount.kind === "percentage"
        ? percentOf(net, context.discount.value as number)
        : (context.discount.value as Cents);

    // Clamp so a large fixed discount cannot produce a negative invoice.
    const applied = Math.min(discountAmount, net);
    net = atLeastZero(net - applied);

    lines.push(line("line.discount_code", -applied, { code: context.discount.code }));
  }

  // ── 11. Minimum order value ───────────────────────────────────────────
  const beforeMinimum = net;
  net = atLeast(net, rates.minimumOrderValue);
  const minimumApplied = net > beforeMinimum;

  if (minimumApplied) {
    lines.push(line("line.minimum_order_value", net - beforeMinimum));
  }

  // ── 12. VAT and deposit ───────────────────────────────────────────────
  const vatAmount = percentOf(net, rates.vatPercent);
  const totalGross = net + vatAmount;
  const depositAmount = percentOf(totalGross, rates.depositPercent);

  const estimatedHours = estimateHours(input, context);

  return {
    lines,
    netAmount: formatMoney(net),
    vatRate: rates.vatPercent.toFixed(2),
    vatAmount: formatMoney(vatAmount),
    totalGross: formatMoney(totalGross),
    depositAmount: formatMoney(depositAmount),
    ...(minimumApplied ? { minimumApplied: true } : {}),
    estimatedHours: estimatedHours.toFixed(2),
    distanceKm: context.distanceKm.toFixed(2),
    pricingVersion: PRICING_VERSION,
    computedAt: new Date().toISOString(),
  };
}

// ── helpers ─────────────────────────────────────────────────────────────

function calculateScope(
  input: QuoteInput,
  context: PricingContext,
  lines: PriceLine[],
): Cents {
  const { rates } = context;

  if (input.calculationMethod === "area") {
    if (input.areaSqm === undefined || input.areaSqm <= 0) {
      throw new PricingError("Area is required when pricing by area.", "MISSING_AREA");
    }

    const perSqm = rates.perSqm[input.serviceType];
    const amount = multiply(perSqm, input.areaSqm);

    lines.push(
      line("line.area", amount, {
        sqm: input.areaSqm,
        rate: formatMoney(perSqm),
      }),
    );

    return amount;
  }

  const selected = Object.entries(input.selectedItems ?? {}).filter(
    ([, quantity]) => quantity > 0,
  );

  if (selected.length === 0) {
    throw new PricingError("At least one item must be selected.", "MISSING_ITEMS");
  }

  // Disposal prices the same physical object differently from a move.
  const useDisposalPrice = input.serviceType === "disposal";

  const amounts = selected.map(([itemId, quantity]) => {
    const item = requireCatalogItem(context, itemId);
    const unitPrice = useDisposalPrice ? item.disposalPrice : item.price;

    return multiply(unitPrice, quantity);
  });

  const total = sum(amounts);
  lines.push(line("line.selected_items", total, { count: selected.length }));

  return total;
}

function calculateTravel(
  input: QuoteInput,
  context: PricingContext,
  lines: PriceLine[],
): Cents {
  // Only a move involves driving between two addresses.
  if (input.serviceType !== "moving" || context.distanceKm <= 0) {
    return 0;
  }

  const { rates, distanceKm } = context;
  const isLongDistance = distanceKm > rates.longDistanceFromKm;
  const perKm = isLongDistance ? rates.perKmLongDistance : rates.perKm;
  const amount = multiply(perKm, distanceKm);

  lines.push(
    line(isLongDistance ? "line.travel_long_distance" : "line.travel", amount, {
      km: distanceKm.toFixed(1),
      rate: formatMoney(perKm),
    }),
  );

  return amount;
}

function calculateExtras(
  input: QuoteInput,
  context: PricingContext,
  surchargeBase: Cents,
  lines: PriceLine[],
): Cents {
  const { rates } = context;
  const amounts: Cents[] = [];

  const disassembly = sumItemWork(input.extras.disassemblyItems, context, "disassemblyPrice");
  if (disassembly > 0) {
    amounts.push(disassembly);
    lines.push(line("line.disassembly", disassembly));
  }

  const assembly = sumItemWork(input.extras.assemblyItems, context, "assemblyPrice");
  if (assembly > 0) {
    amounts.push(assembly);
    lines.push(line("line.assembly", assembly));
  }

  if (input.extras.packingService) {
    amounts.push(rates.packingService);
    lines.push(line("line.packing_service", rates.packingService));
  }

  if (input.extras.parkingZone) {
    amounts.push(rates.parkingZone);
    lines.push(line("line.parking_zone", rates.parkingZone));
  }

  if (input.extras.transportInsurance && rates.transportInsurancePercent > 0) {
    const insurance = percentOf(surchargeBase, rates.transportInsurancePercent);
    amounts.push(insurance);
    lines.push(
      line("line.transport_insurance", insurance, {
        percent: rates.transportInsurancePercent,
      }),
    );
  }

  return sum(amounts);
}

function sumItemWork(
  items: Record<string, number> | undefined,
  context: PricingContext,
  field: "assemblyPrice" | "disassemblyPrice",
): Cents {
  const entries = Object.entries(items ?? {}).filter(([, quantity]) => quantity > 0);

  return sum(
    entries.map(([itemId, quantity]) =>
      multiply(requireCatalogItem(context, itemId)[field], quantity),
    ),
  );
}

function requireCatalogItem(context: PricingContext, itemId: string): CatalogItemRate {
  const item = context.catalog.get(itemId);

  if (!item) {
    throw new PricingError(
      `Unknown or inactive catalog item: ${itemId}`,
      "UNKNOWN_CATALOG_ITEM",
    );
  }

  return item;
}

function countFloorsWithoutLift(input: QuoteInput): number {
  const origin = input.originHasElevator ? 0 : Math.max(0, input.originFloor);

  // Only a move has a destination to carry into.
  const destination =
    input.serviceType === "moving" && !input.destinationHasElevator
      ? Math.max(0, input.destinationFloor)
      : 0;

  return origin + destination;
}

/** Re-reads the floor surcharge from the lines, keeping one source of truth. */
function floorSurchargeOf(lines: readonly PriceLine[]): Cents {
  const found = lines.find((entry) => entry.key === "line.floor_surcharge");
  return found ? parseMoney(found.amount) : 0;
}

/**
 * Rough duration estimate, used to warn that a job needs a second day.
 * Deliberately conservative — under-estimating strands a crew overnight.
 */
function estimateHours(input: QuoteInput, context: PricingContext): number {
  const { rates } = context;
  let hours = rates.hoursBase;

  if (input.calculationMethod === "area" && input.areaSqm) {
    hours += input.areaSqm * rates.hoursPerSqm;
  } else {
    const volume = Object.entries(input.selectedItems ?? {}).reduce((total, [id, quantity]) => {
      const item = context.catalog.get(id);
      return total + (item?.volumeM3 ?? 0) * quantity;
    }, 0);

    // Roughly one cubic metre handled per quarter hour.
    hours += volume * 0.25;
  }

  // Stairs cost real time; a lift does not.
  hours += countFloorsWithoutLift(input) * 0.5;

  // A third mover speeds the job up, but not by a full third.
  if (input.crewSize === 3) hours *= 0.75;
  if (input.secondVan) hours *= 0.8;

  // Driving time, assuming a 50 km/h average with a loaded van.
  if (input.serviceType === "moving") hours += context.distanceKm / 50;

  return Math.round(hours * 4) / 4; // quarter-hour precision
}

function line(
  key: string,
  amount: Cents,
  params?: Record<string, string | number>,
): PriceLine {
  return { key, amount: formatMoney(amount), ...(params ? { params } : {}) };
}
