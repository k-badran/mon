/**
 * The assistant's knowledge base, in all four languages the product offers.
 *
 * Each intent appears once per locale. Keywords are what a customer would
 * actually type, including misspellings and colloquial forms — "storno" as
 * well as "Stornierung", "كم سعر" as well as "التكلفة".
 *
 * Business figures here must agree with `orders.service.ts` and the terms page.
 * Keeping them in one seeded table rather than in a model prompt is what stops
 * the three drifting apart.
 */

export interface KnowledgeSeed {
  intent: string;
  priority: number;
  translations: Record<
    "de" | "en" | "ar" | "tr",
    { keywords: string[]; question: string; answer: string }
  >;
}

export const KNOWLEDGE: KnowledgeSeed[] = [
  {
    intent: "pricing",
    priority: 3,
    translations: {
      de: {
        keywords: ["preis", "kosten", "kostet", "teuer", "angebot", "rechner", "berechnen", "tarif", "euro"],
        question: "Was kostet ein Umzug?",
        answer:
          "Der Preis hängt von der Leistung, dem Umfang (Fläche oder einzelne Positionen), " +
          "den Etagen ohne Aufzug, der Entfernung und den gewählten Zusatzleistungen ab. " +
          "Berechne ihn in wenigen Klicks mit dem Rechner auf der Startseite — du siehst " +
          "die vollständige Aufschlüsselung, bevor du etwas anfragst. Ein Konto brauchst du dafür nicht.",
      },
      en: {
        keywords: ["price", "cost", "costs", "expensive", "quote", "calculator", "calculate", "rate", "euro"],
        question: "What does a move cost?",
        answer:
          "The price depends on the service, the scope (area or individual items), floors " +
          "without a lift, the distance and any extras. Calculate it in a few clicks with " +
          "the calculator on the home page — you see the full breakdown before requesting " +
          "anything, and no account is needed.",
      },
      ar: {
        keywords: ["سعر", "تكلفة", "كم", "غالي", "عرض", "حاسبة", "احسب", "تسعيرة", "يورو"],
        question: "كم تكلفة النقل؟",
        answer:
          "يعتمد السعر على الخدمة، وحجم العمل (المساحة أو العناصر المختارة)، والطوابق بدون " +
          "مصعد، والمسافة، والخدمات الإضافية. احسبه خلال ثوانٍ من الحاسبة في الصفحة الرئيسية — " +
          "سترى التفصيل الكامل قبل إرسال أي طلب، ولا تحتاج حسابًا لذلك.",
      },
      tr: {
        keywords: ["fiyat", "maliyet", "ne kadar", "tutar", "pahalı", "teklif", "hesaplayıcı", "hesapla", "euro"],
        question: "Taşınma ne kadar tutar?",
        answer:
          "Fiyat; hizmete, kapsama (alan veya tek tek eşyalar), asansörsüz katlara, mesafeye " +
          "ve seçilen ek hizmetlere bağlıdır. Ana sayfadaki hesaplayıcı ile birkaç tıkla " +
          "hesaplayın — talep göndermeden önce tüm dökümü görürsünüz, hesap gerekmez.",
      },
    },
  },
  {
    intent: "cancellation",
    priority: 4,
    translations: {
      de: {
        keywords: ["storno", "stornierung", "stornieren", "absagen", "abbrechen", "kündigen", "gebühr", "rücktritt"],
        question: "Bis wann kann ich kostenlos stornieren?",
        answer:
          "Bis 12 Stunden vor dem Termin ist die Stornierung kostenlos. Danach werden der " +
          "Grundpreis sowie eine Bearbeitungsgebühr von 3 % einbehalten. Stornieren kannst " +
          "du selbst unter „Meine Aufträge“ — die genaue Gebühr wird dir dabei angezeigt.",
      },
      en: {
        keywords: ["cancel", "cancellation", "cancelling", "call off", "fee", "withdraw", "refund"],
        question: "Until when can I cancel free of charge?",
        answer:
          "Cancellation is free until 12 hours before the appointment. After that the base " +
          "rate plus a 3% handling fee is retained. You can cancel yourself under " +
          "\"My Orders\", and the exact fee is shown to you before you confirm.",
      },
      ar: {
        keywords: ["الغاء", "إلغاء", "الغي", "ألغي", "رسوم", "تراجع", "استرداد", "كنسل"],
        question: "حتى متى يمكنني الإلغاء مجانًا؟",
        answer:
          "الإلغاء مجاني حتى 12 ساعة قبل الموعد. بعد ذلك يُحتجز السعر الأساسي إضافةً إلى " +
          "رسوم معالجة بنسبة 3٪. يمكنك الإلغاء بنفسك من «طلباتي»، وسيُعرض لك المبلغ الدقيق " +
          "قبل التأكيد.",
      },
      tr: {
        keywords: ["iptal", "iptal etmek", "vazgeç", "ücret", "iade"],
        question: "Ne zamana kadar ücretsiz iptal edebilirim?",
        answer:
          "İptal, randevudan 12 saat öncesine kadar ücretsizdir. Sonrasında taban ücret ve " +
          "%3 işlem ücreti tahsil edilir. İptali \"Siparişlerim\" bölümünden kendiniz " +
          "yapabilirsiniz; kesin tutar onaylamadan önce gösterilir.",
      },
    },
  },
  {
    intent: "service_area",
    priority: 2,
    translations: {
      de: {
        keywords: ["gebiet", "wo", "region", "stadt", "nrw", "nordrhein", "deutschlandweit", "umkreis", "entfernung"],
        question: "In welchem Gebiet seid ihr tätig?",
        answer:
          "Die Startadresse muss in Nordrhein-Westfalen liegen. Das Ziel eines Umzugs kann " +
          "deutschlandweit sein. Für Entsorgung und Reinigung gilt ebenfalls NRW.",
      },
      en: {
        keywords: ["area", "where", "region", "city", "nrw", "germany", "radius", "distance", "operate"],
        question: "Which areas do you serve?",
        answer:
          "The starting address must be in North Rhine-Westphalia. The destination of a move " +
          "can be anywhere in Germany. Disposal and cleaning are offered within NRW.",
      },
      ar: {
        keywords: ["منطقة", "اين", "أين", "مدينة", "ألمانيا", "المانيا", "نطاق", "تغطية", "مسافة"],
        question: "ما هي المناطق التي تخدمونها؟",
        answer:
          "يجب أن يكون عنوان البداية في ولاية شمال الراين-وستفاليا. أمّا وجهة النقل فيمكن " +
          "أن تكون في أي مكان داخل ألمانيا. خدمتا التخلّص من الأثاث والتنظيف متاحتان داخل الولاية.",
      },
      tr: {
        keywords: ["bölge", "nerede", "şehir", "almanya", "mesafe", "hizmet alanı"],
        question: "Hangi bölgelerde hizmet veriyorsunuz?",
        answer:
          "Başlangıç adresi Kuzey Ren-Vestfalya'da olmalıdır. Taşınmanın varış noktası " +
          "Almanya'nın her yeri olabilir. Tasfiye ve temizlik hizmetleri eyalet içinde verilir.",
      },
    },
  },
  {
    intent: "account_needed",
    priority: 2,
    translations: {
      de: {
        keywords: ["konto", "account", "registrieren", "anmelden", "login", "notwendig", "brauche"],
        question: "Brauche ich ein Konto?",
        answer:
          "Für den Rechner nicht — der ist frei nutzbar. Ein kostenloses Konto brauchst du " +
          "erst für eine verbindliche Anfrage. Dein berechnetes Angebot wird bei der " +
          "Registrierung automatisch übernommen, du musst nichts erneut eingeben.",
      },
      en: {
        keywords: ["account", "register", "sign up", "login", "needed", "required"],
        question: "Do I need an account?",
        answer:
          "Not for the calculator — that is free to use. A free account is only needed to " +
          "submit a binding request. The quote you calculated is carried over automatically " +
          "when you sign up, so nothing has to be entered twice.",
      },
      ar: {
        keywords: ["حساب", "تسجيل", "اشتراك", "دخول", "ضروري", "لازم"],
        question: "هل أحتاج إلى حساب؟",
        answer:
          "لا تحتاج حسابًا لاستخدام الحاسبة — فهي مجانية. الحساب المجاني مطلوب فقط لإرسال " +
          "طلب ملزم. والعرض الذي حسبته يُنقل تلقائيًّا عند التسجيل، فلا تُعيد إدخال شيء.",
      },
      tr: {
        keywords: ["hesap", "kayıt", "üyelik", "giriş", "gerekli"],
        question: "Hesap açmam gerekir mi?",
        answer:
          "Hesaplayıcı için gerekmez, ücretsizdir. Ücretsiz hesap yalnızca bağlayıcı bir " +
          "talep göndermek için gerekir. Hesapladığınız teklif kayıt sırasında otomatik " +
          "olarak aktarılır, hiçbir şeyi tekrar girmeniz gerekmez.",
      },
    },
  },
  {
    intent: "deposit",
    priority: 3,
    translations: {
      de: {
        keywords: ["anzahlung", "vorauszahlung", "zahlen", "bezahlen", "zahlung", "überweisung", "rechnung"],
        question: "Wie funktioniert die Anzahlung?",
        answer:
          "Nach der Auftragsbestätigung ist eine Anzahlung von 20 % des Gesamtpreises innerhalb " +
          "von 24 Stunden fällig. Den Restbetrag begleichst du nach Abschluss der Leistung. " +
          "Deinen Zahlungsstand siehst du jederzeit im Auftrag unter „Meine Aufträge“.",
      },
      en: {
        keywords: ["deposit", "advance", "pay", "payment", "transfer", "invoice", "upfront"],
        question: "How does the deposit work?",
        answer:
          "After the order is confirmed, a deposit of 20% of the total is due within 24 hours. " +
          "The remainder is paid once the job is complete. You can see what has been paid at " +
          "any time on the order under \"My Orders\".",
      },
      ar: {
        keywords: ["دفعة", "عربون", "مقدم", "دفع", "تحويل", "فاتورة", "سداد"],
        question: "كيف تعمل الدفعة المقدّمة؟",
        answer:
          "بعد تأكيد الطلب، تُستحقّ دفعة مقدّمة بنسبة 20٪ من الإجمالي خلال 24 ساعة. " +
          "ويُسدَّد الباقي بعد إتمام الخدمة. يمكنك متابعة حالة الدفع في أي وقت من صفحة الطلب في «طلباتي».",
      },
      tr: {
        keywords: ["kapora", "peşinat", "ödeme", "öde", "havale", "fatura"],
        question: "Kapora nasıl işliyor?",
        answer:
          "Sipariş onaylandıktan sonra toplam tutarın %20'si 24 saat içinde kapora olarak " +
          "ödenir. Kalan tutar iş tamamlandıktan sonra ödenir. Ödeme durumunuzu istediğiniz " +
          "zaman \"Siparişlerim\" altında görebilirsiniz.",
      },
    },
  },
  {
    intent: "services",
    priority: 1,
    translations: {
      de: {
        keywords: ["leistung", "leistungen", "angebot", "service", "was macht", "umzug", "entsorgung", "reinigung", "entrümpelung"],
        question: "Welche Leistungen bietet ihr an?",
        answer:
          "Drei: Umzug (privat und gewerblich), Entsorgung (Entrümpelung und Haushaltsauflösung) " +
          "und Reinigung (Übergabereinigung beim Auszug). Du kannst sie auch kombinieren — " +
          "zum Beispiel Umzug plus Entsorgung am selben Termin.",
      },
      en: {
        keywords: ["service", "services", "offer", "what do you do", "moving", "disposal", "cleaning", "clearance"],
        question: "What services do you offer?",
        answer:
          "Three: moving (private and business), disposal (decluttering and house clearance) " +
          "and cleaning (move-out handover cleaning). They can be combined — for example a " +
          "move plus disposal on the same date.",
      },
      ar: {
        keywords: ["خدمات", "خدمة", "تقدمون", "ماذا", "نقل", "تخلص", "تنظيف", "إفراغ", "افراغ"],
        question: "ما هي الخدمات التي تقدّمونها؟",
        answer:
          "ثلاث خدمات: النقل (المنزلي والتجاري)، والتخلّص من الأثاث (الإفراغ وتصفية المنزل)، " +
          "والتنظيف (تنظيف التسليم عند المغادرة). ويمكن الجمع بينها — مثل النقل مع التخلّص من " +
          "الأثاث في الموعد نفسه.",
      },
      tr: {
        keywords: ["hizmet", "hizmetler", "sunuyorsunuz", "nakliye", "tasfiye", "temizlik", "boşaltma"],
        question: "Hangi hizmetleri sunuyorsunuz?",
        answer:
          "Üç hizmet: nakliye (bireysel ve ticari), tasfiye (eşya boşaltma ve ev tasfiyesi) " +
          "ve temizlik (çıkış teslim temizliği). Bunlar birleştirilebilir — örneğin aynı gün " +
          "nakliye ve tasfiye.",
      },
    },
  },
  {
    intent: "booking_date",
    priority: 2,
    translations: {
      de: {
        keywords: ["termin", "datum", "wann", "verfügbar", "frei", "buchen", "kalender", "vorlauf"],
        question: "Wie schnell bekomme ich einen Termin?",
        answer:
          "Wir brauchen mindestens 48 Stunden Vorlauf. Im Kalender siehst du direkt, welche " +
          "Tage noch frei sind — belegte Tage, Sonntage und Feiertage sind deaktiviert. " +
          "Größere Aufträge können zwei aufeinanderfolgende Tage benötigen.",
      },
      en: {
        keywords: ["date", "appointment", "when", "available", "free", "book", "calendar", "notice"],
        question: "How quickly can I get an appointment?",
        answer:
          "We need at least 48 hours' notice. The calendar shows which days are still free — " +
          "booked days, Sundays and public holidays are disabled. Larger jobs may need two " +
          "consecutive days.",
      },
      ar: {
        keywords: ["موعد", "تاريخ", "متى", "متاح", "فاضي", "حجز", "تقويم", "مهلة"],
        question: "كم أحتاج للحصول على موعد؟",
        answer:
          "نحتاج مهلة 48 ساعة على الأقل. ويظهر لك في التقويم أي الأيام ما زالت متاحة — " +
          "أمّا الأيام المحجوزة والآحاد والعطل الرسمية فتكون معطّلة. وقد تحتاج الطلبات " +
          "الكبيرة إلى يومين متتاليين.",
      },
      tr: {
        keywords: ["randevu", "tarih", "ne zaman", "müsait", "boş", "rezervasyon", "takvim"],
        question: "Ne kadar sürede randevu alabilirim?",
        answer:
          "En az 48 saat önceden haber gerekir. Takvimde hangi günlerin boş olduğunu doğrudan " +
          "görürsünüz; dolu günler, pazarlar ve resmî tatiller devre dışıdır. Büyük işler " +
          "art arda iki gün gerektirebilir.",
      },
    },
  },
  {
    intent: "contact",
    priority: 1,
    translations: {
      de: {
        keywords: ["kontakt", "telefon", "email", "mail", "erreichen", "anrufen", "mitarbeiter", "mensch", "sprechen"],
        question: "Wie erreiche ich euch?",
        answer:
          "Per E-Mail an info@umzugplus.de. Du kannst hier im Chat auch nach einem Mitarbeiter " +
          "fragen — dann übernimmt jemand aus dem Team das Gespräch persönlich.",
      },
      en: {
        keywords: ["contact", "phone", "email", "mail", "reach", "call", "human", "person", "speak", "agent"],
        question: "How can I reach you?",
        answer:
          "By email at info@umzugplus.de. You can also ask for a person right here in the " +
          "chat, and someone from the team will take over the conversation.",
      },
      ar: {
        keywords: ["تواصل", "اتصال", "هاتف", "ايميل", "بريد", "موظف", "شخص", "أتحدث", "اتحدث"],
        question: "كيف أتواصل معكم؟",
        answer:
          "عبر البريد الإلكتروني info@umzugplus.de. ويمكنك أيضًا طلب موظف هنا في المحادثة، " +
          "وعندها يتولّى أحد أفراد الفريق الحديث معك شخصيًّا.",
      },
      tr: {
        keywords: ["iletişim", "telefon", "eposta", "mail", "ulaşmak", "aramak", "insan", "kişi", "görüşmek"],
        question: "Size nasıl ulaşabilirim?",
        answer:
          "info@umzugplus.de adresinden e-posta ile. Ayrıca burada sohbette bir yetkili " +
          "isteyebilirsiniz; ekipten biri görüşmeyi devralır.",
      },
    },
  },
  {
    intent: "packing_material",
    priority: 2,
    translations: {
      de: {
        keywords: ["karton", "kartons", "verpackung", "material", "einpacken", "packen", "umzugskarton"],
        question: "Stellt ihr Kartons und Verpackungsmaterial?",
        answer:
          "Ja. Der Verpackungsservice ist eine Zusatzleistung im Rechner und enthält das " +
          "Material. Einzelne Umzugskartons kannst du auch als Position im Katalog auswählen, " +
          "wenn du selbst packen möchtest.",
      },
      en: {
        keywords: ["box", "boxes", "packing", "material", "pack", "wrap", "carton"],
        question: "Do you provide boxes and packing material?",
        answer:
          "Yes. The packing service is an extra in the calculator and includes the material. " +
          "You can also select individual moving boxes as catalogue items if you prefer to " +
          "pack yourself.",
      },
      ar: {
        keywords: ["كرتون", "صناديق", "تغليف", "مواد", "تعبئة", "أغلف"],
        question: "هل توفّرون الصناديق ومواد التغليف؟",
        answer:
          "نعم. خدمة التغليف متاحة كخدمة إضافية في الحاسبة وتشمل المواد. ويمكنك أيضًا اختيار " +
          "صناديق النقل كعناصر مفردة من الكتالوج إن كنت تفضّل التعبئة بنفسك.",
      },
      tr: {
        keywords: ["koli", "kutu", "ambalaj", "malzeme", "paketleme"],
        question: "Koli ve ambalaj malzemesi sağlıyor musunuz?",
        answer:
          "Evet. Paketleme hizmeti hesaplayıcıda ek hizmettir ve malzemeyi içerir. Kendiniz " +
          "paketlemek isterseniz katalogdan tek tek nakliye kolisi de seçebilirsiniz.",
      },
    },
  },
  {
    intent: "insurance",
    priority: 2,
    translations: {
      de: {
        keywords: ["versicherung", "versichert", "schaden", "haftung", "beschädigt", "kaputt", "transportversicherung"],
        question: "Sind meine Möbel versichert?",
        answer:
          "Die gesetzliche Haftung ist immer enthalten. Im Rechner kannst du zusätzlich eine " +
          "erweiterte Transportversicherung dazubuchen. Sollte doch etwas beschädigt werden, " +
          "melde es bitte über „Meine Aufträge“ als Beschwerde — so ist es dokumentiert.",
      },
      en: {
        keywords: ["insurance", "insured", "damage", "liability", "broken", "damaged", "cover"],
        question: "Is my furniture insured?",
        answer:
          "Statutory liability is always included. In the calculator you can add extended " +
          "transport insurance on top. If something is damaged anyway, please report it as a " +
          "complaint under \"My Orders\" so that it is documented.",
      },
      ar: {
        keywords: ["تأمين", "مؤمن", "ضرر", "مسؤولية", "كسر", "تلف", "تعويض"],
        question: "هل أثاثي مؤمَّن؟",
        answer:
          "المسؤولية القانونية مشمولة دائمًا. ويمكنك في الحاسبة إضافة تأمين نقل موسّع. " +
          "وإذا تعرّض شيء للتلف رغم ذلك، فالرجاء الإبلاغ عنه كشكوى من «طلباتي» ليكون موثّقًا.",
      },
      tr: {
        keywords: ["sigorta", "sigortalı", "hasar", "sorumluluk", "kırık", "zarar"],
        question: "Eşyalarım sigortalı mı?",
        answer:
          "Yasal sorumluluk her zaman dahildir. Hesaplayıcıda ek olarak genişletilmiş nakliye " +
          "sigortası ekleyebilirsiniz. Yine de bir hasar olursa lütfen \"Siparişlerim\" " +
          "altından şikâyet olarak bildirin; böylece kayıt altına alınır.",
      },
    },
  },
];
