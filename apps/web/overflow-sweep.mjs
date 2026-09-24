/**
 * Sweeps a page across widths and names whatever pushes past the viewport.
 *
 * A handful of named breakpoints misses the widths between them, which is
 * where header layouts actually break — the 900px failure here sat between
 * the tablet and desktop checks.
 */
import { chromium } from "playwright-core";

const WEB = process.env.WEB_URL ?? "http://localhost:3200";
const paths = process.argv.slice(2);
const WIDTHS = [1440, 1280, 1180, 1080, 1024, 960, 900, 834, 768, 700, 640, 560, 480, 414, 390, 360, 320];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

let failures = 0;

for (const path of paths) {
  console.log(`\n${path}`);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${WEB}${path}`, { waitUntil: "networkidle" });

    const result = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      let worst = null;

      for (const el of document.querySelectorAll("body *")) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1 && (!worst || rect.right > worst.right)) {
          worst = {
            right: Math.round(rect.right),
            tag: el.tagName.toLowerCase(),
            cls: (el.className || "").toString().slice(0, 34),
          };
        }
      }

      return { docWidth, scrollWidth: document.documentElement.scrollWidth, worst };
    });

    const over = result.scrollWidth > result.docWidth + 1;
    if (over) failures += 1;

    console.log(
      `  ${over ? "FAIL" : "ok  "} ${String(width).padStart(5)}px` +
        (over ? `  scroll ${result.scrollWidth}  <- ${result.worst?.tag}.${result.worst?.cls}` : ""),
    );
  }
}

console.log(`\n${failures === 0 ? "no overflow at any width" : `${failures} width(s) overflow`}`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
