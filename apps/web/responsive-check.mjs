/**
 * Captures a page at every breakpoint and reports whether the layout holds.
 *
 * A screenshot alone can hide the failure that matters most on a phone: the
 * body scrolling sideways. That is measured here rather than eyeballed.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";
const [, , pathname, email, password, outDir = "./shots"] = process.argv;

mkdirSync(outDir, { recursive: true });

const SIZES = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1180, height: 820 },
  { name: "tablet", width: 900, height: 1000 },
  { name: "phone", width: 390, height: 844 },
  { name: "phone-sm", width: 360, height: 780 },
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: SIZES[0] });
const page = await context.newPage();

await page.goto(`${WEB}/en/login`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await Promise.all([
  page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 90_000 }),
  page.click('button:has-text("Log in")'),
]);

console.log(`\n${pathname}\n`);

for (const size of SIZES) {
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.goto(`${WEB}${pathname}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);

  // The check that matters: does anything push the page wider than the screen?
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;

    // Name the widest offender, so a failure is actionable.
    let worst = null;
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.right > docWidth + 1 && (!worst || rect.right > worst.right)) {
        worst = {
          right: Math.round(rect.right),
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 40),
        };
      }
    }

    return { docWidth, scrollWidth, overflows: scrollWidth > docWidth + 1, worst };
  });

  await page.screenshot({ path: `${outDir}/${size.name}.png`, fullPage: size.width < 900 });

  const mark = overflow.overflows ? "✗" : "✓";
  console.log(
    `  ${mark} ${size.name.padEnd(9)} ${String(size.width).padStart(4)}px  ` +
      `scroll ${overflow.scrollWidth}px` +
      (overflow.overflows && overflow.worst
        ? `  ← ${overflow.worst.tag}.${overflow.worst.cls} ends at ${overflow.worst.right}px`
        : ""),
  );
}

await browser.close();
