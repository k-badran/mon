import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const WEB = "http://localhost:3200";
const [, , email, password, outDir] = process.argv;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

await page.goto(`${WEB}/en/login`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await Promise.all([
  page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 }),
  page.click('button:has-text("Log in")'),
]);

for (const locale of ["de", "ar", "tr"]) {
  await page.goto(`${WEB}/${locale}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${outDir}/admin-${locale}.png` });
  console.log(`  captured ${locale}`);
}

await browser.close();
