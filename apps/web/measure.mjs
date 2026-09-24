/**
 * Measures the real geometry of the dashboard shell at a given width.
 *
 * A full-page screenshot paints fixed elements at the top of the image, so it
 * cannot tell a correctly pinned bottom bar from a broken one. Computed styles
 * and bounding boxes can.
 */
import { chromium } from "playwright-core";

const WEB = "http://localhost:3200";
const [, , width = "390", email, password] = process.argv;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: Number(width), height: 844 } });
const page = await context.newPage();

await page.goto(`${WEB}/en/login`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await Promise.all([
  page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 }),
  page.click('button:has-text("Log in")'),
]);

await page.goto(`${WEB}/en/dashboard`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const report = await page.evaluate(() => {
  const sidebar = document.querySelector(".dash-sidebar");
  const nav = document.querySelector(".dash-nav");
  const body = document.querySelector(".dash-body");
  const header = document.querySelector(".dash-header");

  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
      width: Math.round(r.width),
      position: cs.position,
      flexDirection: cs.flexDirection,
      blockSize: cs.blockSize,
    };
  };

  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    sidebar: box(sidebar),
    nav: box(nav),
    header: box(header),
    bodyPaddingBottom: body ? getComputedStyle(body).paddingBottom : null,
    // Is the bar actually pinned to the bottom of the viewport?
    pinnedToBottom: sidebar
      ? Math.abs(sidebar.getBoundingClientRect().bottom - window.innerHeight) < 2
      : false,
  };
});

console.log(JSON.stringify(report, null, 2));
await browser.close();
