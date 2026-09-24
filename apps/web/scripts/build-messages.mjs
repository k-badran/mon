/**
 * Generates `lib/i18n/messages/<locale>.json` from the typed catalogue.
 *
 * The catalogue is keyed by message and then by locale, which is what makes a
 * missing translation a compile error. The app loads one file per locale so a
 * visitor downloads only their own language, so the two shapes have to be
 * transposed somewhere — here, at build time, rather than in the browser.
 *
 * Run with `pnpm --filter @umzugplus/web build:messages` after editing the
 * catalogue. It is checked, not just written: a key missing from any locale
 * fails the run rather than shipping a screen with a raw key in it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "lib/i18n/messages");

// The catalogue is TypeScript, and this script runs on plain node. Reading the
// object literal out of the source avoids adding a transpile step for one file.
const source = await import(
  `data:text/javascript,${encodeURIComponent(
    (await import("node:fs")).readFileSync(join(root, "lib/i18n/catalogue.ts"), "utf8")
      .replace(/^import[^\n]*\n/gm, "")
      .replace(/^export type [\s\S]*?;$/gm, "")
      .replace(/^type [\s\S]*?;$/gm, "")
      .replace(/ as const;/g, ";")
      .replace(/: Record<[^>]*>/g, ""),
  )}`
);

const { LOCALES, MESSAGES } = source;

const missing = [];
for (const [key, byLocale] of Object.entries(MESSAGES)) {
  for (const locale of LOCALES) {
    if (byLocale[locale] === undefined) missing.push(`${locale}: ${key}`);
  }
}

if (missing.length > 0) {
  console.error("Missing translations:\n  " + missing.join("\n  "));
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const locale of LOCALES) {
  const messages = {};
  for (const [key, byLocale] of Object.entries(MESSAGES)) {
    messages[key] = byLocale[locale];
  }

  writeFileSync(join(outDir, `${locale}.json`), `${JSON.stringify(messages, null, 2)}\n`, "utf8");
}

console.log(
  `${Object.keys(MESSAGES).length} keys × ${LOCALES.length} locales — every key present in every locale`,
);
