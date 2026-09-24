/**
 * Captures screenshots of authenticated screens.
 *
 * Signs in through the real form rather than injecting a token, so what ends
 * up in the picture is what a person actually sees after logging in — session
 * restore, redirects and all.
 *
 *   node capture.mjs <email> <password> [outDir]
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";
const [, , email, password, outDir = "./shots"] = process.argv;

if (!email || !password) {
  console.error("usage: node capture.mjs <email> <password> [outDir]");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// Uses the Chrome already installed rather than downloading a browser.
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// Surface anything the app logs as an error — a screenshot of a broken page
// that looks fine is worse than no screenshot.
const problems = [];
page.on("console", (message) => {
  if (message.type() === "error") problems.push(message.text().slice(0, 120));
});
page.on("pageerror", (error) => problems.push(String(error).slice(0, 120)));

console.log("signing in…");
await page.goto(`${WEB}/en/login`, { waitUntil: "networkidle" });
await page.fill("#email", email);
await page.fill("#password", password);
await Promise.all([
  page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 }),
  page.click('button:has-text("Log in")'),
]);
console.log("landed on", new URL(page.url()).pathname);

const SHOTS = [
  { path: "/en/admin", file: "admin-orders.png", label: "Admin — orders board" },
  { path: "/en/admin/website", file: "admin-website.png", label: "Admin — website control" },
  { path: "/en/admin/nutzer", file: "admin-users.png", label: "Admin — users" },
  { path: "/en/admin/abrechnung", file: "admin-billing.png", label: "Admin — billing" },
  { path: "/en/dashboard", file: "dashboard.png", label: "Customer dashboard" },
];

for (const shot of SHOTS) {
  await page.goto(`${WEB}${shot.path}`, { waitUntil: "networkidle" });
  // Let skeletons resolve into real content before the shutter.
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${outDir}/${shot.file}` });
  console.log(`  ✓ ${shot.label.padEnd(30)} ${shot.file}`);
}

if (problems.length > 0) {
  console.log("\nconsole errors seen:");
  for (const problem of [...new Set(problems)].slice(0, 6)) console.log("  " + problem);
}

await browser.close();
