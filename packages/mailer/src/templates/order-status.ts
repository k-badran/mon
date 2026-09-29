import { formatCalendarDate, formatClockTime, formatCurrency, type Locale } from "@mon/core";

import type { RenderedTemplate } from "../types.js";
import { renderHtml, renderText, type LayoutBlock, type LayoutInput } from "./layout.js";

/**
 * The stage an order has reached, from the customer's side.
 *
 * `submitted` is not an order status — it is the email for a freshly created
 * order, which the database records as `quoted`. The distinction matters in the
 * copy: to the customer they have just *submitted a request* and are waiting on
 * us, and telling them their order is "quoted" describes our bookkeeping rather
 * than their situation.
 */
export type OrderStage = "submitted" | "confirmed" | "completed" | "cancelled";

export interface OrderStatusPayload {
  stage: OrderStage;
  /** The human-facing reference, e.g. "UP-2026-000142". */
  reference: string;
  name?: string | undefined;
  /** "YYYY-MM-DD". Absent on an order with no date agreed yet. */
  scheduledDate?: string | undefined;
  /** "HH:MM:SS" as Postgres returns it. */
  scheduledTime?: string | undefined;
  /** Decimal string, as the money column stores it. */
  totalGross: string;
  depositAmount?: string | undefined;
  /** Only on a cancellation, and only when one was actually charged. */
  cancellationFee?: string | undefined;
  /** A link to the order in the customer's account. */
  url?: string | undefined;
}

interface Copy {
  subject: (reference: string) => string;
  heading: string;
  intro: string;
  /** What happens next, or nothing when the stage is terminal. */
  next?: string;
  button?: string;
  notice?: string;
  labels: {
    reference: string;
    date: string;
    total: string;
    deposit: string;
    fee: string;
  };
}

