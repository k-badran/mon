import { env } from "@umzugplus/config";
import { publicHolidaysForRange } from "@umzugplus/core";

import { KNOWLEDGE } from "./knowledge-seed.js";
import { CONTENT_DEFAULTS, SETTING_DEFAULTS } from "./site-defaults.js";
import argon2 from "argon2";

import { db, closeDatabase } from "./client.js";
import * as schema from "./schema/index.js";

/**
 * Seeds reference data: the rate card, the service catalog, capacity rules,
 * public holidays, discount codes and the FAQ — plus one admin account.
 *
 * Idempotent. Every insert uses `onConflictDoNothing`, so running it twice is
 * safe and it can be used to top up a database after adding a new rate key.
 *
 * Customer and order data is deliberately NOT seeded: this database starts
 * empty by design.
 */

const {
  priceSettings, catalogItems, capacityConfig, blockedDays,
  discountCodes, faqEntries, users, knowledgeEntries,
  siteSettings, contentBlocks,
} = schema;

/** The rate card. Every key in core's RATE_KEYS must appear here. */
const RATE_CARD = [
  // Base rates — what a job costs before scope, distance or extras.
  ["base_rate_moving", "Grundpreis Umzug", "290.00", "EUR"],
  ["base_rate_disposal", "Grundpreis Entsorgung", "180.00", "EUR"],
  ["base_rate_cleaning", "Grundpreis Reinigung", "150.00", "EUR"],

  // Per square metre, when pricing by area.
  ["per_sqm_moving", "Preis pro m² Umzug", "11.50", "EUR"],
  ["per_sqm_disposal", "Preis pro m² Entsorgung", "18.00", "EUR"],
  ["per_sqm_cleaning", "Preis pro m² Reinigung", "4.50", "EUR"],

  // Travel.
  ["per_km", "Preis pro km", "1.20", "EUR"],
  ["per_km_long_distance", "Preis pro km (Fernumzug)", "0.95", "EUR"],
  ["long_distance_from_km", "Fernumzug ab km", "100", "KM"],

  // Surcharges.
  ["floor_surcharge_percent", "Etagenzuschlag je Etage ohne Aufzug", "4.00", "PERCENT"],
  ["packing_service", "Verpackungsservice inkl. Material", "180.00", "EUR"],
  ["parking_zone", "Halteverbotszone", "95.00", "EUR"],
  ["transport_insurance_percent", "Transportversicherung (erweitert)", "1.50", "PERCENT"],
  ["crew_of_three_surcharge", "Aufpreis 3. Mitarbeiter", "160.00", "EUR"],
  ["second_van_surcharge", "Aufpreis 2. Transporter", "220.00", "EUR"],
  ["saturday_surcharge_percent", "Samstagszuschlag", "15.00", "PERCENT"],

  // Discounts and tax.
  ["business_discount_percent", "Rabatt Gewerbekunden", "5.00", "PERCENT"],
  ["vat_percent", "Mehrwertsteuer", "19.00", "PERCENT"],
  ["minimum_order_value", "Mindestauftragswert", "249.00", "EUR"],
  ["deposit_percent", "Anzahlung", "20.00", "PERCENT"],

  // Duration estimation.
  ["hours_per_sqm", "Stunden pro m²", "0.09", "HOURS"],
  ["hours_base", "Grundstunden je Auftrag", "1.50", "HOURS"],
] as const;

