/**
 * Drives the calculator from the first step to a real quote.
 *
 * The point is to prove the whole path works against the live API — the step
 * gating, the branches that skip steps for non-moving jobs, the URL carrying
 * the step, and the server actually returning a price. A screenshot of step
 * one proves none of that.
 */
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const failures = [];
const check = (label, ok, detail = "") => {
  if (!ok) failures.push(label);
  console.log(`  ${ok ? "OK  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
};

page.on("pageerror", (error) => failures.push(`page error: ${error.message}`));

/** Clicks the forward button and waits for the step in the URL to change. */
async function next() {
  const before = new URL(page.url()).searchParams.get("step") ?? "1";
  await page.locator('button:has-text("Weiter"), button:has-text("Next"), button:has-text("Skip"), button:has-text("Überspringen")').last().click();
  await page.waitForFunction(
    (was) => new URLSearchParams(location.search).get("step") !== was,
    before,
    { timeout: 10_000 },
  );
}

console.log("\n— a moving job, all ten steps —\n");

await page.goto(`${WEB}/en/rechner`, { waitUntil: "networkidle" });

check("step 1 renders", await page.locator("h1").isVisible());
check(
  "forward is blocked until the step is answered? (service has a default, so it is allowed)",
  await page.locator('button:has-text("Next")').isEnabled(),
);

// 1 service — moving is the default.
await page.locator('input[name="serviceType"][value="moving"]').check();
await next();

// 2 customer type and both addresses share one screen, as the design draws it.
await page.locator('input[name="customerType"][value="private"]').check();

const blocked = await page.locator('button:has-text("Next")').isDisabled();
check("route step blocks an empty address", blocked);

await page.fill("#origin", "Königsallee 1, 40212 Düsseldorf");
await page.fill("#destination", "Bilker Allee 20, 40219 Düsseldorf");
check("route step unblocks once both are given", await page.locator('button:has-text("Next")').isEnabled());
await next();

// 3 property — the floor is a select, one card per end of the move.
await page.selectOption("#origin-floor", "3");
check("a lift is only asked about above the ground floor", (await page.locator("#origin-lift").count()) === 1);
await next();

// 4 volume.
await page.fill("#area", "75");
await next();

// 5 add-ons.
await page.locator("#packing").check();
await next();

// 6 crew.
await page.locator('input[name="crewSize"][value="3"]').check();
await next();

// 7 assembly and special handling.
await next();

// 8 photos — must warn that nothing is uploaded.
const warning = await page.locator('[role="status"]').textContent();
check("photos step admits nothing is uploaded", /not uploaded/i.test(warning ?? ""), warning?.slice(0, 60) ?? "");
await next();

// 9 date.
const target = new Date();
target.setDate(target.getDate() + 21);
await page.fill("#date", target.toISOString().slice(0, 10));

const stepParam = new URL(page.url()).searchParams.get("step");
check("the step is carried in the URL", stepParam === "9", `step=${stepParam}`);

// Refresh here: the answers should survive.
await page.reload({ waitUntil: "networkidle" });
const areaAfterReload = await page.evaluate(() => {
  const raw = sessionStorage.getItem("mon.calculator.v1");
  return raw ? (JSON.parse(raw).areaSqm ?? null) : null;
});
check("answers survive a refresh", areaAfterReload === "75", `areaSqm=${areaAfterReload}`);

// 10 review — the last screen asks nothing and reads the answers back.
await next();
const reviewHeading = await page.locator("h1").textContent();
check("the tenth step is the review screen", /review/i.test(reviewHeading ?? ""), reviewHeading ?? "");

// Ask for the price.
await page.locator('button:has-text("Calculate my price")').click();
await page.waitForSelector("text=/Your confirmed price|We are checking the details/", { timeout: 25_000 });

const priced = await page.locator("text=Your confirmed price").count();
const review = await page.locator("text=We are checking the details").count();
check("the server returned an outcome", priced + review > 0, priced ? "instant price" : "manual review");

check("a local move is priced instantly", priced > 0);

if (priced) {
  const total = await page.locator("p.text-display").textContent();
  check("a real total is shown", /\d/.test(total ?? ""), total ?? "");
}

// The other outcome: a job the engine refuses to price unattended.
console.log("\n— a cross-country move goes to review —\n");

await page.goto(`${WEB}/en/rechner`, { waitUntil: "networkidle" });
await page.evaluate(() => {
  sessionStorage.setItem(
    "mon.calculator.v1",
    JSON.stringify({
      serviceType: "moving",
      customerType: "private",
      originAddress: "Königsallee 1, 40212 Düsseldorf",
      destinationAddress: "Alexanderplatz 1, 10178 Berlin",
      originFloor: 0,
      destinationFloor: 0,
      originHasElevator: false,
      destinationHasElevator: false,
      calculationMethod: "area",
      areaSqm: "75",
      selectedItems: {},
      packingService: false,
      parkingZone: false,
      transportInsurance: false,
      crewSize: 2,
      secondVan: false,
      assemblyItems: {},
      disassemblyItems: {},
      photoNames: [],
      scheduledDate: "2026-11-18",
      scheduledTime: "08:00",
      discountCode: "",
    }),
  );
});

await page.goto(`${WEB}/en/rechner?step=10`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.locator('button:has-text("Calculate my price")').click();
await page.waitForSelector("text=We are checking the details", { timeout: 25_000 });

check("a 597 km move is sent to review", true);

const reason = await page.locator("li").filter({ hasText: /400 km/ }).count();
check("the review screen names the reason", reason > 0);

console.log("\n— a cleaning job skips the moving-only steps —\n");

await page.goto(`${WEB}/en/rechner`, { waitUntil: "networkidle" });
await page.evaluate(() => sessionStorage.clear());
await page.reload({ waitUntil: "networkidle" });

await page.locator('input[name="serviceType"][value="cleaning"]').check();
await next();

// No destination field for a job that does not move anything.
await page.locator('input[name="customerType"][value="private"]').check();
check("cleaning asks for one address only", (await page.locator("#destination").count()) === 0);

await page.fill("#origin", "Königsallee 1, 40212 Düsseldorf");
await next();
await next();
await page.fill("#area", "60");
await next();
await next();

// Crew and special-handling steps do not apply, so photos comes next.
const heading = await page.locator("h1").textContent();
check("crew and special steps are skipped", /photo/i.test(heading ?? ""), heading ?? "");

console.log(
  `\n${failures.length === 0 ? "the calculator works end to end" : `${failures.length} failure(s)`}`,
);
if (failures.length) console.log("  " + failures.join("\n  "));

await browser.close();
process.exit(failures.length === 0 ? 0 : 1);
