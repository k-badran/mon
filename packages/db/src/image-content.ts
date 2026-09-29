/**
 * The public pages' photographs, as editable content blocks.
 *
 * Every photo the site shows used to be a path hardcoded in a page component,
 * so replacing one — a stock image with another company's truck on it, say —
 * needed a developer. Each is now a `content_blocks` row of kind "image" whose
 * value is the picture's `/images/...` path (a file in `apps/web/public`) or an
 * https URL. The seeded value is the file the page shipped with, which the
 * page also keeps as its built-in fallback, so a database without these rows
 * renders exactly as before.
 *
 * A photograph does not change with the language, so each row carries the
 * same value in all four locales and the API writes an edit to all four at
 * once. The rows still exist per locale because `content_blocks` is keyed by
 * (section, slot, locale) and the public read is per locale; one row per
 * locale keeps that read a single indexed query with no special case.
 *
 * Alt texts are not here: where a photo has one it is already a text row in
 * its section, translated like any other copy.
 *
 * The slot sits next to the text it illustrates (`hero.image` beside
 * `hero.headline`), and its sort order places it there in the editor too.
 */

import type { ContentSeed } from "./page-content.js";

/** Shorthand: an image row is one value repeated across the locales. */
function image(section: string, slot: string, label: string, sortOrder: number, src: string): ContentSeed {
  return {
    section,
    slot,
    kind: "image",
    label,
    sortOrder,
    values: { de: src, en: src, ar: src, tr: src },
  };
}

const HOME = "home";
const MOVING = "service-moving";
const CLEANING = "service-cleaning";
const ABOUT = "page-about";
const BLOG = "page-blog";
const BUSINESS = "page-for-business";
const CONTACT = "page-contact";
const HOW = "page-how-it-works";
const REVIEWS = "page-reviews";

