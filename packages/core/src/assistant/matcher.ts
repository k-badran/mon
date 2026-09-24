/**
 * Intent matching for the support assistant.
 *
 * Replaces the previous design, which forwarded every message to an external
 * model. That approach had three problems: it returned 503 whenever the API
 * key was absent, it billed per message with no ceiling, and it could invent
 * answers about cancellation terms and pricing that contradicted the actual
 * business rules.
 *
 * This matches the question against a knowledge base held in the database, so
 * the assistant can only ever say things the company has actually written. It
 * needs no network, no key, and no budget — and it is deterministic, which
 * means it can be unit tested.
 *
 * When nothing matches well enough it says so and offers a human, rather than
 * guessing. That is the correct behaviour for a service business: a confident
 * wrong answer about a cancellation fee is worse than no answer.
 */

export interface KnowledgeEntry {
  id: string;
  locale: string;
  /** Stable identifier, e.g. "cancellation" — used for analytics and tests. */
  intent: string;
  /** Words and phrases that signal this intent. Matched case-insensitively. */
  keywords: readonly string[];
  question: string;
  answer: string;
  /** Higher wins ties. Lets a specific intent beat a general one. */
  priority: number;
}

export interface MatchResult {
  entry: KnowledgeEntry;
  /** 0-1. Above CONFIDENT_THRESHOLD the answer is given directly. */
  score: number;
}

export interface AssistantReply {
  kind: "answer" | "clarify" | "handoff";
  /** The answer text, or the fallback message. */
  text: string;
  intent?: string;
  /** Populated for "clarify": the near-misses worth offering as options. */
  suggestions?: Array<{ intent: string; question: string }>;
}

/** Above this, answer directly. */
const CONFIDENT_THRESHOLD = 0.45;
/** Between this and CONFIDENT_THRESHOLD, offer choices instead of guessing. */
const SUGGEST_THRESHOLD = 0.2;

/**
 * Words carrying no intent signal. Kept per language so a German question is
 * not reduced to noise by an English stop list.
 */
const STOP_WORDS: Record<string, ReadonlySet<string>> = {
  de: new Set([
    "ich", "du", "sie", "wir", "der", "die", "das", "ein", "eine", "einen", "und", "oder",
    "ist", "sind", "war", "wie", "was", "wann", "wo", "wer", "warum", "kann", "muss",
    "für", "mit", "von", "zu", "im", "in", "an", "auf", "bei", "es", "mir", "mich",
    "meine", "mein", "euch", "nicht", "auch", "noch", "schon", "man", "bitte",
    "ihr", "ihre", "stellt", "bietet", "habt", "haben", "gibt", "macht", "machen",
    "viel", "lange", "oft", "denn", "mal", "eigentlich",
  ]),
  en: new Set([
    "i", "you", "we", "the", "a", "an", "and", "or", "is", "are", "was", "how", "what",
    "when", "where", "who", "why", "can", "must", "for", "with", "from", "to", "in",
    "on", "at", "it", "me", "my", "your", "not", "also", "do", "does", "please",
  ]),
  ar: new Set([
    "انا", "أنا", "هل", "ما", "ماذا", "متى", "اين", "أين", "من", "لماذا", "كيف",
    "في", "على", "الى", "إلى", "مع", "عن", "هذا", "هذه", "ذلك", "التي", "الذي",
    "و", "أو", "او", "لا", "نعم", "يمكن", "يجب", "لي", "لك", "من فضلك",
    "هي", "هو", "هم", "عندكم", "لديكم", "عندك", "شو", "وش", "ايش", "أيش",
  ]),
  tr: new Set([
    "ben", "sen", "biz", "bir", "ve", "veya", "mi", "mı", "nasıl", "ne", "ne zaman",
    "nerede", "kim", "neden", "için", "ile", "den", "dan", "de", "da", "bu", "şu",
    "değil", "var", "yok", "lütfen", "ederim", "edebilirim", "yapabilirim",
    "misiniz", "musunuz", "sunuyorsunuz", "veriyorsunuz",
  ]),
};

/**
 * Normalises text for comparison.
 *
 * Folds German umlauts and Arabic diacritics so that "Stornierung" matches
 * "stornierung" and "إلغاء" matches "الغاء" — users type both.
 */
