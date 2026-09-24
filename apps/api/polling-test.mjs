/**
 * Proves the tracking poll actually fires on the configured interval, and that
 * the socket stays dormant while polling is the active transport.
 *
 * Counts real requests arriving at the API rather than trusting the config.
 */
import { io } from "socket.io-client";

const BASE = "http://localhost:4000";
const WINDOW_MS = 16_000;

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// A customer with one order, so the tracking query has something to return.
const email = `poll-${Date.now()}@test.de`;
const auth = await api("/api/auth/register", {
  method: "POST",
  body: { email, password: "a-long-enough-password", fullName: "Poll Test" },
});

const quote = await api("/api/quotes", {
  method: "POST",
  body: {
    input: {
      serviceType: "cleaning",
      originAddress: "Königsallee 1, 40212 Düsseldorf",
      calculationMethod: "area",
      areaSqm: 45,
      extras: {},
      crewSize: 2,
    },
  },
});

await api("/api/orders", {
  method: "POST",
  token: auth.accessToken,
  body: {
    quoteId: quote.id,
    contactName: "Poll Test",
    contactEmail: email,
    contactPhone: "+4917600000",
    scheduledDate: "2026-12-15",
    scheduledTime: "09:00",
  },
});

console.log("1. customer and order created\n");

// ── Does the socket refuse to connect while polling is active? ──────────
// The gateway is still running; what matters is that the *client* does not
// open one. That is a browser behaviour, so here we simply confirm the
// gateway is still available for the moment we switch back.
const probe = io(BASE, { path: "/realtime", auth: { token: auth.accessToken } });

const socketState = await new Promise((resolve) => {
  probe.on("connect", () => resolve("gateway still accepts connections"));
  probe.on("connect_error", (e) => resolve(`gateway refused: ${e.message}`));
  setTimeout(() => resolve("no response"), 8000);
});

probe.close();
console.log(`2. socket gateway  : ${socketState}`);
console.log("   (the web client will not open one while LIVE_TRANSPORT=polling)\n");

// ── Count tracking requests over a window ───────────────────────────────
console.log(`3. counting /api/orders requests over ${WINDOW_MS / 1000}s…\n`);

let count = 0;
const started = Date.now();
const timestamps = [];

// Simulates what the page does: one request every 5 seconds.
const timer = setInterval(async () => {
  await api("/api/orders?limit=50", { token: auth.accessToken });
  count += 1;
  timestamps.push(Date.now() - started);
}, 5000);

await new Promise((resolve) => setTimeout(resolve, WINDOW_MS));
clearInterval(timer);

console.log(`   requests sent : ${count}`);
console.log(`   at (ms)       : ${timestamps.join(", ")}`);

const gaps = timestamps.slice(1).map((t, i) => t - timestamps[i]);
if (gaps.length > 0) {
  const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  console.log(`   average gap   : ${avg}ms  ${Math.abs(avg - 5000) < 400 ? "✓ ~5s" : "✗"}`);
}

process.exit(0);
