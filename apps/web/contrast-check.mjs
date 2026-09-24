/**
 * Finds text that cannot be read against what is behind it.
 *
 * This exists because of a real bug: Tailwind emits its utilities inside
 * `@layer utilities`, and an unlayered rule beats a layered one whatever its
 * specificity — so a bare `h2 { color }` in the base stylesheet silently
 * overrode `text-*` on every heading. On the dark closing band the headline
 * ended up the exact colour of its own background. The build passed, the
 * types passed, and a full-page screenshot looked plausible at a glance.
 *
 * Walks the rendered page, computes the WCAG contrast ratio of each text node
 * against its nearest opaque ancestor background, and reports anything below
 * the threshold for its size.
 */
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";
const paths = process.argv.slice(2);

if (paths.length === 0) {
  console.error("usage: node contrast-check.mjs <path> [path…]");
  process.exit(2);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

let failures = 0;

for (const path of paths) {
  await page.goto(`${WEB}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const problems = await page.evaluate(() => {
    /** sRGB channel to linear, per WCAG. */
    function channel(value) {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }

    function luminance([r, g, b]) {
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }

    function parse(colour) {
      const m = colour.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(",").map((n) => Number.parseFloat(n));
      return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
    }

    /** The first ancestor that actually paints something. */
    function backgroundOf(element) {
      let node = element;
      while (node && node !== document.documentElement) {
        const parsed = parse(getComputedStyle(node).backgroundColor);
        if (parsed && parsed.alpha > 0.5) return parsed.rgb;
        node = node.parentElement;
      }
      return [255, 255, 255];
    }

    function ratio(a, b) {
      const la = luminance(a);
      const lb = luminance(b);
      const [hi, lo] = la > lb ? [la, lb] : [lb, la];
      return (hi + 0.05) / (lo + 0.05);
    }

    const found = [];

    for (const element of document.querySelectorAll("body *")) {
      // Only elements that own visible text.
      const text = [...element.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join(" ")
        .trim();

      if (!text) continue;

      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (Number.parseFloat(style.opacity) < 0.1) continue;

      const rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;

      const fg = parse(style.color);
      if (!fg || fg.alpha < 0.5) continue;

      const bg = backgroundOf(element);
      const value = ratio(fg.rgb, bg);

      // WCAG AA: 3:1 for large text (18pt / 14pt bold), 4.5:1 otherwise.
      const size = Number.parseFloat(style.fontSize);
      const weight = Number.parseInt(style.fontWeight, 10) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const threshold = large ? 3 : 4.5;

      if (value < threshold) {
        found.push({
          text: text.slice(0, 54),
          tag: element.tagName.toLowerCase(),
          cls: (element.className || "").toString().slice(0, 42),
          fg: style.color,
          bg: `rgb(${bg.join(", ")})`,
          ratio: Math.round(value * 100) / 100,
          need: threshold,
        });
      }
    }

    return found;
  });

  console.log(`\n${path}`);

  if (problems.length === 0) {
    console.log("  OK   every text node meets WCAG AA");
    continue;
  }

  failures += problems.length;
  for (const p of problems) {
    console.log(
      `  FAIL ${String(p.ratio).padStart(5)}:1 (needs ${p.need}:1)  ${p.tag}.${p.cls}\n` +
        `       ${p.fg} on ${p.bg}  "${p.text}"`,
    );
  }
}

console.log(
  `\n${failures === 0 ? "no contrast failures" : `${failures} text node(s) below WCAG AA`}`,
);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
