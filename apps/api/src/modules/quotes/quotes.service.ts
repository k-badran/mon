import {
  buildRateCard,
  calculatePrice,
  parseMoney,
  type CatalogItemRate,
  type DiscountRate,
  type PriceBreakdown,
  type PricingContext,
  type QuoteInput,
  type RateCard,
} from "@mon/core";
import { db, schema } from "@mon/db";
import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";

import { AppError } from "../../lib/errors.js";
import { redis } from "../../lib/redis.js";

const { quotes, priceSettings, catalogItems, discountCodes } = schema;

/**
 * Quote creation — the server-authoritative pricing path.
 *
 * The client sends a job description and receives a persisted quote id plus a
 * breakdown. It never sends a price, and it never receives the rate card, so
 * the margin structure stays private and the total cannot be tampered with.
 */

/** Quotes expire so nobody can hold yesterday's rate card indefinitely. */
const QUOTE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const RATE_CARD_CACHE_KEY = "ratecard:v1";
const RATE_CARD_CACHE_TTL_SECONDS = 300;

/**
 * Loads the rate card, cached in Redis.
 *
 * Pricing runs on every calculator keystroke-driven request, so re-reading 22
 * rows each time is wasteful. The cache is invalidated explicitly whenever an
 * admin edits a price, so a change takes effect immediately rather than after
 * the TTL.
 */
export async function loadRateCard(): Promise<RateCard> {
  const cached = await redis.get(RATE_CARD_CACHE_KEY).catch(() => null);

  if (cached) {
    return buildRateCard(JSON.parse(cached) as { key: string; value: string }[]);
  }

  const rows = await db
    .select({ key: priceSettings.key, value: priceSettings.value })
    .from(priceSettings);

  if (rows.length === 0) {
    throw AppError.internal("The rate card is empty. Run `pnpm seed`.");
  }

  await redis
    .set(RATE_CARD_CACHE_KEY, JSON.stringify(rows), "EX", RATE_CARD_CACHE_TTL_SECONDS)
    .catch(() => undefined);

  // Throws MissingRateError listing every absent key, rather than failing on
  // the first `undefined` deep inside an arithmetic expression.
  return buildRateCard(rows);
}

export async function invalidateRateCardCache(): Promise<void> {
  await redis.del(RATE_CARD_CACHE_KEY).catch(() => undefined);
}

/** Active catalog rows for a service, as integer cents, keyed by id. */
async function loadCatalog(
  serviceType: QuoteInput["serviceType"],
): Promise<Map<string, CatalogItemRate>> {
  const kind = serviceType === "cleaning" ? "cleaning" : "furniture";

  const rows = await db
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.kind, kind), eq(catalogItems.isActive, true)));

  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        price: parseMoney(row.price),
        disposalPrice: parseMoney(row.disposalPrice),
        assemblyPrice: parseMoney(row.assemblyPrice),
        disassemblyPrice: parseMoney(row.disassemblyPrice),
        volumeM3: row.volumeM3 === null ? null : Number.parseFloat(row.volumeM3),
      },
    ]),
  );
}

/**
 * Validates a discount code against every constraint.
 *
 * The legacy app checked codes in the browser, so usage limits, validity
 * windows and minimum order values were all advisory.
 */
async function loadDiscount(code: string | undefined): Promise<DiscountRate | undefined> {
  if (!code) return undefined;

  const normalized = code.trim().toUpperCase();
  const now = new Date();

  const [row] = await db
    .select()
    .from(discountCodes)
    .where(eq(discountCodes.code, normalized))
    .limit(1);

  if (!row || !row.isActive) {
    throw AppError.unprocessable("This discount code is not valid.");
  }

  if (row.validFrom && row.validFrom > now) {
    throw AppError.unprocessable("This discount code is not active yet.");
  }

  if (row.validUntil && row.validUntil < now) {
    throw AppError.unprocessable("This discount code has expired.");
  }

  if (row.maxUses !== null && row.usedCount >= row.maxUses) {
    throw AppError.unprocessable("This discount code has reached its usage limit.");
  }

  return {
    code: row.code,
    kind: row.kind,
    value: row.kind === "percentage" ? Number.parseFloat(row.value) : parseMoney(row.value),
  };
}

export interface CreateQuoteResult {
  id: string;
  breakdown: PriceBreakdown;
  expiresAt: Date;
  /**
   * The quote is an estimate that a human has to confirm before it can be
   * booked. The customer sees a callback promise instead of a price.
   */
  requiresReview: boolean;
  /** Why, so the screen and the operator can both say something specific. */
  reviewReasons: string[];
}

/**
 * Jobs the engine should not price unattended.
 *
 * Each threshold is a case where the model's assumptions stop holding rather
 * than an arbitrary limit: the per-square-metre rate is calibrated on homes,
 * not warehouses; a very long move is a two-day job with an overnight the
 * engine knows nothing about; and a pile of dismantling work is the thing most
 * often underestimated from a form.
 *
 * Returning the reasons rather than a bare boolean means the operator opening
 * the quote sees what tripped it.
 */