export function normalize(text: string, locale: string): string[] {
  let value = text.toLowerCase().trim();

  if (locale === "de") {
    value = value
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  }

  if (locale === "ar") {
    // Strip harakat and unify alef/ya/ta-marbuta variants.
    value = value
      .replace(/[ً-ْٰ]/g, "")
      .replace(/[إأآٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه");
  }

  const stopWords = STOP_WORDS[locale] ?? STOP_WORDS.en!;

  const tokens = value
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 && !stopWords.has(word));

  if (locale !== "ar") return tokens;

  /**
   * Strip the Arabic definite article.
   *
   * "الخدمات" and "خدمات" are the same word, and customers type both. Done per
   * token after splitting, and only when enough of the word remains, so short
   * words that merely begin with those two letters are left intact.
   */
  return tokens.map((token) =>
    token.startsWith("ال") && token.length >= 5 ? token.slice(2) : token,
  );
}

/**
 * Scores one entry against the question's tokens.
 *
 * Combines two signals: how many of the entry's keywords the question contains
 * (recall), and how much of the question the entry explains (precision). Using
 * both stops a keyword-heavy entry from winning every question by sheer size.
 */
function score(tokens: readonly string[], entry: KnowledgeEntry, locale: string): number {
  if (tokens.length === 0) return 0;

  const entryTokens = new Set(
    entry.keywords.flatMap((keyword) => normalize(keyword, locale)),
  );

  if (entryTokens.size === 0) return 0;

  let matched = 0;

  for (const token of tokens) {
    for (const entryToken of entryTokens) {
      const exact = token === entryToken;
      // Prefix matching handles German compounds ("storno" → "stornierung")
      // and Arabic prefixed forms, but only from three characters up, or
      // short tokens would match almost anything.
      const prefix =
        token.length >= 3 &&
        entryToken.length >= 3 &&
        (entryToken.startsWith(token) || token.startsWith(entryToken));

      if (exact || prefix) {
        matched += exact ? 1 : 0.75;
        break;
      }
    }
  }

  if (matched === 0) return 0;

  /**
   * Coverage: how much of what the customer asked this entry accounts for.
   *
   * Recall over the entry's own keywords is deliberately NOT used. An entry
   * listing nine synonyms would then score lower than a sparse one for the
   * same question, which is backwards — a rich keyword list should help an
   * entry match, not penalise it.
   */
  const coverage = matched / tokens.length;

  // A second independent hit is strong evidence; beyond that it adds little.
  const corroboration = Math.min(matched, 2) / 2;

  const combined = coverage * 0.75 + corroboration * 0.25;

  // Priority only breaks ties between comparable matches.
  return Math.min(1, combined * (1 + entry.priority * 0.03));
}

export function findMatches(
  question: string,
  knowledge: readonly KnowledgeEntry[],
  locale: string,
): MatchResult[] {
  const tokens = normalize(question, locale);

  // Fall back to the German base when a locale has no entries yet, so a new
  // language degrades to "answers in German" rather than to silence.
  const scoped = knowledge.filter((entry) => entry.locale === locale);
  const pool = scoped.length > 0 ? scoped : knowledge.filter((entry) => entry.locale === "de");

  return pool
    .map((entry) => ({ entry, score: score(tokens, entry, locale) }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score);
}

/** Messages shown when the assistant cannot answer. Per locale. */
const FALLBACK: Record<string, { clarify: string; handoff: string }> = {
  de: {
    clarify: "Meintest du vielleicht eine dieser Fragen?",
    handoff:
      "Das kann ich leider nicht sicher beantworten. Möchtest du mit jemandem aus " +
      "unserem Team sprechen? Du kannst uns auch unter info@umzugplus.de erreichen.",
  },
  en: {
    clarify: "Did you mean one of these?",
    handoff:
      "I am not able to answer that reliably. Would you like to talk to someone from " +
      "our team? You can also reach us at info@umzugplus.de.",
  },
  ar: {
    clarify: "هل تقصد أحد هذه الأسئلة؟",
    handoff:
      "لا أستطيع الإجابة على هذا بثقة. هل تودّ التحدّث مع أحد من فريقنا؟ " +
      "يمكنك أيضًا مراسلتنا على info@umzugplus.de.",
  },
  tr: {
    clarify: "Bunlardan birini mi kastettiniz?",
    handoff:
      "Bunu güvenle yanıtlayamıyorum. Ekibimizden biriyle görüşmek ister misiniz? " +
      "Bize info@umzugplus.de adresinden de ulaşabilirsiniz.",
  },
};

/**
 * Produces a reply.
 *
 * Three outcomes, deliberately distinct: a confident answer, a request to
 * disambiguate, or an offer to fetch a human. It never invents a third thing.
 */
export function answer(
  question: string,
  knowledge: readonly KnowledgeEntry[],
  locale: string,
): AssistantReply {
  const fallback = FALLBACK[locale] ?? FALLBACK.de!;
  const matches = findMatches(question, knowledge, locale);
  const best = matches[0];

  if (best && best.score >= CONFIDENT_THRESHOLD) {
    return { kind: "answer", text: best.entry.answer, intent: best.entry.intent };
  }

  const near = matches.filter((match) => match.score >= SUGGEST_THRESHOLD).slice(0, 3);

  if (near.length > 0) {
    return {
      kind: "clarify",
      text: fallback.clarify,
      suggestions: near.map((match) => ({
        intent: match.entry.intent,
        question: match.entry.question,
      })),
    };
  }

  return { kind: "handoff", text: fallback.handoff };
}

export const ASSISTANT_THRESHOLDS = {
  confident: CONFIDENT_THRESHOLD,
  suggest: SUGGEST_THRESHOLD,
} as const;
