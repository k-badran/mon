/**
 * Generates `lib/site/public-images.json`: every file under `public/images`.
 *
 * Image blocks in the CMS hold a path such as `/images/home/hero-right.jpg`.
 * When a design change deletes a file, a database seeded before it keeps
 * pointing at it, and the page renders a broken image even though the photo
 * the design wants ships with the site. `imageSrc` checks a local path against
 * this list and falls back to the page's own file when it is not there.
 *
 * A list made at build time rather than a filesystem check per request: on a
 * serverless host `public/` is served by the CDN and is not on the function's
 * disk, so a runtime check would call every local path missing.
 *
 * Runs before `dev` and `build`. Run it by hand with
 * `pnpm --filter @mon/web build:images` after adding a file while the dev
 * server is up.
 */
import { readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const imagesDir = join(root, "public/images");
const outFile = join(root, "lib/site/public-images.json");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    // Placeholders and notes are not images a block can point at.
    if (entry.name.startsWith(".") || /\.(txt|md)$/i.test(entry.name)) return [];
    return ["/images/" + relative(imagesDir, full).split(sep).join("/")];
  });
}

const files = walk(imagesDir).sort();
writeFileSync(outFile, JSON.stringify(files, null, 2) + "\n");
console.log(`${files.length} files under public/images → lib/site/public-images.json`);
