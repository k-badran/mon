/**
 * Content for the pages that have no Figma frame of their own.
 *
 * Kept separate from `page-content.ts` so the two can be edited independently.
 *
 * ## Why these pages exist without a design
 *
 * **Clearance (`service-disposal`).** The M.io file draws `service-moving` and
 * `service-cleaning` but not clearance — even though clearance is one of the
 * three services on the homepage, one of the add-ons on the moving page, and a
 * link in the footer. It takes the layout the user supplied for it, the
 * cleaning page's sections with text programme cards and no prices, and every
 * string below is drawn from what the design *does* say about clearance: the
 * homepage service card, the moving page's "Clearance & Disposal" add-on, and
 * the footer's "Household Clearance".
 *
 * **Legal pages.** Imprint, privacy and terms carry statutory text, not
 * marketing copy. The rows here are the page's own headings and its lead
 * paragraph; the legal body itself stays with the operator to supply, because
 * inventing it would be worse than leaving it visibly unset.
 */

import type { ContentSeed } from "./page-content.js";

function row(
  section: string,
  slot: string,
  label: string,
  sortOrder: number,
  values: ContentSeed["values"],
  kind: ContentSeed["kind"] = "text",
): ContentSeed {
  return { section, slot, kind, label, sortOrder, values };
}

const D = "service-disposal";

