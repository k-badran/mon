/**
 * The complete message catalogue.
 *
 * Kept as one typed source rather than four hand-edited JSON files, so a key
 * added for one language cannot be forgotten in another — the type below makes
 * that a compile error. The JSON files the app loads are generated from this.
 *
 * A plural is written as an object of CLDR categories. Arabic genuinely needs
 * six of them; German, English and Turkish use two. Only the categories a
 * language actually has are supplied, and `other` is always the fallback.
 */

export const LOCALES = ["de", "en", "ar", "tr"] as const;
export type Locale = (typeof LOCALES)[number];

type Plural = { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
type Message = string | Plural;

/** Every key must exist in every locale. */
export type Catalogue = Record<Locale, Record<MessageKey, Message>>;

export const MESSAGES = {
  // ── Navigation ──────────────────────────────────────────────────────
  "nav.calculator": {
    de: "Rechner", en: "Calculator", ar: "الحاسبة", tr: "Hesaplayıcı",
  },
  "nav.services": {
    de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler",
  },
  "nav.reviews": {
    de: "Kundenstimmen", en: "Reviews", ar: "آراء العملاء", tr: "Yorumlar",
  },
  "nav.about": {
    de: "Über uns", en: "About us", ar: "من نحن", tr: "Hakkımızda",
  },
  "nav.howItWorks": {
    de: "So funktioniert's", en: "How it works", ar: "كيف يعمل", tr: "Nasıl çalışır",
  },
  "nav.admin": { de: "Admin", en: "Admin", ar: "الإدارة", tr: "Yönetim" },
  "nav.profile": {
    de: "Mein Profil", en: "My Profile", ar: "ملفي الشخصي", tr: "Profilim",
  },
  "nav.orders": {
    de: "Meine Aufträge", en: "My Orders", ar: "طلباتي", tr: "Siparişlerim",
  },
  "nav.logout": {
    de: "Abmelden", en: "Log out", ar: "تسجيل الخروج", tr: "Çıkış yap",
  },
  "nav.login": {
    de: "Anmelden", en: "Log in", ar: "تسجيل الدخول", tr: "Giriş yap",
  },
  "nav.signup": {
    de: "Registrieren", en: "Sign up", ar: "إنشاء حساب", tr: "Kayıt ol",
  },
  "nav.language": { de: "Sprache", en: "Language", ar: "اللغة", tr: "Dil" },

  // ── Common ──────────────────────────────────────────────────────────
  "common.loading": {
    de: "Wird geladen…", en: "Loading…", ar: "جارٍ التحميل…", tr: "Yükleniyor…",
  },
  "common.retry": {
    de: "Erneut versuchen", en: "Try again", ar: "حاول مرّة أخرى", tr: "Tekrar dene",
  },
  "common.cancel": { de: "Abbrechen", en: "Cancel", ar: "إلغاء", tr: "İptal" },
  "common.save": { de: "Speichern", en: "Save", ar: "حفظ", tr: "Kaydet" },
  "common.saving": {
    de: "Speichern…", en: "Saving…", ar: "جارٍ الحفظ…", tr: "Kaydediliyor…",
  },
  "common.saved": { de: "Gespeichert.", en: "Saved.", ar: "تم الحفظ.", tr: "Kaydedildi." },
  "common.back": { de: "Zurück", en: "Back", ar: "رجوع", tr: "Geri" },
  "common.next": { de: "Weiter", en: "Next", ar: "التالي", tr: "İleri" },
  "common.search": { de: "Suche", en: "Search", ar: "بحث", tr: "Ara" },
  "common.status": { de: "Status", en: "Status", ar: "الحالة", tr: "Durum" },
  "common.action": { de: "Aktion", en: "Action", ar: "إجراء", tr: "İşlem" },
  "common.name": { de: "Name", en: "Name", ar: "الاسم", tr: "İsim" },
  "common.email": { de: "E-Mail", en: "Email", ar: "البريد الإلكتروني", tr: "E-posta" },
  "common.phone": { de: "Telefon", en: "Phone", ar: "الهاتف", tr: "Telefon" },
  "common.password": { de: "Passwort", en: "Password", ar: "كلمة المرور", tr: "Şifre" },
  "common.date": { de: "Termin", en: "Date", ar: "الموعد", tr: "Tarih" },
  "common.time": { de: "Uhrzeit", en: "Time", ar: "الوقت", tr: "Saat" },
  "common.address": { de: "Adresse", en: "Address", ar: "العنوان", tr: "Adres" },
  "common.optional": { de: "optional", en: "optional", ar: "اختياري", tr: "isteğe bağlı" },
  "common.none": { de: "—", en: "—", ar: "—", tr: "—" },
  "common.loadMore": {
    de: "Weitere laden", en: "Load more", ar: "تحميل المزيد", tr: "Daha fazla yükle",
  },

  // ── Order status ────────────────────────────────────────────────────
  "status.quoted": { de: "Angebot", en: "Quote", ar: "عرض سعر", tr: "Teklif" },
  "status.confirmed": { de: "Bestätigt", en: "Confirmed", ar: "مؤكَّد", tr: "Onaylandı" },
  "status.cancelled": { de: "Storniert", en: "Cancelled", ar: "ملغى", tr: "İptal edildi" },
  "status.completed": {
    de: "Abgeschlossen", en: "Completed", ar: "مكتمل", tr: "Tamamlandı",
  },
  "status.active": { de: "Aktiv", en: "Active", ar: "نشط", tr: "Aktif" },
  "status.blocked": { de: "Gesperrt", en: "Blocked", ar: "محظور", tr: "Engellendi" },

  // ── Services ────────────────────────────────────────────────────────
  "service.moving": { de: "Umzug", en: "Moving", ar: "نقل", tr: "Nakliye" },
  "service.disposal": {
    de: "Entsorgung", en: "Disposal", ar: "التخلّص من الأثاث", tr: "Tasfiye",
  },
  "service.cleaning": { de: "Reinigung", en: "Cleaning", ar: "تنظيف", tr: "Temizlik" },
  "service.moving.hint": {
    de: "Privat- oder Firmenumzug",
    en: "Private or business move",
    ar: "نقل منزلي أو تجاري",
    tr: "Bireysel veya ticari taşınma",
  },
  "service.disposal.hint": {
    de: "Entrümpelung & Haushaltsauflösung",
    en: "Decluttering & house clearance",
    ar: "إفراغ وتصفية المنزل",
    tr: "Eşya boşaltma ve tasfiye",
  },
  "service.cleaning.hint": {
    de: "Übergabereinigung beim Auszug",
    en: "Move-out handover cleaning",
    ar: "تنظيف التسليم عند المغادرة",
    tr: "Çıkış teslim temizliği",
  },

  // ── Calculator ──────────────────────────────────────────────────────
  "calc.title": {
    de: "Sofort-Preis berechnen",
    en: "Calculate your instant price",
    ar: "احسب سعرك الفوري",
    tr: "Anında fiyatını hesapla",
  },
  "calc.lead": {
    de: "Der Rechner ist kostenlos und ohne Konto nutzbar. Ein Konto brauchst du erst, wenn du verbindlich anfragen möchtest.",
    en: "The calculator is free and needs no account. An account is only needed to submit a binding request.",
    ar: "الحاسبة مجانية ولا تحتاج حسابًا. الحساب مطلوب فقط عند إرسال طلب ملزم.",
    tr: "Hesaplayıcı ücretsizdir ve hesap gerektirmez. Hesap yalnızca bağlayıcı talep için gerekir.",
  },
  "calc.step.scope": { de: "Umfang", en: "Scope", ar: "النطاق", tr: "Kapsam" },
  "calc.step.schedule": { de: "Termin", en: "Date", ar: "الموعد", tr: "Tarih" },
  "calc.step.contact": { de: "Kontakt", en: "Contact", ar: "التواصل", tr: "İletişim" },
  "calc.progress": { de: "Fortschritt", en: "Wizard progress", ar: "التقدّم", tr: "İlerleme" },
  "calc.whichService": {
    de: "Welche Leistung brauchst du?",
    en: "Which service do you need?",
    ar: "أي خدمة تحتاج؟",
    tr: "Hangi hizmete ihtiyacınız var?",
  },
  "calc.customerType": {
    de: "Für wen?", en: "For whom?", ar: "لمن؟", tr: "Kimin için?",
  },
  "calc.private": { de: "Privat", en: "Private", ar: "شخصي", tr: "Bireysel" },
  "calc.business": { de: "Gewerblich", en: "Business", ar: "تجاري", tr: "Ticari" },
  "calc.scopeAndAddress": {
    de: "Umfang und Adresse",
    en: "Scope and address",
    ar: "النطاق والعنوان",
    tr: "Kapsam ve adres",
  },
  "calc.originAddress": {
    de: "Startadresse", en: "Starting address", ar: "عنوان البداية", tr: "Başlangıç adresi",
  },
  "calc.objectAddress": {
    de: "Adresse des Objekts", en: "Property address", ar: "عنوان العقار", tr: "Mülk adresi",
  },
  "calc.destinationAddress": {
    de: "Zieladresse", en: "Destination address", ar: "عنوان الوجهة", tr: "Varış adresi",
  },
  "calc.area": { de: "Fläche (m²)", en: "Area (m²)", ar: "المساحة (م²)", tr: "Alan (m²)" },
  "calc.floor": { de: "Etage", en: "Floor", ar: "الطابق", tr: "Kat" },
  "calc.floorIn": {
    de: "Etage (Einzug)", en: "Floor (moving in)", ar: "الطابق (الوصول)", tr: "Kat (giriş)",
  },
  "calc.hasElevator": {
    de: "Aufzug vorhanden", en: "Lift available", ar: "يوجد مصعد", tr: "Asansör var",
  },
  "calc.extras": {
    de: "Zusatzleistungen", en: "Extras", ar: "خدمات إضافية", tr: "Ek hizmetler",
  },
  "calc.packing": {
    de: "Verpackungsservice inkl. Material",
    en: "Packing service incl. material",
    ar: "خدمة التغليف شاملة المواد",
    tr: "Paketleme hizmeti (malzeme dahil)",
  },
  "calc.parkingZone": {
    de: "Halteverbotszone", en: "No-parking zone", ar: "منطقة حظر وقوف", tr: "Park yasağı bölgesi",
  },
  "calc.insurance": {
    de: "Transportversicherung (erweitert)",
    en: "Extended transport insurance",
    ar: "تأمين نقل موسّع",
    tr: "Genişletilmiş nakliye sigortası",
  },
  "calc.crewOfThree": {
    de: "3 Mitarbeiter (schneller)",
    en: "3 movers (faster)",
    ar: "3 عمّال (أسرع)",
    tr: "3 işçi (daha hızlı)",
  },
  "calc.preferredDate": {
    de: "Wunschtermin", en: "Preferred date", ar: "الموعد المفضّل", tr: "Tercih edilen tarih",
  },
  "calc.calendarHint": {
    de: "Belegte und gesperrte Tage sind deaktiviert. Wird ein Tag während deiner Auswahl vergeben, verschwindet er automatisch.",
    en: "Booked and blocked days are disabled. If a day is taken while you are choosing, it disappears automatically.",
    ar: "الأيام المحجوزة والمغلقة معطّلة. وإذا حُجز يوم أثناء اختيارك، يختفي تلقائيًّا.",
    tr: "Dolu ve kapalı günler devre dışıdır. Siz seçerken bir gün dolarsa otomatik olarak kaybolur.",
  },
  "calc.discountCode": {
    de: "Rabattcode", en: "Discount code", ar: "كود خصم", tr: "İndirim kodu",
  },
  "calc.yourPrice": { de: "Dein Preis", en: "Your price", ar: "سعرك", tr: "Fiyatınız" },
  "calc.enterToSeePrice": {
    de: "Gib Adresse und Fläche an, um den Preis zu sehen.",
    en: "Enter an address and area to see the price.",
    ar: "أدخل العنوان والمساحة لرؤية السعر.",
    tr: "Fiyatı görmek için adres ve alan girin.",
  },
  "calc.calculating": {
    de: "Preis wird berechnet…", en: "Calculating price…", ar: "جارٍ حساب السعر…", tr: "Fiyat hesaplanıyor…",
  },
  "calc.net": { de: "Netto", en: "Net", ar: "الصافي", tr: "Net" },
  "calc.vat": { de: "MwSt. {rate} %", en: "VAT {rate}%", ar: "ضريبة القيمة المضافة {rate}٪", tr: "KDV %{rate}" },
  "calc.total": { de: "Gesamt", en: "Total", ar: "الإجمالي", tr: "Toplam" },
  "calc.deposit": {
    de: "Anzahlung", en: "Deposit", ar: "الدفعة المقدّمة", tr: "Kapora",
  },
  "calc.duration": {
    de: "Voraussichtliche Dauer: {hours} Std. Unverbindliche Schätzung.",
    en: "Estimated duration: {hours} hrs. Non-binding estimate.",
    ar: "المدة المتوقعة: {hours} ساعة. تقدير غير ملزم.",
    tr: "Tahmini süre: {hours} saat. Bağlayıcı olmayan tahmin.",
  },
  "calc.accountHint": {
    de: "Für die verbindliche Anfrage legst du ein kostenloses Konto an — dein berechneter Preis wird übernommen.",
    en: "For a binding request you create a free account — your calculated price is carried over.",
    ar: "للطلب الملزم تُنشئ حسابًا مجانيًّا — والسعر الذي حسبته يُنقل معك.",
    tr: "Bağlayıcı talep için ücretsiz hesap açarsınız — hesapladığınız fiyat aktarılır.",
  },
  "calc.submit": {
    de: "Verbindlich anfragen", en: "Request binding quote", ar: "إرسال طلب ملزم", tr: "Bağlayıcı talep gönder",
  },
  "calc.submitWithSignup": {
    de: "Konto anlegen & anfragen",
    en: "Create account & request",
    ar: "إنشاء حساب وإرسال الطلب",
    tr: "Hesap aç ve talep et",
  },
  "calc.sending": { de: "Sende…", en: "Sending…", ar: "جارٍ الإرسال…", tr: "Gönderiliyor…" },
  "calc.successTitle": {
    de: "Anfrage gesendet", en: "Request sent", ar: "تم إرسال الطلب", tr: "Talep gönderildi",
  },
  "calc.successBody": {
    de: "Dein Auftrag {reference} ist bei uns eingegangen. Den Status siehst du jederzeit unter „Meine Aufträge“ — er aktualisiert sich automatisch.",
    en: "Your order {reference} has reached us. You can see its status any time under \"My Orders\" — it updates automatically.",
    ar: "وصلنا طلبك {reference}. يمكنك متابعة حالته في أي وقت من «طلباتي» — وتتحدّث تلقائيًّا.",
    tr: "Siparişiniz {reference} bize ulaştı. Durumunu istediğiniz zaman \"Siparişlerim\" altında görebilirsiniz — otomatik güncellenir.",
  },
  "calc.goToOrders": {
    de: "Zu meinen Aufträgen", en: "Go to my orders", ar: "إلى طلباتي", tr: "Siparişlerime git",
  },
  "calc.prevMonth": {
    de: "Vorheriger Monat", en: "Previous month", ar: "الشهر السابق", tr: "Önceki ay",
  },
  "calc.nextMonth": {
    de: "Nächster Monat", en: "Next month", ar: "الشهر التالي", tr: "Sonraki ay",
  },

  // ── Auth ────────────────────────────────────────────────────────────

  "auth.welcomeBack": {
    de: "Willkommen zurück", en: "Welcome back", ar: "أهلاً بعودتك", tr: "Tekrar hoş geldiniz",
  },
  "auth.panelHeadline": {
    de: "Umzug — einfacher, schneller, stressfrei.",
    en: "Moving made simpler, faster, and stress-free.",
    ar: "النقل — أبسط وأسرع وبلا توتّر.",
    tr: "Taşınma — daha basit, daha hızlı, stressiz.",
  },
  "auth.panelBody": {
    de: "Melde dich an, um deine Aufträge zu verwalten, deine Checkliste anzupassen und dein Team direkt zu erreichen.",
    en: "Log in to manage your bookings, customize your moving checklist, and connect with your dedicated professional team instantly.",
    ar: "سجّل الدخول لإدارة طلباتك، وتخصيص قائمة النقل، والتواصل مع فريقك مباشرةً.",
    tr: "Rezervasyonlarınızı yönetmek, taşınma listenizi özelleştirmek ve ekibinizle anında iletişim kurmak için giriş yapın.",
  },
  "auth.badgeInsured": {
    de: "Vollständig versichert", en: "Fully Insured", ar: "مؤمَّن بالكامل", tr: "Tam Sigortalı",
  },
  "auth.badgeRating": {
    de: "4,6/5 Bewertung", en: "4.6/5 Rating", ar: "تقييم 4.6/5", tr: "4,6/5 Puan",
  },
  "auth.forgotPassword": {
    de: "Passwort vergessen?", en: "Forgot Password?", ar: "نسيت كلمة المرور؟", tr: "Şifrenizi mi unuttunuz?",
  },
  "auth.orContinueWith": {
    de: "oder weiter mit", en: "or continue with", ar: "أو تابع باستخدام", tr: "veya şununla devam et",
  },
  "auth.show": { de: "Zeigen", en: "Show", ar: "إظهار", tr: "Göster" },
  "auth.hide": { de: "Verbergen", en: "Hide", ar: "إخفاء", tr: "Gizle" },
  "auth.comingSoon": {
    de: "Demnächst verfügbar", en: "Coming soon", ar: "قريبًا", tr: "Yakında",
  },
  "auth.loginTitle": { de: "Anmelden", en: "Log in", ar: "تسجيل الدخول", tr: "Giriş yap" },
  "auth.loginSub": {
    de: "Melde dich mit deinem Konto an.",
    en: "Sign in with your account.",
    ar: "سجّل الدخول بحسابك.",
    tr: "Hesabınızla giriş yapın.",
  },
  "auth.loginSubmit": { de: "Einloggen", en: "Log in", ar: "دخول", tr: "Giriş yap" },
  "auth.loggingIn": { de: "Anmelden…", en: "Signing in…", ar: "جارٍ الدخول…", tr: "Giriş yapılıyor…" },
  "auth.noAccount": {
    de: "Noch kein Konto?", en: "No account yet?", ar: "ليس لديك حساب؟", tr: "Hesabınız yok mu?",
  },
  "auth.hasAccount": {
    de: "Schon ein Konto?", en: "Already have an account?", ar: "لديك حساب؟", tr: "Zaten hesabınız var mı?",
  },
  "auth.signupTitle": { de: "Registrieren", en: "Sign up", ar: "إنشاء حساب", tr: "Kayıt ol" },
  "auth.signupSub": {
    de: "Erstelle ein kostenloses Konto.",
    en: "Create a free account.",
    ar: "أنشئ حسابًا مجانيًّا.",
    tr: "Ücretsiz hesap oluşturun.",
  },
  "auth.signupWithQuote": {
    de: "Noch ein Schritt — dein berechnetes Angebot wird übernommen.",
    en: "One more step — your calculated quote is carried over.",
    ar: "خطوة واحدة — والعرض الذي حسبته يُنقل معك.",
    tr: "Bir adım daha — hesapladığınız teklif aktarılır.",
  },
  "auth.signupSubmit": {
    de: "Konto erstellen", en: "Create account", ar: "إنشاء الحساب", tr: "Hesap oluştur",
  },
  "auth.creatingAccount": {
    de: "Konto wird erstellt…", en: "Creating account…", ar: "جارٍ إنشاء الحساب…", tr: "Hesap oluşturuluyor…",
  },
  "auth.passwordHint": {
    de: "Mindestens {min} Zeichen.",
    en: "At least {min} characters.",
    ar: "{min} أحرف على الأقل.",
    tr: "En az {min} karakter.",
  },
  "auth.emailLocked": {
    de: "Zum Ändern der E-Mail wende dich bitte an den Support.",
    en: "To change your email, please contact support.",
    ar: "لتغيير البريد الإلكتروني، الرجاء التواصل مع الدعم.",
    tr: "E-postanızı değiştirmek için lütfen destekle iletişime geçin.",
  },
  "auth.profileTitle": {
    de: "Mein Profil", en: "My Profile", ar: "ملفي الشخصي", tr: "Profilim",
  },

  // ── Auth: reset, confirm and one-time code ──────────────────────────
  "auth.forgotTitle": {
    de: "Passwort vergessen", en: "Forgot password", ar: "نسيت كلمة السر", tr: "Şifremi unuttum",
  },
  "auth.forgotSub": {
    de: "Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.", en: "Enter your email address and we'll send you a reset link.", ar: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.", tr: "E-posta adresini gir, sıfırlama bağlantısı gönderelim.",
  },
  "auth.forgotSubmit": {
    de: "Link senden", en: "Send link", ar: "إرسال الرابط", tr: "Bağlantı gönder",
  },
  "auth.forgotSending": {
    de: "Wird gesendet…", en: "Sending…", ar: "جارٍ الإرسال…", tr: "Gönderiliyor…",
  },
  "auth.forgotSent": {
    de: "Falls ein Konto zu dieser Adresse gehört, ist ein Link auf dem Weg. Prüfe auch den Spam-Ordner.", en: "If an account exists for that address, a link is on its way. Check your spam folder too.", ar: "إذا كان هناك حساب مرتبط بهذا العنوان، فالرابط في الطريق. تحقّق من مجلد السبام أيضاً.", tr: "Bu adrese ait bir hesap varsa bağlantı yolda. Spam klasörünü de kontrol et.",
  },
  "auth.backToLogin": {
    de: "Zurück zur Anmeldung", en: "Back to sign in", ar: "رجوع لتسجيل الدخول", tr: "Girişe dön",
  },
  "auth.resetTitle": {
    de: "Neues Passwort wählen", en: "Choose a new password", ar: "اختر كلمة سر جديدة", tr: "Yeni şifre seç",
  },
  "auth.resetSub": {
    de: "Wähle ein neues Passwort für dein Konto.", en: "Pick a new password for your account.", ar: "اختر كلمة سر جديدة لحسابك.", tr: "Hesabın için yeni bir şifre belirle.",
  },
  "auth.resetSubmit": {
    de: "Passwort speichern", en: "Save password", ar: "حفظ كلمة السر", tr: "Şifreyi kaydet",
  },
  "auth.resetSaving": {
    de: "Wird gespeichert…", en: "Saving…", ar: "جارٍ الحفظ…", tr: "Kaydediliyor…",
  },
  "auth.resetDone": {
    de: "Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.", en: "Your password has been changed. You can sign in now.", ar: "تم تغيير كلمة السر. بتقدر تسجّل دخول هلق.", tr: "Şifren değiştirildi. Şimdi giriş yapabilirsin.",
  },
  "auth.confirmPassword": {
    de: "Passwort bestätigen", en: "Confirm password", ar: "تأكيد كلمة السر", tr: "Şifreyi onayla",
  },
  "auth.passwordMismatch": {
    de: "Die Passwörter stimmen nicht überein.", en: "The passwords do not match.", ar: "كلمتا السر غير متطابقتين.", tr: "Şifreler eşleşmiyor.",
  },
  "auth.linkInvalid": {
    de: "Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an.", en: "This link is invalid or has expired. Request a new one.", ar: "هذا الرابط غير صالح أو منتهي. اطلب رابطاً جديداً.", tr: "Bu bağlantı geçersiz veya süresi dolmuş. Yenisini talep et.",
  },
  "auth.linkMissing": {
    de: "Es fehlt ein Token. Öffne den Link direkt aus der E-Mail.", en: "The token is missing. Open the link straight from the email.", ar: "الرمز مفقود. افتح الرابط من الإيميل مباشرة.", tr: "Belirteç eksik. Bağlantıyı doğrudan e-postadan aç.",
  },
  "auth.verifyTitle": {
    de: "E-Mail bestätigen", en: "Confirm your email", ar: "تأكيد البريد الإلكتروني", tr: "E-postanı onayla",
  },
  "auth.verifyChecking": {
    de: "Wird bestätigt…", en: "Confirming…", ar: "جارٍ التأكيد…", tr: "Onaylanıyor…",
  },
  "auth.verifyDone": {
    de: "Deine E-Mail-Adresse ist bestätigt. Vielen Dank.", en: "Your email address is confirmed. Thank you.", ar: "تم تأكيد بريدك الإلكتروني. شكراً لك.", tr: "E-posta adresin onaylandı. Teşekkürler.",
  },
  "auth.verifyResend": {
    de: "Bestätigungslink erneut senden", en: "Resend confirmation link", ar: "إعادة إرسال رابط التأكيد", tr: "Onay bağlantısını yeniden gönder",
  },
  "auth.verifySent": {
    de: "Wir haben dir einen neuen Link geschickt.", en: "We've sent you a new link.", ar: "بعتنالك رابط جديد.", tr: "Sana yeni bir bağlantı gönderdik.",
  },
  "auth.otpTitle": {
    de: "Mit Code anmelden", en: "Sign in with a code", ar: "الدخول برمز", tr: "Kod ile giriş",
  },
  "auth.otpSub": {
    de: "Wir senden dir einen sechsstelligen Code per E-Mail — kein Passwort nötig.", en: "We'll email you a six-digit code — no password needed.", ar: "نبعتلك رمز من ٦ أرقام على الإيميل — بدون كلمة سر.", tr: "Sana e-postayla altı haneli bir kod göndereceğiz — şifre gerekmez.",
  },
  "auth.otpRequest": {
    de: "Code senden", en: "Send code", ar: "إرسال الرمز", tr: "Kod gönder",
  },
  "auth.otpSent": {
    de: "Falls ein Konto zu dieser Adresse gehört, ist ein Code auf dem Weg.", en: "If an account exists for that address, a code is on its way.", ar: "إذا كان هناك حساب مرتبط بهذا العنوان، فالرمز في الطريق.", tr: "Bu adrese ait bir hesap varsa kod yolda.",
  },
  "auth.otpCode": {
    de: "Sechsstelliger Code", en: "Six-digit code", ar: "الرمز المكوّن من ٦ أرقام", tr: "Altı haneli kod",
  },
  "auth.otpVerify": {
    de: "Anmelden", en: "Sign in", ar: "تسجيل الدخول", tr: "Giriş yap",
  },
  "auth.otpVerifying": {
    de: "Wird geprüft…", en: "Checking…", ar: "جارٍ التحقّق…", tr: "Kontrol ediliyor…",
  },
  "auth.otpInvalid": {
    de: "Dieser Code ist falsch oder abgelaufen.", en: "That code is wrong or has expired.", ar: "هذا الرمز خطأ أو منتهي.", tr: "Bu kod yanlış veya süresi dolmuş.",
  },
  "auth.otpChangeEmail": {
    de: "Andere E-Mail-Adresse verwenden", en: "Use a different email", ar: "استخدام بريد آخر", tr: "Başka bir e-posta kullan",
  },
  "auth.otpLink": {
    de: "Stattdessen Code per E-Mail", en: "Email me a code instead", ar: "أرسل لي رمزاً بدلاً من ذلك", tr: "Bunun yerine kod gönder",
  },
  "auth.passwordLink": {
    de: "Mit Passwort anmelden", en: "Sign in with a password", ar: "الدخول بكلمة السر", tr: "Şifre ile giriş",
  },
  "auth.otpNotDelivered": {
    de: "Hinweis: Der Mailversand ist deaktiviert (MAIL_DRIVER=log) — die Nachricht wurde nur lokal gespeichert.", en: "Note: mail sending is disabled (MAIL_DRIVER=log) — the message was only recorded locally.", ar: "ملاحظة: إرسال الإيميل معطّل (MAIL_DRIVER=log) — الرسالة انحفظت محلياً بس.", tr: "Not: e-posta gönderimi kapalı (MAIL_DRIVER=log) — mesaj yalnızca yerel olarak kaydedildi.",
  },

  // ── Orders ──────────────────────────────────────────────────────────
  "orders.title": {
    de: "Meine Aufträge", en: "My Orders", ar: "طلباتي", tr: "Siparişlerim",
  },
  "orders.empty": {
    de: "Du hast noch keine Aufträge.",
    en: "You have no orders yet.",
    ar: "لا توجد لديك طلبات بعد.",
    tr: "Henüz siparişiniz yok.",
  },
  "orders.calculateNow": {
    de: "Jetzt Preis berechnen", en: "Calculate a price now", ar: "احسب السعر الآن", tr: "Şimdi fiyat hesapla",
  },
  "orders.reference": {
    de: "Auftrag", en: "Order", ar: "الطلب", tr: "Sipariş",
  },
  "orders.service": { de: "Leistung", en: "Service", ar: "الخدمة", tr: "Hizmet" },
  "orders.breakdown": {
    de: "Preisaufschlüsselung", en: "Price breakdown", ar: "تفصيل السعر", tr: "Fiyat dökümü",
  },
  "orders.paid": {
    de: "Davon bezahlt", en: "Paid so far", ar: "المدفوع حتى الآن", tr: "Şu ana kadar ödenen",
  },
  "orders.cancelOrder": {
    de: "Auftrag stornieren", en: "Cancel order", ar: "إلغاء الطلب", tr: "Siparişi iptal et",
  },
  "orders.cancelTitle": {
    de: "Auftrag {reference} stornieren?",
    en: "Cancel order {reference}?",
    ar: "إلغاء الطلب {reference}؟",
    tr: "{reference} siparişi iptal edilsin mi?",
  },
  "orders.cancelBody": {
    de: "Bis 12 Stunden vor dem Termin ist die Stornierung kostenlos. Danach werden der Grundpreis sowie eine Bearbeitungsgebühr von 3 % einbehalten.",
    en: "Cancellation is free until 12 hours before the appointment. After that the base rate plus a 3% handling fee is retained.",
    ar: "الإلغاء مجاني حتى 12 ساعة قبل الموعد. بعد ذلك يُحتجز السعر الأساسي إضافةً إلى رسوم معالجة 3٪.",
    tr: "İptal, randevudan 12 saat öncesine kadar ücretsizdir. Sonrasında taban ücret ve %3 işlem ücreti tahsil edilir.",
  },
  "orders.cancelConfirm": {
    de: "Ja, stornieren", en: "Yes, cancel", ar: "نعم، ألغِ", tr: "Evet, iptal et",
  },
  "orders.cancelling": {
    de: "Wird storniert…", en: "Cancelling…", ar: "جارٍ الإلغاء…", tr: "İptal ediliyor…",
  },
  "orders.cancellationFee": {
    de: "Stornogebühr: {amount}",
    en: "Cancellation fee: {amount}",
    ar: "رسوم الإلغاء: {amount}",
    tr: "İptal ücreti: {amount}",
  },
  "orders.notFound": {
    de: "Dieser Auftrag wurde nicht gefunden.",
    en: "That order was not found.",
    ar: "لم يُعثر على هذا الطلب.",
    tr: "Bu sipariş bulunamadı.",
  },
  "orders.loadFailed": {
    de: "Deine Aufträge konnten nicht geladen werden.",
    en: "Your orders could not be loaded.",
    ar: "تعذّر تحميل طلباتك.",
    tr: "Siparişleriniz yüklenemedi.",
  },

  // ── Reviews ─────────────────────────────────────────────────────────
  "reviews.title": {
    de: "Kundenstimmen", en: "Reviews", ar: "آراء العملاء", tr: "Yorumlar",
  },
  "reviews.empty": {
    de: "Noch keine Bewertungen vorhanden.",
    en: "No reviews yet.",
    ar: "لا توجد تقييمات بعد.",
    tr: "Henüz yorum yok.",
  },
  "reviews.loadFailed": {
    de: "Die Bewertungen konnten nicht geladen werden.",
    en: "The reviews could not be loaded.",
    ar: "تعذّر تحميل التقييمات.",
    tr: "Yorumlar yüklenemedi.",
  },
  "reviews.adminReply": {
    de: "Antwort von m.on:",
    en: "Reply from m.on:",
    ar: "ردّ من m.on:",
    tr: "m.on'tan yanıt:",
  },
  "reviews.stars": {
    de: "{rating} von 5 Sternen",
    en: "{rating} out of 5 stars",
    ar: "{rating} من 5 نجوم",
    tr: "5 yıldız üzerinden {rating}",
  },

  // ── Admin ───────────────────────────────────────────────────────────
  "admin.orders": { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  "admin.customer": { de: "Kunde", en: "Customer", ar: "العميل", tr: "Müşteri" },
  "admin.allStatuses": {
    de: "Alle Status", en: "All statuses", ar: "كل الحالات", tr: "Tüm durumlar",
  },
  "admin.searchOrders": {
    de: "Referenz, Name oder E-Mail…",
    en: "Reference, name or email…",
    ar: "الرقم المرجعي أو الاسم أو البريد…",
    tr: "Referans, isim veya e-posta…",
  },
  "admin.noOrders": {
    de: "Keine Aufträge gefunden.", en: "No orders found.", ar: "لم يُعثر على طلبات.", tr: "Sipariş bulunamadı.",
  },
  "admin.live": { de: "Live", en: "Live", ar: "مباشر", tr: "Canlı" },
  "admin.connecting": {
    de: "Verbinde…", en: "Connecting…", ar: "جارٍ الاتصال…", tr: "Bağlanıyor…",
  },
  "admin.offline": {
    de: "Nicht verbunden", en: "Not connected", ar: "غير متّصل", tr: "Bağlı değil",
  },
  "admin.autoRefresh": {
    de: "Aktualisiert alle {seconds} s",
    en: "Refreshes every {seconds}s",
    ar: "يتحدّث كل {seconds} ثانية",
    tr: "{seconds} sn'de bir yenilenir",
  },
  "admin.users": { de: "Nutzer", en: "Users", ar: "المستخدمون", tr: "Kullanıcılar" },
  "admin.allRoles": {
    de: "Alle Rollen", en: "All roles", ar: "كل الأدوار", tr: "Tüm roller",
  },
  "admin.noUsers": {
    de: "Keine Nutzer gefunden.", en: "No users found.", ar: "لم يُعثر على مستخدمين.", tr: "Kullanıcı bulunamadı.",
  },
  "admin.searchUsers": {
    de: "Name oder E-Mail…", en: "Name or email…", ar: "الاسم أو البريد…", tr: "İsim veya e-posta…",
  },
  "admin.lastLogin": {
    de: "Zuletzt angemeldet", en: "Last sign-in", ar: "آخر تسجيل دخول", tr: "Son giriş",
  },
  "admin.yourself": { de: "Du selbst", en: "Yourself", ar: "أنت", tr: "Kendiniz" },
  "admin.role": { de: "Rolle", en: "Role", ar: "الدور", tr: "Rol" },
  "admin.roleOf": {
    de: "Rolle von {name}", en: "Role of {name}", ar: "دور {name}", tr: "{name} rolü",
  },
  "admin.block": { de: "Sperren", en: "Block", ar: "حظر", tr: "Engelle" },
  "admin.unblock": { de: "Entsperren", en: "Unblock", ar: "رفع الحظر", tr: "Engeli kaldır" },
  "admin.blocking": { de: "Wird gesperrt…", en: "Blocking…", ar: "جارٍ الحظر…", tr: "Engelleniyor…" },
  "admin.blockTitle": {
    de: "{name} sperren?", en: "Block {name}?", ar: "حظر {name}؟", tr: "{name} engellensin mi?",
  },
  "admin.blockBody": {
    de: "{email} kann sich dann nicht mehr anmelden, und alle aktiven Sitzungen werden sofort beendet. Bestehende Aufträge bleiben erhalten.",
    en: "{email} will no longer be able to sign in, and all active sessions end immediately. Existing orders are kept.",
    ar: "لن يتمكّن {email} من تسجيل الدخول، وستُنهى كل الجلسات النشطة فورًا. أمّا الطلبات القائمة فتبقى.",
    tr: "{email} artık giriş yapamayacak ve tüm aktif oturumlar hemen sona erecek. Mevcut siparişler korunur.",
  },
  "admin.blockConfirm": {
    de: "Ja, sperren", en: "Yes, block", ar: "نعم، احظر", tr: "Evet, engelle",
  },
  // ── Roles ───────────────────────────────────────────────────────────
  // One entry per role in `@mon/core`. A role without a label here
  // renders as its raw key on the admin screen, which is how the removed
  // "staff" entry was spotted.
  "admin.role.customer": { de: "Kunde", en: "Customer", ar: "عميل", tr: "Müşteri" },
  "admin.role.customer_service": {
    de: "Kundenservice", en: "Customer service", ar: "خدمة العملاء", tr: "Müşteri hizmetleri",
  },
  "admin.role.operator": {
    de: "Disponent", en: "Operator", ar: "مشغّل", tr: "Operatör",
  },
  "admin.role.admin": {
    de: "Administrator", en: "Administrator", ar: "مدير", tr: "Yönetici",
  },
  "admin.role.super_admin": {
    de: "Super-Administrator", en: "Super administrator", ar: "مدير عام", tr: "Süper yönetici",
  },

  // What each role may actually do, shown under the role selector so the
  // choice is made on capability rather than on a job title.
  "admin.roleHint.customer": {
    de: "Sieht nur die eigenen Aufträge. Keine Rechte im Backoffice.",
    en: "Sees only their own orders. No back-office rights.",
    ar: "يرى طلباته فقط. لا صلاحيات في لوحة الإدارة.",
    tr: "Yalnızca kendi siparişlerini görür. Yönetim panelinde yetkisi yoktur.",
  },
  "admin.roleHint.customer_service": {
    de: "Sieht Aufträge und Angebote, beantwortet Nachrichten und Beschwerden.",
    en: "Sees orders and quotes, answers messages and complaints.",
    ar: "يرى الطلبات وعروض الأسعار، ويردّ على الرسائل والشكاوى.",
    tr: "Siparişleri ve teklifleri görür, mesaj ve şikâyetleri yanıtlar.",
  },
  "admin.roleHint.operator": {
    de: "Plant Aufträge, ändert Status, pflegt Verfügbarkeiten und moderiert Bewertungen.",
    en: "Plans orders, changes their status, maintains availability and moderates reviews.",
    ar: "يخطّط الطلبات ويغيّر حالتها ويحدّث المواعيد المتاحة ويراجع التقييمات.",
    tr: "Siparişleri planlar, durumlarını değiştirir, müsaitliği günceller ve yorumları denetler.",
  },
  "admin.roleHint.admin": {
    de: "Alles vom Disponenten, dazu Preise, Zahlungen, Website und Nutzerverwaltung.",
    en: "Everything an operator may do, plus pricing, payments, the website and user administration.",
    ar: "كل صلاحيات المشغّل، إضافةً إلى الأسعار والمدفوعات والموقع وإدارة المستخدمين.",
    tr: "Operatörün tüm yetkileri ile birlikte fiyatlar, ödemeler, web sitesi ve kullanıcı yönetimi.",
  },
  "admin.roleHint.super_admin": {
    de: "Vollzugriff, einschließlich der Vergabe von Rollen.",
    en: "Full access, including handing out roles.",
    ar: "وصول كامل، بما في ذلك منح الأدوار.",
    tr: "Rol atama dâhil tam erişim.",
  },

  // ── User administration ─────────────────────────────────────────────
  "admin.usersLead": {
    de: "Die Rolle bestimmt, was jemand im Backoffice darf. Jede Änderung wird protokolliert.",
    en: "A role decides what someone may do in the back office. Every change is recorded.",
    ar: "يحدّد الدور ما يمكن للشخص فعله في لوحة الإدارة. وكل تغيير يُسجَّل.",
    tr: "Rol, bir kişinin yönetim panelinde ne yapabileceğini belirler. Her değişiklik kayda geçer.",
  },
  "admin.joined": {
    de: "Angelegt", en: "Joined", ar: "تاريخ الانضمام", tr: "Katılım",
  },
  "admin.newUser": {
    de: "Neuer Nutzer", en: "New user", ar: "مستخدم جديد", tr: "Yeni kullanıcı",
  },
  "admin.newUserBody": {
    de: "Das Passwort wird erzeugt und nur einmal angezeigt. Gib es weiter — es lässt sich später nicht erneut abrufen.",
    en: "The password is generated and shown once. Pass it on — it cannot be retrieved again later.",
    ar: "يُنشأ كلمة المرور وتُعرض مرّة واحدة فقط. سلّمها للشخص المعني — لا يمكن استرجاعها لاحقًا.",
    tr: "Parola oluşturulur ve yalnızca bir kez gösterilir. İlgili kişiye iletin — sonradan tekrar alınamaz.",
  },
  "admin.createUser": {
    de: "Nutzer anlegen", en: "Create user", ar: "إنشاء المستخدم", tr: "Kullanıcı oluştur",
  },
  "admin.created": {
    de: "{email} wurde angelegt.",
    en: "{email} has been created.",
    ar: "تم إنشاء {email}.",
    tr: "{email} oluşturuldu.",
  },
  "admin.createdWithPassword": {
    de: "{email} wurde angelegt. Passwort (wird nur einmal angezeigt): {password}",
    en: "{email} has been created. Password (shown only once): {password}",
    ar: "تم إنشاء {email}. كلمة المرور (تُعرض مرّة واحدة فقط): {password}",
    tr: "{email} oluşturuldu. Parola (yalnızca bir kez gösterilir): {password}",
  },
  "admin.createFailed": {
    de: "Der Nutzer konnte nicht angelegt werden.",
    en: "The user could not be created.",
    ar: "تعذّر إنشاء المستخدم.",
    tr: "Kullanıcı oluşturulamadı.",
  },
  "admin.billing": { de: "Abrechnung", en: "Billing", ar: "المحاسبة", tr: "Muhasebe" },
  "admin.paymentsReceived": {
    de: "Eingegangene Zahlungen", en: "Payments received", ar: "المدفوعات المستلمة", tr: "Alınan ödemeler",
  },
  "admin.bookingCount": {
    de: { one: "Buchung", other: "Buchungen" },
    en: { one: "booking", other: "bookings" },
    ar: { zero: "لا حجوزات", one: "حجز واحد", two: "حجزان", few: "حجوزات", many: "حجزًا", other: "حجز" },
    tr: { one: "kayıt", other: "kayıt" },
  },
  "admin.billingNote": {
    de: "Summiert werden alle im gewählten Monat verbuchten Zahlungen — Anzahlungen, Restzahlungen und Erstattungen. Die Abgrenzung erfolgt in der Zeitzone Europe/Berlin.",
    en: "All payments booked in the selected month are summed — deposits, balances and refunds. Month boundaries use the Europe/Berlin time zone.",
    ar: "تُجمع كل المدفوعات المسجّلة في الشهر المختار — الدفعات المقدّمة والمتبقّية والمستردّات. وتُحسب حدود الشهر بتوقيت Europe/Berlin.",
    tr: "Seçilen ayda kaydedilen tüm ödemeler toplanır — kaporalar, bakiyeler ve iadeler. Ay sınırları Europe/Berlin saat dilimine göredir.",
  },
  "admin.noPayments": {
    de: "In diesem Monat wurden noch keine Zahlungen verbucht.",
    en: "No payments have been booked this month yet.",
    ar: "لم تُسجَّل أي مدفوعات في هذا الشهر بعد.",
    tr: "Bu ay henüz ödeme kaydedilmedi.",
  },
  "admin.reportFailed": {
    de: "Der Bericht konnte nicht geladen werden.",
    en: "The report could not be loaded.",
    ar: "تعذّر تحميل التقرير.",
    tr: "Rapor yüklenemedi.",
  },
  "admin.usersFailed": {
    de: "Die Nutzer konnten nicht geladen werden.",
    en: "The users could not be loaded.",
    ar: "تعذّر تحميل المستخدمين.",
    tr: "Kullanıcılar yüklenemedi.",
  },
  "admin.ordersFailed": {
    de: "Die Aufträge konnten nicht geladen werden.",
    en: "The orders could not be loaded.",
    ar: "تعذّر تحميل الطلبات.",
    tr: "Siparişler yüklenemedi.",
  },
  "admin.statusChangeFailed": {
    de: "Der Status konnte nicht geändert werden.",
    en: "The status could not be changed.",
    ar: "تعذّر تغيير الحالة.",
    tr: "Durum değiştirilemedi.",
  },
  "admin.updateFailed": {
    de: "Die Änderung konnte nicht gespeichert werden.",
    en: "The change could not be saved.",
    ar: "تعذّر حفظ التغيير.",
    tr: "Değişiklik kaydedilemedi.",
  },

  // ── Chat ────────────────────────────────────────────────────────────
  "chat.title": {
    de: "m.on-Assistent", en: "m.on Assistant", ar: "مساعد m.on", tr: "m.on Asistanı",
  },
  "chat.subtitle": {
    de: "Antwortet meist sofort",
    en: "Usually replies instantly",
    ar: "يجيب فورًا عادةً",
    tr: "Genellikle anında yanıtlar",
  },
  "chat.greeting": {
    de: "Hallo! Wie kann ich dir helfen?",
    en: "Hello! How can I help?",
    ar: "مرحبًا! كيف أستطيع مساعدتك؟",
    tr: "Merhaba! Nasıl yardımcı olabilirim?",
  },
  "chat.placeholder": {
    de: "Deine Frage…", en: "Your question…", ar: "سؤالك…", tr: "Sorunuz…",
  },
  "chat.send": { de: "Senden", en: "Send", ar: "إرسال", tr: "Gönder" },
  "chat.open": { de: "Chat öffnen", en: "Open chat", ar: "فتح المحادثة", tr: "Sohbeti aç" },
  "chat.close": { de: "Chat schließen", en: "Close chat", ar: "إغلاق المحادثة", tr: "Sohbeti kapat" },
  "chat.humanTakeover": {
    de: "Ein Mitarbeiter übernimmt jetzt das Gespräch.",
    en: "A team member is taking over the conversation.",
    ar: "أحد الموظّفين يتولّى المحادثة الآن.",
    tr: "Bir ekip üyesi görüşmeyi devralıyor.",
  },
  "chat.failed": {
    de: "Verbindung fehlgeschlagen. Bitte versuch es erneut.",
    en: "Connection failed. Please try again.",
    ar: "فشل الاتصال. الرجاء المحاولة مرّة أخرى.",
    tr: "Bağlantı başarısız. Lütfen tekrar deneyin.",
  },


  // ── Dashboard ───────────────────────────────────────────────────────
  "dash.overview": {
    de: "Übersicht", en: "Dashboard Overview", ar: "نظرة عامة", tr: "Genel Bakış",
  },
  "dash.mainNavigation": {
    de: "Hauptnavigation", en: "Main navigation", ar: "التنقّل الرئيسي", tr: "Ana gezinme",
  },
  "dash.searchPlaceholder": {
    de: "Aufträge, Angebote…", en: "Search orders, quotes…", ar: "ابحث في الطلبات والعروض…", tr: "Sipariş, teklif ara…",
  },
  "dash.notifications": {
    de: "Benachrichtigungen", en: "Notifications", ar: "الإشعارات", tr: "Bildirimler",
  },
  "dash.savedQuotes": {
    de: "Gespeicherte Angebote", en: "Saved Quotes", ar: "العروض المحفوظة", tr: "Kayıtlı Teklifler",
  },
  "dash.documents": { de: "Dokumente", en: "Documents", ar: "المستندات", tr: "Belgeler" },
  "dash.messages": { de: "Nachrichten", en: "Messages", ar: "الرسائل", tr: "Mesajlar" },
  "dash.payment": { de: "Zahlungen", en: "Payment", ar: "المدفوعات", tr: "Ödeme" },
  "dash.settings": { de: "Einstellungen", en: "Settings", ar: "الإعدادات", tr: "Ayarlar" },
  "dash.welcome": {
    de: "Willkommen zurück, {name}!",
    en: "Welcome back, {name}!",
    ar: "أهلاً بعودتك، {name}!",
    tr: "Tekrar hoş geldiniz, {name}!",
  },
  "dash.welcomeWithMove": {
    de: "Dein nächster Termin ist am {date}. Alles ist vorbereitet.",
    en: "Your next move is scheduled for {date}. Everything is on track.",
    ar: "موعدك القادم في {date}. كل شيء جاهز.",
    tr: "Bir sonraki taşınmanız {date} tarihinde. Her şey hazır.",
  },
  "dash.welcomeNoMove": {
    de: "Du hast aktuell keinen anstehenden Termin.",
    en: "You have no upcoming move scheduled.",
    ar: "لا يوجد لديك موعد قادم حاليًا.",
    tr: "Planlanmış yaklaşan taşınmanız yok.",
  },
  "dash.trackMove": {
    de: "Termin verfolgen", en: "Track Live Move", ar: "تتبّع الموعد", tr: "Taşınmayı İzle",
  },
  "dash.activeOrders": {
    de: "Aktive Aufträge", en: "Active Orders", ar: "الطلبات النشطة", tr: "Aktif Siparişler",
  },
  "dash.pendingQuotes": {
    de: "Offene Angebote", en: "Pending Quotes", ar: "عروض معلّقة", tr: "Bekleyen Teklifler",
  },
  "dash.completedMoves": {
    de: "Abgeschlossen", en: "Completed Moves", ar: "طلبات مكتملة", tr: "Tamamlanan Taşınmalar",
  },
  "dash.unreadMessages": {
    de: "Ungelesene Nachrichten", en: "Unread Messages", ar: "رسائل غير مقروءة", tr: "Okunmamış Mesajlar",
  },
  "dash.inTransit": {
    de: { one: "{count} in Bearbeitung", other: "{count} in Bearbeitung" },
    en: { one: "{count} in progress", other: "{count} in progress" },
    ar: {
      zero: "لا شيء قيد التنفيذ", one: "واحد قيد التنفيذ", two: "اثنان قيد التنفيذ",
      few: "{count} قيد التنفيذ", many: "{count} قيد التنفيذ", other: "{count} قيد التنفيذ",
    },
    tr: { one: "{count} devam ediyor", other: "{count} devam ediyor" },
  },
  "dash.awaitingConfirmation": {
    de: "Warten auf Bestätigung", en: "Awaiting confirmation", ar: "بانتظار التأكيد", tr: "Onay bekliyor",
  },
  "dash.sinceJoining": {
    de: "Seit Beitritt", en: "Since joining", ar: "منذ الانضمام", tr: "Katılımdan beri",
  },
  "dash.fromSupport": {
    de: "Vom Support-Team", en: "From support team", ar: "من فريق الدعم", tr: "Destek ekibinden",
  },
  "dash.recentOrders": {
    de: "Letzte Aufträge", en: "Recent Orders", ar: "أحدث الطلبات", tr: "Son Siparişler",
  },
  "dash.viewAll": { de: "Alle ansehen", en: "View All", ar: "عرض الكل", tr: "Tümünü Gör" },
  "dash.nextAppointment": {
    de: "Nächster Termin", en: "Next Appointment", ar: "الموعد القادم", tr: "Sonraki Randevu",
  },
  "dash.estimatedArrival": {
    de: "Voraussichtliche Ankunft 08:00–09:00",
    en: "Est. arrival 08:00 – 09:00",
    ar: "الوصول المتوقّع 08:00–09:00",
    tr: "Tahmini varış 08:00–09:00",
  },
  "dash.assignedTeam": {
    de: "Zugewiesenes Team", en: "Assigned team", ar: "الفريق المكلّف", tr: "Atanan ekip",
  },
  "dash.contactTeam": {
    de: "Team anrufen", en: "Contact Team", ar: "اتّصل بالفريق", tr: "Ekibe Ulaş",
  },
  "dash.viewDetails": {
    de: "Details ansehen", en: "View Details", ar: "عرض التفاصيل", tr: "Detayları Gör",
  },
  "dash.noAppointment": {
    de: "Kein anstehender Termin.", en: "No upcoming appointment.", ar: "لا موعد قادم.", tr: "Yaklaşan randevu yok.",
  },

  // ── Website control ─────────────────────────────────────────────────
  "site.title": {
    de: "Website", en: "Website", ar: "الموقع", tr: "Web Sitesi",
  },
  "site.lead": {
    de: "Ändere Farben, Branding, Kontaktdaten und Texte der Website — ohne Deployment. Preise und rechtliche Seiten sind bewusst nicht hier bearbeitbar.",
    en: "Change the website's colours, branding, contact details and copy — with no deploy. Prices and legal pages are deliberately not editable here.",
    ar: "غيّر ألوان الموقع وهويته وبيانات التواصل والنصوص — بلا نشر جديد. الأسعار والصفحات القانونية غير قابلة للتعديل هنا عن قصد.",
    tr: "Web sitesinin renklerini, markasını, iletişim bilgilerini ve metinlerini dağıtım yapmadan değiştirin. Fiyatlar ve yasal sayfalar burada bilinçli olarak düzenlenemez.",
  },
  "site.tab.theme": { de: "Farben", en: "Theme", ar: "الألوان", tr: "Tema" },
  "site.tab.brand": { de: "Marke", en: "Brand", ar: "الهوية", tr: "Marka" },
  "site.tab.contact": { de: "Kontakt", en: "Contact", ar: "التواصل", tr: "İletişim" },
  "site.tab.seo": { de: "SEO", en: "SEO", ar: "تحسين الظهور", tr: "SEO" },
  "site.tab.content": { de: "Inhalte", en: "Content", ar: "المحتوى", tr: "İçerik" },
  "site.section.home": { de: "Startseite", en: "Home page", ar: "الصفحة الرئيسية", tr: "Ana sayfa" },
  "site.section.auth": { de: "Anmeldeseite", en: "Login page", ar: "صفحة الدخول", tr: "Giriş sayfası" },
  "site.section.footer": { de: "Fußzeile", en: "Footer", ar: "التذييل", tr: "Alt bilgi" },
  "site.published": { de: "Veröffentlicht", en: "Published", ar: "منشور", tr: "Yayında" },
  "site.saved": {
    de: "Gespeichert — auf der Website in bis zu einer Minute sichtbar.",
    en: "Saved — live on the website within a minute.",
    ar: "تم الحفظ — سيظهر على الموقع خلال دقيقة.",
    tr: "Kaydedildi — bir dakika içinde sitede görünür.",
  },
  "site.resetTheme": {
    de: "Farben zurücksetzen", en: "Reset theme", ar: "إعادة الألوان", tr: "Temayı sıfırla",
  },
  "site.themeReset": {
    de: "Die Farben wurden auf die Standardwerte zurückgesetzt.",
    en: "The theme has been restored to its defaults.",
    ar: "أُعيدت الألوان إلى قيمها الافتراضية.",
    tr: "Tema varsayılanlarına döndürüldü.",
  },
  "site.contentHint": {
    de: "Texte werden pro Sprache gepflegt.",
    en: "Copy is maintained per language.",
    ar: "النصوص تُحرَّر لكل لغة على حدة.",
    tr: "Metinler her dil için ayrı tutulur.",
  },
  "site.loadFailed": {
    de: "Die Website-Einstellungen konnten nicht geladen werden.",
    en: "The website settings could not be loaded.",
    ar: "تعذّر تحميل إعدادات الموقع.",
    tr: "Web sitesi ayarları yüklenemedi.",
  },

  // ── Footer ──────────────────────────────────────────────────────────
  "footer.rights": {
    de: "Alle Rechte vorbehalten.",
    en: "All rights reserved.",
    ar: "جميع الحقوق محفوظة.",
    tr: "Tüm hakları saklıdır.",
  },
  "footer.tagline": {
    de: "Umzug, Entsorgung & Reinigung zum transparenten Festpreis.",
    en: "Moving, disposal & cleaning at a transparent fixed price.",
    ar: "نقل وتخلّص من الأثاث وتنظيف بسعر ثابت وشفّاف.",
    tr: "Şeffaf sabit fiyatla nakliye, tasfiye ve temizlik.",
  },
  /**
   * The footer's fourth column heading.
   *
   * The M.io footer draws three columns — brand, Services, Contact & Support —
   * and no frame links the guide, partner, business or how-it-works pages from
   * anywhere. This heading is therefore the one string here with no source in
   * the design; the four labels under it already existed in this catalogue,
   * because the pages themselves use them.
   */
  "footer.companyTitle": {
    de: "Unternehmen", en: "Company", ar: "الشركة", tr: "Şirket",
  },


  // ── Admin navigation ────────────────────────────────────────────────
  "admin.nav.dashboard": { de: "Dashboard", en: "Dashboard", ar: "لوحة التحكّم", tr: "Panel" },
  "admin.nav.users": { de: "Nutzer", en: "Users", ar: "المستخدمون", tr: "Kullanıcılar" },
  "admin.nav.leads": { de: "Leads", en: "Leads", ar: "العملاء المحتملون", tr: "Potansiyeller" },
  "admin.nav.orders": { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" },
  "admin.nav.dispatch": { de: "Disposition", en: "Dispatch", ar: "التوزيع", tr: "Sevkiyat" },
  "admin.nav.pricing": { de: "Preise", en: "Pricing", ar: "التسعير", tr: "Fiyatlandırma" },
  "admin.nav.payments": { de: "Zahlungen", en: "Payments", ar: "المدفوعات", tr: "Ödemeler" },
  "admin.nav.operations": { de: "Betrieb", en: "Operations", ar: "العمليات", tr: "Operasyon" },
  "admin.nav.partners": { de: "Partner", en: "Partners", ar: "الشركاء", tr: "Ortaklar" },
  "admin.nav.quality": { de: "Qualität", en: "Quality", ar: "الجودة", tr: "Kalite" },
  "admin.nav.analytics": { de: "Analytics", en: "Analytics", ar: "التحليلات", tr: "Analitik" },
  "admin.nav.logs": { de: "Protokoll", en: "Logs", ar: "السجلّات", tr: "Kayıtlar" },
  "admin.nav.settings": { de: "Einstellungen", en: "Settings", ar: "الإعدادات", tr: "Ayarlar" },

  "dash.comingSoon": {
    de: "In Vorbereitung", en: "Coming soon", ar: "قريبًا", tr: "Yakında",
  },

  // ── My orders ───────────────────────────────────────────────────────
  "orders.allOrders": { de: "Alle Aufträge", en: "All Orders", ar: "كل الطلبات", tr: "Tüm Siparişler" },
  "orders.dateRange": { de: "Zeitraum", en: "Date range", ar: "الفترة", tr: "Tarih aralığı" },
  "orders.range.3m": {
    de: "Letzte 3 Monate", en: "Last 3 months", ar: "آخر 3 أشهر", tr: "Son 3 ay",
  },
  "orders.range.6m": {
    de: "Letzte 6 Monate", en: "Last 6 months", ar: "آخر 6 أشهر", tr: "Son 6 ay",
  },
  "orders.range.12m": {
    de: "Letzte 12 Monate", en: "Last 12 months", ar: "آخر 12 شهرًا", tr: "Son 12 ay",
  },
  "orders.range.all": {
    de: "Gesamter Zeitraum", en: "All time", ar: "كل الفترات", tr: "Tüm zamanlar",
  },
  "orders.searchPlaceholder": {
    de: "Auftrag suchen…", en: "Search orders…", ar: "ابحث في الطلبات…", tr: "Sipariş ara…",
  },
  "orders.dateCreated": {
    de: "Erstellt am", en: "Date Created", ar: "تاريخ الإنشاء", tr: "Oluşturulma",
  },
  "orders.amount": { de: "Betrag", en: "Amount", ar: "المبلغ", tr: "Tutar" },
  "orders.details": { de: "Details", en: "Details", ar: "التفاصيل", tr: "Detaylar" },
  "orders.showing": {
    de: "{from}–{to} von {total}",
    en: "Showing {from}–{to} of {total}",
    ar: "{from}–{to} من {total}",
    tr: "{total} kayıttan {from}–{to}",
  },
  "common.previous": { de: "Zurück", en: "Previous", ar: "السابق", tr: "Önceki" },

  // ── Order detail ────────────────────────────────────────────────────
  "orders.detailTitle": {
    de: "Auftragsdetails", en: "Order Detail View", ar: "تفاصيل الطلب", tr: "Sipariş Detayı",
  },
  "orders.downloadInvoice": {
    de: "Rechnung herunterladen", en: "Download Invoice", ar: "تنزيل الفاتورة", tr: "Fatura İndir",
  },
  "orders.reschedule": {
    de: "Termin verschieben", en: "Reschedule Move", ar: "تغيير الموعد", tr: "Tarihi Değiştir",
  },
  "orders.tab.overview": { de: "Übersicht", en: "Overview", ar: "نظرة عامة", tr: "Genel" },
  "orders.tab.documents": { de: "Dokumente", en: "Documents", ar: "المستندات", tr: "Belgeler" },
  "orders.tab.messages": { de: "Nachrichten", en: "Messages", ar: "الرسائل", tr: "Mesajlar" },
  "orders.includedServices": {
    de: "Enthaltene Leistungen", en: "Included Services", ar: "الخدمات المشمولة", tr: "Dahil Hizmetler",
  },
  "orders.included.transport": {
    de: "Transport inklusive gesetzlicher Haftung",
    en: "Transport including statutory liability cover",
    ar: "النقل شاملاً المسؤولية القانونية",
    tr: "Yasal sorumluluk dahil taşıma",
  },
  "orders.included.crew": {
    de: "{count} Mitarbeiter vor Ort",
    en: "{count}-person crew on site",
    ar: "{count} من العمّال في الموقع",
    tr: "Sahada {count} kişilik ekip",
  },
  "orders.coordinates": {
    de: "Adressen", en: "Move Coordinates", ar: "عناوين النقل", tr: "Taşınma Adresleri",
  },
  "orders.origin": { de: "Start (A)", en: "Origin (A)", ar: "البداية (أ)", tr: "Başlangıç (A)" },
  "orders.destination": {
    de: "Ziel (B)", en: "Destination (B)", ar: "الوجهة (ب)", tr: "Varış (B)",
  },
  "orders.floorN": {
    de: "{n}. Etage", en: "Floor {n}", ar: "الطابق {n}", tr: "{n}. kat",
  },
  "orders.groundFloor": {
    de: "Erdgeschoss", en: "Ground floor", ar: "الطابق الأرضي", tr: "Zemin kat",
  },
  "orders.grandTotal": { de: "Gesamtsumme", en: "Grand Total", ar: "الإجمالي الكلّي", tr: "Genel Toplam" },
  "orders.depositPaid": {
    de: "Anzahlung erhalten", en: "Deposit Paid", ar: "الدفعة المقدّمة المسدَّدة", tr: "Ödenen Kapora",
  },
  "orders.remaining": {
    de: "Restbetrag", en: "Remaining Balance", ar: "المبلغ المتبقّي", tr: "Kalan Bakiye",
  },
  "orders.settleBalance": {
    de: "Restbetrag begleichen", en: "Settle Balance Now", ar: "سدّد المتبقّي الآن", tr: "Bakiyeyi Öde",
  },

  // ── Price breakdown line labels ─────────────────────────────────────
  "line.base_rate": { de: "Grundpreis", en: "Base Moving Fee", ar: "السعر الأساسي", tr: "Taban Ücret" },
  "line.area": { de: "Fläche", en: "Area", ar: "المساحة", tr: "Alan" },
  "line.selected_items": {
    de: "Positionen", en: "Selected items", ar: "العناصر المختارة", tr: "Seçilen kalemler",
  },
  "line.travel_long_distance": {
    de: "Zuschlag Fernumzug",
    en: "Surcharges (Long Distance)",
    ar: "بدل المسافات الطويلة",
    tr: "Uzun mesafe farkı",
  },
  "line.floor_surcharge": {
    de: "Etagenzuschlag", en: "Floor surcharge", ar: "بدل الطوابق", tr: "Kat farkı",
  },
  "line.travel": {
    de: "Entfernung", en: "Travel distance", ar: "المسافة", tr: "Mesafe farkı",
  },
  "line.packing_service": {
    de: "Verpackungsservice", en: "Packing Service Add-on", ar: "خدمة التغليف", tr: "Paketleme hizmeti",
  },
  "line.parking_zone": {
    de: "Halteverbotszone", en: "No-parking zone", ar: "منطقة حظر الوقوف", tr: "Park yasağı bölgesi",
  },
  "line.transport_insurance": {
    de: "Transportversicherung", en: "Transport insurance", ar: "تأمين النقل", tr: "Nakliye sigortası",
  },
  "line.crew_of_three": {
    de: "3. Mitarbeiter", en: "Third crew member", ar: "عامل ثالث", tr: "Üçüncü işçi",
  },
  "line.second_van": {
    de: "2. Transporter", en: "Second van", ar: "شاحنة ثانية", tr: "İkinci araç",
  },
  "line.saturday_surcharge": {
    de: "Samstagszuschlag", en: "Saturday surcharge", ar: "بدل السبت", tr: "Cumartesi farkı",
  },
  "line.business_discount": {
    de: "Gewerberabatt", en: "Business discount", ar: "خصم الشركات", tr: "Ticari indirim",
  },
  "line.discount_code": {
    de: "Rabattcode", en: "Discount code", ar: "كود الخصم", tr: "İndirim kodu",
  },
  "line.minimum_order_value": {
    de: "Mindestauftragswert", en: "Minimum order value", ar: "الحد الأدنى للطلب", tr: "Asgari sipariş tutarı",
  },
  "line.assembly": { de: "Möbelmontage", en: "Assembly", ar: "تركيب الأثاث", tr: "Montaj" },
  "line.disassembly": { de: "Möbeldemontage", en: "Disassembly", ar: "تفكيك الأثاث", tr: "Demontaj" },

  "nav.openMenu": {
    de: "Menü öffnen", en: "Open menu", ar: "افتح القائمة", tr: "Menüyü aç",
  },
  "nav.closeMenu": {
    de: "Menü schließen", en: "Close menu", ar: "أغلق القائمة", tr: "Menüyü kapat",
  },

  // ── Calculator: the ten-step wizard ─────────────────────────────────
  // The heading of each screen, as the design writes it.
  "calc.step.service": {
    de: "Wählen Sie Ihre Leistung", en: "Select your required services",
    ar: "اختر الخدمة التي تحتاجها", tr: "İhtiyacınız olan hizmeti seçin",
  },
  "calc.step.customer": {
    de: "Privat oder gewerblich?", en: "Private or business?",
    ar: "شخصي أم تجاري؟", tr: "Bireysel mi, kurumsal mı?",
  },
  "calc.step.route": {
    de: "Kundenart & Adressen", en: "Customer type & Route details",
    ar: "نوع العميل وتفاصيل المسار", tr: "Müşteri tipi ve güzergâh",
  },
  "calc.step.property": {
    de: "Objekt- und Ladedetails", en: "Property & Loading Details",
    ar: "تفاصيل العقار والتحميل", tr: "Mülk ve yükleme detayları",
  },
  "calc.step.volume": {
    de: "Schätzen Sie Ihr Transportvolumen", en: "Estimate your cargo volume",
    ar: "قدّر حجم الشحنة", tr: "Taşınacak hacmi tahmin edin",
  },
  "calc.step.addons": {
    de: "Optionale Zusatzleistungen", en: "Optional Add-on Services",
    ar: "خدمات إضافية اختيارية", tr: "İsteğe bağlı ek hizmetler",
  },
  "calc.step.workers": {
    de: "Team und Transportmittel", en: "Workers & Transport Resources",
    ar: "الفريق ووسائل النقل", tr: "Ekip ve nakliye kaynakları",
  },
  "calc.step.special": {
    de: "Montage und Sonderbehandlung", en: "Assembly & Special Handling",
    ar: "التركيب والمعالجة الخاصة", tr: "Montaj ve özel taşıma",
  },
  "calc.step.photos": {
    de: "Visuelles Inventar & Fotos", en: "Visual Inventory & Photos",
    ar: "جرد مصوَّر وصور", tr: "Görsel envanter ve fotoğraflar",
  },
  "calc.step.date": {
    de: "Wunschtermin & Zeitfenster", en: "Preferred Date & Time Window",
    ar: "التاريخ المفضّل ونافذة الوصول", tr: "Tercih edilen tarih ve zaman aralığı",
  },
  "calc.step.review": {
    de: "Letzte Prüfung", en: "Final Review",
    ar: "المراجعة النهائية", tr: "Son kontrol",
  },

  // The short name of each step in the progress rail.
  "calc.rail.service": {
    de: "Leistungen", en: "Services", ar: "الخدمات", tr: "Hizmetler",
  },
  "calc.rail.route": {
    de: "Adressen", en: "Addresses", ar: "العناوين", tr: "Adresler",
  },
  "calc.rail.property": {
    de: "Objekte", en: "Properties", ar: "العقارات", tr: "Mülkler",
  },
  "calc.rail.volume": {
    de: "Volumen", en: "Volume", ar: "الحجم", tr: "Hacim",
  },
  "calc.rail.addons": {
    de: "Zusatzleistungen", en: "Add-ons", ar: "الإضافات", tr: "Ek hizmetler",
  },
  "calc.rail.workers": {
    de: "Team", en: "Workers", ar: "الفريق", tr: "Ekip",
  },
  "calc.rail.special": {
    de: "Montage", en: "Special", ar: "خاص", tr: "Özel",
  },
  "calc.rail.photos": {
    de: "Fotos", en: "Photos", ar: "الصور", tr: "Fotoğraflar",
  },
  "calc.rail.date": {
    de: "Termin", en: "Date", ar: "التاريخ", tr: "Tarih",
  },
  "calc.rail.review": {
    de: "Prüfung", en: "Review", ar: "المراجعة", tr: "Özet",
  },

  // The line under each heading that says what the step is for.
  "calc.lead.service": {
    de: "Wählen Sie die Leistung, die Sie brauchen. Mehrere auf einmal? Rufen Sie uns an, wir kombinieren sie.",
    en: "Choose the service you need. Need several at once? Call us and we will combine them.",
    ar: "اختر الخدمة التي تحتاجها. تحتاج أكثر من واحدة؟ اتصل بنا وسنجمعها لك.",
    tr: "İhtiyacınız olan hizmeti seçin. Birden fazlası mı gerekiyor? Bizi arayın, birleştirelim.",
  },
  "calc.lead.route": {
    de: "Bitte geben Sie an, ob es ein privater oder gewerblicher Umzug ist, und nennen Sie die Adressen.",
    en: "Please specify if this is a private or commercial move and provide the locations.",
    ar: "حدّد ما إذا كان النقل شخصياً أم تجارياً، ثم أدخل العناوين.",
    tr: "Taşınmanın bireysel mi ticari mi olduğunu belirtin ve adresleri girin.",
  },
  "calc.lead.property": {
    de: "Angaben zu beiden Adressen verhindern Verzögerungen und unerwartete Kosten.",
    en: "Specify details for both locations to prevent delays or unexpected charges.",
    ar: "أدخل تفاصيل الموقعين لتفادي التأخير أو رسوم غير متوقّعة.",
    tr: "Gecikmeleri ve beklenmedik ücretleri önlemek için her iki adresin detaylarını girin.",
  },
  "calc.lead.volume": {
    de: "Wie sollen wir das Volumen berechnen? Nach Fläche oder Stück für Stück.",
    en: "How would you like to calculate your volume? Choose by area or by itemised list.",
    ar: "كيف تريد حساب الحجم؟ حسب المساحة أو بقائمة الأغراض.",
    tr: "Hacmi nasıl hesaplayalım? Alana göre veya eşya listesiyle.",
  },
  "calc.lead.addons": {
    de: "Ergänzen Sie Ihren Umzug um Zusatzleistungen. Der Preis aktualisiert sich dabei.",
    en: "Customise your move with extra services. The price updates as you choose.",
    ar: "خصّص نقلتك بخدمات إضافية. يتحدّث السعر مع كل اختيار.",
    tr: "Taşınmanızı ek hizmetlerle özelleştirin. Fiyat seçiminizle birlikte güncellenir.",
  },
  "calc.lead.workers": {
    de: "Wählen Sie die Teamgröße und ob ein zweiter Transporter nötig ist.",
    en: "Choose how many movers come and whether a second van is needed.",
    ar: "اختر عدد العمّال وهل تحتاج مركبة ثانية.",
    tr: "Kaç taşıyıcı geleceğini ve ikinci araç gerekip gerekmediğini seçin.",
  },
  "calc.lead.special": {
    de: "Sagen Sie uns, welche Möbel ab- und wieder aufgebaut werden müssen.",
    en: "Tell us which furniture has to be taken apart and rebuilt.",
    ar: "أخبرنا أي أثاث يحتاج فكّاً وإعادة تركيب.",
    tr: "Hangi mobilyaların sökülüp yeniden kurulacağını belirtin.",
  },
  "calc.lead.photos": {
    de: "Zeigen Sie uns sperrige Möbel oder ein enges Treppenhaus, damit der Preis am Umzugstag hält.",
    en: "Show us awkward furniture or a tight stairwell so the price holds on moving day.",
    ar: "أرِنا الأثاث الصعب أو الدرج الضيّق ليبقى السعر ثابتاً يوم النقل.",
    tr: "Zor mobilyaları veya dar merdiveni gösterin ki fiyat taşınma günü değişmesin.",
  },
  "calc.lead.date": {
    de: "Wählen Sie im Verfügbarkeitskalender einen Termin und das gewünschte Zeitfenster.",
    en: "Pick a move date from our availability calendar and choose the arrival window.",
    ar: "اختر تاريخ النقل من تقويم التوفّر ثم نافذة الوصول.",
    tr: "Uygunluk takviminden bir tarih ve varış aralığını seçin.",
  },
  "calc.lead.review": {
    de: "Prüfen Sie Ihre Angaben, dann berechnen wir Ihren Festpreis.",
    en: "Check your answers, then we will calculate your fixed price.",
    ar: "راجع إجاباتك، ثم نحسب سعرك الثابت.",
    tr: "Yanıtlarınızı kontrol edin, ardından sabit fiyatınızı hesaplayalım.",
  },

  "calc.stepOf": {
    de: "Schritt {current} von {total}", en: "Step {current} of {total}",
    ar: "الخطوة {current} من {total}", tr: "Adım {current}/{total}",
  },

  // The name on each service card, and the line of copy under it.
  "calc.service.movingName": {
    de: "Umzugsservice", en: "Moving Service",
    ar: "خدمة النقل", tr: "Nakliye hizmeti",
  },
  "calc.service.disposalName": {
    de: "Entrümpelung", en: "Property Clearance",
    ar: "إخلاء العقار", tr: "Eşya boşaltma",
  },
  "calc.service.cleaningName": {
    de: "Premium-Reinigung", en: "Premium Cleaning",
    ar: "تنظيف ممتاز", tr: "Premium temizlik",
  },
  "calc.service.movingHint": {
    de: "Professionelles Packen, Transport und Aufbau Ihrer Einrichtung.",
    en: "Professional packing, transport and setup of your belongings.",
    ar: "تغليف ونقل وتركيب احترافي لأغراضك.",
    tr: "Eşyalarınızın profesyonelce paketlenmesi, taşınması ve kurulumu.",
  },
  "calc.service.disposalHint": {
    de: "Umweltgerechte Entsorgung, Kellerentrümpelung und besenreine Übergabe.",
    en: "Eco-friendly disposal, cellar clearance and a sweeping clean.",
    ar: "تخلّص صديق للبيئة، إخلاء الأقبية وتسليم نظيف.",
    tr: "Çevre dostu bertaraf, bodrum boşaltma ve süpürge temizliği.",
  },
  "calc.service.cleaningHint": {
    de: "Übergabereinigung mit garantierter Abnahme durch den Vermieter.",
    en: "Handover cleaning with guaranteed acceptance from your landlord.",
    ar: "تنظيف التسليم مع ضمان قبول المالك.",
    tr: "Ev sahibinin kabulü garantili teslim temizliği.",
  },

  "calc.customer.private": {
    de: "Privatkunde", en: "Private Customer", ar: "عميل خاص", tr: "Bireysel müşteri",
  },
  "calc.customer.privateHint": {
    de: "Rechnung auf Ihren Namen", en: "Invoiced to you personally",
    ar: "فاتورة باسمك", tr: "Fatura şahsınıza",
  },
  "calc.customer.business": {
    de: "Gewerblich / Büro", en: "Commercial / Office",
    ar: "تجاري / مكتب", tr: "Ticari / Ofis",
  },
  "calc.customer.businessHint": {
    de: "Mit Firmenrabatt und USt-Ausweis",
    en: "Business discount, VAT itemised",
    ar: "خصم الشركات وضريبة مفصّلة",
    tr: "Kurumsal indirim, KDV ayrıntılı",
  },

  "calc.addressHint": {
    de: "Straße, Hausnummer, PLZ und Ort",
    en: "Street, number, postcode and city",
    ar: "الشارع والرقم والرمز البريدي والمدينة",
    tr: "Sokak, numara, posta kodu ve şehir",
  },
  "calc.addressPlaceholder": {
    de: "Königsallee 1, 40212 Düsseldorf",
    en: "Königsallee 1, 40212 Düsseldorf",
    ar: "Königsallee 1, 40212 Düsseldorf",
    tr: "Königsallee 1, 40212 Düsseldorf",
  },
  "calc.distanceNote": {
    de: "Die Entfernung berechnen wir selbst — ein Aufschlag entsteht erst ab 50 km.",
    en: "We work out the distance ourselves; a surcharge only applies beyond 50 km.",
    ar: "نحسب المسافة بأنفسنا، والرسوم الإضافية تبدأ بعد 50 كم.",
    tr: "Mesafeyi biz hesaplarız; ek ücret yalnızca 50 km sonrası için geçerlidir.",
  },

  "calc.method": {
    de: "Wie möchten Sie rechnen?", en: "How would you like to estimate?",
    ar: "كيف تريد الحساب؟", tr: "Nasıl hesaplayalım?",
  },
  "calc.methodArea": {
    de: "Nach Fläche", en: "By area", ar: "حسب المساحة", tr: "Alana göre",
  },
  "calc.methodAreaHint": {
    de: "Schnell — Quadratmeter genügen", en: "Quick — square metres are enough",
    ar: "سريع — المساحة تكفي", tr: "Hızlı — metrekare yeterli",
  },
  "calc.methodItems": {
    de: "Nach Gegenständen", en: "By items",
    ar: "حسب الأغراض", tr: "Eşyaya göre",
  },
  "calc.methodItemsHint": {
    de: "Genauer — Sie wählen jedes Stück", en: "More precise — you pick each piece",
    ar: "أدقّ — تختار كل قطعة", tr: "Daha kesin — her parçayı seçersiniz",
  },
  "calc.areaHint": {
    de: "Die Wohnfläche, nicht die Grundstücksfläche.",
    en: "The living area, not the plot.",
    ar: "مساحة السكن، لا مساحة الأرض.",
    tr: "Yaşam alanı, arsa değil.",
  },

  "calc.packingHint": {
    de: "Komplettservice mit hochwertigem Packpapier, Luftpolsterfolie und besonders stabilen Kartons.",
    en: "Full service pack including premium wrapping paper, bubble wrap and extra-strength cartons.",
    ar: "خدمة تغليف كاملة تشمل ورق تغليف فاخر وفقاعات هوائية وصناديق شديدة التحمّل.",
    tr: "Kaliteli ambalaj kâğıdı, balonlu naylon ve ekstra dayanıklı kolileri içeren tam paketleme.",
  },
  "calc.parkingZoneHint": {
    de: "Wir richten an beiden Adressen eine amtliche Halteverbotszone ein, damit schnell geladen werden kann.",
    en: "We set up an official holding zone in front of both locations to keep loading quick.",
    ar: "نجهّز منطقة حظر وقوف رسمية أمام الموقعين ليتم التحميل بسرعة.",
    tr: "Yüklemenin hızlı olması için her iki adresin önüne resmi park yasağı alanı kurarız.",
  },
  "calc.insuranceHint": {
    de: "Erweiterter Schutz bis 50.000 € für besonders wertvolles Eigentum.",
    en: "Upgraded protection of up to €50,000 for high-value personal assets.",
    ar: "تغطية موسّعة حتى 50.000 يورو للممتلكات عالية القيمة.",
    tr: "Yüksek değerli eşyalar için 50.000 €'ya kadar genişletilmiş koruma.",
  },

  "calc.crewSize": {
    de: "Wie viele Mitarbeiter?", en: "How many movers?",
    ar: "كم عاملاً؟", tr: "Kaç kişi?",
  },
  "calc.crewTwo": { de: "2 Mitarbeiter", en: "2 movers", ar: "عاملان", tr: "2 kişi" },
  "calc.crewTwoHint": {
    de: "Standard für bis zu 3 Zimmer", en: "Standard for up to 3 rooms",
    ar: "المعتاد حتى 3 غرف", tr: "3 odaya kadar standart",
  },
  "calc.crewThree": { de: "3 Mitarbeiter", en: "3 movers", ar: "ثلاثة عمّال", tr: "3 kişi" },
  "calc.crewThreeHint": {
    de: "Schneller, bei großen Wohnungen günstiger",
    en: "Faster, and cheaper on large homes",
    ar: "أسرع، وأوفر للشقق الكبيرة",
    tr: "Daha hızlı, büyük evlerde daha uygun",
  },
  "calc.secondVan": {
    de: "Zweiter Transporter", en: "Second van",
    ar: "شاحنة ثانية", tr: "İkinci araç",
  },
  "calc.secondVanHint": {
    de: "Für alles über etwa 100 m² in einer Fahrt.",
    en: "Everything above roughly 100 m² in one trip.",
    ar: "لكل ما يزيد عن 100 م² في رحلة واحدة.",
    tr: "Yaklaşık 100 m² üzeri her şey tek seferde.",
  },

  "calc.specialHint": {
    de: "Möbel, die auf- oder abgebaut werden müssen.",
    en: "Furniture that needs assembling or taking apart.",
    ar: "أثاث يحتاج تركيباً أو فكّاً.",
    tr: "Montaj veya demontaj gereken mobilyalar.",
  },
  "calc.specialEmpty": {
    de: "Wählen Sie zuerst Gegenstände im vorherigen Schritt.",
    en: "Pick some items in the previous step first.",
    ar: "اختر أغراضاً في الخطوة السابقة أولاً.",
    tr: "Önce bir önceki adımda eşya seçin.",
  },

  "calc.photosHint": {
    de: "Fotos helfen uns, den Preis vorab zu bestätigen.",
    en: "Photos help us confirm the price in advance.",
    ar: "الصور تساعدنا على تأكيد السعر مسبقاً.",
    tr: "Fotoğraflar fiyatı önceden onaylamamıza yardımcı olur.",
  },
  "calc.photosChoose": {
    de: "Fotos auswählen", en: "Choose photos",
    ar: "اختر صوراً", tr: "Fotoğraf seç",
  },
  "calc.photosNotUploaded": {
    de: "Hinweis: Fotos werden noch nicht hochgeladen. Bringen Sie sie bitte zum Termin mit.",
    en: "Note: photos are not uploaded yet. Please bring them to the appointment.",
    ar: "ملاحظة: الصور لا تُرفع بعد. الرجاء إحضارها في الموعد.",
    tr: "Not: fotoğraflar henüz yüklenmiyor. Lütfen randevuya getirin.",
  },

  "calc.dateHint": {
    de: "Frühestens morgen.", en: "Tomorrow at the earliest.",
    ar: "غداً على أقرب تقدير.", tr: "En erken yarın.",
  },
  "calc.discountHint": {
    de: "Falls Sie einen haben.", en: "If you have one.",
    ar: "إن كان لديك واحد.", tr: "Varsa.",
  },

  "calc.getPrice": {
    de: "Preis berechnen", en: "Calculate my price",
    ar: "احسب السعر", tr: "Fiyatı hesapla",
  },
  "calc.pricing": {
    de: "Wird berechnet…", en: "Calculating…",
    ar: "يجري الحساب…", tr: "Hesaplanıyor…",
  },
  "calc.quoteTitle": {
    de: "Ihr Festpreis", en: "Your confirmed price",
    ar: "سعرك المؤكَّد", tr: "Kesin fiyatınız",
  },
  "calc.vatIncluded": {
    de: "Inklusive Mehrwertsteuer. Keine versteckten Kosten.",
    en: "VAT included. No hidden costs.",
    ar: "شامل ضريبة القيمة المضافة. بدون تكاليف خفية.",
    tr: "KDV dahil. Gizli maliyet yok.",
  },
  "calc.reviewTitle": {
    de: "Wir prüfen die Details", en: "We are checking the details",
    ar: "نحن نراجع التفاصيل", tr: "Detayları kontrol ediyoruz",
  },
  "calc.reviewBody": {
    de: "Ihr Auftrag braucht einen kurzen Blick von uns. Wir melden uns innerhalb eines Werktags mit einem Festpreis.",
    en: "Your job needs a quick look from us. We will come back within one working day with a fixed price.",
    ar: "طلبك يحتاج نظرة سريعة منّا. سنعود إليك خلال يوم عمل واحد بسعر ثابت.",
    tr: "İşiniz kısa bir incelemeye ihtiyaç duyuyor. Bir iş günü içinde sabit fiyatla döneceğiz.",
  },
  "calc.editAnswers": {
    de: "Angaben ändern", en: "Change my answers",
    ar: "عدّل إجاباتي", tr: "Yanıtlarımı değiştir",
  },
  "calc.bookNow": {
    de: "Jetzt verbindlich buchen", en: "Book this now",
    ar: "احجز الآن", tr: "Şimdi rezervasyon yap",
  },

  // ── Calculator: the five result chips and the confirmation screen ────
  "calc.tab.route": {
    de: "Routendetails", en: "Route Details",
    ar: "تفاصيل المسار", tr: "Rota Detayları",
  },
  "calc.tab.inventory": {
    de: "Umfang", en: "Inventory Size",
    ar: "حجم المنقولات", tr: "Eşya Miktarı",
  },
  "calc.tab.special": {
    de: "Sonderleistungen", en: "Special Services",
    ar: "خدمات خاصة", tr: "Özel Hizmetler",
  },
  "calc.tab.schedule": {
    de: "Termin & Uhrzeit", en: "Date & Time",
    ar: "التاريخ والوقت", tr: "Tarih ve Saat",
  },
  "calc.tab.quote": {
    de: "Ihr Angebot", en: "Your Quote",
    ar: "عرضك", tr: "Teklifiniz",
  },

  "calc.confirm.title": {
    de: "Buchung abschließen", en: "Complete your booking",
    ar: "أكمل حجزك", tr: "Rezervasyonunuzu tamamlayın",
  },
  "calc.confirm.needHelp": {
    de: "Fragen zur Buchung?", en: "Need help booking?",
    ar: "تحتاج مساعدة في الحجز؟", tr: "Rezervasyonda yardım mı lazım?",
  },
  "calc.confirm.callUs": {
    de: "Hotline anrufen", en: "Call our hotline",
    ar: "اتصل بخط المساعدة", tr: "Destek hattını arayın",
  },

  "calc.confirm.registerTitle": {
    de: "Schnell registrieren", en: "Quick Registration",
    ar: "تسجيل سريع", tr: "Hızlı Kayıt",
  },
  "calc.confirm.registerBody": {
    de: "Legen Sie ein Konto an, um Ihre Buchung zu verwalten und den Fortschritt zu verfolgen.",
    en: "Create an account to manage your booking and track progress.",
    ar: "أنشئ حساباً لإدارة حجزك ومتابعة التقدّم.",
    tr: "Rezervasyonunuzu yönetmek ve süreci izlemek için bir hesap oluşturun.",
  },
  "calc.confirm.alreadyRegistered": {
    de: "Schon registriert?", en: "Already registered?",
    ar: "لديك حساب؟", tr: "Zaten kayıtlı mısınız?",
  },
  "calc.confirm.loginHere": {
    de: "Hier anmelden", en: "Login here",
    ar: "سجّل الدخول هنا", tr: "Buradan giriş yapın",
  },

  "calc.confirm.fullName": {
    de: "Vollständiger Name", en: "Full Name",
    ar: "الاسم الكامل", tr: "Ad Soyad",
  },
  "calc.confirm.fullNamePlaceholder": {
    de: "z. B. Max Mustermann", en: "e.g. John Doe",
    ar: "مثال: أحمد محمد", tr: "örn. Ahmet Yılmaz",
  },
  "calc.confirm.phone": {
    de: "Telefonnummer", en: "Phone Number",
    ar: "رقم الهاتف", tr: "Telefon Numarası",
  },
  "calc.confirm.phonePlaceholder": {
    de: "z. B. +49 176 1234567", en: "e.g. +49 176 1234567",
    ar: "مثال: +49 176 1234567", tr: "örn. +49 176 1234567",
  },
  "calc.confirm.email": {
    de: "E-Mail-Adresse", en: "Email Address",
    ar: "البريد الإلكتروني", tr: "E-posta Adresi",
  },
  "calc.confirm.emailPlaceholder": {
    de: "z. B. max@beispiel.de", en: "e.g. john.doe@example.com",
    ar: "مثال: name@example.com", tr: "örn. ad.soyad@ornek.com",
  },
  "calc.confirm.passwordPlaceholder": {
    de: "Mindestens {count} Zeichen", en: "Min. {count} characters",
    ar: "‏{count} أحرف على الأقل", tr: "En az {count} karakter",
  },
  "calc.confirm.confirmPassword": {
    de: "Passwort bestätigen", en: "Confirm Password",
    ar: "تأكيد كلمة المرور", tr: "Şifreyi Onaylayın",
  },
  "calc.confirm.confirmPasswordPlaceholder": {
    de: "Passwort wiederholen", en: "Repeat password",
    ar: "أعد كتابة كلمة المرور", tr: "Şifreyi tekrarlayın",
  },
  "calc.confirm.showPassword": {
    de: "Passwort anzeigen", en: "Show password",
    ar: "إظهار كلمة المرور", tr: "Şifreyi göster",
  },
  "calc.confirm.hidePassword": {
    de: "Passwort verbergen", en: "Hide password",
    ar: "إخفاء كلمة المرور", tr: "Şifreyi gizle",
  },
  "calc.confirm.passwordMismatch": {
    de: "Die beiden Passwörter stimmen nicht überein.",
    en: "The two passwords do not match.",
    ar: "كلمتا المرور غير متطابقتين.",
    tr: "İki şifre birbiriyle eşleşmiyor.",
  },

  "calc.confirm.arrivalTime": {
    de: "Gewünschte Ankunftszeit", en: "Preferred arrival time",
    ar: "وقت الوصول المفضّل", tr: "Tercih edilen varış saati",
  },
  "calc.confirm.pickTime": {
    de: "Bitte wählen", en: "Please choose",
    ar: "الرجاء الاختيار", tr: "Lütfen seçin",
  },

  "calc.confirm.paymentTitle": {
    de: "Zahlungsart wählen", en: "Select Payment Method",
    ar: "اختر طريقة الدفع", tr: "Ödeme Yöntemi Seçin",
  },
  "calc.confirm.payCard": {
    de: "Kreditkarte", en: "Credit Card",
    ar: "بطاقة ائتمان", tr: "Kredi Kartı",
  },
  "calc.confirm.payCardHint": {
    de: "Visa, Mastercard", en: "Visa, Mastercard",
    ar: "فيزا، ماستركارد", tr: "Visa, Mastercard",
  },
  "calc.confirm.payPaypal": {
    de: "PayPal", en: "PayPal", ar: "باي بال", tr: "PayPal",
  },
  "calc.confirm.payPaypalHint": {
    de: "Direkt und sicher", en: "Direct secure transfer",
    ar: "تحويل مباشر وآمن", tr: "Doğrudan güvenli transfer",
  },
  "calc.confirm.payBank": {
    de: "Überweisung", en: "Bank Transfer",
    ar: "حوالة بنكية", tr: "Banka Havalesi",
  },
  "calc.confirm.payBankHint": {
    de: "SEPA-Überweisung", en: "SEPA wire transfer",
    ar: "تحويل SEPA", tr: "SEPA havalesi",
  },
  "calc.confirm.payCash": {
    de: "Zahlung bei Lieferung", en: "Pay on Delivery",
    ar: "الدفع عند التسليم", tr: "Teslimatta Ödeme",
  },
  "calc.confirm.payCashHint": {
    de: "Bar oder Karte nach dem Umzug", en: "Cash or card after the move",
    ar: "نقداً أو بالبطاقة بعد النقل", tr: "Taşınmadan sonra nakit veya kart",
  },
  // Stated because there is no checkout behind these cards: the payments
  // module is a staff ledger, not a provider integration.
  "calc.confirm.paymentNotice": {
    de: "Hier wird noch nichts abgebucht. Wir notieren Ihren Wunsch und rechnen nach dem Umzug ab.",
    en: "Nothing is charged here. We note your preference and invoice after the move.",
    ar: "لا يُخصم أي مبلغ هنا. نسجّل تفضيلك ونُصدر الفاتورة بعد النقل.",
    tr: "Burada hiçbir tahsilat yapılmaz. Tercihinizi not eder, taşınmadan sonra fatura ederiz.",
  },

  // Two placeholders, so each language keeps its own word order around the links.
  "calc.confirm.consent": {
    de: "Ich akzeptiere die {terms} und die {privacy} von m.on.",
    en: "I agree to the {terms} and {privacy} of m.on.",
    ar: "أوافق على {terms} و{privacy} الخاصة بـ m.on.",
    tr: "m.on'ın {terms} ve {privacy} belgelerini kabul ediyorum.",
  },
  "calc.confirm.terms": {
    de: "AGB", en: "Terms of Service",
    ar: "شروط الخدمة", tr: "Hizmet Şartları",
  },
  "calc.confirm.privacy": {
    de: "Datenschutzerklärung", en: "Privacy Policy",
    ar: "سياسة الخصوصية", tr: "Gizlilik Politikası",
  },
  "calc.confirm.cancellation": {
    de: "Bis 48 Stunden vor dem Umzugstermin ist die Stornierung kostenlos.",
    en: "Cancellation is free up to 48 hours before the scheduled moving date.",
    ar: "الإلغاء مجاني حتى 48 ساعة قبل موعد النقل.",
    tr: "Taşınma tarihinden 48 saat öncesine kadar iptal ücretsizdir.",
  },
  "calc.confirm.consentRequired": {
    de: "Bitte bestätigen Sie AGB und Datenschutzerklärung.",
    en: "Please accept the terms and the privacy policy.",
    ar: "الرجاء الموافقة على الشروط وسياسة الخصوصية.",
    tr: "Lütfen şartları ve gizlilik politikasını kabul edin.",
  },

  "calc.confirm.ssl": {
    de: "SSL-verschlüsselt gebucht", en: "SSL encrypted secure booking",
    ar: "حجز آمن مشفّر بـ SSL", tr: "SSL şifreli güvenli rezervasyon",
  },
  // Not "& Pay": this screen books, it does not take money.
  "calc.confirm.submit": {
    de: "Buchung verbindlich bestätigen", en: "Confirm booking",
    ar: "تأكيد الحجز", tr: "Rezervasyonu onayla",
  },
  "calc.confirm.submitting": {
    de: "Wird gebucht…", en: "Booking…",
    ar: "يجري الحجز…", tr: "Rezervasyon yapılıyor…",
  },

  "calc.confirm.service": {
    de: "Gewählte Leistung", en: "Selected service",
    ar: "الخدمة المختارة", tr: "Seçilen hizmet",
  },
  "calc.confirm.route": {
    de: "Route", en: "Route", ar: "المسار", tr: "Rota",
  },
  "calc.confirm.distance": {
    de: "{km} km Entfernung", en: "{km} km distance",
    ar: "{km} كم مسافة", tr: "{km} km mesafe",
  },
  "calc.confirm.moveDate": {
    de: "Umzugstermin", en: "Move date",
    ar: "تاريخ النقل", tr: "Taşınma tarihi",
  },
  "calc.confirm.startingAt": {
    de: "Beginn um {time} Uhr", en: "Starting at {time}",
    ar: "يبدأ الساعة {time}", tr: "{time} itibarıyla başlıyor",
  },
  "calc.confirm.inventory": {
    de: "Umfang", en: "Inventory size",
    ar: "حجم المنقولات", tr: "Eşya miktarı",
  },
  "calc.confirm.areaValue": {
    de: "Rund {area} m² Wohnfläche", en: "Approx. {area} m² living space",
    ar: "نحو {area} م² مساحة سكنية", tr: "Yaklaşık {area} m² yaşam alanı",
  },
  "calc.confirm.itemsValue": {
    de: { one: "{count} ausgewähltes Möbelstück", other: "{count} ausgewählte Möbelstücke" },
    en: { one: "{count} selected item", other: "{count} selected items" },
    ar: {
      zero: "لا أغراض مختارة",
      one: "غرض واحد مختار",
      two: "غرضان مختاران",
      few: "{count} أغراض مختارة",
      many: "{count} غرضاً مختاراً",
      other: "{count} غرض مختار",
    },
    tr: { one: "{count} seçili eşya", other: "{count} seçili eşya" },
  },
  "calc.confirm.crew": {
    de: "Team", en: "Helper crew", ar: "فريق العمل", tr: "Ekip",
  },
  "calc.confirm.crewValue": {
    de: "{crew} Mitarbeiter und {vans} Transporter",
    en: "{crew} movers and {vans} van(s)",
    ar: "{crew} عمّال و{vans} شاحنة",
    tr: "{crew} taşıyıcı ve {vans} araç",
  },
  "calc.confirm.loadingEstimate": {
    de: "Geschätzte Dauer: {hours} Stunden", en: "Estimated loading: {hours} hours",
    ar: "المدة المقدّرة: {hours} ساعة", tr: "Tahmini süre: {hours} saat",
  },
  "calc.confirm.included": {
    de: "In diesem Preis enthalten", en: "Included in this price",
    ar: "مشمول في هذا السعر", tr: "Bu fiyata dahil",
  },
  "calc.confirm.total": {
    de: "Gesamtpreis", en: "Total price",
    ar: "السعر الإجمالي", tr: "Toplam fiyat",
  },
  "calc.confirm.vatIncluded": {
    de: "Inkl. {rate} % MwSt.", en: "Incl. {rate}% German VAT",
    ar: "شامل ضريبة القيمة المضافة {rate}٪", tr: "KDV %{rate} dahil",
  },

  "calc.confirm.noQuote": {
    de: "Zu dieser Buchung gibt es kein gültiges Angebot.",
    en: "There is no valid quote for this booking.",
    ar: "لا يوجد عرض سعر صالح لهذا الحجز.",
    tr: "Bu rezervasyon için geçerli bir teklif yok.",
  },
  "calc.confirm.noDate": {
    de: "Für dieses Angebot ist noch kein Umzugstermin hinterlegt.",
    en: "This quote does not have a moving date yet.",
    ar: "لا يوجد بعد تاريخ نقل لهذا العرض.",
    tr: "Bu teklif için henüz bir taşınma tarihi yok.",
  },
  "calc.confirm.backToCalculator": {
    de: "Zurück zum Rechner", en: "Back to the calculator",
    ar: "العودة إلى الحاسبة", tr: "Hesaplayıcıya dön",
  },
  "calc.confirm.pickAnotherDate": {
    de: "Anderen Termin wählen", en: "Choose another date",
    ar: "اختر موعداً آخر", tr: "Başka bir tarih seçin",
  },
  "calc.confirm.quoteUsed": {
    de: "Dieses Angebot wurde bereits gebucht.",
    en: "This quote has already been booked.",
    ar: "تم حجز هذا العرض بالفعل.",
    tr: "Bu teklif zaten rezerve edildi.",
  },
  "calc.confirm.successBody": {
    de: "Ihre Auftragsnummer lautet {reference}. Wir bestätigen den Termin per E-Mail.",
    en: "Your reference is {reference}. We will confirm the appointment by email.",
    ar: "رقم طلبك هو {reference}. سنؤكّد الموعد عبر البريد الإلكتروني.",
    tr: "Sipariş numaranız {reference}. Randevuyu e-posta ile onaylayacağız.",
  },

  "calc.fromAddress": {
    de: "Startadresse", en: "From Address", ar: "عنوان الانطلاق", tr: "Çıkış adresi",
  },
  "calc.toAddress": {
    de: "Zieladresse", en: "To Address", ar: "عنوان الوصول", tr: "Varış adresi",
  },

  "calc.propertyFrom": {
    de: "Auszugsobjekt ({place})", en: "From Property ({place})",
    ar: "عقار المغادرة ({place})", tr: "Çıkış mülkü ({place})",
  },
  "calc.propertyTo": {
    de: "Einzugsobjekt ({place})", en: "To Property ({place})",
    ar: "عقار الوصول ({place})", tr: "Varış mülkü ({place})",
  },
  "calc.floorNth": {
    de: "{n}. Etage", en: "Floor {n}", ar: "الطابق {n}", tr: "{n}. kat",
  },

  "calc.livingArea": {
    de: "Wohnfläche (m²)", en: "Living Area (m²)",
    ar: "المساحة السكنية (م²)", tr: "Yaşam alanı (m²)",
  },
  "calc.adjustArea": {
    de: "Fläche genau einstellen", en: "Adjust Area Size Precisely",
    ar: "اضبط المساحة بدقّة", tr: "Alanı hassas ayarlayın",
  },
  "calc.sqmValue": { de: "{n} m²", en: "{n} m²", ar: "{n} م²", tr: "{n} m²" },

  "calc.roomFilter": { de: "Raum", en: "Room", ar: "الغرفة", tr: "Oda" },
  "calc.roomAll": {
    de: "Alle Räume", en: "All rooms", ar: "كل الغرف", tr: "Tüm odalar",
  },
  "calc.totalItemsAll": {
    de: "Gesamt: {count} Stück", en: "Total: {count} items",
    ar: "الإجمالي: {count} قطعة", tr: "Toplam: {count} parça",
  },
  "calc.totalRoomItems": {
    de: "{room}: {count} Stück", en: "{room}: {count} items",
    ar: "{room}: {count} قطعة", tr: "{room}: {count} parça",
  },

  "calc.addonsNote": {
    de: "Möbelmontage fragen wir später pro Möbelstück ab. Reinigung und Entrümpelung sind eigene Leistungen — wählen Sie sie im ersten Schritt oder rufen Sie uns an.",
    en: "Furniture assembly is asked per item later on. Cleaning and clearance are services of their own — pick them in the first step or call us.",
    ar: "نسأل عن تركيب الأثاث لاحقاً لكل قطعة. التنظيف والإخلاء خدمتان مستقلتان — اخترهما في الخطوة الأولى أو اتصل بنا.",
    tr: "Mobilya montajını ilerleyen adımda parça parça soruyoruz. Temizlik ve boşaltma ayrı hizmetlerdir — ilk adımda seçin ya da bizi arayın.",
  },
  "calc.crewRecommendation": {
    de: "Für eine Zweizimmerwohnung empfehlen wir drei Mitarbeiter.",
    en: "We recommend three movers for a two-bedroom flat.",
    ar: "نوصي بثلاثة عمّال لشقة بغرفتَي نوم.",
    tr: "İki yatak odalı bir daire için üç kişilik ekip öneririz.",
  },

  "calc.assembly": { de: "Aufbau", en: "Assembly", ar: "تركيب", tr: "Montaj" },
  "calc.disassembly": { de: "Abbau", en: "Disassembly", ar: "فكّ", tr: "Demontaj" },
  "calc.specialNoticeTitle": {
    de: "Hinweis zu Montage und schwerem Gut",
    en: "Additional Handling & Assembly Notice",
    ar: "تنبيه بشأن التركيب والأغراض الثقيلة",
    tr: "Montaj ve ağır eşya uyarısı",
  },
  "calc.specialNoticeBody": {
    de: "Stücke über 100 kg brauchen Gurte und geschultes Personal. Sagen Sie uns vorab Bescheid — telefonisch oder mit einem Foto im nächsten Schritt.",
    en: "Items over 100 kg need belts and trained helpers. Tell us in advance — by phone, or with a photo in the next step.",
    ar: "الأغراض التي تتجاوز 100 كغ تحتاج أحزمة وعمّالاً مدرّبين. أخبرنا مسبقاً هاتفياً أو بصورة في الخطوة التالية.",
    tr: "100 kg üzeri eşyalar kemer ve eğitimli eleman gerektirir. Bize önceden telefonla ya da sonraki adımda bir fotoğrafla bildirin.",
  },

  "calc.photosDropTitle": {
    de: "Fotos hierher ziehen", en: "Drag and drop your photos here",
    ar: "اسحب صورك إلى هنا", tr: "Fotoğraflarınızı buraya sürükleyin",
  },
  "calc.photosDropHint": {
    de: "JPG und PNG bis 10 MB pro Datei.",
    en: "Supports JPG and PNG up to 10 MB per file.",
    ar: "يدعم JPG وPNG حتى 10 ميغابايت لكل ملف.",
    tr: "Dosya başına 10 MB'a kadar JPG ve PNG.",
  },
  "calc.photosListTitle": {
    de: "Ausgewählte Fotos", en: "Selected photos",
    ar: "الصور المختارة", tr: "Seçilen fotoğraflar",
  },
  "calc.photosPending": {
    de: "Noch nicht übertragen", en: "Not sent yet",
    ar: "لم تُرسَل بعد", tr: "Henüz gönderilmedi",
  },
  "calc.photosRemove": {
    de: "{name} entfernen", en: "Remove {name}",
    ar: "إزالة {name}", tr: "{name} kaldır",
  },
  "calc.photosTooLarge": {
    de: "Zu groß und nicht übernommen: {names}. Maximal 10 MB pro Datei.",
    en: "Too large and not added: {names}. The limit is 10 MB per file.",
    ar: "أكبر من الحد ولم تُضَف: {names}. الحد 10 ميغابايت لكل ملف.",
    tr: "Çok büyük olduğu için eklenmedi: {names}. Sınır dosya başına 10 MB.",
  },
  "calc.photosTipsTitle": {
    de: "Nützliche Foto-Tipps", en: "Useful photo tips",
    ar: "نصائح مفيدة للتصوير", tr: "Faydalı fotoğraf ipuçları",
  },
  "calc.photosTip1": {
    de: "• Weitwinkelaufnahmen ganzer Räume, damit wir den Platz einschätzen können.",
    en: "• Take wide shots of whole rooms so we can judge the space.",
    ar: "• صوّر الغرف كاملة بزاوية واسعة لنقدّر المساحة.",
    tr: "• Alanı değerlendirebilmemiz için odaların geniş açılı fotoğrafını çekin.",
  },
  "calc.photosTip2": {
    de: "• Treppen und Aufzugsmaße festhalten, wenn sie ungewöhnlich eng sind.",
    en: "• Document stairs and lift dimensions if they are unusually tight.",
    ar: "• وثّق أبعاد الدرج والمصعد إن كانت ضيّقة بشكل غير معتاد.",
    tr: "• Merdiven ve asansör ölçülerini, alışılmadık derecede darsa belgeleyin.",
  },
  "calc.photosTip3": {
    de: "• Etiketten hochwertiger Designermöbel abfotografieren.",
    en: "• Shoot the labels on high-end designer furniture.",
    ar: "• صوّر ملصقات الأثاث المصمَّم الفاخر.",
    tr: "• Üst segment tasarım mobilyalarının etiketlerini çekin.",
  },

  "calc.dayFree": {
    de: "Voll verfügbar", en: "Fully available",
    ar: "متاح بالكامل", tr: "Tamamen uygun",
  },
  "calc.dayLimited": {
    de: "Wenige Plätze", en: "Limited slots",
    ar: "أماكن محدودة", tr: "Sınırlı kontenjan",
  },
  "calc.dayFull": {
    de: "Ausgebucht", en: "Fully booked", ar: "محجوز بالكامل", tr: "Dolu",
  },
  "calc.daySelected": {
    de: "Gewählter Termin", en: "Selected date",
    ar: "التاريخ المختار", tr: "Seçilen tarih",
  },

  "calc.arrivalWindow": {
    de: "Ankunftsfenster wählen", en: "Select arrival window",
    ar: "اختر نافذة الوصول", tr: "Varış aralığını seçin",
  },
  "calc.window.morning": {
    de: "Vormittags (08:00–12:00)", en: "Morning slot (08:00–12:00)",
    ar: "الفترة الصباحية (08:00–12:00)", tr: "Sabah (08:00–12:00)",
  },
  "calc.window.morningHint": {
    de: "Am beliebtesten für komplette Umzüge.",
    en: "Most popular for full relocations.",
    ar: "الأكثر طلباً لعمليات النقل الكاملة.",
    tr: "Tam taşınmalar için en çok tercih edilen.",
  },
  "calc.window.afternoon": {
    de: "Nachmittags (12:00–17:00)", en: "Afternoon slot (12:00–17:00)",
    ar: "فترة بعد الظهر (12:00–17:00)", tr: "Öğleden sonra (12:00–17:00)",
  },
  "calc.window.afternoonHint": {
    de: "Ideal für kurze Strecken.",
    en: "Ideal for short distance routes.",
    ar: "مثالية للمسافات القصيرة.",
    tr: "Kısa mesafeler için ideal.",
  },
  "calc.window.evening": {
    de: "Abends (17:00–20:00)", en: "Evening slot (17:00–20:00)",
    ar: "الفترة المسائية (17:00–20:00)", tr: "Akşam (17:00–20:00)",
  },
  "calc.window.eveningHint": {
    de: "Später Express-Service.",
    en: "Late express service.",
    ar: "خدمة سريعة في وقت متأخّر.",
    tr: "Geç saatte ekspres hizmet.",
  },

  "calc.summaryNone": { de: "Keine", en: "None", ar: "لا شيء", tr: "Yok" },
  "calc.percentComplete": {
    de: "{percent} % abgeschlossen", en: "{percent}% completed",
    ar: "اكتمل {percent}٪", tr: "%{percent} tamamlandı",
  },

  // The wizard's buttons, worded per screen as the frames word them (3:622 … 3:2018).
  "calc.nextStep": { de: "Nächster Schritt", en: "Next Step", ar: "الخطوة التالية", tr: "Sonraki adım" },
  /** The fourth node of the five-node rail (3:653); the ten-segment rail keeps the short name. */
  "calc.node.volume": {
    de: "Volumenschätzung", en: "Volume Estimate", ar: "تقدير الحجم", tr: "Hacim tahmini",
  },
  "calc.cta.continue": {
    de: "Speichern & weiter", en: "Save & Continue", ar: "حفظ ومتابعة", tr: "Kaydet ve devam et",
  },
  "calc.cta.toSpecial": {
    de: "Weiter zu Sondergegenständen", en: "Continue to Special Items",
    ar: "المتابعة إلى القطع الخاصة", tr: "Özel eşyalara geç",
  },
  "calc.cta.toPhotos": {
    de: "Weiter zu den Fotos", en: "Continue to Photos",
    ar: "المتابعة إلى الصور", tr: "Fotoğraflara geç",
  },
  "calc.cta.toDates": {
    de: "Weiter zum Termin", en: "Continue to Dates",
    ar: "المتابعة إلى المواعيد", tr: "Tarihlere geç",
  },
  "calc.cta.toReview": {
    de: "Endgültiges Angebot prüfen", en: "Review Final Offer",
    ar: "مراجعة العرض النهائي", tr: "Son teklifi incele",
  },
  "calc.cta.back": {
    de: "Zurück zum vorherigen Schritt", en: "Back to Previous Step",
    ar: "العودة إلى الخطوة السابقة", tr: "Önceki adıma dön",
  },

  // The two result screens (3:2348 instant quote, 3:2496 pending review).
  "calc.tab.pending": {
    de: "Vorläufige Schätzung", en: "Pending Estimate", ar: "تقدير قيد المراجعة", tr: "Bekleyen tahmin",
  },
  "calc.quote.badge": {
    de: "Sofortpreis — jetzt buchen", en: "Instant Price — Book Now",
    ar: "سعر فوري — احجز الآن", tr: "Anında fiyat — Hemen rezervasyon yap",
  },
  "calc.quote.title": {
    de: "Wir haben Ihren besten Preis berechnet!", en: "We calculated your best rate!",
    ar: "لقد حسبنا لك أفضل سعر!", tr: "Sizin için en iyi fiyatı hesapladık!",
  },
  "calc.quote.body": {
    de: "Garantierter Preis auf Basis Ihrer aktuellen Angaben. Keine versteckten Gebühren oder Überraschungen. Der Preis gilt bis {date}.",
    en: "Guaranteed price based on your current entries. No hidden fees or surprise charges. Price held until {date}.",
    ar: "سعر مضمون بناءً على بياناتك الحالية. لا رسوم خفية ولا مفاجآت. السعر ثابت حتى {date}.",
    tr: "Mevcut bilgilerinize dayalı garantili fiyat. Gizli ücret veya sürpriz masraf yok. Fiyat {date} tarihine kadar geçerlidir.",
  },
  "calc.quote.accept": {
    de: "Annehmen & jetzt buchen", en: "Accept & Book Now", ar: "قبول والحجز الآن", tr: "Kabul et ve rezervasyon yap",
  },
  "calc.quote.save": { de: "Angebot speichern", en: "Save Quote", ar: "حفظ العرض", tr: "Teklifi kaydet" },
  /** There is no PDF endpoint; the button opens the print dialog, which saves one. */
  "calc.quote.pdf": {
    de: "Als PDF speichern", en: "Download as PDF", ar: "تنزيل بصيغة PDF", tr: "PDF olarak indir",
  },
  "calc.quote.breakdown": {
    de: "Detaillierte Preisaufstellung", en: "Itemized Price Breakdown",
    ar: "تفصيل السعر", tr: "Ayrıntılı fiyat dökümü",
  },
  "calc.quote.total": {
    de: "Garantierter Gesamtbetrag", en: "Total Guaranteed Amount",
    ar: "المبلغ الإجمالي المضمون", tr: "Garantili toplam tutar",
  },
  "calc.pending.badge": {
    de: "Schätzung — Prüfung ausstehend", en: "Estimate — Pending Review",
    ar: "تقدير — بانتظار المراجعة", tr: "Tahmin — İnceleme bekliyor",
  },
  "calc.pending.title": {
    de: "Wir erstellen Ihr individuelles Angebot", en: "We are preparing your custom quote",
    ar: "نحن نُعدّ عرضك المخصّص", tr: "Size özel teklifinizi hazırlıyoruz",
  },
  "calc.pending.estimate": { de: "(Schätzung)", en: "(estimate)", ar: "(تقديري)", tr: "(tahmini)" },
  "calc.pending.body": {
    de: "Einige Ihrer Angaben muss unser Dispositionsteam kurz von Hand prüfen, bevor wir einen Preis garantieren. Der Betrag oben ist unsere aktuelle Schätzung.",
    en: "Some of your answers need a manual check by our dispatch team before we can guarantee a price. The figure above is our current estimate.",
    ar: "تحتاج بعض إجاباتك إلى تحقّق يدوي من فريق التنسيق لدينا قبل أن نضمن السعر. المبلغ أعلاه هو تقديرنا الحالي.",
    tr: "Bir fiyatı garanti edebilmemiz için bazı yanıtlarınızın sevk ekibimiz tarafından elle kontrol edilmesi gerekiyor. Yukarıdaki tutar güncel tahminimizdir.",
  },
  "calc.pending.whyTitle": {
    de: "Warum wird das geprüft?", en: "Why is this pending review?",
    ar: "لماذا يخضع هذا للمراجعة؟", tr: "Bu neden inceleniyor?",
  },
  "calc.pending.whyBody": {
    de: "Unsere Umzugsexperten prüfen die folgenden Punkte, damit es am Umzugstag keine Überraschungen gibt. Den endgültigen Preis bestätigen wir innerhalb eines Werktags.",
    en: "Our moving experts check the points below so there are no surprise complications on your moving day. We confirm the final price within one working day.",
    ar: "يتحقّق خبراء النقل لدينا من النقاط أدناه حتى لا تحدث مفاجآت يوم النقل. نؤكّد السعر النهائي خلال يوم عمل واحد.",
    tr: "Taşınma gününde sürpriz yaşanmaması için taşıma uzmanlarımız aşağıdaki noktaları kontrol eder. Nihai fiyatı bir iş günü içinde onaylarız.",
  },
  "calc.pending.timeline": {
    de: "Nächste Schritte", en: "Next Steps Timeline", ar: "الخطوات التالية", tr: "Sonraki adımlar",
  },
  "calc.pending.step1": {
    de: "Schätzung berechnet", en: "Estimate Calculated", ar: "تم حساب التقدير", tr: "Tahmin hesaplandı",
  },
  "calc.pending.step1Sub": { de: "Gerade erledigt", en: "Done just now", ar: "تمّ للتو", tr: "Az önce tamamlandı" },
  "calc.pending.step2": {
    de: "Prüfung durch Experten", en: "Expert Assessment", ar: "تقييم الخبراء", tr: "Uzman değerlendirmesi",
  },
  "calc.pending.step2Sub": {
    de: "In Bearbeitung (innerhalb 24 h)", en: "In progress (within 24h)",
    ar: "قيد التنفيذ (خلال 24 ساعة)", tr: "Devam ediyor (24 saat içinde)",
  },
  "calc.pending.step3": {
    de: "Endgültiges Angebot", en: "Final Quote Sent", ar: "إرسال العرض النهائي", tr: "Nihai teklif gönderildi",
  },
  "calc.pending.step3Sub": { de: "Per E-Mail", en: "By email", ar: "عبر البريد الإلكتروني", tr: "E-posta ile" },
  "calc.pending.step4": { de: "Sicher buchen", en: "Safe Booking", ar: "حجز آمن", tr: "Güvenli rezervasyon" },
  "calc.pending.step4Sub": {
    de: "Termin sofort sichern", en: "Secure your date instantly", ar: "احجز موعدك فورًا", tr: "Tarihinizi hemen ayırtın",
  },
  /** Signing up with the quote id adopts the quote, which gives dispatch a way to reply. */
  "calc.pending.save": {
    de: "Schätzung speichern & Konto erstellen", en: "Save Estimate & Create Account",
    ar: "حفظ التقدير وإنشاء حساب", tr: "Tahmini kaydet ve hesap oluştur",
  },

  "common.skip": { de: "Überspringen", en: "Skip", ar: "تخطَّ", tr: "Atla" },
  "common.yes": { de: "Ja", en: "Yes", ar: "نعم", tr: "Evet" },
  "common.no": { de: "Nein", en: "No", ar: "لا", tr: "Hayır" },

  // Why a quote went to manual review. The server decides; these only name it.
  "calc.review.area_above_200_sqm": {
    de: "Über 200 m² Wohnfläche",
    en: "More than 200 m² of living space",
    ar: "أكثر من 200 م² مساحة سكنية",
    tr: "200 m² üzeri yaşam alanı",
  },
  "calc.review.more_than_60_items": {
    de: "Mehr als 60 Einzelstücke",
    en: "More than 60 individual items",
    ar: "أكثر من 60 قطعة",
    tr: "60 parçadan fazla eşya",
  },
  "calc.review.distance_above_400_km": {
    de: "Über 400 km Entfernung",
    en: "More than 400 km to travel",
    ar: "مسافة تزيد عن 400 كم",
    tr: "400 km üzeri mesafe",
  },
  "calc.review.extensive_assembly_work": {
    de: "Umfangreiche Möbelmontage",
    en: "Extensive furniture assembly",
    ar: "أعمال تركيب أثاث واسعة",
    tr: "Kapsamlı mobilya montajı",
  },
  "calc.review.large_commercial_job": {
    de: "Großer gewerblicher Auftrag",
    en: "A large commercial job",
    ar: "طلب تجاري كبير",
    tr: "Büyük ticari iş",
  },

  // ── The live price panel beside every calculator step ────────────────
  // Chrome only. The figures it frames are the server's, never assembled here.
  "calc.panel.liveEstimate": {
    de: "Live-Preisschätzung", en: "Live Price Estimate",
    ar: "تقدير السعر المباشر", tr: "Canlı Fiyat Tahmini",
  },
  "calc.panel.inclVat": {
    de: "inkl. MwSt.", en: "incl. VAT", ar: "شامل الضريبة", tr: "KDV dahil",
  },
  "calc.panel.noPriceYet": {
    de: "Beantworte noch ein paar Fragen — dann steht dein Preis hier.",
    en: "Answer a few more questions and your price appears here.",
    ar: "أجب عن بضعة أسئلة إضافية ليظهر سعرك هنا.",
    tr: "Birkaç soruyu daha yanıtlayın, fiyatınız burada görünür.",
  },
  "calc.panel.calculating": {
    de: "Preis wird berechnet…", en: "Calculating your price…",
    ar: "يجري حساب السعر…", tr: "Fiyatınız hesaplanıyor…",
  },
  "calc.panel.refreshFailed": {
    de: "Der Preis konnte gerade nicht aktualisiert werden. Deine Angaben bleiben erhalten.",
    en: "The price could not be updated just now. Your answers are kept.",
    ar: "تعذّر تحديث السعر الآن. إجاباتك محفوظة.",
    tr: "Fiyat şu anda güncellenemedi. Yanıtlarınız korunuyor.",
  },
  "calc.panel.selectedServices": {
    de: "Gewählte Leistungen", en: "Selected Services",
    ar: "الخدمات المختارة", tr: "Seçilen Hizmetler",
  },
  "calc.panel.routeSpecs": {
    de: "Strecke & Eckdaten", en: "Route & Specs",
    ar: "المسار والمواصفات", tr: "Güzergâh ve Detaylar",
  },
  "calc.panel.awaitingSpecs": {
    de: "Adresse und Angaben eingeben, um den Preis zu verfeinern.",
    en: "Enter address & specifications to refine price.",
    ar: "أدخل العنوان والمواصفات لتحديد السعر بدقّة.",
    tr: "Fiyatı netleştirmek için adres ve bilgileri girin.",
  },
  "calc.panel.guaranteeTitle": {
    de: "m.on Garantie", en: "m.on Guarantee",
    ar: "ضمان m.on", tr: "m.on Garantisi",
  },
  "calc.panel.guaranteeBody": {
    de: "Keine versteckten Kosten. Transportversicherung inklusive.",
    en: "No hidden fees. Full transport insurance included.",
    ar: "لا رسوم خفيّة. تأمين نقل شامل مضمَّن.",
    tr: "Gizli ücret yok. Tam nakliye sigortası dahil.",
  },
  "calc.panel.instantLivePrice": {
    de: "Sofortpreis live", en: "Instant Live Price",
    ar: "السعر الفوري المباشر", tr: "Anında Canlı Fiyat",
  },
  "calc.panel.breakdown": {
    de: "Preisaufschlüsselung", en: "Price Breakdown",
    ar: "تفصيل السعر", tr: "Fiyat Dökümü",
  },
  "calc.panel.estimatedTotal": {
    de: "Geschätzte Gesamtsumme", en: "Estimated Total",
    ar: "الإجمالي التقديري", tr: "Tahmini Toplam",
  },
  "calc.panel.totalNote": {
    de: "Inkl. Steuern und Versicherung", en: "Incl. all taxes & insurance",
    ar: "شامل كل الضرائب والتأمين", tr: "Tüm vergiler ve sigorta dahil",
  },
  "calc.panel.bestPrice": {
    de: "Bestpreis-Garantie & Sofortbuchung", en: "Best Price Guarantee & Instant Booking",
    ar: "ضمان أفضل سعر وحجز فوري", tr: "En İyi Fiyat Garantisi ve Anında Rezervasyon",
  },
  "calc.panel.distance": {
    de: "Entfernung", en: "Distance", ar: "المسافة", tr: "Mesafe",
  },
  "calc.panel.kmValue": {
    de: "{km} km", en: "{km} km", ar: "{km} كم", tr: "{km} km",
  },
  "calc.panel.customerType": {
    de: "Kundentyp", en: "Customer Type", ar: "نوع العميل", tr: "Müşteri Tipi",
  },
  "calc.panel.fromFloor": {
    de: "Etage / Aufzug (von)", en: "From Floor / Elevator",
    ar: "الطابق/المصعد (من)", tr: "Kat / Asansör (çıkış)",
  },
  "calc.panel.toFloor": {
    de: "Etage / Aufzug (nach)", en: "To Floor / Elevator",
    ar: "الطابق/المصعد (إلى)", tr: "Kat / Asansör (varış)",
  },
  "calc.panel.groundFloor": {
    de: "EG", en: "Ground", ar: "أرضي", tr: "Zemin",
  },
  "calc.panel.floorNumber": {
    de: "{floor}. OG", en: "Floor {floor}", ar: "الطابق {floor}", tr: "{floor}. kat",
  },
  "calc.panel.livingArea": {
    de: "Wohnfläche", en: "Living Area", ar: "المساحة السكنية", tr: "Yaşam Alanı",
  },
  "calc.panel.sqmValue": {
    de: "{sqm} m²", en: "{sqm} m²", ar: "{sqm} م²", tr: "{sqm} m²",
  },
  "calc.panel.calcMethod": {
    de: "Berechnungsart", en: "Calc Method", ar: "طريقة الحساب", tr: "Hesaplama Yöntemi",
  },
  "calc.panel.totalItems": {
    de: "Artikel gesamt", en: "Total Items", ar: "إجمالي العناصر", tr: "Toplam Eşya",
  },
  "calc.panel.itemsValue": {
    de: { one: "{count} Artikel", other: "{count} Artikel" },
    en: { one: "{count} item", other: "{count} items" },
    ar: {
      zero: "لا عناصر", one: "عنصر واحد", two: "عنصران",
      few: "{count} عناصر", many: "{count} عنصرًا", other: "{count} عنصر",
    },
    tr: { one: "{count} parça", other: "{count} parça" },
  },

  // The sub-caption under each breakdown line. The engine ships the numbers in
  // `params`; these only put words around them.
  "line.base_rate.caption": {
    de: "Grundleistung vor Zuschlägen", en: "Core service before surcharges",
    ar: "الخدمة الأساسية قبل الرسوم الإضافية", tr: "Ek ücretlerden önce temel hizmet",
  },
  "line.area.caption": {
    de: "Nach Wohnfläche: {sqm} m²", en: "By living area: {sqm} m²",
    ar: "حسب المساحة السكنية: {sqm} م²", tr: "Yaşam alanına göre: {sqm} m²",
  },
  "line.selected_items.caption": {
    de: "{count} ausgewählte Positionen", en: "{count} selected item types",
    ar: "{count} أصناف مختارة", tr: "{count} seçili kalem türü",
  },
  "line.travel.caption": {
    de: "{km} km Fahrstrecke", en: "{km} km driving route",
    ar: "{km} كم مسافة قيادة", tr: "{km} km sürüş güzergâhı",
  },
  "line.travel_long_distance.caption": {
    de: "Fernumzug über {km} km", en: "Long-distance move over {km} km",
    ar: "نقل لمسافة طويلة تبلغ {km} كم", tr: "{km} km uzun mesafe taşıma",
  },
  "line.floor_surcharge.caption": {
    de: "{floors} Etagen ohne Aufzug", en: "{floors} floors without a lift",
    ar: "{floors} طوابق بدون مصعد", tr: "Asansörsüz {floors} kat",
  },
  "line.packing_service.caption": {
    de: "Zusatzleistung gewählt", en: "Add-on selected",
    ar: "خدمة إضافية مختارة", tr: "Ek hizmet seçildi",
  },
  "line.parking_zone.caption": {
    de: "Halteverbotszone beantragt", en: "No-parking zone requested",
    ar: "طلب منطقة منع وقوف", tr: "Park yasağı bölgesi talep edildi",
  },
  "line.transport_insurance.caption": {
    de: "{percent} % des Leistungswerts", en: "{percent}% of the service value",
    ar: "{percent}٪ من قيمة الخدمة", tr: "Hizmet bedelinin %{percent} kadarı",
  },
  "line.crew_of_three.caption": {
    de: "Dritter Mitarbeiter eingeplant", en: "Third mover scheduled",
    ar: "عامل ثالث مُدرج", tr: "Üçüncü taşıyıcı planlandı",
  },
  "line.second_van.caption": {
    de: "Zweites Fahrzeug eingeplant", en: "Second van scheduled",
    ar: "مركبة ثانية مُدرجة", tr: "İkinci araç planlandı",
  },
  "line.assembly.caption": {
    de: "Montage ausgewählter Möbel", en: "Assembly of selected furniture",
    ar: "تركيب الأثاث المختار", tr: "Seçilen mobilyaların montajı",
  },
  "line.disassembly.caption": {
    de: "Demontage ausgewählter Möbel", en: "Disassembly of selected furniture",
    ar: "تفكيك الأثاث المختار", tr: "Seçilen mobilyaların demontajı",
  },
  "line.saturday_surcharge.caption": {
    de: "Samstagszuschlag {percent} %", en: "Saturday premium of {percent}%",
    ar: "رسوم السبت {percent}٪", tr: "%{percent} cumartesi farkı",
  },
  "line.business_discount.caption": {
    de: "Gewerberabatt {percent} %", en: "Business discount of {percent}%",
    ar: "خصم الشركات {percent}٪", tr: "%{percent} kurumsal indirim",
  },
  "line.discount_code.caption": {
    de: "Code {code}", en: "Code {code}", ar: "الرمز {code}", tr: "Kod {code}",
  },
  "line.minimum_order_value.caption": {
    de: "Mindestauftragswert erreicht", en: "Minimum order value applied",
    ar: "تم تطبيق الحد الأدنى لقيمة الطلب", tr: "Asgari sipariş tutarı uygulandı",
  },

  "brand.name": { de: "m.on", en: "m.on", ar: "m.on", tr: "m.on" },
  // The wordmark is two runs: the lead in ink, the accent in brand red.
  "brand.nameLead": { de: "Umzug", en: "Umzug", ar: "Umzug", tr: "Umzug" },
  "brand.nameAccent": { de: "Plus", en: "Plus", ar: "Plus", tr: "Plus" },
  "brand.tagline": {
    de: "Premium Service", en: "Premium Service", ar: "خدمة مميّزة", tr: "Premium Hizmet",
  },
  "nav.faq": {
    de: "FAQ", en: "FAQ", ar: "الأسئلة الشائعة", tr: "SSS",
  },
  "nav.contact": {
    de: "Kontakt", en: "Contact", ar: "اتصل بنا", tr: "İletişim",
  },
  "nav.search": {
    de: "Suchen", en: "Search", ar: "بحث", tr: "Ara",
  },
  "nav.instantQuote": {
    de: "Sofort-Angebot", en: "Instant Quote", ar: "عرض فوري", tr: "Anında Teklif",
  },
  "nav.pricing": {
    de: "Preise", en: "Pricing", ar: "الأسعار", tr: "Fiyatlar",
  },
  "nav.business": {
    de: "Für Unternehmen", en: "For Business", ar: "للشركات", tr: "Kurumsal",
  },
  "nav.guide": {
    de: "Ratgeber", en: "Guide", ar: "دليل", tr: "Rehber",
  },
  "nav.partner": {
    de: "Partner werden", en: "Become a Partner", ar: "كن شريكاً", tr: "Ortak Ol",
  },
  /**
   * The black pill of the new nav-bar (86:5213) and the white one of the
   * footer (101:163). Rendered uppercase, as drawn; Arabic has no case.
   */
  "nav.getApp": {
    de: "App holen", en: "Get app", ar: "حمّل التطبيق", tr: "Uygulamayı indir",
  },
  /** The nav-bar's shopping cart (86:5339), which opens the calculator. */
  "nav.cart": {
    de: "Ihr Angebot", en: "Your quote", ar: "عرض السعر الخاص بك", tr: "Teklifiniz",
  },
  /** Names the footer's link row for screen readers, apart from the header's. */
  "footer.navLabel": {
    de: "Fußzeilen-Navigation", en: "Footer navigation", ar: "روابط التذييل", tr: "Alt bilgi gezinmesi",
  },

  // ── Errors ──────────────────────────────────────────────────────────
  "error.invalidCredentials": {
    de: "E-Mail oder Passwort ist falsch.",
    en: "Email or password is incorrect.",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    tr: "E-posta veya şifre yanlış.",
  },
  "error.emailNotVerified": {
    de: "Dein Konto ist noch nicht bestätigt. Bitte prüfe deinen Posteingang.",
    en: "Your account is not confirmed yet. Please check your inbox.",
    ar: "لم يُفعَّل حسابك بعد. الرجاء التحقّق من بريدك.",
    tr: "Hesabınız henüz onaylanmadı. Lütfen gelen kutunuzu kontrol edin.",
  },
  "error.accountBlocked": {
    de: "Dieses Konto wurde gesperrt. Bitte wende dich an den Support.",
    en: "This account has been blocked. Please contact support.",
    ar: "هذا الحساب محظور. الرجاء التواصل مع الدعم.",
    tr: "Bu hesap engellendi. Lütfen destekle iletişime geçin.",
  },
  "error.emailTaken": {
    de: "Für diese E-Mail existiert bereits ein Konto.",
    en: "An account with this email already exists.",
    ar: "يوجد حساب بهذا البريد الإلكتروني بالفعل.",
    tr: "Bu e-posta ile bir hesap zaten var.",
  },
  "error.rateLimited": {
    de: "Zu viele Versuche. Bitte warte einen Moment.",
    en: "Too many attempts. Please wait a moment.",
    ar: "محاولات كثيرة. الرجاء الانتظار قليلاً.",
    tr: "Çok fazla deneme. Lütfen biraz bekleyin.",
  },
  "error.network": {
    de: "Keine Verbindung zum Server.",
    en: "Could not reach the server.",
    ar: "تعذّر الوصول إلى الخادم.",
    tr: "Sunucuya ulaşılamadı.",
  },
  "error.slotTaken": {
    de: "Dieser Termin wurde gerade vergeben. Bitte wähle einen anderen Tag.",
    en: "That date was just taken. Please choose another day.",
    ar: "حُجز هذا الموعد للتوّ. الرجاء اختيار يوم آخر.",
    tr: "Bu tarih az önce doldu. Lütfen başka bir gün seçin.",
  },
  "error.quoteExpired": {
    de: "Dein Angebot ist abgelaufen. Bitte berechne den Preis erneut.",
    en: "Your quote has expired. Please calculate the price again.",
    ar: "انتهت صلاحية عرضك. الرجاء حساب السعر مرّة أخرى.",
    tr: "Teklifiniz süresi doldu. Lütfen fiyatı tekrar hesaplayın.",
  },
  "error.checkFields": {
    de: "Bitte prüfe deine Eingaben.",
    en: "Please check your input.",
    ar: "الرجاء التحقّق من مدخلاتك.",
    tr: "Lütfen girdilerinizi kontrol edin.",
  },
  "error.generic": {
    de: "Etwas ist schiefgelaufen. Bitte versuch es erneut.",
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ ما. الرجاء المحاولة مرّة أخرى.",
    tr: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
  },
  "error.availabilityFailed": {
    de: "Die Verfügbarkeit konnte nicht geladen werden.",
    en: "Availability could not be loaded.",
    ar: "تعذّر تحميل الأوقات المتاحة.",
    tr: "Müsaitlik yüklenemedi.",
  },
  "error.priceFailed": {
    de: "Der Preis konnte nicht berechnet werden.",
    en: "The price could not be calculated.",
    ar: "تعذّر حساب السعر.",
    tr: "Fiyat hesaplanamadı.",
  },
  "error.missingArea": {
    de: "Bitte gib die Fläche an.",
    en: "Please enter the area.",
    ar: "الرجاء إدخال المساحة.",
    tr: "Lütfen alanı girin.",
  },
  "error.profileLoadFailed": {
    de: "Dein Profil konnte nicht geladen werden.",
    en: "Your profile could not be loaded.",
    ar: "تعذّر تحميل ملفك الشخصي.",
    tr: "Profiliniz yüklenemedi.",
  },
  "error.saveFailed": {
    de: "Speichern fehlgeschlagen. Bitte versuch es erneut.",
    en: "Saving failed. Please try again.",
    ar: "فشل الحفظ. الرجاء المحاولة مرّة أخرى.",
    tr: "Kaydetme başarısız. Lütfen tekrar deneyin.",
  },
} as const;

export type MessageKey = keyof typeof MESSAGES;