function reviewReasonsFor(input: QuoteInput, breakdown: PriceBreakdown): string[] {
  const reasons: string[] = [];

  if (input.calculationMethod === "area" && (input.areaSqm ?? 0) > 200) {
    reasons.push("area_above_200_sqm");
  }

  const itemCount = Object.values(input.selectedItems ?? {}).reduce((sum, n) => sum + n, 0);
  if (itemCount > 60) {
    reasons.push("more_than_60_items");
  }

  const distance = Number.parseFloat(breakdown.distanceKm ?? "0");
  if (distance > 400) {
    reasons.push("distance_above_400_km");
  }

  const dismantling =
    Object.values(input.extras.assemblyItems ?? {}).reduce((sum, n) => sum + n, 0) +
    Object.values(input.extras.disassemblyItems ?? {}).reduce((sum, n) => sum + n, 0);
  if (dismantling > 15) {
    reasons.push("extensive_assembly_work");
  }

  if (input.customerType === "business" && Number.parseFloat(breakdown.totalGross) > 8000) {
    reasons.push("large_commercial_job");
  }

  return reasons;
}

/**
 * Prices a job and persists the result.
 *
 * `userId` is optional: the calculator works without an account, and the quote
 * is adopted at signup so nothing has to be retyped.
 */
export async function createQuote(
  input: QuoteInput,
  options: { userId?: string | undefined; distanceKm: number },
): Promise<CreateQuoteResult> {
  const [rates, catalog, discount] = await Promise.all([
    loadRateCard(),
    loadCatalog(input.serviceType),
    loadDiscount(input.discountCode),
  ]);

  const context: PricingContext = {
    rates,
    catalog,
    distanceKm: options.distanceKm,
    discount,
  };

  // Throws PricingError for unknown items or a missing area; the error handler
  // maps that to 422 with a machine-readable reason.
  const breakdown = calculatePrice(input, context);
  const expiresAt = new Date(Date.now() + QUOTE_TTL_MS);

  const [created] = await db
    .insert(quotes)
    .values({
      userId: options.userId ?? null,
      serviceType: input.serviceType,
      customerType: input.customerType,
      input,
      breakdown,
      netAmount: breakdown.netAmount,
      vatRate: breakdown.vatRate,
      vatAmount: breakdown.vatAmount,
      totalGross: breakdown.totalGross,
      depositAmount: breakdown.depositAmount,
      estimatedHours: breakdown.estimatedHours ?? null,
      distanceKm: options.distanceKm.toFixed(2),
      pricingVersion: breakdown.pricingVersion,
      expiresAt,
    })
    .returning({ id: quotes.id });

  if (!created) {
    throw AppError.internal("Quote could not be created.");
  }

  const reviewReasons = reviewReasonsFor(input, breakdown);

  return {
    id: created.id,
    breakdown,
    expiresAt,
    requiresReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

export async function getQuote(quoteId: string) {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);

  if (!quote) {
    throw AppError.notFound("Quote");
  }

  return quote;
}

/**
 * Loads a quote for conversion into an order, enforcing that it is still
 * usable. Called inside the booking transaction.
 */
export async function loadUsableQuote(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  quoteId: string,
  userId: string,
) {
  const [quote] = await tx
    .select()
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    // Locks the row so the same quote cannot be converted twice concurrently.
    .for("update")
    .limit(1);

  if (!quote) {
    throw AppError.notFound("Quote");
  }

  if (quote.consumedAt !== null) {
    throw AppError.conflict("QUOTE_ALREADY_USED", "This quote has already been booked.");
  }

  if (quote.expiresAt.getTime() <= Date.now()) {
    throw AppError.conflict(
      "QUOTE_EXPIRED",
      "This quote has expired. Please calculate the price again.",
    );
  }

  // An anonymous quote may be claimed by whoever books it; one already tied to
  // a user may not be booked by a different account.
  if (quote.userId !== null && quote.userId !== userId) {
    throw AppError.notFound("Quote");
  }

  return quote;
}

/** Marks a quote as consumed, inside the booking transaction. */
export async function consumeQuote(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  quoteId: string,
  userId: string,
): Promise<void> {
  await tx
    .update(quotes)
    .set({ consumedAt: new Date(), userId })
    .where(eq(quotes.id, quoteId));
}

/** Increments a discount code's usage counter atomically. */
export async function incrementDiscountUse(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  code: string,
): Promise<void> {
  await tx
    .update(discountCodes)
    .set({ usedCount: sql`${discountCodes.usedCount} + 1` })
    .where(eq(discountCodes.code, code));
}

/**
 * Attaches anonymous quotes to a user after signup, so the price they just
 * calculated survives account creation.
 */
export async function adoptAnonymousQuote(quoteId: string, userId: string): Promise<void> {
  await db
    .update(quotes)
    .set({ userId })
    .where(
      and(
        eq(quotes.id, quoteId),
        isNull(quotes.userId),
        isNull(quotes.consumedAt),
        gt(quotes.expiresAt, new Date()),
      ),
    );
}

/** Housekeeping: remove expired, unconsumed quotes. */
export async function pruneExpiredQuotes(): Promise<number> {
  const deleted = await db
    .delete(quotes)
    .where(and(lte(quotes.expiresAt, new Date()), isNull(quotes.consumedAt)))
    .returning({ id: quotes.id });

  return deleted.length;
}
