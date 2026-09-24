/**
 * Creates a demo customer with a few orders, so the dashboard can be seen in a
 * realistic state rather than empty.
 *
 * Idempotent-ish: run it again and you get another customer. Intended for
 * local development only.
 */
const BASE = "http://localhost:4000";

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
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const email = "marcus@example.com";
const password = "a-long-enough-password";

let auth;
try {
  auth = await api("/api/auth/register", {
    method: "POST",
    body: { email, password, fullName: "Marcus Vance", phone: "+49 176 1234567" },
  });
  console.log("created customer:", email);
} catch {
  auth = await api("/api/auth/login", { method: "POST", body: { email, password } });
  console.log("customer already existed, signed in:", email);
}

const admin = await api("/api/auth/login", {
  method: "POST",
  body: { email: "admin@umzugplus.de", password: "ChangeMe123!" },
});

/** Books one order and optionally advances it. */
async function book({ service, area, date, advanceTo }) {
  const quote = await api("/api/quotes", {
    method: "POST",
    body: {
      input: {
        serviceType: service,
        originAddress: "Königsallee 1, 40212 Düsseldorf",
        ...(service === "moving" ? { destinationAddress: "Alexanderplatz 1, 10178 Berlin" } : {}),
        calculationMethod: "area",
        areaSqm: area,
        originFloor: 2,
        extras: {},
        crewSize: 2,
      },
    },
  });

  const order = await api("/api/orders", {
    method: "POST",
    token: auth.accessToken,
    body: {
      quoteId: quote.id,
      contactName: "Marcus Vance",
      contactEmail: email,
      contactPhone: "+49 176 1234567",
      scheduledDate: date,
      scheduledTime: "09:00",
    },
  });

  if (advanceTo) {
    for (const status of advanceTo) {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        token: admin.accessToken,
        body: { status },
      });
    }
  }

  console.log(`  ${order.reference}  ${service.padEnd(9)} ${order.totalGross} EUR  ${advanceTo?.at(-1) ?? "quoted"}`);
  return order;
}

// Spread across days so capacity (2/day) is never the reason one fails.
console.log("\nbooking demo orders:");
await book({ service: "moving", area: 85, date: "2026-10-27", advanceTo: ["confirmed"] });
await book({ service: "cleaning", area: 60, date: "2026-10-28", advanceTo: ["confirmed", "completed"] });
await book({ service: "disposal", area: 40, date: "2026-11-03" });
await book({ service: "cleaning", area: 55, date: "2026-11-05", advanceTo: ["confirmed", "completed"] });

console.log("\nsign in at the dashboard with:");
console.log(`  ${email} / ${password}`);
