/**
 * The legal pages' text.
 *
 * These carry statutory content rather than marketing copy, so two things are
 * handled differently from the rest of the site.
 *
 * **Accuracy over completeness.** The privacy page's processor list was
 * inherited from the app this replaces and still named Supabase and Vercel.
 * Neither is used any more: the database is self-hosted PostgreSQL, the cache
 * is self-hosted Redis, and the only third party the API contacts is
 * OpenStreetMap's Nominatim for geocoding. Naming a processor that does not
 * process anything is a compliance defect, not a typo, so it is corrected here.
 *
 * **German is the source.** The obligations are German (TMG, MStV, DSGVO), so
 * the German column is authoritative and the other three are translations
 * offered for comprehension. The pages say so.
 *
 * The operator still has to have these reviewed. The rows carry the real
 * structure and the real facts we know; the company particulars are
 * placeholders that must be replaced before launch, and they are labelled as
 * such in the dashboard so they are hard to miss.
 */

import type { ContentSeed } from "./page-content.js";

function row(
  section: string,
  slot: string,
  label: string,
  sortOrder: number,
  values: ContentSeed["values"],
  kind: ContentSeed["kind"] = "textarea",
): ContentSeed {
  return { section, slot, kind, label, sortOrder, values };
}

const I = "page-imprint";
const P = "page-privacy";
const T = "page-terms";

/** Shown at the top of each legal page. */
const REVIEW_NOTICE = {
  de: "Hinweis: Dieser Text ist ein Entwurf und muss vor dem Livegang anwaltlich geprüft werden.",
  en: "Note: this text is a draft and must be reviewed by a lawyer before launch. The German version is authoritative.",
  ar: "ملاحظة: هذا النصّ مسوّدة ويجب مراجعته قانونياً قبل الإطلاق. النسخة الألمانية هي المعتمدة.",
  tr: "Not: bu metin bir taslaktır ve yayına geçmeden önce hukuken incelenmelidir. Almanca sürüm esastır.",
};

