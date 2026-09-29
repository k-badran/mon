/**
 * The topics an FAQ entry can belong to.
 *
 * Shared because three places have to agree on them: `faq_entries.category`
 * stores the key, the API validates it on write and filters by it on read,
 * and the website turns it into a translated chip label. A key the website
 * has no label for would render as a raw string, so the list lives here once.
 *
 * The order is the order the chips appear in (after "All"), not alphabetical:
 * it follows the homepage frame 86:4671, which reads Insurance, Billing,
 * Booking, Cleaning, with the two topics the frame does not draw at the end.
 *
 * `general` is also what a row with no category means — the column is
 * nullable so entries written before it existed need no guess at a topic.
 */

export const FAQ_CATEGORIES = [
  "insurance",
  "billing",
  "booking",
  "cleaning",
  "moving",
  "general",
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export const DEFAULT_FAQ_CATEGORY: FaqCategory = "general";

export function isFaqCategory(value: unknown): value is FaqCategory {
  return typeof value === "string" && (FAQ_CATEGORIES as readonly string[]).includes(value);
}

/** Narrows a stored value to a category; null or unknown reads as `general`. */
export function toFaqCategory(value: unknown): FaqCategory {
  return isFaqCategory(value) ? value : DEFAULT_FAQ_CATEGORY;
}
