/**
 * Assistant check across all four languages.
 *
 * Run through Node rather than a shell so non-ASCII text is not mangled by
 * the terminal's encoding on the way to the server.
 */
const BASE = "http://localhost:4000";

// The API rate-limits the assistant to 12 requests a minute, so the test
// paces itself rather than tripping its own defence.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function ask(message, locale) {
  await pause(300);
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, locale }),
  });

  const data = await res.json();

  if (data.error) return { kind: "ERROR", text: data.error.code };

  return {
    kind: data.reply.kind,
    intent: data.reply.intent,
    text: (data.reply.text || "").replace(/\n/g, " "),
  };
}

const CASES = [
  ["de", "Was kostet ein Umzug?", "pricing"],
  ["de", "bis wann kann ich stornieren", "cancellation"],
  ["de", "wann muss ich die anzahlung zahlen", "deposit"],
  ["de", "stellt ihr kartons", "packing_material"],
  ["en", "What does a move cost?", "pricing"],
  ["en", "how do I cancel my order", "cancellation"],
  ["en", "do I need an account", "account_needed"],
  ["ar", "كم تكلفة النقل", "pricing"],
  ["ar", "كيف الغي الطلب", "cancellation"],
  ["ar", "هل اثاثي مؤمن", "insurance"],
  ["ar", "ما هي الخدمات التي تقدمونها", "services"],
  ["tr", "Taşınma ne kadar tutar", "pricing"],
  ["tr", "nasıl iptal ederim", "cancellation"],
];

const UNKNOWN = [
  ["de", "wie ist das wetter morgen"],
  ["en", "do you sell bicycles"],
  ["ar", "ما هو الطقس غدا"],
];

let pass = 0;
const failures = [];

console.log("── Answers expected ──────────────────────────────────");

for (const [locale, question, expected] of CASES) {
  const reply = await ask(question, locale);
  const ok = reply.kind === "answer" && reply.intent === expected;

  console.log(
    `  ${ok ? "✓" : "✗"} [${locale}] ${question}\n      → ${reply.kind}${reply.intent ? "/" + reply.intent : ""}  ${reply.text.slice(0, 70)}`,
  );

  if (ok) pass++;
  else failures.push(`[${locale}] "${question}" expected ${expected}, got ${reply.kind}/${reply.intent ?? "-"}`);
}

console.log("\n── Should NOT invent an answer ───────────────────────");

for (const [locale, question] of UNKNOWN) {
  const reply = await ask(question, locale);
  const ok = reply.kind !== "answer";

  console.log(`  ${ok ? "✓" : "✗"} [${locale}] ${question} → ${reply.kind}`);

  if (ok) pass++;
  else failures.push(`[${locale}] "${question}" should not have been answered`);
}

const total = CASES.length + UNKNOWN.length;
console.log("\n" + "═".repeat(54));
console.log(`  ${pass}/${total} passed`);

if (failures.length > 0) {
  console.log("\n  FAILURES:");
  for (const f of failures) console.log("    " + f);
}

process.exit(failures.length > 0 ? 1 : 0);