const COPY: Record<Locale, Record<OrderStage, Copy>> = {
  de: {
    submitted: {
      subject: (r) => `Anfrage ${r} erhalten`,
      heading: "Wir haben Ihre Anfrage erhalten",
      intro: "Vielen Dank. Ihre Anfrage liegt uns vor und wird jetzt geprüft.",
      next: "Wir melden uns innerhalb eines Werktags mit der Bestätigung. Sie müssen nichts weiter tun.",
      button: "Anfrage ansehen",
      notice: "Der Termin ist erst nach unserer Bestätigung verbindlich.",
      labels: { reference: "Referenz", date: "Wunschtermin", total: "Gesamtpreis", deposit: "Anzahlung", fee: "Gebühr" },
    },
    confirmed: {
      subject: (r) => `Auftrag ${r} bestätigt`,
      heading: "Ihr Auftrag ist bestätigt",
      intro: "Wir haben Ihre Anfrage geprüft und den Termin fest eingeplant.",
      next: "Unser Team meldet sich vor dem Termin, um die letzten Details abzustimmen.",
      button: "Auftrag ansehen",
      labels: { reference: "Referenz", date: "Termin", total: "Gesamtpreis", deposit: "Anzahlung", fee: "Gebühr" },
    },
    completed: {
      subject: (r) => `Auftrag ${r} abgeschlossen`,
      heading: "Ihr Auftrag ist abgeschlossen",
      intro: "Der Auftrag ist erledigt. Vielen Dank, dass Sie sich für uns entschieden haben.",
      next: "Eine Zusammenfassung finden Sie jederzeit in Ihrem Konto. Über eine Bewertung freuen wir uns.",
      button: "Auftrag ansehen",
      labels: { reference: "Referenz", date: "Termin", total: "Gesamtpreis", deposit: "Anzahlung", fee: "Gebühr" },
    },
    cancelled: {
      subject: (r) => `Auftrag ${r} storniert`,
      heading: "Ihr Auftrag wurde storniert",
      intro: "Der Auftrag wurde storniert und der Termin ist wieder freigegeben.",
      button: "Auftrag ansehen",
      labels: { reference: "Referenz", date: "Termin", total: "Gesamtpreis", deposit: "Anzahlung", fee: "Stornogebühr" },
    },
  },
  en: {
    submitted: {
      subject: (r) => `Request ${r} received`,
      heading: "We've received your request",
      intro: "Thank you. Your request has reached us and is now being reviewed.",
      next: "We'll come back to you within one working day with a confirmation. Nothing further is needed from you.",
      button: "View request",
      notice: "The date is not binding until we confirm it.",
      labels: { reference: "Reference", date: "Requested date", total: "Total", deposit: "Deposit", fee: "Fee" },
    },
    confirmed: {
      subject: (r) => `Order ${r} confirmed`,
      heading: "Your order is confirmed",
      intro: "We've reviewed your request and the date is now booked.",
      next: "Our team will be in touch before the date to settle the last details.",
      button: "View order",
      labels: { reference: "Reference", date: "Date", total: "Total", deposit: "Deposit", fee: "Fee" },
    },
    completed: {
      subject: (r) => `Order ${r} completed`,
      heading: "Your order is complete",
      intro: "The job is done. Thank you for choosing us.",
      next: "A summary stays available in your account. We'd be glad to hear how it went.",
      button: "View order",
      labels: { reference: "Reference", date: "Date", total: "Total", deposit: "Deposit", fee: "Fee" },
    },
    cancelled: {
      subject: (r) => `Order ${r} cancelled`,
      heading: "Your order has been cancelled",
      intro: "The order has been cancelled and the slot is free again.",
      button: "View order",
      labels: { reference: "Reference", date: "Date", total: "Total", deposit: "Deposit", fee: "Cancellation fee" },
    },
  },
  ar: {
    submitted: {
      subject: (r) => `استلمنا طلبك ${r}`,
      heading: "استلمنا طلبك",
      intro: "شكراً لك. وصلنا طلبك وهو الآن قيد المراجعة.",
      next: "سنرد عليك بالتأكيد خلال يوم عمل واحد. لا حاجة لأي خطوة أخرى من جانبك.",
      button: "عرض الطلب",
      notice: "الموعد غير مؤكد نهائياً إلا بعد تأكيدنا.",
      labels: { reference: "رقم الطلب", date: "الموعد المطلوب", total: "المجموع", deposit: "العربون", fee: "الرسوم" },
    },
    confirmed: {
      subject: (r) => `تم تأكيد طلبك ${r}`,
      heading: "تم تأكيد طلبك",
      intro: "راجعنا طلبك وحجزنا الموعد نهائياً.",
      next: "سيتواصل معك فريقنا قبل الموعد لترتيب التفاصيل الأخيرة.",
      button: "عرض الطلب",
      labels: { reference: "رقم الطلب", date: "الموعد", total: "المجموع", deposit: "العربون", fee: "الرسوم" },
    },
    completed: {
      subject: (r) => `تم إنجاز طلبك ${r}`,
      heading: "تم إنجاز طلبك",
      intro: "انتهى العمل. شكراً لاختيارك لنا.",
      next: "تفاصيل الطلب متاحة دائماً في حسابك. يسعدنا أن نسمع رأيك.",
      button: "عرض الطلب",
      labels: { reference: "رقم الطلب", date: "الموعد", total: "المجموع", deposit: "العربون", fee: "الرسوم" },
    },
    cancelled: {
      subject: (r) => `تم إلغاء طلبك ${r}`,
      heading: "تم إلغاء طلبك",
      intro: "تم إلغاء الطلب وأصبح الموعد متاحاً من جديد.",
      button: "عرض الطلب",
      labels: { reference: "رقم الطلب", date: "الموعد", total: "المجموع", deposit: "العربون", fee: "رسوم الإلغاء" },
    },
  },
  tr: {
    submitted: {
      subject: (r) => `${r} talebiniz alındı`,
      heading: "Talebinizi aldık",
      intro: "Teşekkürler. Talebiniz bize ulaştı ve şimdi inceleniyor.",
      next: "Bir iş günü içinde onayla size döneceğiz. Sizden başka bir şey gerekmiyor.",
      button: "Talebi görüntüle",
      notice: "Tarih, biz onaylayana kadar kesin değildir.",
      labels: { reference: "Referans", date: "İstenen tarih", total: "Toplam", deposit: "Ön ödeme", fee: "Ücret" },
    },
    confirmed: {
      subject: (r) => `${r} siparişi onaylandı`,
      heading: "Siparişiniz onaylandı",
      intro: "Talebinizi inceledik ve tarihi kesinleştirdik.",
      next: "Ekibimiz tarihten önce son detaylar için sizinle iletişime geçecek.",
      button: "Siparişi görüntüle",
      labels: { reference: "Referans", date: "Tarih", total: "Toplam", deposit: "Ön ödeme", fee: "Ücret" },
    },
    completed: {
      subject: (r) => `${r} siparişi tamamlandı`,
      heading: "Siparişiniz tamamlandı",
      intro: "İş tamamlandı. Bizi seçtiğiniz için teşekkürler.",
      next: "Özet her zaman hesabınızda kalır. Görüşünüzü duymak isteriz.",
      button: "Siparişi görüntüle",
      labels: { reference: "Referans", date: "Tarih", total: "Toplam", deposit: "Ön ödeme", fee: "Ücret" },
    },
    cancelled: {
      subject: (r) => `${r} siparişi iptal edildi`,
      heading: "Siparişiniz iptal edildi",
      intro: "Sipariş iptal edildi ve tarih yeniden müsait.",
      button: "Siparişi görüntüle",
      labels: { reference: "Referans", date: "Tarih", total: "Toplam", deposit: "Ön ödeme", fee: "İptal ücreti" },
    },
  },
};

