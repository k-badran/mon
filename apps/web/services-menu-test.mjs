/**
 * Proves the three service pages are reachable from the navigation.
 *
 * They existed and rendered, but "Services" in the header pointed at an anchor
 * on the homepage, so nothing in the navigation led to them. A page that works
 * and cannot be found is, from a visitor's side, a page that does not exist —
 * which is exactly how it was reported.
 */
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const failures = [];
const check = (label, ok, detail = "") => {
  if (!ok) failures.push(label);
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
};

console.log("\n— desktop menu —\n");

await page.goto(`${WEB}/en`, { waitUntil: "networkidle" });

const trigger = page.locator('[data-services-menu] button');
check("the header has a Services control", (await trigger.count()) === 1);
check("it starts collapsed", (await trigger.getAttribute("aria-expanded")) === "false");
check("no menu is rendered yet", (await page.locator('[data-services-menu] [role="menu"]').count()) === 0);

await trigger.click();
await page.waitForSelector('[data-services-menu] [role="menu"]', { state: "visible" });

const items = await page.locator('[data-services-menu] [role="menuitem"]').allTextContents();
check("it opens", (await trigger.getAttribute("aria-expanded")) === "true");
check("all three services are listed", items.length === 3, items.join(" · "));

const hrefs = await page.locator('[data-services-menu] [role="menuitem"]').evaluateAll((els) =>
  els.map((el) => el.getAttribute("href")),
);
check(
  "each points at its own page",
  ["/en/umzug", "/en/entsorgung", "/en/reinigung"].every((h) => hrefs.includes(h)),
  hrefs.join(" · "),
);

// Escape must close it — a menu you can only leave by clicking its trigger is a trap.
await page.keyboard.press("Escape");
await page.waitForTimeout(250);
check("Escape closes it", (await page.locator('[data-services-menu] [role="menu"]').count()) === 0);

// Clicking elsewhere must close it too.
await trigger.click();
await page.waitForSelector('[data-services-menu] [role="menu"]', { state: "visible" });
await page.locator("h1").first().click({ position: { x: 5, y: 5 } });
await page.waitForTimeout(250);
check("clicking outside closes it", (await page.locator('[data-services-menu] [role="menu"]').count()) === 0);

// And it has to actually navigate.
await trigger.click();
await page.waitForSelector('[data-services-menu] [role="menu"]', { state: "visible" });
await page.locator('[data-services-menu] [role="menuitem"]').first().click();

let navigated = true;
try {
  await page.waitForURL((url) => url.pathname !== "/en", { timeout: 15_000 });
} catch {
  navigated = false;
}
check("a menu item navigates", navigated, page.url());

console.log("\n— every service page renders its own content —\n");

for (const [route, expect] of [
  ["/en/umzug", /move|moving|apartment/i],
  ["/en/entsorgung", /clearance|disposal/i],
  ["/en/reinigung", /cleaning/i],
]) {
  await page.goto(`${WEB}${route}`, { waitUntil: "networkidle" });
  const heading = (await page.locator("h1").first().textContent()) ?? "";
  check(`${route} has its own heading`, expect.test(heading), heading.slice(0, 48));
}

console.log("\n— the drawer lists them on a phone —\n");

await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${WEB}/en`, { waitUntil: "networkidle" });
await page.locator("header button[aria-controls='site-nav-drawer']").click();
await page.waitForSelector("#site-nav-drawer", { state: "visible" });

const drawerHrefs = await page.locator("#site-nav-drawer a").evaluateAll((els) =>
  els.map((el) => el.getAttribute("href")),
);
check(
  "the drawer links all three",
  ["/en/umzug", "/en/entsorgung", "/en/reinigung"].every((h) => drawerHrefs.includes(h)),
  drawerHrefs.filter((h) => /umzug|entsorgung|reinigung/.test(h ?? "")).join(" · "),
);

console.log(
  `\n${failures.length === 0 ? "the service pages are reachable" : `${failures.length} failure(s)`}`,
);
if (failures.length) console.log("  " + failures.join("\n  "));

await browser.close();
process.exit(failures.length === 0 ? 0 : 1);