export const IMAGE_CONTENT: ContentSeed[] = [
  // ══ Homepage (86:4671) ═════════════════════════════════════════════
  image(HOME, "hero.taglineImage", "Hero — tagline wordmark (image)", 1, "/images/home/tagline-move-on-go-on.png"),
  image(HOME, "hero.image", "Hero — truck photo", 2, "/images/home/hero-truck.jpg"),
  image(HOME, "services.moving.image", "Services — Moving card photo", 11, "/images/home/circular-photo-wrapper.jpg"),
  image(HOME, "services.disposal.image", "Services — Clearance card photo", 15, "/images/home/circular-photo-wrapper-2.jpg"),
  image(HOME, "services.cleaning.image", "Services — Cleaning card photo", 19, "/images/home/circular-photo-wrapper-3.jpg"),
  // Cards 4–6 reuse the first three photos, exactly as the frame does.
  image(HOME, "services.packing.image", "Services — Packing card photo", 23, "/images/home/circular-photo-wrapper.jpg"),
  image(HOME, "services.assembly.image", "Services — Assembly card photo", 27, "/images/home/circular-photo-wrapper-2.jpg"),
  image(HOME, "services.storage.image", "Services — Storage card photo", 31, "/images/home/circular-photo-wrapper-3.jpg"),
  image(HOME, "values.image", "What makes us m.on — photo", 38, "/images/home/values-team.jpg"),
  image(HOME, "promise.image", "Promise — photo", 56, "/images/home/promise-truck-interior.jpg"),
  image(HOME, "experience.team.image", "Experience — first photo (team)", 61, "/images/home/experience-team.jpg"),
  image(HOME, "experience.work.image", "Experience — second photo (work)", 64, "/images/home/experience-work.jpg"),
  image(HOME, "experience.result.image", "Experience — third photo (result)", 67, "/images/home/experience-result.jpg"),

  // ══ Moving (106:10195) ═════════════════════════════════════════════
  image(MOVING, "hero.image", "Hero — background photo", 5, "/images/service-moving/page-hero.jpg"),
  image(MOVING, "included.image", "Included — banner photo", 12, "/images/service-moving/checklist-photo.jpg"),
  // The frame's own fill for this card shows a truck in the old UmzugPlus
  // livery; the default is the m.on-liveried truck from the homepage hero,
  // cropped to the 760×620 card.
  image(MOVING, "gallery.1.image", "Gallery — large photo", 53, "/images/service-moving/gallery-residential-mon.jpg"),
  image(MOVING, "gallery.2.image", "Gallery — upper small photo", 54, "/images/service-moving/rectangle-2.jpg"),
  image(MOVING, "gallery.3.image", "Gallery — lower small photo", 55, "/images/service-moving/rectangle-3.jpg"),

  // ══ Cleaning (136:319, programmes 136:533) ═════════════════════════
  image(CLEANING, "hero.image", "Hero — background photo", 5, "/images/service-cleaning/page-hero.jpg"),
  image(CLEANING, "programs.1.image", "Programme 1 — photo", 14, "/images/service-cleaning/program-end-of-tenancy.jpg"),
  image(CLEANING, "programs.2.image", "Programme 2 — photo", 17, "/images/service-cleaning/program-deep-home.jpg"),
  image(CLEANING, "programs.3.image", "Programme 3 — photo", 19, "/images/service-cleaning/program-commercial-office.jpg"),
  image(CLEANING, "gallery.beforeImage", "Before / after — before photo", 33, "/images/service-cleaning/rectangle.jpg"),
  image(CLEANING, "gallery.afterImage", "Before / after — after photo", 34, "/images/service-cleaning/rectangle-2.jpg"),

  // ══ About ══════════════════════════════════════════════════════════
  image(ABOUT, "values.image", "Values — photo", 21, "/images/page-about/rectangle.jpg"),
  image(ABOUT, "team.1.image", "Team member 1 — portrait", 43, "/images/page-about/rectangle-2.jpg"),
  image(ABOUT, "team.2.image", "Team member 2 — portrait", 45, "/images/page-about/rectangle-3.jpg"),
  image(ABOUT, "team.3.image", "Team member 3 — portrait", 47, "/images/page-about/rectangle-4.jpg"),
  image(ABOUT, "fleet.image", "Fleet — photo", 62, "/images/page-about/rectangle-5.jpg"),

  // ══ Guide / blog ═══════════════════════════════════════════════════
  image(BLOG, "featured.image", "Featured article — photo", 6, "/images/page-blog/rectangle.jpg"),
  image(BLOG, "articles.1.image", "Article 1 — photo", 14, "/images/page-blog/rectangle-2.jpg"),
  image(BLOG, "articles.2.image", "Article 2 — photo", 18, "/images/page-blog/rectangle-3.jpg"),
  image(BLOG, "articles.3.image", "Article 3 — photo", 22, "/images/page-blog/rectangle-4.jpg"),
  image(BLOG, "articles.4.image", "Article 4 — photo", 26, "/images/page-blog/rectangle-5.jpg"),

  // ══ For business ═══════════════════════════════════════════════════
  image(BUSINESS, "hero.image", "Hero — background photo", 3, "/images/page-for-business/page-hero.jpg"),
  image(BUSINESS, "services.1.image", "Service tile 1 — photo", 30, "/images/page-for-business/rectangle.jpg"),
  image(BUSINESS, "services.2.image", "Service tile 2 — photo", 32, "/images/page-for-business/rectangle-2.jpg"),
  image(BUSINESS, "services.3.image", "Service tile 3 — photo", 34, "/images/page-for-business/rectangle-3.jpg"),

  // ══ Contact ════════════════════════════════════════════════════════
  image(CONTACT, "form.image", "Beside the form — map image", 18, "/images/page-contact/rectangle.jpg"),

  // ══ How it works ═══════════════════════════════════════════════════
  image(HOW, "steps.1.image", "Step 1 — illustration", 12, "/images/page-how-it-works/rectangle.jpg"),
  image(HOW, "steps.2.image", "Step 2 — illustration", 14, "/images/page-how-it-works/rectangle-2.jpg"),
  image(HOW, "steps.3.image", "Step 3 — illustration", 16, "/images/page-how-it-works/rectangle-3.jpg"),
  image(HOW, "steps.4.image", "Step 4 — illustration", 18, "/images/page-how-it-works/rectangle-4.jpg"),

  // ══ Reviews ════════════════════════════════════════════════════════
  image(REVIEWS, "reviews.1.avatar", "Review 1 — avatar", 18, "/images/page-reviews/rectangle.jpg"),
  image(REVIEWS, "reviews.2.avatar", "Review 2 — avatar", 22, "/images/page-reviews/rectangle-2.jpg"),
  image(REVIEWS, "reviews.3.avatar", "Review 3 — avatar", 26, "/images/page-reviews/rectangle-3.jpg"),
];

/** The seeded default for an image slot, for the dashboard's reset. */
export function imageDefault(section: string, slot: string): string | undefined {
  return IMAGE_CONTENT.find((seed) => seed.section === section && seed.slot === slot)?.values.en;
}