export const EXTRA_CONTENT: ContentSeed[] = [
  // ══ Clearance & disposal ═══════════════════════════════════════════
  row(D, "hero.eyebrow", "Hero — eyebrow", 1, {
    de: "Entrümpelung",
    en: "Clearance",
    ar: "الإخلاء",
    tr: "Boşaltma",
  }),
  row(D, "hero.headline", "Hero — headline", 2, {
    de: "Professionelle und saubere Haushaltsauflösungen",
    en: "Professional and spotless household clearances",
    ar: "إخلاء منزلي احترافي ونظيف تماماً",
    tr: "Profesyonel ve tertemiz ev boşaltma",
  }),
  row(
    D,
    "hero.subline",
    "Hero — subline",
    3,
    {
      de: "Von einzelnen Möbeln bis zur kompletten Haushaltsauflösung — fachgerecht entsorgt, dokumentiert und mit Entsorgungsnachweis.",
      en: "From a single wardrobe to a full house clearance — disposed of properly, documented, and with a certificate of disposal.",
      ar: "من قطعة أثاث واحدة إلى إخلاء منزل كامل — تخلّص نظامي وموثّق مع شهادة تخلّص.",
      tr: "Tek bir dolaptan tüm ev boşaltmaya — usulüne uygun, belgeli ve bertaraf sertifikalı.",
    },
    "textarea",
  ),
  row(D, "hero.ctaPrimary", "Hero — primary button", 4, {
    de: "Kostenloses Angebot",
    en: "Get Free Quote",
    ar: "احصل على عرض مجاني",
    tr: "Ücretsiz Teklif Al",
  }),
  row(D, "hero.ctaSecondary", "Hero — secondary button", 5, {
    de: "Unsere Preise",
    en: "Our Rates",
    ar: "أسعارنا",
    tr: "Fiyatlarımız",
  }),

  // ── Programmes: three text cards, as the layout supplied for this page ──
  // No prices, as drawn. A `programs.N.price` row added in the dashboard
  // brings the red pill back on that card.
  row(D, "programs.eyebrow", "Programmes — eyebrow", 10, {
    de: "Unsere Leistungen",
    en: "Our Programs",
    ar: "برامجنا",
    tr: "Programlarımız",
  }),
  row(D, "programs.headline", "Programmes — headline", 11, {
    de: "Entrümpelung für jeden Raum",
    en: "Clearance for Every Space",
    ar: "إخلاء لكل مساحة",
    tr: "Her Alan İçin Boşaltma",
  }),

  row(D, "programs.1.title", "Programme 1 — title", 12, {
    de: "Haushaltsauflösung",
    en: "Household Clearance",
    ar: "إخلاء المنازل",
    tr: "Ev Boşaltma",
  }),
  row(
    D,
    "programs.1.body",
    "Programme 1 — description",
    13,
    {
      de: "Komplette Wohnungs- und Hausauflösungen: Möbel, Geräte und Hausrat werden abgeholt, fachgerecht entsorgt und die Räume besenrein übergeben.",
      en: "Complete apartment and house clearances: furniture, appliances and household goods collected, disposed of properly, and the rooms handed over broom-clean.",
      ar: "إخلاء كامل للشقق والمنازل: نجمع الأثاث والأجهزة والأغراض المنزلية ونتخلّص منها بشكل نظامي، ونسلّم الغرف نظيفة.",
      tr: "Daire ve evlerin eksiksiz boşaltılması: mobilya, cihaz ve ev eşyaları toplanır, usulüne uygun bertaraf edilir ve odalar süpürülmüş teslim edilir.",
    },
    "textarea",
  ),
  row(D, "programs.1.check.1", "Programme 1 — item 1", 14, {
    de: "Möbel- & Geräteabholung",
    en: "Furniture & Appliance Removal",
    ar: "نقل الأثاث والأجهزة",
    tr: "Mobilya ve Cihaz Taşıma",
  }),
  row(D, "programs.1.check.2", "Programme 1 — item 2", 15, {
    de: "Festpreis nach m²",
    en: "Fixed Price by m²",
    ar: "سعر ثابت حسب المتر المربع",
    tr: "m²'ye Göre Sabit Fiyat",
  }),
  row(D, "programs.1.check.3", "Programme 1 — item 3", 16, {
    de: "Zertifizierte Entsorgung",
    en: "Certified Disposal",
    ar: "تخلّص معتمد",
    tr: "Sertifikalı Bertaraf",
  }),
  row(D, "programs.1.check.4", "Programme 1 — item 4", 17, {
    de: "Besenreine Übergabe",
    en: "Broom-Clean Handover",
    ar: "تسليم نظيف",
    tr: "Süpürülmüş Teslim",
  }),

  row(D, "programs.2.title", "Programme 2 — title", 20, {
    de: "Keller & Dachboden",
    en: "Cellar & Attic Clearance",
    ar: "إخلاء الأقبية والعلّيات",
    tr: "Bodrum ve Tavan Arası Boşaltma",
  }),
  row(
    D,
    "programs.2.body",
    "Programme 2 — description",
    21,
    {
      de: "Keller, Dachböden und Garagen, befreit von jahrelang Gelagertem — inklusive Sperrmüll und Altholz.",
      en: "Cellars, attics and garages cleared of years of storage — including bulky waste and scrap timber.",
      ar: "نُخلي الأقبية والعلّيات والكراجات من أغراض مخزّنة منذ سنوات — بما فيها النفايات الضخمة وبقايا الخشب.",
      tr: "Yıllardır biriken eşyalardan arındırılmış bodrum, tavan arası ve garajlar — iri atıklar ve hurda ahşap dahil.",
    },
    "textarea",
  ),
  row(D, "programs.2.check.1", "Programme 2 — item 1", 22, {
    de: "Sperrmüll & Altholz",
    en: "Bulky Waste & Scrap Timber",
    ar: "النفايات الضخمة وبقايا الخشب",
    tr: "İri Atık ve Hurda Ahşap",
  }),
  row(D, "programs.2.check.2", "Programme 2 — item 2", 23, {
    de: "Festpreis nach m²",
    en: "Fixed Price by m²",
    ar: "سعر ثابت حسب المتر المربع",
    tr: "m²'ye Göre Sabit Fiyat",
  }),
  row(D, "programs.2.check.3", "Programme 2 — item 3", 24, {
    de: "Zertifizierte Entsorgung",
    en: "Certified Disposal",
    ar: "تخلّص معتمد",
    tr: "Sertifikalı Bertaraf",
  }),
  row(D, "programs.2.check.4", "Programme 2 — item 4", 25, {
    de: "Besenreine Übergabe",
    en: "Broom-Clean Handover",
    ar: "تسليم نظيف",
    tr: "Süpürülmüş Teslim",
  }),

  row(D, "programs.3.title", "Programme 3 — title", 30, {
    de: "Büro & Gewerbe",
    en: "Office & Commercial",
    ar: "المكاتب والمحلات",
    tr: "Ofis ve Ticari",
  }),
  row(
    D,
    "programs.3.body",
    "Programme 3 — description",
    31,
    {
      de: "Büros, Ladenflächen und Lager, geräumt nach Ihrem Zeitplan — mit dokumentierter Entsorgung für Ihre Unterlagen.",
      en: "Offices, shop floors and storage units cleared on your schedule — with documented disposal for your records.",
      ar: "نُخلي المكاتب والمحلات والمستودعات حسب جدولك — مع توثيق التخلّص لسجلاتك.",
      tr: "Ofisler, mağazalar ve depolar programınıza göre boşaltılır — kayıtlarınız için belgeli bertaraf ile.",
    },
    "textarea",
  ),
  row(D, "programs.3.check.1", "Programme 3 — item 1", 32, {
    de: "Büromöbel & Ausstattung",
    en: "Office Furniture & Equipment",
    ar: "أثاث المكاتب والمعدّات",
    tr: "Ofis Mobilyası ve Ekipman",
  }),
  row(D, "programs.3.check.2", "Programme 3 — item 2", 33, {
    de: "Festpreis nach m²",
    en: "Fixed Price by m²",
    ar: "سعر ثابت حسب المتر المربع",
    tr: "m²'ye Göre Sabit Fiyat",
  }),
  row(D, "programs.3.check.3", "Programme 3 — item 3", 34, {
    de: "Zertifizierte Entsorgung",
    en: "Certified Disposal",
    ar: "تخلّص معتمد",
    tr: "Sertifikalı Bertaraf",
  }),
  row(D, "programs.3.check.4", "Programme 3 — item 4", 35, {
    de: "Entsorgungsnachweis",
    en: "Certificate of Disposal",
    ar: "شهادة تخلّص",
    tr: "Bertaraf Belgesi",
  }),

  // ── Before / after: shown once both photos are set (see the page) ──
  row(D, "gallery.eyebrow", "Before/after — eyebrow", 40, {
    de: "Echte Ergebnisse",
    en: "Visual Evidence",
    ar: "نتائج حقيقية",
    tr: "Gerçek Sonuçlar",
  }),
  row(D, "gallery.headline", "Before/after — headline", 41, {
    de: "Echte Vorher/Nachher-Ergebnisse",
    en: "Real Before/After Results",
    ar: "نتائج حقيقية قبل وبعد",
    tr: "Gerçek Öncesi/Sonrası Sonuçlar",
  }),
  row(D, "gallery.subline", "Before/after — subline", 42, {
    de: "Vergleichen Sie echte, unbearbeitete Fotos unserer Entrümpelungen.",
    en: "Compare real, unedited photos of our clearance projects.",
    ar: "قارن صوراً حقيقية غير معدّلة من مشاريع الإخلاء التي نفّذناها.",
    tr: "Boşaltma projelerimizin gerçek, düzenlenmemiş fotoğraflarını karşılaştırın.",
  }),
  row(D, "gallery.before", "Before/after — before label", 43, {
    de: "Vorher",
    en: "Before",
    ar: "قبل",
    tr: "Önce",
  }),
  row(D, "gallery.after", "Before/after — after label", 44, {
    de: "Nach der Entrümpelung",
    en: "After Clearance",
    ar: "بعد الإخلاء",
    tr: "Boşaltmadan Sonra",
  }),

  // ── Guarantee ─────────────────────────────────────────────────────────
  row(D, "guarantee.title", "Guarantee — title", 50, {
    de: "Unsere Besenrein-Garantie",
    en: "Our Broom-Clean Guarantee",
    ar: "ضمان التسليم النظيف",
    tr: "Süpürülmüş Teslim Garantimiz",
  }),
  row(
    D,
    "guarantee.body",
    "Guarantee — text",
    51,
    {
      de: "Findet Ihr Vermieter oder Hausverwalter bei der Übergabe noch etwas, das hätte entsorgt werden sollen, kommt unser Team zurück und räumt es kostenlos.",
      en: "If your landlord or property manager finds anything left behind at the handover that should have gone, our crew comes back and clears it free of charge.",
      ar: "إذا وجد المالك أو مدير العقار عند التسليم أي شيء كان يجب إزالته، يعود فريقنا ويُخليه مجاناً.",
      tr: "Ev sahibiniz veya yöneticiniz teslimde kaldırılması gereken bir şey bulursa ekibimiz geri gelir ve ücretsiz olarak temizler.",
    },
    "textarea",
  ),
  row(D, "guarantee.cta", "Guarantee — button", 52, {
    de: "Entrümpelung buchen",
    en: "Book a Clearance",
    ar: "احجز إخلاء",
    tr: "Boşaltma Rezervasyonu",
  }),

  // ── Cross-sell: relocation, then final cleaning ────────────────────────
  row(D, "crossSell.eyebrow", "Cross-sell — eyebrow", 60, {
    de: "Kombi-Leistungen",
    en: "Eco-System Modules",
    ar: "خدمات متكاملة",
    tr: "Birleşik Hizmetler",
  }),
  row(D, "crossSell.headline", "Cross-sell — headline", 61, {
    de: "Mehr buchen. Mehr sparen.",
    en: "Book More. Save More.",
    ar: "احجز أكثر. وفّر أكثر.",
    tr: "Daha Fazla Rezervasyon. Daha Fazla Tasarruf.",
  }),
  row(
    D,
    "crossSell.subline",
    "Cross-sell — subline",
    62,
    {
      de: "Wir belohnen Komplettbuchungen. Kombinieren Sie die Entrümpelung mit professionellem Transport und Endreinigung und sichern Sie sich Paketrabatte.",
      en: "We reward comprehensive bookings. Bundle your clearance with professional transport and final cleaning to secure package discounts.",
      ar: "نكافئ الحجوزات الشاملة. اجمع الإخلاء مع النقل الاحترافي والتنظيف النهائي لتحصل على خصومات الباقات.",
      tr: "Kapsamlı rezervasyonları ödüllendiriyoruz. Boşaltmayı profesyonel taşıma ve son temizlikle birleştirerek paket indirimlerinden yararlanın.",
    },
    "textarea",
  ),
  row(D, "crossSell.1.title", "Cross-sell 1 — title", 63, {
    de: "Umzug",
    en: "Residential Relocation",
    ar: "نقل المنزل",
    tr: "Ev Taşıma",
  }),
  row(D, "crossSell.1.body", "Cross-sell 1 — text", 64, {
    de: "Was mitkommt, transportieren wir; was bleibt, entsorgen wir — in einem Termin.",
    en: "What comes with you we transport; what stays we dispose of — in a single appointment.",
    ar: "ننقل ما يرافقك ونتخلّص مما يبقى — في موعد واحد.",
    tr: "Sizinle gelenleri taşır, kalanları bertaraf ederiz — tek bir randevuda.",
  }),
  row(D, "crossSell.2.title", "Cross-sell 2 — title", 65, {
    de: "Endreinigung",
    en: "Final Cleaning",
    ar: "التنظيف النهائي",
    tr: "Son Temizlik",
  }),
  row(D, "crossSell.2.body", "Cross-sell 2 — text", 66, {
    de: "Nach der Entrümpelung übergeben Sie die Räume blitzsauber — mit unserer Übergabegarantie.",
    en: "Hand over spotless rooms after the clearance — with our handover guarantee.",
    ar: "سلّم المكان نظيفاً تماماً بعد الإخلاء — مع ضمان التسليم.",
    tr: "Boşaltmadan sonra odaları tertemiz teslim edin — teslim garantimizle.",
  }),
];