/** A representative catalog. Real inventories are managed in the admin panel. */
const CATALOG: ReadonlyArray<{
  kind: "furniture" | "cleaning";
  category: string;
  name: string;
  price: string;
  disposalPrice: string;
  assemblyPrice: string;
  disassemblyPrice: string;
  volumeM3: string;
}> = [
  // Living room
  f("Wohnzimmer", "Sofa (2-Sitzer)", "45.00", "55.00", "0", "0", "1.80"),
  f("Wohnzimmer", "Sofa (3-Sitzer)", "60.00", "75.00", "0", "0", "2.60"),
  f("Wohnzimmer", "Sessel", "25.00", "30.00", "0", "0", "0.90"),
  f("Wohnzimmer", "Couchtisch", "18.00", "22.00", "15.00", "15.00", "0.40"),
  f("Wohnzimmer", "TV-Schrank", "35.00", "45.00", "30.00", "30.00", "1.10"),
  f("Wohnzimmer", "Bücherregal", "30.00", "38.00", "35.00", "35.00", "1.00"),

  // Bedroom
  f("Schlafzimmer", "Bett (Einzel)", "40.00", "50.00", "45.00", "45.00", "1.40"),
  f("Schlafzimmer", "Bett (Doppel)", "65.00", "80.00", "70.00", "70.00", "2.40"),
  f("Schlafzimmer", "Matratze", "20.00", "28.00", "0", "0", "0.60"),
  f("Schlafzimmer", "Kleiderschrank (2-türig)", "70.00", "90.00", "80.00", "80.00", "2.20"),
  f("Schlafzimmer", "Kleiderschrank (4-türig)", "120.00", "150.00", "140.00", "140.00", "4.00"),
  f("Schlafzimmer", "Kommode", "30.00", "38.00", "25.00", "25.00", "0.80"),

  // Kitchen
  f("Küche", "Küchenzeile (komplett)", "220.00", "280.00", "320.00", "320.00", "5.00"),
  f("Küche", "Kühlschrank", "55.00", "70.00", "0", "0", "1.20"),
  f("Küche", "Waschmaschine", "60.00", "75.00", "0", "0", "1.00"),
  f("Küche", "Geschirrspüler", "50.00", "65.00", "0", "0", "0.90"),
  f("Küche", "Esstisch", "40.00", "50.00", "35.00", "35.00", "1.20"),
  f("Küche", "Stuhl", "8.00", "12.00", "0", "0", "0.25"),

  // Office
  f("Büro", "Schreibtisch", "38.00", "48.00", "40.00", "40.00", "1.10"),
  f("Büro", "Bürostuhl", "18.00", "25.00", "0", "0", "0.50"),
  f("Büro", "Aktenschrank", "45.00", "58.00", "35.00", "35.00", "1.30"),

  // Boxes and misc
  f("Sonstiges", "Umzugskarton", "4.50", "6.00", "0", "0", "0.12"),
  f("Sonstiges", "Fahrrad", "22.00", "30.00", "0", "0", "0.70"),
  f("Sonstiges", "Waschbecken / Sanitär", "35.00", "45.00", "0", "0", "0.60"),

  // Cleaning scope items
  c("Reinigung", "Badezimmer", "65.00", "0.00"),
  c("Reinigung", "Küche (Grundreinigung)", "95.00", "0.00"),
  c("Reinigung", "Zimmer", "45.00", "0.00"),
  c("Reinigung", "Fenster (pro Stück)", "12.00", "0.00"),
  c("Reinigung", "Keller / Dachboden", "70.00", "0.00"),
];

const FAQ: ReadonlyArray<{ locale: string; question: string; answer: string }> = [
  {
    locale: "de",
    question: "Wie berechnet sich der Preis?",
    answer:
      "Der Preis setzt sich aus einem Grundpreis, dem Umfang (Fläche oder einzelne Positionen), " +
      "Etagen ohne Aufzug, der Entfernung sowie gewählten Zusatzleistungen zusammen. " +
      "Die Aufschlüsselung siehst du vor der Anfrage vollständig.",
  },
  {
    locale: "de",
    question: "Brauche ich ein Konto?",
    answer:
      "Der Rechner ist ohne Konto nutzbar. Für eine verbindliche Anfrage ist ein kostenloses " +
      "Konto nötig — dein berechnetes Angebot wird dabei automatisch übernommen.",
  },
  {
    locale: "de",
    question: "Bis wann kann ich kostenlos stornieren?",
    answer:
      "Bis 12 Stunden vor dem Termin ist die Stornierung kostenlos. Danach werden der " +
      "Grundpreis sowie eine Bearbeitungsgebühr von 3 % einbehalten.",
  },
  {
    locale: "de",
    question: "In welchem Gebiet seid ihr tätig?",
    answer:
      "Der Startpunkt muss in Nordrhein-Westfalen liegen. Das Ziel eines Umzugs kann " +
      "deutschlandweit sein.",
  },
];

