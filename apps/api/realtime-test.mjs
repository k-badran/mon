/**
 * Manual end-to-end check of the realtime gateway.
 *
 * Opens an authenticated admin socket, then books an order over REST from a
 * separate customer session, and asserts the admin socket receives the event
 * without polling. Run with the API up:  node realtime-test.mjs
 */
import { io } from "socket.io-client";

const BASE = "http://localhost:4000";

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(`${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

// 1. Admin signs in and opens a socket.
const admin = await api("/api/auth/login", {
  method: "POST",
  body: { email: "admin@moveongo.de", password: "ChangeMe123!" },
});
console.log("1. admin signed in     :", admin.user.email, `(${admin.user.role})`);

const socket = io(BASE, { path: "/realtime", auth: { token: admin.accessToken } });

const connected = new Promise((resolve, reject) => {
  socket.on("connect", () => resolve());
  socket.on("connect_error", (e) => reject(new Error(`socket refused: ${e.message}`)));
  setTimeout(() => reject(new Error("socket connect timed out")), 10_000);
});

await connected;
console.log("2. admin socket open   : joined role:staff automatically");

// Wait for the event the booking below will produce.
const received = new Promise((resolve, reject) => {
  socket.on("order.created", (envelope) => resolve(envelope));
  setTimeout(() => reject(new Error("no realtime event within 15s")), 15_000);
});

// 2. An unauthenticated socket must be refused.
const anon = io(BASE, { path: "/realtime", auth: {} });
const refused = await new Promise((resolve) => {
  anon.on("connect_error", (e) => resolve(e.message));
  anon.on("connect", () => resolve("UNEXPECTEDLY CONNECTED"));
  setTimeout(() => resolve("no response"), 8000);
});
anon.close();
console.log("3. anonymous socket    :", refused);

// 3. A customer books, over REST, in a completely separate session.
const email = `rt-${Date.now()}@test.de`;
const customer = await api("/api/auth/register", {
  method: "POST",
  body: { email, password: "a-long-enough-password", fullName: "Realtime Kunde" },
});

const quote = await api("/api/quotes", {
  method: "POST",
  body: {
    input: {
      serviceType: "cleaning",
      originAddress: "Königsallee 1, 40212 Düsseldorf",
      calculationMethod: "area",
      areaSqm: 55,
      extras: {},
      crewSize: 2,
    },
  },
});

const order = await api("/api/orders", {
  method: "POST",
  token: customer.accessToken,
  body: {
    quoteId: quote.id,
    contactName: "Realtime Kunde",
    contactEmail: email,
    contactPhone: "+4917600000",
    scheduledDate: "2026-12-08",
    scheduledTime: "09:00",
  },
});
console.log("4. customer booked     :", order.reference, order.totalGross, "EUR (via REST)");

// 4. The admin socket should already have it.
const envelope = await received;
console.log("5. admin got the event :", envelope.event, "seq", envelope.sequence);
console.log("   payload             :", JSON.stringify(envelope.payload));
console.log("   no reload, no poll   — pushed from the server after commit");

socket.close();
process.exit(0);