export function orderStatusTemplate(
  payload: OrderStatusPayload,
  locale: Locale,
): RenderedTemplate {
  const copy = COPY[locale][payload.stage];
  const blocks: LayoutBlock[] = [];

  if (payload.name) blocks.push({ paragraph: greeting(payload.name, locale) });
  blocks.push({ paragraph: copy.intro });

  // The facts the customer will want to check against: reference, date, price.
  const facts = [`${copy.labels.reference}: ${payload.reference}`];

  if (payload.scheduledDate) {
    const date = formatCalendarDate(payload.scheduledDate, locale);
    const time = payload.scheduledTime ? ` · ${formatClockTime(payload.scheduledTime)}` : "";
    facts.push(`${copy.labels.date}: ${date}${time}`);
  }

  facts.push(`${copy.labels.total}: ${formatCurrency(payload.totalGross, locale)}`);

  // Shown only when it is money the customer still owes — a zero deposit is a
  // line that raises a question rather than answering one.
  if (payload.depositAmount && Number.parseFloat(payload.depositAmount) > 0) {
    facts.push(`${copy.labels.deposit}: ${formatCurrency(payload.depositAmount, locale)}`);
  }

  if (payload.cancellationFee && Number.parseFloat(payload.cancellationFee) > 0) {
    facts.push(`${copy.labels.fee}: ${formatCurrency(payload.cancellationFee, locale)}`);
  }

  blocks.push({ lines: facts });

  if (copy.next) blocks.push({ paragraph: copy.next });

  if (payload.url && copy.button) {
    blocks.push({ button: { label: copy.button, url: payload.url } });
  }

  const layout: LayoutInput = {
    locale,
    heading: copy.heading,
    blocks,
    // Not "requested from your account" — this follows from a booking.
    reason: "transaction",
    ...(copy.notice ? { notice: copy.notice } : {}),
  };

  return {
    subject: copy.subject(payload.reference),
    html: renderHtml(layout),
    text: renderText(layout),
  };
}

const GREETINGS: Record<Locale, (name: string) => string> = {
  de: (n) => `Hallo ${n},`,
  en: (n) => `Hello ${n},`,
  ar: (n) => `مرحباً ${n}،`,
  tr: (n) => `Merhaba ${n},`,
};

function greeting(name: string, locale: Locale): string {
  return GREETINGS[locale](name);
}
