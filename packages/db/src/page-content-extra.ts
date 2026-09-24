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
 * link in the footer. Leaving it out would give the site a dead end on a
 * service it sells, so it is built on the two service pages' structure, and
 * every string below is drawn from what the design *does* say about clearance:
 * the homepage service card, the moving page's "Clearance & Disposal" add-on,
 * and the footer's "Household Clearance".
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
    de: "Professionelle und saubere **Haushaltsauflösungen**",
    en: "Professional and spotless **household clearances**",
    ar: "إخلاء منزلي احترافي و**نظيف تماماً**",
    tr: "Profesyonel ve **tertemiz ev boşaltma**",
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

  row(D, "included.eyebrow", "Included — eyebrow", 10, {
    de: "Rundum-Betreuung",
    en: "All-Inclusive Care",
    ar: "رعاية شاملة",
    tr: "Her Şey Dahil Hizmet",
  }),
  row(D, "included.headline", "Included — headline", 11, {
    de: "Was bei jeder Entrümpelung enthalten ist",
    en: "What's included in every clearance",
    ar: "ما المشمول في كل عملية إخلاء",
    tr: "Her boşaltmaya neler dahil",
  }),
  row(
    D,
    "included.subline",
    "Included — subline",
    12,
    {
      de: "Keller, Dachboden oder ganze Wohnung: Wir räumen, sortieren und entsorgen — und hinterlassen die Räume besenrein.",
      en: "Cellar, attic or a whole flat: we clear, sort and dispose — and leave the rooms broom-clean.",
      ar: "قبو أو عليّة أو شقة كاملة: نفرغ ونفرز ونتخلّص — ونترك الغرف نظيفة.",
      tr: "Bodrum, çatı katı ya da tüm daire: boşaltır, ayrıştırır ve bertaraf ederiz — odaları süpürge temizliğinde bırakırız.",
    },
    "textarea",
  ),
  row(D, "included.1.title", "Included 1 — title", 13, {
    de: "Sortieren statt wegwerfen",
    en: "Sorted, not just skipped",
    ar: "فرز لا مجرّد رمي",
    tr: "Atmak değil, ayrıştırmak",
  }),
  row(
    D,
    "included.1.body",
    "Included 1 — body",
    14,
    {
      de: "Verwertbares geht an Sozialkaufhäuser, Elektro- und Sondermüll getrennt an zertifizierte Betriebe.",
      en: "Anything reusable goes to charity shops; electronics and hazardous waste go separately to certified facilities.",
      ar: "كل ما يمكن إعادة استخدامه يذهب لمتاجر خيرية، والإلكترونيات والنفايات الخطرة لمنشآت معتمدة.",
      tr: "Yeniden kullanılabilir her şey hayır mağazalarına; elektronik ve tehlikeli atıklar ayrıca sertifikalı tesislere gider.",
    },
    "textarea",
  ),
  row(D, "included.2.title", "Included 2 — title", 15, {
    de: "Entsorgungsnachweis",
    en: "Certificate of disposal",
    ar: "شهادة تخلّص",
    tr: "Bertaraf sertifikası",
  }),
  row(
    D,
    "included.2.body",
    "Included 2 — body",
    16,
    {
      de: "Sie erhalten einen dokumentierten Nachweis für Vermieter, Nachlassverwaltung oder Behörden.",
      en: "You receive a documented certificate for the landlord, an estate executor, or the authorities.",
      ar: "تحصل على إثبات موثّق للمالك أو لإدارة التركة أو للجهات الرسمية.",
      tr: "Ev sahibi, tereke yöneticisi veya resmî makamlar için belgeli bir kanıt alırsınız.",
    },
    "textarea",
  ),
  row(D, "included.3.title", "Included 3 — title", 17, {
    de: "Diskret und respektvoll",
    en: "Discreet and respectful",
    ar: "بتكتّم واحترام",
    tr: "Nazik ve saygılı",
  }),
  row(
    D,
    "included.3.body",
    "Included 3 — body",
    18,
    {
      de: "Gerade bei Nachlässen arbeiten wir leise, unauffällig und mit Rücksicht auf Nachbarn.",
      en: "With bereavement clearances in particular we work quietly, discreetly, and with consideration for the neighbours.",
      ar: "خاصة في إخلاء التركات، نعمل بهدوء وتكتّم ومراعاة للجيران.",
      tr: "Özellikle miras boşaltmalarında sessiz, göze batmadan ve komşuları gözeterek çalışırız.",
    },
    "textarea",
  ),
  row(D, "included.4.title", "Included 4 — title", 19, {
    de: "Besenrein übergeben",
    en: "Left broom-clean",
    ar: "تُسلَّم نظيفة",
    tr: "Süpürge temizliğinde teslim",
  }),
  row(
    D,
    "included.4.body",
    "Included 4 — body",
    20,
    {
      de: "Nach dem Ausräumen kehren wir durch. Auf Wunsch schließt die Endreinigung direkt an.",
      en: "Once the rooms are empty we sweep through. The final cleaning can follow on directly if you want it.",
      ar: "بعد الإفراغ نكنس المكان. ويمكن أن يتبع ذلك التنظيف النهائي مباشرة إن رغبت.",
      tr: "Odalar boşaldıktan sonra süpürürüz. İsterseniz son temizlik hemen ardından gelir.",
    },
    "textarea",
  ),

  row(D, "factors.eyebrow", "Pricing factors — eyebrow", 30, {
    de: "Dynamischer Rechner",
    en: "Dynamic Calculator",
    ar: "حاسبة ديناميكية",
    tr: "Dinamik Hesaplayıcı",
  }),
  row(D, "factors.headline", "Pricing factors — headline", 31, {
    de: "Wie Ihr Angebot berechnet wird",
    en: "How your quote is calculated",
    ar: "كيف يُحسب عرض السعر",
    tr: "Teklifiniz nasıl hesaplanır",
  }),
  row(
    D,
    "factors.subline",
    "Pricing factors — subline",
    32,
    {
      de: "Festpreisgarantie nach m² — die vier Faktoren, die den Preis bestimmen.",
      en: "A fixed-price guarantee by m² — the four factors that set the price.",
      ar: "ضمان سعر ثابت حسب المتر المربّع — العوامل الأربعة التي تحدّد السعر.",
      tr: "m² bazında sabit fiyat garantisi — fiyatı belirleyen dört etken.",
    },
    "textarea",
  ),
  row(D, "factors.1.title", "Factor 1", 33, {
    de: "Fläche (m²)",
    en: "Area (m²)",
    ar: "المساحة (م²)",
    tr: "Alan (m²)",
  }),
  row(
    D,
    "factors.1.body",
    "Factor 1 — body",
    34,
    {
      de: "Die zu räumende Fläche, inklusive Keller- und Dachbodenanteil.",
      en: "The area to be cleared, including any cellar and attic space.",
      ar: "المساحة المطلوب إخلاؤها، شاملة القبو والعليّة.",
      tr: "Boşaltılacak alan, bodrum ve çatı katı dahil.",
    },
    "textarea",
  ),
  row(D, "factors.2.title", "Factor 2", 35, {
    de: "Füllgrad",
    en: "How full it is",
    ar: "درجة الامتلاء",
    tr: "Doluluk oranı",
  }),
  row(
    D,
    "factors.2.body",
    "Factor 2 — body",
    36,
    {
      de: "Ein leerstehender Keller und ein vollgestellter Dachboden sind nicht derselbe Aufwand.",
      en: "An empty cellar and a packed attic are not the same job.",
      ar: "قبو فارغ وعليّة مكتظّة ليسا العمل نفسه.",
      tr: "Boş bir bodrum ile tıklım tıklım bir çatı katı aynı iş değildir.",
    },
    "textarea",
  ),
  row(D, "factors.3.title", "Factor 3", 37, {
    de: "Etage und Zugang",
    en: "Floor and access",
    ar: "الطابق وسهولة الوصول",
    tr: "Kat ve erişim",
  }),
  row(
    D,
    "factors.3.body",
    "Factor 3 — body",
    38,
    {
      de: "Etage ohne Aufzug, enge Treppenhäuser und die Entfernung zum Fahrzeug.",
      en: "A floor without a lift, narrow staircases, and the carry to the vehicle.",
      ar: "طابق بلا مصعد، وسلالم ضيّقة، والمسافة حتى المركبة.",
      tr: "Asansörsüz kat, dar merdivenler ve araca kadar taşıma mesafesi.",
    },
    "textarea",
  ),
  row(D, "factors.4.title", "Factor 4", 39, {
    de: "Sondermüll",
    en: "Hazardous waste",
    ar: "النفايات الخطرة",
    tr: "Tehlikeli atık",
  }),
  row(
    D,
    "factors.4.body",
    "Factor 4 — body",
    40,
    {
      de: "Farben, Chemikalien oder Elektrogroßgeräte werden gesondert abgerechnet und entsorgt.",
      en: "Paint, chemicals or large electrical appliances are billed and disposed of separately.",
      ar: "الدهانات والمواد الكيميائية والأجهزة الكهربائية الكبيرة تُحتسب وتُعالَج على حدة.",
      tr: "Boya, kimyasal veya büyük elektrikli cihazlar ayrıca faturalandırılır ve bertaraf edilir.",
    },
    "textarea",
  ),

  row(D, "faq.eyebrow", "FAQ — eyebrow", 60, {
    de: "Hilfe",
    en: "Help Desk",
    ar: "مكتب المساعدة",
    tr: "Yardım Masası",
  }),
  row(D, "faq.headline", "FAQ — headline", 61, {
    de: "Häufig gestellte Fragen",
    en: "Frequently Asked Questions",
    ar: "الأسئلة الشائعة",
    tr: "Sık Sorulan Sorular",
  }),
  row(D, "faq.1.question", "FAQ 1 — question", 62, {
    de: "Bekomme ich einen Entsorgungsnachweis?",
    en: "Do I get a certificate of disposal?",
    ar: "هل أحصل على شهادة تخلّص؟",
    tr: "Bertaraf sertifikası alıyor muyum?",
  }),
  row(
    D,
    "faq.1.answer",
    "FAQ 1 — answer",
    63,
    {
      de: "Ja. Sie erhalten nach Abschluss eine schriftliche Bestätigung über die fachgerechte Entsorgung — für Vermieter, Nachlassverwaltung oder Behörden.",
      en: "Yes. After the job you receive written confirmation of proper disposal — for the landlord, an estate executor, or the authorities.",
      ar: "نعم. تحصل بعد الانتهاء على تأكيد خطّي بالتخلّص النظامي — للمالك أو لإدارة التركة أو للجهات الرسمية.",
      tr: "Evet. İş bitiminde usulüne uygun bertaraf edildiğine dair yazılı onay alırsınız — ev sahibi, tereke yöneticisi veya resmî makamlar için.",
    },
    "textarea",
  ),
  row(D, "faq.2.question", "FAQ 2 — question", 64, {
    de: "Was passiert mit noch brauchbaren Sachen?",
    en: "What happens to things that are still usable?",
    ar: "ماذا يحدث للأغراض التي ما زالت صالحة؟",
    tr: "Hâlâ kullanılabilir eşyalara ne oluyor?",
  }),
  row(
    D,
    "faq.2.answer",
    "FAQ 2 — answer",
    65,
    {
      de: "Verwertbares geben wir an Sozialkaufhäuser und gemeinnützige Einrichtungen weiter, statt es zu entsorgen.",
      en: "Anything reusable is passed to charity shops and non-profit organisations rather than thrown away.",
      ar: "كل ما يصلح للاستخدام نمرّره لمتاجر خيرية ومؤسسات غير ربحية بدل التخلّص منه.",
      tr: "Yeniden kullanılabilir her şeyi atmak yerine hayır mağazalarına ve kâr amacı gütmeyen kuruluşlara veririz.",
    },
    "textarea",
  ),
  row(D, "faq.3.question", "FAQ 3 — question", 66, {
    de: "Muss ich während der Entrümpelung anwesend sein?",
    en: "Do I have to be there during the clearance?",
    ar: "هل يجب أن أكون حاضراً أثناء الإخلاء؟",
    tr: "Boşaltma sırasında orada olmam gerekiyor mu?",
  }),
  row(
    D,
    "faq.3.answer",
    "FAQ 3 — answer",
    67,
    {
      de: "Nein. Nach Schlüsselübergabe und Freigabe erledigen wir alles selbstständig und dokumentieren den Ablauf.",
      en: "No. Once the keys are handed over and the job is approved we work independently and document what we do.",
      ar: "لا. بعد تسليم المفاتيح والموافقة، ننجز كل شيء بأنفسنا ونوثّق سير العمل.",
      tr: "Hayır. Anahtarlar teslim edilip iş onaylandıktan sonra her şeyi biz hallederiz ve süreci belgeleriz.",
    },
    "textarea",
  ),

  row(D, "addons.eyebrow", "Add-ons — eyebrow", 70, {
    de: "Zusatzmodule",
    en: "Additional Modules",
    ar: "وحدات إضافية",
    tr: "Ek Modüller",
  }),
  row(D, "addons.headline", "Add-ons — headline", 71, {
    de: "Kombinieren und sparen",
    en: "Combine and save",
    ar: "ادمج ووفّر",
    tr: "Birleştir ve kazan",
  }),
  row(D, "addons.1.title", "Add-on 1 — title", 72, {
    de: "Endreinigung",
    en: "Final Cleaning",
    ar: "التنظيف النهائي",
    tr: "Son Temizlik",
  }),
  row(
    D,
    "addons.1.body",
    "Add-on 1 — body",
    73,
    {
      de: "Direkt nach der Entrümpelung — mit Übergabegarantie gegenüber Ihrem Vermieter.",
      en: "Straight after the clearance — with a handover guarantee for your landlord.",
      ar: "مباشرة بعد الإخلاء — مع ضمان التسليم أمام المالك.",
      tr: "Boşaltmanın hemen ardından — ev sahibinize karşı teslim garantisiyle.",
    },
    "textarea",
  ),
  row(D, "addons.2.title", "Add-on 2 — title", 74, {
    de: "Umzug & Transport",
    en: "Moving & Transport",
    ar: "النقل والترحيل",
    tr: "Taşınma ve Nakliye",
  }),
  row(
    D,
    "addons.2.body",
    "Add-on 2 — body",
    75,
    {
      de: "Was mitkommt, transportieren wir; was bleibt, entsorgen wir — in einem Termin.",
      en: "What comes with you we transport; what stays we dispose of — in a single appointment.",
      ar: "ما ينتقل معك ننقله، وما يبقى نتخلّص منه — في موعد واحد.",
      tr: "Sizinle gelecekleri taşır, kalanları bertaraf ederiz — tek randevuda.",
    },
    "textarea",
  ),
  row(D, "addons.cta", "Add-ons — link label", 76, {
    de: "Mehr erfahren",
    en: "Learn More",
    ar: "اعرف المزيد",
    tr: "Daha Fazla",
  }),

  row(D, "cta.headline", "Closing CTA — headline", 90, {
    de: "Platz schaffen, ohne sich zu kümmern",
    en: "Clear the space without the hassle",
    ar: "أفرغ المكان بلا عناء",
    tr: "Zahmetsizce yer açın",
  }),
  row(
    D,
    "cta.body",
    "Closing CTA — body",
    91,
    {
      de: "Berechnen Sie Ihren Festpreis in unter 2 Minuten — kostenlos und ohne Registrierung.",
      en: "Calculate your fixed price in under 2 minutes — free and with no registration.",
      ar: "احسب سعرك الثابت في أقل من دقيقتين — مجاناً وبدون تسجيل.",
      tr: "Sabit fiyatınızı 2 dakikadan kısa sürede hesaplayın — ücretsiz ve kayıtsız.",
    },
    "textarea",
  ),
  row(D, "cta.button", "Closing CTA — button", 92, {
    de: "Preis berechnen",
    en: "Calculate Price",
    ar: "احسب السعر",
    tr: "Fiyat Hesapla",
  }),
];
