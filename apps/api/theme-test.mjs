/**
 * Proves the dashboard actually drives the website.
 *
 * Changes a theme colour through the admin API, then reads the rendered HTML
 * back and checks the new value is in the page — end to end, not just stored.
 */
const API = "http://localhost:4000";
const WEB = "http://localhost:3200";

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
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

const admin = await api("/api/auth/login", {
  method: "POST",
  body: { email: "admin@moveongo.de", password: "ChangeMe123!" },
});
console.log("1. signed in as admin\n");

// ── A customer must not be able to restyle the site ──────────────────────
const email = `theme-${Date.now()}@test.de`;
const customer = await api("/api/auth/register", {
  method: "POST",
  body: { email, password: "a-long-enough-password", fullName: "Theme Test" },
});

const refused = await fetch(`${API}/api/site/settings/color.brand`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${customer.accessToken}` },
  body: JSON.stringify({ value: "#00FF00" }),
});
console.log(`2. customer tries to change the brand colour → ${refused.status} ${(await refused.json()).error?.code}`);

// ── A bad value must be refused, not stored ──────────────────────────────
const badColour = await fetch(`${API}/api/site/settings/color.brand`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.accessToken}` },
  body: JSON.stringify({ value: "bright red please" }),
});
console.log(`3. admin sends prose into a colour field → ${badColour.status} ${(await badColour.json()).error?.code}`);

// ── The real change ──────────────────────────────────────────────────────
const NEW = "#0EA5E9";
await api("/api/site/settings/color.brand", {
  method: "PATCH",
  token: admin.accessToken,
  body: { value: NEW },
});
console.log(`\n4. admin sets the brand colour to ${NEW}`);

// The site revalidates its theme, so allow for that before reading it back.
await new Promise((resolve) => setTimeout(resolve, 2000));

async function brandInPage() {
  const html = await (await fetch(`${WEB}/en/login`, { cache: "no-store" })).text();
  const style = html.match(/:root\{([^}]*)\}/)?.[1] ?? "";
  return { present: style.includes(NEW), style: style.slice(0, 90) };
}

let seen = await brandInPage();

// Next caches the fetch for 60s; a couple of retries covers the boundary.
for (let attempt = 0; attempt < 30 && !seen.present; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  seen = await brandInPage();
}

console.log(`5. website HTML contains it: ${seen.present ? "YES ✓" : "no ✗"}`);
if (seen.style) console.log(`   emitted: :root{${seen.style}…}`);

// ── Put it back ──────────────────────────────────────────────────────────
await api("/api/site/settings/reset-theme", { method: "POST", token: admin.accessToken });
console.log("\n6. theme reset to defaults");

const after = await (await fetch(`${API}/api/site/theme`)).json();
console.log(`   brand colour is now ${after.theme["color.brand"]}`);

process.exit(seen.present ? 0 : 1);