export const LEGAL_CONTENT: ContentSeed[] = [
  // ══ Imprint ════════════════════════════════════════════════════════
  row(I, "hero.headline", "Imprint — title", 1, {
    de: "Impressum",
    en: "Imprint",
    ar: "بيانات الناشر",
    tr: "Künye",
  }, "text"),
  row(I, "hero.subline", "Imprint — lead", 2, {
    de: "Angaben gemäß § 5 TMG.",
    en: "Information pursuant to § 5 TMG.",
    ar: "بيانات وفقاً للمادة 5 من قانون TMG الألماني.",
    tr: "§ 5 TMG uyarınca bilgiler.",
  }),
  row(I, "notice", "Imprint — review notice", 3, REVIEW_NOTICE),

  row(I, "1.title", "Section 1 — title", 10, {
    de: "Anbieter",
    en: "Provider",
    ar: "مقدّم الخدمة",
    tr: "Sağlayıcı",
  }, "text"),
  row(I, "1.body", "Section 1 — body", 11, {
    de: "m.on GmbH\nKurfürstendamm 212\n10719 Berlin\nDeutschland",
    en: "m.on GmbH\nKurfürstendamm 212\n10719 Berlin\nGermany",
    ar: "m.on GmbH\nKurfürstendamm 212\n10719 Berlin\nألمانيا",
    tr: "m.on GmbH\nKurfürstendamm 212\n10719 Berlin\nAlmanya",
  }),
  row(I, "2.title", "Section 2 — title", 12, {
    de: "Vertreten durch",
    en: "Represented by",
    ar: "يمثّلها",
    tr: "Temsilci",
  }, "text"),
  row(I, "2.body", "Section 2 — body", 13, {
    de: "Geschäftsführung: noch einzutragen.",
    en: "Managing director: to be completed.",
    ar: "الإدارة: يُستكمل لاحقاً.",
    tr: "Genel müdür: tamamlanacak.",
  }),
  row(I, "3.title", "Section 3 — title", 14, {
    de: "Kontakt",
    en: "Contact",
    ar: "التواصل",
    tr: "İletişim",
  }, "text"),
  row(I, "3.body", "Section 3 — body", 15, {
    de: "Telefon: 0800 123 456 78\nE-Mail: support@moveongo.de",
    en: "Phone: 0800 123 456 78\nEmail: support@moveongo.de",
    ar: "الهاتف: 0800 123 456 78\nالبريد: support@moveongo.de",
    tr: "Telefon: 0800 123 456 78\nE-posta: support@moveongo.de",
  }),
  row(I, "4.title", "Section 4 — title", 16, {
    de: "Registereintrag und Umsatzsteuer-ID",
    en: "Register entry and VAT ID",
    ar: "قيد السجل ورقم ضريبة القيمة المضافة",
    tr: "Sicil kaydı ve KDV numarası",
  }, "text"),
  row(I, "4.body", "Section 4 — body", 17, {
    de: "Handelsregister und USt-IdNr. gemäß § 27a UStG: noch einzutragen.",
    en: "Commercial register and VAT ID pursuant to § 27a UStG: to be completed.",
    ar: "السجل التجاري ورقم الضريبة وفق المادة 27أ: يُستكمل لاحقاً.",
    tr: "Ticaret sicili ve § 27a UStG uyarınca KDV no: tamamlanacak.",
  }),
  row(I, "5.title", "Section 5 — title", 18, {
    de: "EU-Streitschlichtung",
    en: "EU dispute resolution",
    ar: "تسوية النزاعات في الاتحاد الأوروبي",
    tr: "AB uyuşmazlık çözümü",
  }, "text"),
  row(I, "5.body", "Section 5 — body", 19, {
    de: "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit. Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
    en: "The European Commission provides a platform for online dispute resolution. We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.",
    ar: "توفّر المفوضية الأوروبية منصّة لتسوية النزاعات إلكترونياً. ولسنا ملزمين ولا مستعدّين للمشاركة في إجراءات تسوية أمام هيئة تحكيم استهلاكية.",
    tr: "Avrupa Komisyonu çevrimiçi uyuşmazlık çözümü için bir platform sunar. Tüketici tahkim kurulu önünde uyuşmazlık çözüm sürecine katılmakla yükümlü değiliz ve katılmaya istekli değiliz.",
  }),

  // ══ Privacy ════════════════════════════════════════════════════════
  row(P, "hero.headline", "Privacy — title", 1, {
    de: "Datenschutzerklärung",
    en: "Privacy Policy",
    ar: "سياسة الخصوصية",
    tr: "Gizlilik Politikası",
  }, "text"),
  row(P, "hero.subline", "Privacy — lead", 2, {
    de: "Wie wir personenbezogene Daten verarbeiten, nach DSGVO.",
    en: "How we process personal data, under the GDPR.",
    ar: "كيف نعالج البيانات الشخصية وفق اللائحة العامة لحماية البيانات.",
    tr: "Kişisel verileri GDPR kapsamında nasıl işlediğimiz.",
  }),
  row(P, "notice", "Privacy — review notice", 3, REVIEW_NOTICE),

  row(P, "1.title", "Section 1 — title", 10, {
    de: "1. Verantwortlicher",
    en: "1. Controller",
    ar: "1. المسؤول عن المعالجة",
    tr: "1. Veri sorumlusu",
  }, "text"),
  row(P, "1.body", "Section 1 — body", 11, {
    de: "m.on GmbH, Kurfürstendamm 212, 10719 Berlin. Kontakt: support@moveongo.de",
    en: "m.on GmbH, Kurfürstendamm 212, 10719 Berlin. Contact: support@moveongo.de",
    ar: "m.on GmbH, Kurfürstendamm 212, 10719 Berlin. للتواصل: support@moveongo.de",
    tr: "m.on GmbH, Kurfürstendamm 212, 10719 Berlin. İletişim: support@moveongo.de",
  }),
  row(P, "2.title", "Section 2 — title", 12, {
    de: "2. Welche Daten wir verarbeiten",
    en: "2. What data we process",
    ar: "2. ما البيانات التي نعالجها",
    tr: "2. Hangi verileri işliyoruz",
  }, "text"),
  row(P, "2.body", "Section 2 — body", 13, {
    de: "Angaben aus dem Preisrechner (Adressen, Wohnfläche, Etage, Termin), Kontodaten bei Registrierung (Name, E-Mail, Telefon), Auftrags- und Rechnungsdaten sowie technische Zugriffsdaten (IP-Adresse, Zeitpunkt, aufgerufene Seite) in Server-Protokollen.",
    en: "Details entered in the price calculator (addresses, living area, floor, date), account details on registration (name, email, phone), order and invoice data, and technical access data (IP address, timestamp, page requested) in server logs.",
    ar: "البيانات المُدخلة في حاسبة السعر (العناوين، المساحة، الطابق، الموعد)، وبيانات الحساب عند التسجيل (الاسم، البريد، الهاتف)، وبيانات الطلبات والفواتير، وبيانات الوصول التقنية (عنوان IP، الوقت، الصفحة المطلوبة) في سجلّات الخادم.",
    tr: "Fiyat hesaplayıcıya girilen bilgiler (adresler, yaşam alanı, kat, tarih), kayıt sırasındaki hesap bilgileri (ad, e-posta, telefon), sipariş ve fatura verileri ile sunucu günlüklerindeki teknik erişim verileri (IP adresi, zaman damgası, istenen sayfa).",
  }),
  row(P, "3.title", "Section 3 — title", 14, {
    de: "3. Zweck und Rechtsgrundlage",
    en: "3. Purpose and legal basis",
    ar: "3. الغرض والأساس القانوني",
    tr: "3. Amaç ve hukuki dayanak",
  }, "text"),
  row(P, "3.body", "Section 3 — body", 15, {
    de: "Die Verarbeitung dient der Angebotserstellung und Vertragsdurchführung (Art. 6 Abs. 1 lit. b DSGVO), der Erfüllung gesetzlicher Aufbewahrungspflichten (lit. c) sowie dem sicheren Betrieb der Website (lit. f).",
    en: "Processing serves the preparation of quotes and performance of the contract (Art. 6(1)(b) GDPR), compliance with statutory retention obligations (lit. c), and the secure operation of the website (lit. f).",
    ar: "تتمّ المعالجة لإعداد العروض وتنفيذ العقد (المادة 6/1/ب)، والامتثال لالتزامات الحفظ القانونية (ج)، وتشغيل الموقع بأمان (و).",
    tr: "İşleme; teklif hazırlama ve sözleşmenin ifası (Md. 6(1)(b) GDPR), yasal saklama yükümlülüklerine uyum (c bendi) ve web sitesinin güvenli işletimi (f bendi) amacına hizmet eder.",
  }),
  row(P, "4.title", "Section 4 — title", 16, {
    de: "4. Eingesetzte Dienstleister",
    en: "4. Processors we use",
    ar: "4. الجهات المعالِجة التي نستعين بها",
    tr: "4. Kullandığımız işleyiciler",
  }, "text"),
  row(P, "4.body", "Section 4 — body", 17, {
    de: "Anwendung und Datenbank betreiben wir auf eigener Infrastruktur; Kundendaten liegen in einer selbst gehosteten PostgreSQL-Datenbank, flüchtige Sitzungsdaten in einem selbst gehosteten Redis-Cache. Für die Entfernungsberechnung rufen wir OpenStreetMap Nominatim auf; dabei werden die eingegebenen Adressen an diesen Dienst übermittelt. Weitere Dienstleister (z. B. Zahlungsanbieter, E-Mail-Versand) sind derzeit nicht eingebunden und werden hier ergänzt, sobald sie es sind.",
    en: "We run the application and the database on our own infrastructure: customer data is held in a self-hosted PostgreSQL database and transient session data in a self-hosted Redis cache. For distance calculation we call OpenStreetMap Nominatim, which means the addresses entered are transmitted to that service. No other processors (for example payment providers or email delivery) are currently integrated; they will be listed here once they are.",
    ar: "نشغّل التطبيق وقاعدة البيانات على بنيتنا التحتية الخاصة: بيانات العملاء في قاعدة PostgreSQL مستضافة ذاتياً، وبيانات الجلسات المؤقّتة في ذاكرة Redis مستضافة ذاتياً. ولحساب المسافات نستدعي OpenStreetMap Nominatim، ما يعني إرسال العناوين المُدخلة إلى تلك الخدمة. ولا توجد حالياً جهات معالِجة أخرى (كمزوّدي الدفع أو إرسال البريد)، وستُضاف هنا فور إدماجها.",
    tr: "Uygulamayı ve veritabanını kendi altyapımızda çalıştırıyoruz: müşteri verileri kendi barındırdığımız bir PostgreSQL veritabanında, geçici oturum verileri ise kendi barındırdığımız bir Redis önbelleğinde tutulur. Mesafe hesabı için OpenStreetMap Nominatim'i çağırırız; bu, girilen adreslerin o hizmete iletilmesi anlamına gelir. Şu anda başka bir işleyici (örneğin ödeme sağlayıcı veya e-posta gönderimi) entegre değildir; entegre edildiklerinde burada listelenecektir.",
  }),
  row(P, "5.title", "Section 5 — title", 18, {
    de: "5. Speicherdauer",
    en: "5. Retention",
    ar: "5. مدّة الحفظ",
    tr: "5. Saklama süresi",
  }, "text"),
  row(P, "5.body", "Section 5 — body", 19, {
    de: "Auftrags- und Rechnungsdaten bewahren wir für die gesetzliche Frist von zehn Jahren auf. Angebote ohne Buchung löschen wir nach Ablauf ihrer Gültigkeit. Serverprotokolle werden nach spätestens 30 Tagen gelöscht.",
    en: "Order and invoice data is kept for the statutory period of ten years. Quotes that are never booked are deleted once they expire. Server logs are deleted after 30 days at the latest.",
    ar: "نحتفظ ببيانات الطلبات والفواتير للمدّة القانونية وهي عشر سنوات. والعروض غير المحجوزة تُحذف بعد انتهاء صلاحيتها. وسجلّات الخادم تُحذف خلال 30 يوماً كحدّ أقصى.",
    tr: "Sipariş ve fatura verileri yasal süre olan on yıl boyunca saklanır. Rezervasyona dönüşmeyen teklifler, geçerlilikleri sona erdiğinde silinir. Sunucu günlükleri en geç 30 gün sonra silinir.",
  }),
  row(P, "6.title", "Section 6 — title", 20, {
    de: "6. Deine Rechte",
    en: "6. Your rights",
    ar: "6. حقوقك",
    tr: "6. Haklarınız",
  }, "text"),
  row(P, "6.body", "Section 6 — body", 21, {
    de: "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren. Wenden Sie sich an support@moveongo.de.",
    en: "You have the right to information, rectification, erasure, restriction of processing, data portability and objection. You may also lodge a complaint with a data protection supervisory authority. Write to support@moveongo.de.",
    ar: "لك الحقّ في الاطّلاع والتصحيح والمحو وتقييد المعالجة ونقل البيانات والاعتراض. ويمكنك أيضاً تقديم شكوى إلى هيئة الإشراف على حماية البيانات. راسلنا على support@moveongo.de.",
    tr: "Bilgi alma, düzeltme, silme, işlemeyi kısıtlama, veri taşınabilirliği ve itiraz haklarına sahipsiniz. Ayrıca bir veri koruma denetim otoritesine şikâyette bulunabilirsiniz. support@moveongo.de adresine yazın.",
  }),

  // ══ Terms ══════════════════════════════════════════════════════════
  row(T, "hero.headline", "Terms — title", 1, {
    de: "Allgemeine Geschäftsbedingungen",
    en: "Terms and Conditions",
    ar: "الشروط والأحكام العامة",
    tr: "Genel Şartlar ve Koşullar",
  }, "text"),
  row(T, "hero.subline", "Terms — lead", 2, {
    de: "Für alle über m.on gebuchten Leistungen.",
    en: "For all services booked through m.on.",
    ar: "لجميع الخدمات المحجوزة عبر m.on.",
    tr: "m.on üzerinden alınan tüm hizmetler için.",
  }),
  row(T, "notice", "Terms — review notice", 3, REVIEW_NOTICE),

  row(T, "1.title", "§ 1 — title", 10, {
    de: "§ 1 Geltungsbereich",
    en: "§ 1 Scope",
    ar: "المادة 1 — النطاق",
    tr: "§ 1 Kapsam",
  }, "text"),
  row(T, "1.body", "§ 1 — body", 11, {
    de: "Diese Bedingungen gelten für alle Verträge über Umzugs-, Entrümpelungs- und Reinigungsleistungen, die über diese Website geschlossen werden.",
    en: "These terms apply to all contracts for moving, clearance and cleaning services concluded through this website.",
    ar: "تسري هذه الشروط على جميع العقود المتعلّقة بخدمات النقل والإخلاء والتنظيف المبرمة عبر هذا الموقع.",
    tr: "Bu şartlar, bu web sitesi üzerinden kurulan taşıma, boşaltma ve temizlik hizmetlerine ilişkin tüm sözleşmeler için geçerlidir.",
  }),
  row(T, "2.title", "§ 2 — title", 12, {
    de: "§ 2 Vertragsschluss",
    en: "§ 2 Formation of contract",
    ar: "المادة 2 — إبرام العقد",
    tr: "§ 2 Sözleşmenin kurulması",
  }, "text"),
  row(T, "2.body", "§ 2 — body", 13, {
    de: "Der im Rechner angezeigte Preis ist ein verbindliches Angebot auf Grundlage Ihrer Angaben. Der Vertrag kommt mit Ihrer Buchung und unserer Bestätigung zustande. Weichen die tatsächlichen Verhältnisse erheblich von Ihren Angaben ab, informieren wir Sie vor Beginn der Arbeiten.",
    en: "The price shown in the calculator is a binding offer based on the details you provide. The contract is formed when you book and we confirm. If the actual circumstances differ substantially from your details, we will tell you before work begins.",
    ar: "السعر الظاهر في الحاسبة عرض مُلزم بناءً على البيانات التي تقدّمها. ويُبرم العقد بحجزك وتأكيدنا. وإذا اختلفت الظروف الفعلية جوهرياً عن بياناتك، نُعلمك قبل بدء العمل.",
    tr: "Hesaplayıcıda gösterilen fiyat, verdiğiniz bilgilere dayanan bağlayıcı bir tekliftir. Sözleşme, siz rezervasyon yaptığınızda ve biz onayladığımızda kurulur. Fiili koşullar bilgilerinizden önemli ölçüde farklıysa, işe başlamadan önce sizi bilgilendiririz.",
  }),
  row(T, "3.title", "§ 3 — title", 14, {
    de: "§ 3 Preise und Zahlung",
    en: "§ 3 Prices and payment",
    ar: "المادة 3 — الأسعار والدفع",
    tr: "§ 3 Fiyatlar ve ödeme",
  }, "text"),
  row(T, "3.body", "§ 3 — body", 15, {
    de: "Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer. Die Zahlung ist nach Abschluss der Leistung fällig, sofern nichts anderes vereinbart ist.",
    en: "All prices include statutory VAT. Payment is due once the service has been completed, unless agreed otherwise.",
    ar: "جميع الأسعار شاملة ضريبة القيمة المضافة القانونية. ويُستحقّ الدفع بعد إتمام الخدمة ما لم يُتّفق على غير ذلك.",
    tr: "Tüm fiyatlara yasal KDV dahildir. Aksi kararlaştırılmadıkça ödeme, hizmet tamamlandıktan sonra muaccel olur.",
  }),
  row(T, "4.title", "§ 4 — title", 16, {
    de: "§ 4 Stornierung",
    en: "§ 4 Cancellation",
    ar: "المادة 4 — الإلغاء",
    tr: "§ 4 İptal",
  }, "text"),
  row(T, "4.body", "§ 4 — body", 17, {
    de: "Bis 5 Werktage vor dem vereinbarten Termin ist die Stornierung kostenfrei. Danach können anteilige Kosten für bereits reservierte Kapazitäten anfallen.",
    en: "Cancellation is free of charge up to 5 working days before the agreed date. After that, a proportionate charge may apply for capacity already reserved.",
    ar: "الإلغاء مجاني حتى 5 أيام عمل قبل الموعد المتّفق عليه. وبعد ذلك قد تُفرض تكاليف نسبية عن الطاقة المحجوزة.",
    tr: "Kararlaştırılan tarihten 5 iş günü öncesine kadar iptal ücretsizdir. Sonrasında, ayrılmış kapasite için orantılı bir ücret doğabilir.",
  }),
  row(T, "5.title", "§ 5 — title", 18, {
    de: "§ 5 Haftung",
    en: "§ 5 Liability",
    ar: "المادة 5 — المسؤولية",
    tr: "§ 5 Sorumluluk",
  }, "text"),
  row(T, "5.body", "§ 5 — body", 19, {
    de: "Wir haften im Rahmen der gesetzlichen Bestimmungen. Für Transportschäden besteht darüber hinaus Versicherungsschutz; Schäden sind unverzüglich, spätestens bei der Übergabe, anzuzeigen.",
    en: "We are liable within the scope of the statutory provisions. Transport damage is additionally covered by insurance; damage must be reported without delay, and at the latest on handover.",
    ar: "نتحمّل المسؤولية في حدود الأحكام القانونية. وأضرار النقل مشمولة إضافةً بالتأمين؛ ويجب الإبلاغ عن الأضرار فوراً وبحدّ أقصى عند التسليم.",
    tr: "Yasal hükümler çerçevesinde sorumluyuz. Nakliye hasarları ayrıca sigorta kapsamındadır; hasarlar gecikmeksizin ve en geç teslimde bildirilmelidir.",
  }),
  row(T, "6.title", "§ 6 — title", 20, {
    de: "§ 6 Widerrufsrecht",
    en: "§ 6 Right of withdrawal",
    ar: "المادة 6 — حقّ الانسحاب",
    tr: "§ 6 Cayma hakkı",
  }, "text"),
  row(T, "6.body", "§ 6 — body", 21, {
    de: "Verbraucher haben ein vierzehntägiges Widerrufsrecht. Es erlischt, wenn die Leistung auf ausdrücklichen Wunsch vor Ablauf der Frist vollständig erbracht wurde.",
    en: "Consumers have a fourteen-day right of withdrawal. It lapses where the service has been performed in full before the period expires, at the consumer's express request.",
    ar: "للمستهلكين حقّ الانسحاب خلال أربعة عشر يوماً. ويسقط هذا الحقّ إذا نُفّذت الخدمة بالكامل قبل انقضاء المهلة بناءً على طلب صريح.",
    tr: "Tüketicilerin on dört günlük cayma hakkı vardır. Hizmet, tüketicinin açık talebi üzerine süre dolmadan tamamen ifa edilmişse bu hak sona erer.",
  }),
];
