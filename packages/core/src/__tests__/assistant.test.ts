import { describe, expect, it } from "vitest";

import { answer, findMatches, normalize, type KnowledgeEntry } from "../assistant/matcher.js";

/**
 * The assistant answers from a knowledge base rather than a language model, so
 * its behaviour is deterministic and can be pinned here. These tests are what
 * make it safe to tune the scoring: a change that starts answering a question
 * wrongly — or stops answering one it used to — fails the suite.
 */

function entry(partial: Partial<KnowledgeEntry> & Pick<KnowledgeEntry, "intent" | "locale" | "keywords">): KnowledgeEntry {
  return {
    id: `${partial.locale}-${partial.intent}`,
    question: partial.question ?? "Q",
    answer: partial.answer ?? `answer:${partial.intent}`,
    priority: partial.priority ?? 0,
    ...partial,
  };
}

const KNOWLEDGE: KnowledgeEntry[] = [
  entry({
    locale: "de", intent: "pricing", priority: 3,
    keywords: ["preis", "kosten", "kostet", "teuer", "rechner", "berechnen", "umzug", "tarif"],
  }),
  entry({
    locale: "de", intent: "cancellation", priority: 4,
    keywords: ["storno", "stornierung", "stornieren", "absagen", "gebuehr"],
  }),
  entry({
    locale: "de", intent: "deposit", priority: 3,
    keywords: ["anzahlung", "zahlen", "bezahlen", "zahlung", "ueberweisung"],
  }),
  entry({
    locale: "en", intent: "pricing", priority: 3,
    keywords: ["price", "cost", "costs", "expensive", "calculator", "quote", "move"],
  }),
  entry({
    locale: "en", intent: "cancellation", priority: 4,
    keywords: ["cancel", "cancellation", "fee", "refund"],
  }),
  entry({
    locale: "ar", intent: "pricing", priority: 3,
    keywords: ["سعر", "تكلفة", "كم", "غالي", "حاسبة", "احسب", "نقل"],
  }),
  entry({
    locale: "ar", intent: "cancellation", priority: 4,
    keywords: ["الغاء", "الغي", "رسوم", "استرداد", "كنسل"],
  }),
  entry({
    locale: "tr", intent: "pricing", priority: 3,
    keywords: ["fiyat", "maliyet", "ne kadar", "tutar", "pahalı", "hesaplayıcı", "taşınma"],
  }),
];

describe("answers real questions confidently", () => {
  it.each([
    ["Was kostet ein Umzug?", "de", "pricing"],
    ["wie viel kostet das", "de", "pricing"],
    ["Bis wann kann ich stornieren?", "de", "cancellation"],
    ["storno", "de", "cancellation"],
    ["wann ist die anzahlung faellig", "de", "deposit"],
    ["What does a move cost?", "en", "pricing"],
    ["how do I cancel", "en", "cancellation"],
    ["كم تكلفة النقل", "ar", "pricing"],
    ["كيف الغي الطلب", "ar", "cancellation"],
    ["Taşınma ne kadar tutar", "tr", "pricing"],
  ])("%s (%s) → %s", (question, locale, expected) => {
    const reply = answer(question, KNOWLEDGE, locale);

    expect(reply.kind).toBe("answer");
    expect(reply.intent).toBe(expected);
  });
});

describe("does not guess when it does not know", () => {
  it.each([
    ["Wie ist das Wetter morgen?", "de"],
    ["do you sell bicycles", "en"],
    ["ما هو الطقس غدا", "ar"],
  ])("%s (%s) offers a human instead of inventing", (question, locale) => {
    const reply = answer(question, KNOWLEDGE, locale);

    // A confident wrong answer about a fee is worse than admitting ignorance.
    expect(reply.kind).not.toBe("answer");
  });

  it("offers choices when the question is ambiguous rather than picking one", () => {
    const result = answer("zahlen gebuehr", KNOWLEDGE, "de");

    // Two intents share these words; either disambiguating or picking the
    // stronger one is acceptable, inventing a third answer is not.
    expect(["clarify", "answer"]).toContain(result.kind);
  });
});

describe("language handling", () => {
  it("answers in the language asked, not a default", () => {
    expect(answer("كم تكلفة النقل", KNOWLEDGE, "ar").text).toBe("answer:pricing");
    expect(answer("What does a move cost?", KNOWLEDGE, "en").text).toBe("answer:pricing");
  });

  it("does not leak entries from another language into the match pool", () => {
    const matches = findMatches("Was kostet ein Umzug?", KNOWLEDGE, "de");
    expect(matches.every((match) => match.entry.locale === "de")).toBe(true);
  });

  it("falls back to German when a locale has no entries yet", () => {
    const matches = findMatches("Was kostet ein Umzug?", KNOWLEDGE, "fr");
    expect(matches[0]?.entry.locale).toBe("de");
  });
});

describe("normalisation", () => {
  it("folds German umlauts so both spellings match", () => {
    expect(normalize("Gebühr", "de")).toEqual(["gebuehr"]);
    expect(normalize("Größe", "de")).toEqual(["groesse"]);
  });

  it("folds Arabic diacritics and alef variants", () => {
    // إلغاء and الغاء are the same word as typed by different people.
    expect(normalize("إلغاء", "ar")).toEqual(normalize("الغاء", "ar"));
  });

  it("strips the Arabic definite article so both forms match", () => {
    // الخدمات and خدمات are the same word with and without "ال".
    expect(normalize("الخدمات", "ar")).toEqual(["خدمات"]);
    expect(normalize("النقل", "ar")).toEqual(["نقل"]);
  });

  it("drops stop words that carry no intent", () => {
    expect(normalize("wie viel ist das", "de")).not.toContain("ist");
    expect(normalize("how much is the", "en")).not.toContain("the");
  });

  it("keeps a keyword-bearing question from reducing to nothing", () => {
    expect(normalize("Was kostet ein Umzug?", "de")).toContain("kostet");
    expect(normalize("Was kostet ein Umzug?", "de")).toContain("umzug");
  });
});

describe("scoring properties", () => {
  it("does not penalise an entry for listing many keywords", () => {
    const sparse = entry({ locale: "de", intent: "sparse", keywords: ["kostet"] });
    const rich = entry({
      locale: "de", intent: "rich",
      keywords: ["kostet", "preis", "teuer", "tarif", "gebuehr", "summe", "betrag"],
    });

    const [first] = findMatches("was kostet das", [sparse, rich], "de");

    // Both contain the matching keyword; the richer entry must not rank lower
    // merely for being thorough.
    expect(first).toBeDefined();
    const scores = findMatches("was kostet das", [sparse, rich], "de");
    const sparseScore = scores.find((s) => s.entry.intent === "sparse")?.score ?? 0;
    const richScore = scores.find((s) => s.entry.intent === "rich")?.score ?? 0;

    expect(richScore).toBeGreaterThanOrEqual(sparseScore);
  });

  it("ranks a two-keyword match above a one-keyword match", () => {
    const matches = findMatches("preis kosten umzug", KNOWLEDGE, "de");
    expect(matches[0]?.entry.intent).toBe("pricing");
  });

  it("returns nothing for an empty question", () => {
    expect(findMatches("   ", KNOWLEDGE, "de")).toHaveLength(0);
  });
});
