/**
 * Exercises the mobile drawer the way a person uses it.
 *
 * Overflow checks prove the header fits; they say nothing about whether the
 * six links it hides are actually reachable, which was the real defect.
 */
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
};

await page.goto(`${WEB}/de`, { waitUntil: "networkidle" });

check("toggle is visible on a phone", await page.locator(".nav-toggle").isVisible());
check("drawer is closed initially", (await page.locator(".nav-drawer").count()) === 0);
check(
  "toggle reports collapsed",
  (await page.locator(".nav-toggle").getAttribute("aria-expanded")) === "false",
);

await page.locator(".nav-toggle").click();
await page.waitForSelector(".nav-drawer", { state: "visible" });

const links = await page.locator(".nav-drawer a").allTextContents();
check("drawer opens", await page.locator(".nav-drawer").isVisible());
check("all six sections are reachable", links.length >= 6, `found ${links.length}: ${links.join(", ")}`);
check(
  "toggle reports expanded",
  (await page.locator(".nav-toggle").getAttribute("aria-expanded")) === "true",
);
check(
  "page behind the drawer cannot scroll",
  (await page.evaluate(() => document.body.style.overflow)) === "hidden",
);

await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check("Escape closes the drawer", (await page.locator(".nav-drawer").count()) === 0);
check(
  "body scroll is restored",
  (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
);

// Navigating should close it, and should actually go somewhere.
await page.locator(".nav-toggle").click();
await page.waitForSelector(".nav-drawer", { state: "visible" });
// App Router navigation is client-side, so "networkidle" can settle before the
// route has actually changed. Wait on the URL instead.
await page.locator(".nav-drawer a").nth(1).click();

let navigated = true;
try {
  await page.waitForURL((url) => url.pathname !== "/de", { timeout: 15_000 });
} catch {
  navigated = false;
}

check("navigation works from the drawer", navigated, page.url());
await page.waitForTimeout(400);
check("drawer closes after navigating", (await page.locator(".nav-drawer").count()) === 0);

// At 320px the language picker moves inside.
await page.setViewportSize({ width: 320, height: 700 });
await page.goto(`${WEB}/de`, { waitUntil: "networkidle" });
check("header switcher is hidden at 320px", !(await page.locator(".navbar .locale-switcher").isVisible()));

await page.locator(".nav-toggle").click();
await page.waitForSelector(".nav-drawer", { state: "visible" });
check(
  "language picker is in the drawer at 320px",
  await page.locator(".drawer-locales").isVisible(),
);

console.log(`\n${failed === 0 ? "mobile navigation works" : `${failed} check(s) failed`}`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
