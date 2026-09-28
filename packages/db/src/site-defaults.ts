/**
 * The website's default theme and content.
 *
 * These seed the tables the dashboard edits. They are also what
 * `POST /api/site/settings/reset-theme` restores, so an admin who makes the
 * site unreadable can always get back — which is the only thing that makes
 * handing out live colour control reasonable in the first place.
 */

export interface SettingSeed {
  key: string;
  value: string;
  group: "theme" | "brand" | "contact" | "seo";
  kind: "color" | "text" | "textarea" | "url" | "email" | "number" | "boolean" | "image";
  label: string;
  description?: string;
  sortOrder: number;
}

/** Theme tokens only — what reset-theme puts back. */
export const THEME_DEFAULTS: SettingSeed[] = [
  {
    key: "color.brand",
    value: "#E62039",
    group: "theme",
    kind: "color",
    label: "Primary / brand",
    description: "Buttons, links and anything that invites action. Used sparingly on purpose.",
    sortOrder: 1,
  },
  {
    key: "color.brandHover",
    value: "#C4162E",
    group: "theme",
    kind: "color",
    label: "Primary — pressed",
    description: "A shade darker than the primary, for hover and active states.",
    sortOrder: 2,
  },
  {
    key: "color.ink",
    value: "#121214",
    group: "theme",
    kind: "color",
    label: "Ink / dark surface",
    description: "Headlines and the dashboard sidebar.",
    sortOrder: 3,
  },
  {
    key: "color.accent",
    value: "#FFCB08",
    group: "theme",
    kind: "color",
    label: "Accent",
    description: "Badges and highlight panels. Never used for text — it fails contrast at body size.",
    sortOrder: 4,
  },
  {
    key: "color.pageBackground",
    value: "#F8F9FA",
    group: "theme",
    kind: "color",
    label: "Page background",
    sortOrder: 5,
  },
  {
    key: "color.success",
    value: "#10B981",
    group: "theme",
    kind: "color",
    label: "Success",
    sortOrder: 6,
  },
  {
    key: "color.warning",
    value: "#F59E0B",
    group: "theme",
    kind: "color",
    label: "Warning",
    sortOrder: 7,
  },
  {
    key: "radius.base",
    value: "12",
    group: "theme",
    kind: "number",
    label: "Corner radius (px)",
    description: "Applies to cards, inputs and buttons together.",
    sortOrder: 8,
  },
  {
    key: "font.display",
    value: "Outfit",
    group: "theme",
    kind: "text",
    label: "Headline typeface",
    description: "Must be a Google Fonts family name.",
    sortOrder: 9,
  },
  {
    key: "font.body",
    value: "DM Sans",
    group: "theme",
    kind: "text",
    label: "Body typeface",
    sortOrder: 10,
  },
];

export const SETTING_DEFAULTS: SettingSeed[] = [
  ...THEME_DEFAULTS,

  // ── Brand ─────────────────────────────────────────────────────────────
  {
    key: "brand.name",
    value: "m.on",
    group: "brand",
    kind: "text",
    label: "Company name",
    sortOrder: 1,
  },
  {
    key: "brand.legalName",
    value: "m.on GmbH",
    group: "brand",
    kind: "text",
    label: "Legal name",
    description: "Used in the footer and on invoices.",
    sortOrder: 2,
  },
  {
    key: "brand.logo",
    value: "/images/brand/logo.png",
    group: "brand",
    kind: "image",
    label: "Logo",
    description: "Shown in the header, the footer and on the sign-in pages. Upload one, or give a path under /images/ or an https:// address.",
    sortOrder: 3,
  },
  {
    key: "brand.tagline",
    value: "Moving made simpler, faster, and stress-free.",
    group: "brand",
    kind: "text",
    label: "Tagline",
    sortOrder: 4,
  },

  // ── Contact ───────────────────────────────────────────────────────────
  {
    key: "contact.phone",
    value: "+49 30 123456",
    group: "contact",
    kind: "text",
    label: "Phone",
    sortOrder: 1,
  },
  {
    key: "contact.email",
    value: "info@moveongo.de",
    group: "contact",
    kind: "email",
    label: "Email",
    sortOrder: 2,
  },
  {
    key: "contact.address",
    value: "Musterstraße 1, 40212 Düsseldorf",
    group: "contact",
    kind: "text",
    label: "Address",
    sortOrder: 3,
  },
  {
    key: "contact.hours",
    value: "Mo–Fr 08:00–18:00, Sa 09:00–14:00",
    group: "contact",
    kind: "text",
    label: "Opening hours",
    sortOrder: 4,
  },

  // ── SEO ───────────────────────────────────────────────────────────────
  {
    key: "seo.titleSuffix",
    value: "m.on",
    group: "seo",
    kind: "text",
    label: "Title suffix",
    description: "Appended to every page title.",
    sortOrder: 1,
  },
  {
    key: "seo.defaultDescription",
    value:
      "Umzug, Entsorgung und Reinigung zum transparenten Festpreis — online berechnen, online anfragen.",
    group: "seo",
    kind: "textarea",
    label: "Default description",
    sortOrder: 2,
  },
];

