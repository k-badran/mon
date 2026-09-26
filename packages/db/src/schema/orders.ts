import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./identity.js";
import {
  calculationMethodEnum,
  customerTypeEnum,
  orderStatusEnum,
  serviceTypeEnum,
} from "./enums.js";
import type { PriceBreakdown, QuoteInput } from "@mon/core";

const money = (name: string) => numeric(name, { precision: 10, scale: 2 });

/**
 * A server-computed price quote.
 *
 * This table is the fix for the single worst flaw in the legacy app, where the
 * browser calculated the total and the insert trusted whatever it sent. Now:
 *
 *   1. The client POSTs the job description (`input`) — never a price.
 *   2. The server prices it and persists the result here.
 *   3. Order creation references `quoteId`; the server re-reads `totalGross`
 *      from this row.
 *
 * Quotes expire so a customer cannot hold a stale rate card indefinitely.
 */
export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Nullable: the calculator works without an account. On signup the quote
    // is attached to the new user instead of being retyped.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    serviceType: serviceTypeEnum("service_type").notNull(),
    customerType: customerTypeEnum("customer_type").notNull().default("private"),

    // Exactly what the customer asked for, kept for reproducibility.
    input: jsonb("input").$type<QuoteInput>().notNull(),
    // Full line-by-line breakdown the server produced.
    breakdown: jsonb("breakdown").$type<PriceBreakdown>().notNull(),

    netAmount: money("net_amount").notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull(),
    vatAmount: money("vat_amount").notNull(),
    totalGross: money("total_gross").notNull(),
    depositAmount: money("deposit_amount").notNull(),

    estimatedHours: numeric("estimated_hours", { precision: 5, scale: 2 }),
    distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),

    // Which rate card produced this. If prices change, open quotes are stale.
    pricingVersion: integer("pricing_version").notNull().default(1),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quotes_user_idx").on(table.userId),
    index("quotes_expires_idx").on(table.expiresAt),
    check("quotes_total_non_negative", sql`${table.totalGross} >= 0`),
  ],
);

/**
 * A booked job.
 *
 * Prices are copied from the quote at creation time and are never recomputed
 * from client input afterwards.
 */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Human-facing reference (e.g. "UP-2026-000142"), generated server-side.
    reference: text("reference").notNull(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),

    status: orderStatusEnum("status").notNull().default("quoted"),
    serviceType: serviceTypeEnum("service_type").notNull(),
    customerType: customerTypeEnum("customer_type").notNull().default("private"),

    // ── Contact details captured at booking time ──
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),

    // ── Addresses ──
    // Moving uses origin + destination; disposal/cleaning use origin only.
    originAddress: text("origin_address").notNull(),
    destinationAddress: text("destination_address"),
    originFloor: integer("origin_floor").notNull().default(0),
    destinationFloor: integer("destination_floor").notNull().default(0),
    originHasElevator: boolean("origin_has_elevator").notNull().default(false),
    destinationHasElevator: boolean("destination_has_elevator").notNull().default(false),
    distanceKm: numeric("distance_km", { precision: 8, scale: 2 }),

    // ── Scope ──
    calculationMethod: calculationMethodEnum("calculation_method").notNull(),
    areaSqm: integer("area_sqm"),
    selectedItems: jsonb("selected_items").$type<Record<string, number>>(),
    extraServices: jsonb("extra_services").$type<Record<string, unknown>>(),

    // ── Scheduling ──
    // `date` not `timestamp`: a booking day is a calendar day, not an instant.
    scheduledDate: date("scheduled_date"),
    scheduledTime: time("scheduled_time"),
    // Long jobs spill into a second consecutive day.
    scheduledSecondDate: date("scheduled_second_date"),
    // How many of the day's capacity slots this job consumes.
    capacityUnits: integer("capacity_units").notNull().default(1),
    crewSize: integer("crew_size").notNull().default(2),
    estimatedHours: numeric("estimated_hours", { precision: 5, scale: 2 }),

    // ── Money (copied from the quote, authoritative) ──
    netAmount: money("net_amount").notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull(),
    vatAmount: money("vat_amount").notNull(),
    totalGross: money("total_gross").notNull(),
    depositAmount: money("deposit_amount").notNull(),
    paidAmount: money("paid_amount").notNull().default("0"),
    discountCode: text("discount_code"),
    priceBreakdown: jsonb("price_breakdown").$type<PriceBreakdown>().notNull(),

    notes: text("notes"),
    locale: text("locale").notNull().default("de"),

    // ── Lifecycle timestamps ──
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    cancellationFee: money("cancellation_fee"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_reference_idx").on(table.reference),
    // Supports the admin queue: filter by status, newest first.
    index("orders_status_created_idx").on(table.status, table.createdAt),
    // Supports capacity counting for a given day.
    index("orders_scheduled_date_idx").on(table.scheduledDate),
    index("orders_user_idx").on(table.userId),
    check("orders_paid_not_negative", sql`${table.paidAmount} >= 0`),
    check("orders_capacity_positive", sql`${table.capacityUnits} > 0`),
  ],
);

/**
 * Add-on services attached to a primary order (e.g. disposal booked alongside
 * a move). Modelled as rows rather than a JSON blob so they can be priced,
 * reported on, and cancelled individually.
 */
export const orderAddons = pgTable(
  "order_addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    serviceType: serviceTypeEnum("service_type").notNull(),
    address: text("address").notNull(),
    calculationMethod: calculationMethodEnum("calculation_method").notNull(),
    areaSqm: integer("area_sqm"),
    selectedItems: jsonb("selected_items").$type<Record<string, number>>(),

    netAmount: money("net_amount").notNull(),
    vatAmount: money("vat_amount").notNull(),
    totalGross: money("total_gross").notNull(),
    priceBreakdown: jsonb("price_breakdown").$type<PriceBreakdown>().notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_addons_order_idx").on(table.orderId)],
);

/**
 * Payments recorded against an order. An append-only ledger rather than a
 * single mutable `paid_amount`, so partial payments and refunds have history.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),

    amount: money("amount").notNull(),
    kind: text("kind").notNull(), // "deposit" | "balance" | "refund"
    method: text("method"), // "bank_transfer" | "cash" | "card"
    reference: text("reference"),
    note: text("note"),

    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("payments_order_idx").on(table.orderId)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  quote: one(quotes, { fields: [orders.quoteId], references: [quotes.id] }),
  addons: many(orderAddons),
  payments: many(payments),
}));

export const orderAddonsRelations = relations(orderAddons, ({ one }) => ({
  order: one(orders, { fields: [orderAddons.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  user: one(users, { fields: [quotes.userId], references: [users.id] }),
}));
