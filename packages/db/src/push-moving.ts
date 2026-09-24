/**
 * Pushes the `service-moving` rows of `PAGE_CONTENT` into `content_blocks`.
 *
 * `seed:home` leaves existing values alone unless `--force` is passed, and
 * `--force` would reset every section at once. This resets one section, which
 * is what correcting a single page's transcription needs.
 */
import { and, eq } from "drizzle-orm";

import { db, closeDatabase } from "./client.js";
import { contentBlocks } from "./schema/catalog.js";
import { PAGE_CONTENT } from "./page-content.js";

const LOCALES = ["de", "en", "ar", "tr"] as const;
const SECTION = "service-moving";

async function main() {
  let changed = 0;
  let inserted = 0;

  for (const seed of PAGE_CONTENT.filter((entry) => entry.section === SECTION)) {
    for (const locale of LOCALES) {
      const [existing] = await db
        .select()
        .from(contentBlocks)
        .where(
          and(
            eq(contentBlocks.section, seed.section),
            eq(contentBlocks.slot, seed.slot),
            eq(contentBlocks.locale, locale),
          ),
        )
        .limit(1);

      if (!existing) {
        await db.insert(contentBlocks).values({
          section: seed.section,
          slot: seed.slot,
          locale,
          value: seed.values[locale],
          kind: seed.kind,
          label: seed.label,
          sortOrder: seed.sortOrder,
          isPublished: true,
        });
        inserted += 1;
        continue;
      }

      if (existing.value === seed.values[locale]) continue;

      await db
        .update(contentBlocks)
        .set({ value: seed.values[locale], updatedAt: new Date() })
        .where(eq(contentBlocks.id, existing.id));
      changed += 1;
    }
  }

  console.log(`service-moving: ${changed} values reset, ${inserted} inserted`);
  await closeDatabase();
}

main().catch(async (error) => {
  console.error(error);
  await closeDatabase();
  process.exit(1);
});
