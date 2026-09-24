import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { catalogKindEnum, discountKindEnum } from "./enums.js";

/**
 * Money is `numeric`, never `double precision`.
 *
 * The legacy app used JavaScript floats throughout, so a price could come out
 * as 1234.5600000000002 and a VAT total could disagree with the sum of its
 * lines by a cent. `numeric(10, 2)` is exact; Drizzle returns it as a string
 * and the pricing engine works in integer cents.
 */
const money = (name: string) => numeric(name, { precision: 10, scale: 2 });

/**
 * Tunable pricing parameters, editable by admins.
 *
 * `key` is a stable identifier the pricing engine looks up. Values here are
 * read by the SERVER only — the browser never receives the rate card, so the
 * margin structure is no longer public.
 */
export const priceSettings = pgTable(
  "price_settings",
  {
    key: text("key").primaryKey(),
    label: text("label").notNull(),
    value: money("value").notNull(),
    unit: text("unit").notNull().default("EUR"), // "EUR" | "PERCENT" | "KM" | "HOURS"
    description: text("description"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
  },
);

/**
 * Individual items a customer can select instead of giving a total area:
 * furniture pieces for moving/disposal, room types for cleaning.
 */
export const catalogItems = pgTable(
  "catalog_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    kind: catalogKindEnum("kind").notNull(),
    category: text("category").notNull(),
    name: text("name").notNull(),

    // Price for a moving job.
    price: money("price").notNull().default("0"),
    // Disposal is priced differently for the same physical object.
    disposalPrice: money("disposal_price").notNull().default("0"),
    // Optional assembly / disassembly surcharges.
    assemblyPrice: money("assembly_price").notNull().default("0"),
    disassemblyPrice: money("disassembly_price").notNull().default("0"),

    // Rough volume, used to estimate duration and van capacity.
    volumeM3: numeric("volume_m3", { precision: 6, scale: 2 }),

    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("catalog_items_kind_category_idx").on(table.kind, table.category),
    index("catalog_items_active_idx").on(table.isActive),
  ],
);

/**
 * Discount codes.
 *
 * `usedCount` and `maxUses` are enforced server-side inside the quote
 * transaction; the legacy app validated codes in the browser only.
 */
export const discountCodes = pgTable(
  "discount_codes",
  {
    code: text("code").primaryKey(),
    kind: discountKindEnum("kind").notNull(),
    // Percent (0-100) when kind = percentage, EUR amount when kind = fixed.
    value: money("value").notNull(),

    isActive: boolean("is_active").notNull().default(true),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    minOrderValue: money("min_order_value"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("discount_codes_active_idx").on(table.isActive)],
);

/**
 * How much work the company can take per day.
 *
 * Single row keyed "default". Kept as a table rather than an env var so
 * admins can change capacity without a deploy.
 */
export const capacityConfig = pgTable("capacity_config", {
  id: text("id").primaryKey().default("default"),

  maxCapacityPerDay: integer("max_capacity_per_day").notNull().default(2),
  // 0 = Sunday. The day the company does not operate.
  closedWeekday: integer("closed_weekday").notNull().default(0),
  // How far ahead a customer may book.
  bookingHorizonDays: integer("booking_horizon_days").notNull().default(180),
  // Minimum notice before a job can start.
  minLeadTimeHours: integer("min_lead_time_hours").notNull().default(48),

  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Days the company is unavailable: holidays and manual closures.
 *
 * `day` is a Postgres `date`, NOT a timestamp. This is the structural fix for
 * the off-by-one bug: a calendar day has no time zone, so converting through
 * UTC can no longer shift it into the previous day.
 *
 * Public holidays are generated per year (see `core/holidays.ts`) and written
 * here with `isPublicHoliday = true`, so the table never expires the way the
 * old hardcoded 2026 list did.
 */
export const blockedDays = pgTable(
  "blocked_days",
  {
    day: date("day").primaryKey(),
    reason: text("reason").notNull(),
    isPublicHoliday: boolean("is_public_holiday").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (table) => [index("blocked_days_holiday_idx").on(table.isPublicHoliday)],
);

/**
 * Frequently asked questions, shown on the marketing pages.
 * Content is per-locale so the FAQ is not German-only.
 */
export const faqEntries = pgTable(
  "faq_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locale: text("locale").notNull().default("de"),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("faq_locale_sort_idx").on(table.locale, table.sortOrder),
    index("faq_published_idx").on(table.isPublished),
  ],
);

/**
 * Site settings — the website's theme and branding, editable from the admin
 * dashboard.
 *
 * Stored as rows rather than a config file so an admin can change the site's
 * look without a deploy. The website reads these at render time and emits them
 * as CSS custom properties, which is why the design system references tokens
 * exclusively: a raw hex in a component would be unreachable from here.
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    /** Groups keys in the editor UI: "theme", "brand", "contact", "seo". */
    group: text("group").notNull().default("theme"),
    /**
     * How the editor should render the control, and how the value is
     * validated: "color", "text", "textarea", "url", "email", "number",
     * "boolean", "image".
     */
    kind: text("kind").notNull().default("text"),
    label: text("label").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [index("site_settings_group_idx").on(table.group, table.sortOrder)],
);

/**
 * Editable website content, per locale.
 *
 * Each block is a named slot the website renders — a hero headline, a section
 * body, a footer line. Keeping them here rather than hardcoded in JSX is what
 * lets the dashboard change the site's wording in four languages without a
 * developer.
 */
export const contentBlocks = pgTable(
  "content_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    /** Which page or section this belongs to, e.g. "home", "footer". */
    section: text("section").notNull(),
    /** Slot within the section, e.g. "hero.headline". */
    slot: text("slot").notNull(),
    locale: text("locale").notNull().default("de"),

    value: text("value").notNull(),
    kind: text("kind").notNull().default("text"),
    label: text("label").notNull(),

    /** Unpublished edits stay invisible to visitors until reviewed. */
    isPublished: boolean("is_published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("content_blocks_slot_locale_idx").on(table.section, table.slot, table.locale),
    index("content_blocks_section_idx").on(table.section, table.sortOrder),
  ],
);
