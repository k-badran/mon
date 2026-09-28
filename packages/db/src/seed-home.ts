/**
 * Seeds the public site's editable copy.
 *
 * Idempotent by (section, slot, locale): re-running updates the label and the
 * sort order but leaves the value alone, so a business edit made in the
 * dashboard is never overwritten by a deploy. Pass `--force` to reset the
 * text back to what the design says.
 *
 * That safety has one failure mode: when a section's seed is *rewritten* —
 * the document it carries changes, not just its wording — the rows already in
 * the database keep the old text forever, and the slots the rewrite dropped
 * stay behind as orphans no page reads. `page-legal-cookie` hit exactly this
 * and served the terms document under the cookie page's heading. So a rewrite
 * can be re-applied to one section without touching the rest of the site:
 *
 *     pnpm seed:home --section=page-legal-cookie --force --prune
 *
 * `--section` scopes everything that follows to the named sections (comma
 * separated), `--prune` deletes rows in those sections that the seed no
 * longer defines. Pruning is refused without `--section`, because unscoped it
 * would delete every row an editor ever added by hand.
 */
import { and, eq, inArray } from "drizzle-orm";

import { db } from "./client.js";
import { contentBlocks } from "./schema/catalog.js";
import { HOME_CONTENT } from "./home-content.js";
import { PAGE_CONTENT } from "./page-content.js";
import { EXTRA_CONTENT } from "./page-content-extra.js";
import { LEGAL_CONTENT } from "./legal-content.js";
import { CLEANING_CONTENT } from "./cleaning-content.js";
import { IMAGE_CONTENT } from "./image-content.js";

const LOCALES = ["de", "en", "ar", "tr"] as const;

function flagValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const force = process.argv.includes("--force");
  const prune = process.argv.includes("--prune");

  const scope = (flagValue("section") ?? "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

  if (prune && scope.length === 0) {
    console.error("--prune needs --section=<key>: unscoped it would delete every hand-added row.");
    process.exit(1);
  }

  const all = [
    ...HOME_CONTENT,
    ...PAGE_CONTENT,
    ...EXTRA_CONTENT,
    ...LEGAL_CONTENT,
    ...CLEANING_CONTENT,
    // The photographs. A missing row is inserted on every run, so an existing
    // database gains them without --force and keeps any photo already edited.
    ...IMAGE_CONTENT,
  ];
  const seeds = scope.length ? all.filter((seed) => scope.includes(seed.section)) : all;

  if (scope.length && seeds.length === 0) {
    console.error(`no seed rows for section(s): ${scope.join(", ")}`);
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;
  let untouched = 0;

  for (const seed of seeds) {
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

      const valueChanged = force && existing.value !== seed.values[locale];
      const metaChanged =
        existing.label !== seed.label ||
        existing.sortOrder !== seed.sortOrder ||
        existing.kind !== seed.kind;

      if (!valueChanged && !metaChanged) {
        untouched += 1;
        continue;
      }

      await db
        .update(contentBlocks)
        .set({
          label: seed.label,
          kind: seed.kind,
          sortOrder: seed.sortOrder,
          ...(valueChanged ? { value: seed.values[locale] } : {}),
          updatedAt: new Date(),
        })
        .where(eq(contentBlocks.id, existing.id));

      updated += 1;
    }
  }

  let pruned = 0;

  if (prune) {
    for (const section of scope) {
      const keep = seeds.filter((seed) => seed.section === section).map((seed) => seed.slot);
      const rows = await db
        .select({ id: contentBlocks.id, slot: contentBlocks.slot })
        .from(contentBlocks)
        .where(eq(contentBlocks.section, section));

      const orphans = rows.filter((row) => !keep.includes(row.slot));
      if (orphans.length === 0) continue;

      await db.delete(contentBlocks).where(
        inArray(
          contentBlocks.id,
          orphans.map((row) => row.id),
        ),
      );

      pruned += orphans.length;
      const slots = [...new Set(orphans.map((row) => row.slot))].sort();
      console.log(`pruned from ${section}: ${slots.join(", ")}`);
    }
  }

  console.log(
    `content blocks — inserted ${inserted}, updated ${updated}, unchanged ${untouched}` +
      (prune ? `, pruned ${pruned}` : "") +
      (scope.length ? `  [${scope.join(", ")}]` : "") +
      (force ? "  (values reset to the design)" : "  (existing values preserved)"),
  );

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
