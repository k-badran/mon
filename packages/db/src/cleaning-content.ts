/**
 * The cleaning service page's copy, transcribed from the M.io frame.
 *
 * This replaces an earlier version that was written rather than transcribed —
 * the headline, the programme names, the rates and the guarantee were all
 * invented, and none of them matched the design. Every English string below is
 * the designer's own wording taken from `service-cleaning`; the other three
 * locales are translations of it.
 *
 * It lives in its own file so the replacement is a clean swap rather than an
 * edit threaded through the shared page-content file.
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

const C = "service-cleaning";

export const CLEANING_CONTENT: ContentSeed[] = [
  // ── Hero ────────────────────────────────────────────────────────────
  row(C, "hero.eyebrow", "Hero — badge", 1, {
    de: "Reinigung",
    en: "Cleaning",
    ar: "التنظيف",
    tr: "Temizlik",
  }),
  row(C, "hero.headline", "Hero — headline", 2, {
    de: "Professionelle Endreinigung & Grundreinigung",
    en: "Professional Post-Move & Deep Cleaning",
    ar: "تنظيف احترافي بعد النقل وتنظيف عميق",
    tr: "Profesyonel Taşınma Sonrası ve Derin Temizlik",
  }),
  row(
    C,
    "hero.subline",
    "Hero — subline",
    3,
    {
      de: "100 % Kautionsrückgabe-Garantie. Unser Team reinigt jede Fläche, jede Fußleiste und jedes Einbaugerät im Detail.",
      en: "100% Deposit Return Guarantee. Our commercial team details every surface, baseboard, and built-in appliance to hand the property back spotless.",
      ar: "ضمان استرداد الوديعة 100%. يعتني فريقنا بكل سطح وكل وزرة وكل جهاز مدمج ليُسلَّم العقار نظيفاً تماماً.",
      tr: "%100 depozito iade garantisi. Ekibimiz her yüzeyi, süpürgeliği ve ankastre cihazı detaylıca temizleyerek mülkü tertemiz teslim eder.",
    },
    "textarea",
  ),
  row(C, "hero.ctaPrimary", "Hero — primary button", 4, {
    de: "Kostenloses Angebot",
    en: "Get Free Quote",
    ar: "احصل على عرض مجاني",
    tr: "Ücretsiz Teklif Al",
  }),
  row(C, "hero.ctaSecondary", "Hero — secondary button", 5, {
    de: "Unsere Preise",
    en: "Our Rates",
    ar: "أسعارنا",
    tr: "Fiyatlarımız",
  }),

  // ── Programmes ──────────────────────────────────────────────────────
  row(C, "programs.eyebrow", "Programmes — eyebrow", 10, {
    de: "Unsere Programme",
    en: "Our Programs",
    ar: "برامجنا",
    tr: "Programlarımız",
  }),
  row(C, "programs.headline", "Programmes — headline", 11, {
    de: "Hochwertige Reinigungsleistungen",
    en: "High-End Cleaning Services",
    ar: "خدمات تنظيف راقية",
    tr: "Üst Düzey Temizlik Hizmetleri",
  }),

  row(C, "programs.1.title", "Programme 1 — title", 12, {
    de: "Endreinigung bei Auszug",
    en: "End-of-Tenancy",
    ar: "تنظيف نهاية الإيجار",
    tr: "Kira Sonu",
  }),
  row(C, "programs.1.price", "Programme 1 — rate", 13, {
    de: "4,50 € / m²",
    en: "€4.50 / m²",
    ar: "4,50 € / م²",
    tr: "4,50 € / m²",
  }),
  row(
    C,
    "programs.1.body",
    "Programme 1 — body",
    14,
    {
      de: "Für Mieter, die eine Wohnung zurückgeben. Umfasst intensive Backofenreinigung, Kalkentfernung, Fensterpolitur und Bodenpflege.",
      en: "Designed for tenants handing back rental spaces. Covers intensive oven scrubbing, limescale removal, window polishing and floor care.",
      ar: "مصمَّم للمستأجرين الذين يسلّمون العقار. يشمل تنظيف الفرن المكثّف وإزالة الترسّبات وتلميع النوافذ والعناية بالأرضيات.",
      tr: "Kiralık yeri teslim eden kiracılar için. Yoğun fırın temizliği, kireç sökümü, cam parlatma ve zemin bakımını kapsar.",
    },
    "textarea",
  ),

  row(C, "programs.2.title", "Programme 2 — title", 15, {
    de: "Grundreinigung",
    en: "Deep Home Cleaning",
    ar: "تنظيف منزلي عميق",
    tr: "Derin Ev Temizliği",
  }),
  row(C, "programs.2.price", "Programme 2 — rate", 16, {
    de: "6,00 € / m²",
    en: "€6.00 / m²",
    ar: "6,00 € / م²",
    tr: "6,00 € / m²",
  }),
  row(
    C,
    "programs.2.body",
    "Programme 2 — body",
    17,
    {
      de: "Intensive Desinfektion Ihrer neuen Wohnung, bevor die Möbel kommen. Wand-zu-Wand-Desinfektion und gründliche Teppichreinigung.",
      en: "Intensive sanitization for your new property before furniture arrives. Wall-to-wall disinfection, deep carpet treatment and full air-vent care.",
      ar: "تعقيم مكثّف لعقارك الجديد قبل وصول الأثاث. تطهير من جدار إلى جدار وتنظيف عميق للسجاد وعناية كاملة بفتحات التهوية.",
      tr: "Mobilyalar gelmeden önce yeni mülkünüz için yoğun sanitasyon. Duvardan duvara dezenfeksiyon, derin halı bakımı ve tam havalandırma temizliği.",
    },
    "textarea",
  ),

  row(C, "programs.3.title", "Programme 3 — title", 18, {
    de: "Gewerbliche Büroreinigung",
    en: "Commercial Office",
    ar: "المكاتب التجارية",
    tr: "Ticari Ofis",
  }),
  row(
    C,
    "programs.3.body",
    "Programme 3 — body",
    19,
    {
      de: "Wartungsverträge auf Unternehmensniveau oder einmalige Detailreinigung für professionelle Hygienestandards am Arbeitsplatz.",
      en: "Corporate-grade maintenance contracts or one-off detailing to ensure professional workplace hygiene standards.",
      ar: "عقود صيانة بمستوى الشركات أو تنظيف تفصيلي لمرّة واحدة لضمان معايير النظافة المهنية في مكان العمل.",
      tr: "Kurumsal düzeyde bakım sözleşmeleri veya profesyonel işyeri hijyen standartları için tek seferlik detaylı temizlik.",
    },
    "textarea",
  ),

  // The four checks every programme card lists.
  row(C, "programs.check.1", "Programme check 1", 20, {
    de: "Backofen & Küche im Detail",
    en: "Oven & Kitchen Deep Detail",
    ar: "الفرن والمطبخ بالتفصيل",
    tr: "Fırın ve Mutfak Detayı",
  }),
  row(C, "programs.check.2", "Programme check 2", 21, {
    de: "Fensterglas polieren",
    en: "Window Glass Polishing",
    ar: "تلميع زجاج النوافذ",
    tr: "Cam Parlatma",
  }),
  row(C, "programs.check.3", "Programme check 3", 22, {
    de: "Sanitär entkalken",
    en: "Sanitary Descaling",
    ar: "إزالة الترسّبات من الأدوات الصحية",
    tr: "Sıhhi Tesisat Kireç Sökümü",
  }),
  row(C, "programs.check.4", "Programme check 4", 23, {
    de: "Garantie der Übergabe-Abnahme",
    en: "Guarantee of Handover Approval",
    ar: "ضمان قبول التسليم",
    tr: "Teslim Onayı Garantisi",
  }),
  row(C, "programs.cta", "Programme card — button", 24, {
    de: "Angebot anfordern",
    en: "Request Quote",
    ar: "اطلب عرض سعر",
    tr: "Teklif İste",
  }),

  // ── Before / after ──────────────────────────────────────────────────
  row(C, "gallery.eyebrow", "Gallery — eyebrow", 30, {
    de: "Sichtbarer Beweis",
    en: "Visual Evidence",
    ar: "دليل مرئي",
    tr: "Görsel Kanıt",
  }),
  row(C, "gallery.headline", "Gallery — headline", 31, {
    de: "Echte Vorher-/Nachher-Ergebnisse",
    en: "Real Before/After Results",
    ar: "نتائج حقيقية قبل/بعد",
    tr: "Gerçek Öncesi/Sonrası Sonuçlar",
  }),
  row(
    C,
    "gallery.subline",
    "Gallery — subline",
    32,
    {
      de: "Vergleichen Sie echte, unbearbeitete Fotos unserer Grundreinigungen.",
      en: "Compare real, unedited photos of our deep cleaning projects.",
      ar: "قارن صوراً حقيقية غير معدَّلة من مشاريع التنظيف العميق لدينا.",
      tr: "Derin temizlik projelerimizin gerçek, düzenlenmemiş fotoğraflarını karşılaştırın.",
    },
    "textarea",
  ),
  row(C, "gallery.before", "Gallery — before label", 33, {
    de: "VORHER",
    en: "BEFORE",
    ar: "قبل",
    tr: "ÖNCESİ",
  }),
  row(C, "gallery.after", "Gallery — after label", 34, {
    de: "NACH DER REINIGUNG",
    en: "AFTER CLEANING",
    ar: "بعد التنظيف",
    tr: "TEMİZLİK SONRASI",
  }),

  // ── Guarantee ───────────────────────────────────────────────────────
  row(C, "guarantee.title", "Guarantee — title", 40, {
    de: "Unsere Übergabegarantie",
    en: "Our Handover Guarantee",
    ar: "ضمان التسليم لدينا",
    tr: "Teslim Garantimiz",
  }),
  row(
    C,
    "guarantee.body",
    "Guarantee — body",
    41,
    {
      de: "Findet Ihr Vermieter oder Makler bei der Abnahme Reinigungsmängel, kommt unser Team zurück und reinigt kostenfrei nach.",
      en: "If your landlord or estate agent finds any cleaning issues during inspection, our crew will return to clean the area again free of charge.",
      ar: "إذا وجد المالك أو الوكيل العقاري أي ملاحظات تنظيف أثناء المعاينة، يعود فريقنا لتنظيف المكان مجدّداً مجاناً.",
      tr: "Ev sahibiniz veya emlakçınız denetimde herhangi bir temizlik sorunu bulursa, ekibimiz geri dönüp o alanı ücretsiz yeniden temizler.",
    },
    "textarea",
  ),
  row(C, "guarantee.cta", "Guarantee — button", 42, {
    de: "Reinigungstermin buchen",
    en: "Book Cleaning Session",
    ar: "احجز موعد التنظيف",
    tr: "Temizlik Randevusu Al",
  }),

  // ── Cross-sell ──────────────────────────────────────────────────────
  row(C, "crossSell.eyebrow", "Cross-sell — eyebrow", 50, {
    de: "Ökosystem-Module",
    en: "Eco-System Modules",
    ar: "وحدات المنظومة",
    tr: "Ekosistem Modülleri",
  }),
  row(C, "crossSell.headline", "Cross-sell — headline", 51, {
    de: "Mehr buchen. Mehr sparen.",
    en: "Book More. Save More.",
    ar: "احجز أكثر. وفّر أكثر.",
    tr: "Daha Fazla Al. Daha Fazla Kazan.",
  }),
  row(
    C,
    "crossSell.subline",
    "Cross-sell — subline",
    52,
    {
      de: "Wir belohnen Gesamtbuchungen. Kombinieren Sie die Reinigung mit Transport und Entrümpelung für den besten Preis.",
      en: "We reward comprehensive bookings. Bundle your cleaning with professional transport and clearance to secure deeper discounts.",
      ar: "نكافئ الحجوزات الشاملة. اجمع التنظيف مع النقل والإخلاء للحصول على خصومات أكبر.",
      tr: "Kapsamlı rezervasyonları ödüllendiriyoruz. Temizliği profesyonel nakliye ve boşaltmayla birleştirip daha yüksek indirim kazanın.",
    },
    "textarea",
  ),
  row(C, "crossSell.1.title", "Cross-sell 1 — title", 53, {
    de: "Privatumzug",
    en: "Residential Relocation",
    ar: "النقل السكني",
    tr: "Konut Taşımacılığı",
  }),
  row(
    C,
    "crossSell.1.body",
    "Cross-sell 1 — body",
    54,
    {
      de: "Sparen Sie 50 €, wenn Sie die Endreinigung dazubuchen.",
      en: "Save €50 when combined with End-of-Tenancy Cleaning.",
      ar: "وفّر 50 € عند الجمع مع تنظيف نهاية الإيجار.",
      tr: "Kira Sonu Temizliği ile birleştirdiğinizde 50 € kazanın.",
    },
    "textarea",
  ),
  row(C, "crossSell.2.title", "Cross-sell 2 — title", 55, {
    de: "Entrümpelung dazu",
    en: "Clearance Upgrade",
    ar: "إضافة الإخلاء",
    tr: "Boşaltma Eklentisi",
  }),
  row(
    C,
    "crossSell.2.body",
    "Cross-sell 2 — body",
    56,
    {
      de: "Unerwünschtes wird entsorgt, bevor gesaugt wird.",
      en: "Get unwanted junk cleared before vacuuming starts.",
      ar: "تخلّص من غير المرغوب قبل أن يبدأ الشفط.",
      tr: "Süpürme başlamadan önce istenmeyen eşyalar kaldırılsın.",
    },
    "textarea",
  ),
  row(C, "crossSell.cta", "Cross-sell — link label", 57, {
    de: "Mehr erfahren",
    en: "Learn More",
    ar: "اعرف المزيد",
    tr: "Daha Fazla",
  }),
];