async function main(): Promise<void> {
  console.log("Seeding reference data…\n");

  // ── Rate card ──
  await db
    .insert(priceSettings)
    .values(
      RATE_CARD.map(([key, label, value, unit]) => ({ key, label, value, unit })),
    )
    .onConflictDoNothing();
  console.log(`  price_settings   ${RATE_CARD.length} rates`);

  // ── Catalog ──
  await db
    .insert(catalogItems)
    .values(CATALOG.map((item, index) => ({ ...item, sortOrder: index })))
    .onConflictDoNothing();
  console.log(`  catalog_items    ${CATALOG.length} items`);

  // ── Capacity ──
  await db
    .insert(capacityConfig)
    .values({
      id: "default",
      maxCapacityPerDay: 2,
      closedWeekday: 0, // Sunday
      bookingHorizonDays: 180,
      minLeadTimeHours: 48,
    })
    .onConflictDoNothing();
  console.log("  capacity_config  1 row (2 jobs/day, closed Sundays)");

  // ── Public holidays ──
  // Generated rather than hardcoded, so no year silently becomes bookable.
  const currentYear = new Date().getUTCFullYear();
  const holidays = publicHolidaysForRange(currentYear, currentYear + 5);

  await db
    .insert(blockedDays)
    .values(
      holidays.map((holiday) => ({
        day: holiday.date,
        reason: holiday.name,
        isPublicHoliday: true,
      })),
    )
    .onConflictDoNothing();
  console.log(
    `  blocked_days     ${holidays.length} public holidays (${currentYear}-${currentYear + 5})`,
  );

  // ── Discount codes ──
  await db
    .insert(discountCodes)
    .values([
      { code: "WILLKOMMEN10", kind: "percentage", value: "10.00", maxUses: 500 },
      { code: "STAMMKUNDE", kind: "percentage", value: "7.50", maxUses: null },
      { code: "SOMMER50", kind: "fixed", value: "50.00", maxUses: 200, minOrderValue: "400.00" },
    ])
    .onConflictDoNothing();
  console.log("  discount_codes   3 codes");

  // ── FAQ ──
  await db
    .insert(faqEntries)
    .values(FAQ.map((entry, index) => ({ ...entry, sortOrder: index })))
    .onConflictDoNothing();
  console.log(`  faq_entries      ${FAQ.length} entries`);

  // ── Assistant knowledge base ──
  // One row per intent per locale, so the assistant answers in the customer's
  // language from content the company actually wrote.
  const knowledgeRows = KNOWLEDGE.flatMap((entry) =>
    (Object.keys(entry.translations) as Array<keyof typeof entry.translations>).map((locale) => ({
      locale,
      intent: entry.intent,
      priority: entry.priority,
      keywords: entry.translations[locale].keywords,
      question: entry.translations[locale].question,
      answer: entry.translations[locale].answer,
    })),
  );

  await db.insert(knowledgeEntries).values(knowledgeRows).onConflictDoNothing();
  console.log(
    `  knowledge        ${knowledgeRows.length} entries (${KNOWLEDGE.length} intents × 4 locales)`,
  );

  // ── Site theme and branding ──
  // What the dashboard edits; the website reads these at render time.
  await db.insert(siteSettings).values(SETTING_DEFAULTS).onConflictDoNothing();
  console.log(`  site_settings    ${SETTING_DEFAULTS.length} settings`);

  // ── Editable website copy ──
  const blockRows = CONTENT_DEFAULTS.flatMap((block) =>
    (Object.keys(block.translations) as Array<keyof typeof block.translations>).map((locale) => ({
      section: block.section,
      slot: block.slot,
      locale,
      value: block.translations[locale],
      kind: block.kind,
      label: block.label,
      sortOrder: block.sortOrder,
    })),
  );

  await db.insert(contentBlocks).values(blockRows).onConflictDoNothing();
  console.log(`  content_blocks   ${blockRows.length} blocks (${CONTENT_DEFAULTS.length} slots × 4 locales)`);

  // ── Admin account ──
  if (env.SEED_ADMIN_EMAIL && env.SEED_ADMIN_PASSWORD) {
    const passwordHash = await argon2.hash(env.SEED_ADMIN_PASSWORD, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const inserted = await db
      .insert(users)
      .values({
        email: env.SEED_ADMIN_EMAIL.toLowerCase(),
        passwordHash,
        fullName: env.SEED_ADMIN_NAME ?? "Admin",
        role: "admin",
        emailVerifiedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning({ id: users.id });

    console.log(
      inserted.length > 0
        ? `  users            admin created (${env.SEED_ADMIN_EMAIL})`
        : "  users            admin already exists, left unchanged",
    );
  } else {
    console.log("  users            skipped (SEED_ADMIN_* not set)");
  }

  console.log("\nSeed complete.");
}

function f(
  category: string,
  name: string,
  price: string,
  disposalPrice: string,
  assemblyPrice: string,
  disassemblyPrice: string,
  volumeM3: string,
) {
  return {
    kind: "furniture" as const,
    category,
    name,
    price,
    disposalPrice,
    assemblyPrice,
    disassemblyPrice,
    volumeM3,
  };
}

function c(category: string, name: string, price: string, disposalPrice: string) {
  return {
    kind: "cleaning" as const,
    category,
    name,
    price,
    disposalPrice,
    assemblyPrice: "0",
    disassemblyPrice: "0",
    volumeM3: "0",
  };
}

main()
  .then(() => closeDatabase())
  .then(() => process.exit(0))
  .catch(async (error: unknown) => {
    console.error("\nSeed failed:", error);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  });
