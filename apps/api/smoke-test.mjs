/**
 * Endpoint smoke test.
 *
 * Exercises every route the frontend will call, as a real client would, and
 * reports exactly what works. Run with the API up:
 *
 *   node smoke-test.mjs
 */
const BASE = "http://localhost:4000";

let adminToken = "";
let customerToken = "";
const results = [];

async function call(method, path, { body, token, expect = [200, 201, 204] } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

  const ok = expect.includes(res.status);
  results.push({ method, path, status: res.status, ok, code: json?.error?.code });

  return { status: res.status, json, ok };
}

const stamp = Date.now();

/**
 * A booking date this run owns.
 *
 * Capacity is two jobs a day, so a hardcoded date eventually collides with
 * demo data or an earlier run and the booking fails with SLOT_TAKEN — which
 * is the guard working, not a regression. Spreading runs across a year of
 * far-future days keeps the test independent of what else is in the database.
 */
const TEST_DATE = (() => {
  const base = new Date();
  base.setUTCFullYear(base.getUTCFullYear() + 1);
  base.setUTCDate(base.getUTCDate() + (stamp % 300));

  return base.toISOString().slice(0, 10);
})();

console.log("── Auth ──────────────────────────────────────────────");
const reg = await call("POST", "/api/auth/register", {
  body: { email: `smoke-${stamp}@test.de`, password: "a-long-enough-password", fullName: "Smoke Test" },
  expect: [201],
});
customerToken = reg.json?.accessToken ?? "";

const login = await call("POST", "/api/auth/login", {
  // Read from the environment when it is set, so the script keeps working when
  // the seeded administrator is not the default one. Hardcoding these meant a
  // changed SEED_ADMIN_EMAIL failed the login step and then cascaded into every
  // admin-guarded check below it, reporting eight failures for one cause.
  body: {
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@umzugplus.de",
    password: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
  },
});
adminToken = login.json?.accessToken ?? "";

await call("GET", "/api/auth/me", { token: customerToken });
await call("GET", "/api/auth/sessions", { token: customerToken });
await call("POST", "/api/auth/refresh", { body: { refreshToken: reg.json?.refreshToken }, expect: [200] });

console.log("── Public (no auth) ──────────────────────────────────");
await call("GET", "/api/catalog?kind=furniture");
await call("GET", "/api/faq?locale=de");
await call("GET", "/api/reviews?limit=5");
await call("GET", "/api/availability?year=2026&month=11");

console.log("── Quotes ────────────────────────────────────────────");
const quote = await call("POST", "/api/quotes", {
  body: {
    input: {
      serviceType: "cleaning",
      originAddress: "Königsallee 1, 40212 Düsseldorf",
      calculationMethod: "area",
      areaSqm: 70,
      extras: {},
      crewSize: 2,
    },
  },
  expect: [201],
});
const quoteId = quote.json?.id;
if (quoteId) await call("GET", `/api/quotes/${quoteId}`);

console.log("── Orders ────────────────────────────────────────────");
const order = await call("POST", "/api/orders", {
  token: customerToken,
  body: {
    quoteId,
    contactName: "Smoke Test",
    contactEmail: `smoke-${stamp}@test.de`,
    contactPhone: "+4917600000",
    scheduledDate: TEST_DATE,
    scheduledTime: "09:00",
  },
  expect: [201],
});
const orderId = order.json?.id;

await call("GET", "/api/orders?limit=10", { token: customerToken });
if (orderId) await call("GET", `/api/orders/${orderId}`, { token: customerToken });
if (orderId) await call("PATCH", `/api/orders/${orderId}/status`, {
  token: adminToken, body: { status: "confirmed" },
});

console.log("── Users ─────────────────────────────────────────────");
await call("GET", "/api/users/me", { token: customerToken });
await call("PATCH", "/api/users/me", { token: customerToken, body: { phone: "+4917611111" } });
await call("GET", "/api/users?limit=5", { token: adminToken });
await call("GET", "/api/users/audit/log?limit=5", { token: adminToken });

console.log("── Admin ─────────────────────────────────────────────");
await call("GET", "/api/pricing", { token: adminToken });
await call("GET", "/api/discounts", { token: adminToken });

console.log("── Payments ──────────────────────────────────────────");
if (orderId) {
  await call("POST", `/api/payments/${orderId}`, {
    token: adminToken, body: { amount: "50.00", kind: "deposit", method: "bank_transfer" },
    expect: [201],
  });
  await call("GET", `/api/payments/${orderId}`, { token: customerToken });
}

console.log("── Complaints ────────────────────────────────────────");
const complaint = await call("POST", "/api/complaints", {
  token: customerToken,
  body: { orderId, subject: "Test enquiry", message: "A test message." },
  expect: [201],
});
await call("GET", "/api/complaints?limit=5", { token: customerToken });
if (complaint.json?.id) {
  await call("POST", `/api/complaints/${complaint.json.id}/messages`, {
    token: adminToken, body: { body: "Antwort vom Team." }, expect: [201],
  });
}

console.log("── Chat ──────────────────────────────────────────────");
await call("POST", "/api/chat", {
  body: { message: "Was kostet ein Umzug?", locale: "de" },
  // 503 is expected when ANTHROPIC_API_KEY is unset — that is configuration,
  // not a broken route.
  expect: [200, 503],
});

console.log("\n── Guards (these SHOULD be rejected) ─────────────────");
await call("GET", "/api/auth/me", { expect: [401] });
await call("GET", "/api/pricing", { token: customerToken, expect: [403] });
await call("GET", "/api/users?limit=5", { token: customerToken, expect: [403] });
if (orderId) await call("PATCH", `/api/orders/${orderId}/status`, {
  token: customerToken, body: { status: "completed" }, expect: [403],
});

// ── Report ──────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(58));
const pass = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);

for (const r of results) {
  const mark = r.ok ? "✓" : "✗";
  console.log(`  ${mark} ${r.method.padEnd(6)} ${r.path.padEnd(38)} ${r.status}${r.code ? " " + r.code : ""}`);
}

console.log("═".repeat(58));
console.log(`  ${pass}/${results.length} passed`);
if (fail.length > 0) {
  console.log("\n  FAILURES:");
  for (const f of fail) console.log(`    ${f.method} ${f.path} → ${f.status} ${f.code ?? ""}`);
}

process.exit(fail.length > 0 ? 1 : 0);
