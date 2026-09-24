/**
 * Asserts the rendered page resolves each token to the value M.io specifies.
 *
 * A screenshot can look right while a token is wrong — a stale cached theme, a
 * shadowed custom property, a PostCSS plugin that silently did not run. This
 * reads the computed values out of the live document instead, which is how the
 * `@theme` block passing through unprocessed was caught.
 *
 * Both naming schemes are checked: Tailwind's (`--color-brand-red`), which the
 * utilities are generated from, and the legacy aliases (`--brand-red`) that
 * the not-yet-migrated stylesheets still read. They must agree, or a screen
 * built with utilities and one built with hand-written CSS will drift apart.
 */
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";

/** Tailwind theme names -> the value the M.io handbook states. */
const THEME = {
  "--color-brand-red": "#d71635",
  "--color-brand-yellow": "#ffcb08",

  "--color-red-50": "#fdf1f3",
  "--color-red-500": "#d71635",
  "--color-red-900": "#4f020e",
  "--color-yellow-500": "#ffcb08",
  "--color-yellow-900": "#5e4d00",
  "--color-neutral-50": "#faf9f9",
  "--color-neutral-500": "#7c7571",
  "--color-neutral-900": "#131110",

  "--color-success-soft": "#e8f8f0",
  "--color-success": "#10b981",
  "--color-success-text": "#065f46",
  "--color-warning": "#f59e0b",
  "--color-danger": "#ef4444",
  "--color-info": "#3b82f6",
  "--color-info-text": "#1e3a8a",

  "--radius-xs": "2px",
  "--radius-md": "8px",
  "--radius-lg": "12px",
  "--radius-2xl": "24px",

  "--spacing-6": "24px",
  "--spacing-32": "128px",

  "--text-display": "3rem",
  "--text-h1": "2.25rem",
  "--text-body-sm": "0.875rem",
};

/** The aliases the hand-written stylesheets still read. */
const LEGACY = {
  "--brand-red": "#d71635",
  "--brand-yellow": "#ffcb08",
  "--neutral-900": "#131110",
  "--danger": "#ef4444",
  "--success": "#10b981",
  "--radius-lg": "12px",
  "--space-6": "24px",
  "--text-base": "1rem",
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${WEB}/de`, { waitUntil: "networkidle" });

const actual = await page.evaluate((names) => {
  const style = getComputedStyle(document.documentElement);
  const out = {};
  for (const n of names) out[n] = style.getPropertyValue(n).trim().toLowerCase();

  out.__bodyFont = getComputedStyle(document.body).fontFamily;

  // Proof that the utilities were generated, not just the properties emitted.
  const probe = document.createElement("div");
  probe.className = "grid gap-6 rounded-lg bg-brand-red text-h1";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe);
  out.__utilities = {
    display: computed.display,
    gap: computed.gap,
    radius: computed.borderRadius,
    background: computed.backgroundColor,
    fontSize: computed.fontSize,
  };
  probe.remove();

  return out;
}, [...Object.keys(THEME), ...Object.keys(LEGACY)]);

let bad = 0;
const report = (label, want, got) => {
  const ok = got === want;
  if (!ok) bad += 1;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label.padEnd(22)} want ${String(want).padEnd(10)} got ${got || "(empty)"}`);
};

console.log("\ntheme tokens");
for (const [token, want] of Object.entries(THEME)) report(token, want, actual[token]);

console.log("\nlegacy aliases");
for (const [token, want] of Object.entries(LEGACY)) report(token, want, actual[token]);

console.log("\nutilities actually generated");
const u = actual.__utilities;
report("grid", "grid", u.display);
report("gap-6", "24px", u.gap);
report("rounded-lg", "12px", u.radius);
report("bg-brand-red", "rgb(215, 22, 53)", u.background);
report("text-h1", "36px", u.fontSize);

console.log(`\n  body font: ${actual.__bodyFont}`);
const fontOk = /dm sans/i.test(actual.__bodyFont);
if (!fontOk) bad += 1;
console.log(`  ${fontOk ? "OK  " : "FAIL"} DM Sans is the rendered body face`);

console.log(`\n${bad === 0 ? "every token matches M.io" : `${bad} check(s) failed`}`);
await browser.close();
process.exit(bad === 0 ? 0 : 1);