export interface BlockSeed {
  section: string;
  slot: string;
  label: string;
  kind: "text" | "textarea";
  sortOrder: number;
  translations: Record<"de" | "en" | "ar" | "tr", string>;
}

/**
 * Website copy an admin can change without a developer.
 *
 * Deliberately limited to marketing copy. Legal pages, prices and anything the
 * pricing engine reads are NOT here: a typo in a rate card is a billing
 * incident, and terms are a legal document, so neither belongs behind a free
 * text box.
 */
export const CONTENT_DEFAULTS: BlockSeed[] = [
  // No "home" rows: home-content.ts seeds the homepage from the design. Rows
  // here were inserted first and, since seed-home never overwrites, left a
  // fresh database on older wording than the Figma frame.
  {
    section: "auth",
    slot: "panel.headline",
    label: "Login panel headline",
    kind: "text",
    sortOrder: 1,
    translations: {
      de: "Umzug — einfacher, schneller, stressfrei.",
      en: "Moving made simpler, faster, and stress-free.",
      ar: "النقل — أبسط وأسرع وبلا توتّر.",
      tr: "Taşınma — daha basit, daha hızlı, stressiz.",
    },
  },
  {
    section: "auth",
    slot: "panel.body",
    label: "Login panel text",
    kind: "textarea",
    sortOrder: 2,
    translations: {
      de: "Melde dich an, um deine Aufträge zu verwalten, deine Checkliste anzupassen und dein Team direkt zu erreichen.",
      en: "Log in to manage your bookings, customize your moving checklist, and connect with your dedicated professional team instantly.",
      ar: "سجّل الدخول لإدارة طلباتك، وتخصيص قائمة النقل، والتواصل مع فريقك مباشرةً.",
      tr: "Rezervasyonlarınızı yönetmek, taşınma listenizi özelleştirmek ve ekibinizle anında iletişim kurmak için giriş yapın.",
    },
  },
  {
    section: "footer",
    slot: "tagline",
    label: "Footer tagline",
    kind: "textarea",
    sortOrder: 1,
    translations: {
      de: "Umzug, Entsorgung & Reinigung zum transparenten Festpreis.",
      en: "Moving, disposal & cleaning at a transparent fixed price.",
      ar: "نقل وتخلّص من الأثاث وتنظيف بسعر ثابت وشفّاف.",
      tr: "Şeffaf sabit fiyatla nakliye, tasfiye ve temizlik.",
    },
  },
  {
    section: "footer",
    slot: "rights",
    label: "Copyright line",
    kind: "text",
    sortOrder: 2,
    translations: {
      de: "Alle Rechte vorbehalten.",
      en: "All rights reserved.",
      ar: "جميع الحقوق محفوظة.",
      tr: "Tüm hakları saklıdır.",
    },
  },
];
