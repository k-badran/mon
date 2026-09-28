/**
 * Seeds the FAQ in every locale.
 *
 * The questions and answers are the ones written into the M.io homepage
 * frame. Only German existed before, so the FAQ section vanished on the
 * English, Arabic and Turkish homepages — the endpoint returned an empty
 * list and the section hid itself.
 *
 * Idempotent on (locale, sortOrder), which is the table's unique key. A
 * re-run rewrites the category too, so rows seeded before the column existed
 * pick up their topic from here.
 */
import type { FaqCategory } from "@mon/core";
import { and, eq } from "drizzle-orm";

import { db } from "./client.js";
import { faqEntries } from "./schema/catalog.js";

interface FaqSeed {
  sortOrder: number;
  /** One topic per question, the same in every locale — a key, not a label. */
  category: FaqCategory;
  de: { q: string; a: string };
  en: { q: string; a: string };
  ar: { q: string; a: string };
  tr: { q: string; a: string };
}

const FAQ: FaqSeed[] = [
  {
    sortOrder: 1,
    category: "insurance",
    de: {
      q: "Sind meine Möbel während des Transports versichert?",
      a: "Ja, vollständig. Jedes transportierte Stück ist durch unsere Allianz-Haftpflicht- und Transportversicherung abgesichert. Bei wertvollen Kunstobjekten passen wir die Versicherungssumme auf Wunsch individuell an.",
    },
    en: {
      q: "Are my furniture items insured during transport?",
      a: "Yes, absolutely. Every transported item is fully protected by our Allianz liability and transport insurance. For valuable art objects, we adjust the insurance sum individually on request.",
    },
    ar: {
      q: "هل أثاثي مؤمَّن أثناء النقل؟",
      a: "نعم، بالكامل. كل قطعة تُنقل محميّة بتأمين المسؤولية والنقل من Allianz. وللقطع الفنّية الثمينة نعدّل مبلغ التأمين بشكل فردي عند الطلب.",
    },
    tr: {
      q: "Eşyalarım taşıma sırasında sigortalı mı?",
      a: "Evet, tamamen. Taşınan her parça Allianz sorumluluk ve nakliye sigortamızla korunur. Değerli sanat eserleri için sigorta bedelini talep üzerine ayrıca belirleriz.",
    },
  },
  {
    sortOrder: 2,
    category: "billing",
    de: {
      q: "Wie funktioniert die Abrechnung nach m² genau?",
      a: "Sie geben die Wohnfläche und die ungefähre Zimmerzahl in unseren Rechner ein. Unser System vergleicht das mit Durchschnittswerten und berechnet daraus ein exaktes Festpreisangebot. Alternativ können Sie einzelne Sperrgutstücke manuell ergänzen.",
    },
    en: {
      q: "How does the m² billing work exactly?",
      a: "You enter the living area and approximate number of rooms into our calculator. Our system compares this with average values and calculates an exact fixed-price offer from it. Alternatively, you can manually add individual bulky items.",
    },
    ar: {
      q: "كيف يتمّ الحساب بالمتر المربّع بالضبط؟",
      a: "تُدخل المساحة السكنية وعدد الغرف التقريبي في الحاسبة. يقارن نظامنا ذلك بالمتوسّطات ويحسب منه عرض سعر ثابت دقيق. وبدلاً من ذلك يمكنك إضافة القطع الكبيرة يدوياً.",
    },
    tr: {
      q: "m² bazlı faturalandırma tam olarak nasıl işliyor?",
      a: "Yaşam alanını ve yaklaşık oda sayısını hesaplayıcımıza girersiniz. Sistemimiz bunu ortalama değerlerle karşılaştırıp kesin bir sabit fiyat teklifi hesaplar. Alternatif olarak hacimli parçaları tek tek ekleyebilirsiniz.",
    },
  },
  {
    sortOrder: 3,
    category: "booking",
    de: {
      q: "Kann ich meinen Umzugstermin später verschieben?",
      a: "Eine Terminverschiebung ist bis 5 Werktage vor dem vereinbarten Termin vollständig kostenfrei. Wenden Sie sich dafür einfach direkt an Ihren persönlichen Projektleiter.",
    },
    en: {
      q: "Can I reschedule my move date later?",
      a: "Rescheduling your date is completely free of charge up to 5 business days before the agreed date. Simply contact your personal project manager directly.",
    },
    ar: {
      q: "هل يمكنني تغيير موعد النقل لاحقاً؟",
      a: "تغيير الموعد مجاني تماماً حتى 5 أيام عمل قبل الموعد المتّفق عليه. تواصل مباشرة مع مدير المشروع الخاصّ بك.",
    },
    tr: {
      q: "Taşınma tarihimi sonradan değiştirebilir miyim?",
      a: "Tarih değişikliği, kararlaştırılan tarihten 5 iş günü öncesine kadar tamamen ücretsizdir. Doğrudan kişisel proje yöneticinizle iletişime geçmeniz yeterli.",
    },
  },
  {
    sortOrder: 4,
    category: "cleaning",
    de: {
      q: "Was beinhaltet die Übergabegarantie bei der Reinigung?",
      a: "Das bedeutet: Meldet der Vermieter bei der offiziellen Übergabe Reinigungsmängel, beheben wir diese sofort und für Sie vollständig kostenfrei. Auf Wunsch begleiten wir Sie auch bei der Schlüsselübergabe.",
    },
    en: {
      q: "What does the handover guarantee include for cleaning?",
      a: "This means: if the landlord reports cleaning defects during the official handover, we will correct them immediately and completely free of charge for you. We can also accompany you during the key handover if you wish.",
    },
    ar: {
      q: "ماذا يشمل ضمان التسليم في خدمة التنظيف؟",
      a: "يعني: إذا أبلغ المالك عن عيوب في التنظيف أثناء التسليم الرسمي، نصلحها فوراً ومجاناً تماماً. ويمكننا مرافقتك أيضاً عند تسليم المفاتيح إن رغبت.",
    },
    tr: {
      q: "Temizlikte teslim garantisi neleri kapsıyor?",
      a: "Şu anlama gelir: ev sahibi resmi teslim sırasında temizlik kusuru bildirirse, bunları derhal ve sizin için tamamen ücretsiz gideririz. İsterseniz anahtar tesliminde de size eşlik ederiz.",
    },
  },
];

const LOCALES = ["de", "en", "ar", "tr"] as const;

async function main() {
  let inserted = 0;
  let updated = 0;

  for (const entry of FAQ) {
    for (const locale of LOCALES) {
      const text = entry[locale];

      const [existing] = await db
        .select()
        .from(faqEntries)
        .where(and(eq(faqEntries.locale, locale), eq(faqEntries.sortOrder, entry.sortOrder)))
        .limit(1);

      if (existing) {
        await db
          .update(faqEntries)
          .set({
            question: text.q,
            answer: text.a,
            category: entry.category,
            isPublished: true,
            updatedAt: new Date(),
          })
          .where(eq(faqEntries.id, existing.id));
        updated += 1;
        continue;
      }

      await db.insert(faqEntries).values({
        locale,
        question: text.q,
        answer: text.a,
        category: entry.category,
        sortOrder: entry.sortOrder,
        isPublished: true,
      });
      inserted += 1;
    }
  }

  console.log(`faq — inserted ${inserted}, updated ${updated} (${FAQ.length} × ${LOCALES.length})`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
