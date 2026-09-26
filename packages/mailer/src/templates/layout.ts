import { directionOf, type Locale } from "@mon/core";

import { escapeHtml, safeUrl, sanitizeUrl, tidyText } from "../render.js";

/**
 * The shared chrome every email is rendered into.
 *
 * Email HTML is not web HTML. Outlook renders with Word's engine, Gmail strips
 * `<style>` blocks in some clients and most of `position`/`flex` everywhere, so
 * this is a table with inline styles on purpose rather than out of neglect. The
 * one `<style>` block carries only progressive enhancement — a client that
 * drops it still gets a correct, readable message.
 */

/** Mirrors `color.brand` in `packages/db/src/site-defaults.ts`. */
const BRAND = "#D71635";
const INK = "#121214";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const CANVAS = "#F8F9FA";

/**
 * Why the recipient is getting this.
 *
 * Two kinds, because one sentence cannot cover both. An OTP or a reset link was
 * *asked for*, and saying so is what lets someone who did not ask recognise that
 * something is wrong. An order confirmation was not asked for — it follows from
 * a booking — and telling a customer it "was requested from your account" reads
 * as a mistake and invites a support call.
 */
export type FooterReason = "requested" | "transaction";

interface FooterCopy {
  requested: string;
  transaction: string;
  help: string;
}

const FOOTER: Record<Locale, FooterCopy> = {
  de: {
    requested: "Sie erhalten diese E-Mail, weil sie in Ihrem m.on-Konto angefordert wurde.",
    transaction: "Sie erhalten diese E-Mail zu Ihrem Auftrag bei m.on.",
    help: "Fragen? Antworten Sie einfach auf diese E-Mail.",
  },
  en: {
    requested: "You are receiving this email because it was requested from your m.on account.",
    transaction: "You are receiving this email about your order with m.on.",
    help: "Questions? Just reply to this email.",
  },
  ar: {
    requested: "وصلتك هذه الرسالة لأنه تم طلبها من حسابك في m.on.",
    transaction: "وصلتك هذه الرسالة بخصوص طلبك عند m.on.",
    help: "عندك سؤال؟ رد على هذه الرسالة مباشرة.",
  },
  tr: {
    requested: "Bu e-postayı m.on hesabınızdan talep edildiği için alıyorsunuz.",
    transaction: "Bu e-postayı m.on'daki siparişinizle ilgili alıyorsunuz.",
    help: "Sorunuz mu var? Bu e-postayı doğrudan yanıtlayın.",
  },
};

const LEGAL_NAME = "m.on GmbH";
const LEGAL_ADDRESS = "Musterstraße 1, 40212 Düsseldorf";

export interface LayoutBlock {
  /** A paragraph of body copy. Escaped. */
  paragraph?: string | undefined;
  /**
   * A short list of labelled facts, one per line.
   *
   * Its own block type rather than newlines inside a paragraph: HTML collapses
   * a newline to a space, so "Reference: X\nDate: Y" would render as one run-on
   * line in the email while looking correct in the plain-text twin — a
   * difference nobody notices until a customer forwards the HTML one.
   */
  lines?: readonly string[] | undefined;
  /** A large, letter-spaced code — the OTP treatment. */
  code?: string | undefined;
  /** A call-to-action button. */
  button?: { label: string; url: string } | undefined;
  /** The raw URL under a button, for clients that will not render the link. */
  fallbackUrl?: { label: string; url: string } | undefined;
}

export interface LayoutInput {
  locale: Locale;
  /** The `<h1>`. Distinct from the subject: the subject competes in a list. */
  heading: string;
  blocks: LayoutBlock[];
  /**
   * Shown in muted type under the body — the "this expires in 10 minutes" or
   * "if you did not request this, ignore it" line.
   */
  notice?: string | undefined;
  /** Defaults to "requested", which is right for the account flows. */
  reason?: FooterReason | undefined;
}

export function renderHtml(input: LayoutInput): string {
  const dir = directionOf(input.locale);
  const footer = FOOTER[input.locale];
  const reason = footer[input.reason ?? "requested"];
  const align = dir === "rtl" ? "right" : "left";

  const body = input.blocks.map((block) => renderBlock(block, align)).join("\n");

  const notice = input.notice
    ? `<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:${MUTED};text-align:${align};">${escapeHtml(input.notice)}</p>`
    : "";

  // `lang` and `dir` on <html> are what make an Arabic email read right in
  // every client; setting them on an inner div is too late for some of them.
  return `<!doctype html>
<html lang="${input.locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(input.heading)}</title>
<style>
  @media (max-width:600px){
    .up-card{padding:24px !important}
    .up-code{font-size:30px !important;letter-spacing:6px !important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CANVAS};">
<!-- Preheader: the grey line a client shows next to the subject. Kept in sync
     with the heading so an inbox list never shows leaked body markup. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.heading)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr>
          <td style="padding:0 0 20px;text-align:${align};">
            <span style="font:700 20px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND};letter-spacing:-0.3px;">m.on</span>
          </td>
        </tr>
        <tr>
          <td class="up-card" style="background:#FFFFFF;border:1px solid ${BORDER};border-radius:12px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
            <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:${INK};text-align:${align};">${escapeHtml(input.heading)}</h1>
            ${body}
            ${notice}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 8px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:19px;color:${MUTED};text-align:${align};">
            <p style="margin:0 0 6px;">${escapeHtml(footer.help)}</p>
            <p style="margin:0 0 6px;">${escapeHtml(reason)}</p>
            <p style="margin:0;">${escapeHtml(LEGAL_NAME)} · ${escapeHtml(LEGAL_ADDRESS)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function renderBlock(block: LayoutBlock, align: string): string {
  if (block.paragraph !== undefined) {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK};text-align:${align};">${escapeHtml(block.paragraph)}</p>`;
  }

  if (block.lines !== undefined) {
    const rows = block.lines
      .map(
        (line) =>
          `<tr><td style="padding:4px 0;font-size:15px;line-height:22px;color:${INK};text-align:${align};">${escapeHtml(line)}</td></tr>`,
      )
      .join("");

    // A table, because a stack of <div>s with margins is the thing Outlook's
    // renderer collapses, and these lines carry the price and the date.
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${CANVAS};border:1px solid ${BORDER};border-radius:10px;padding:12px 16px;">${rows}</table>`;
  }

  if (block.code !== undefined) {
    // `dir="ltr"` even in an Arabic email: a one-time code is a sequence of
    // digits read left to right, and letting an RTL context reorder it hands
    // the customer a code that does not work.
    return `<p dir="ltr" style="margin:0 0 16px;text-align:center;"><span class="up-code" style="display:inline-block;padding:16px 28px;background:${CANVAS};border:1px solid ${BORDER};border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:9px;color:${INK};">${escapeHtml(block.code)}</span></p>`;
  }

  if (block.button) {
    return `<p style="margin:0 0 16px;text-align:center;"><a href="${safeUrl(block.button.url)}" style="display:inline-block;padding:13px 26px;background:${BRAND};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(block.button.label)}</a></p>`;
  }

  if (block.fallbackUrl) {
    return `<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${MUTED};text-align:${align};">${escapeHtml(block.fallbackUrl.label)}<br><span style="color:${INK};word-break:break-all;">${escapeHtml(sanitizeUrl(block.fallbackUrl.url))}</span></p>`;
  }

  return "";
}

/**
 * The plain-text twin of the same blocks.
 *
 * Built from the identical block list rather than written separately, because
 * two hand-maintained bodies drift — and the one nobody looks at is the text
 * one, which is exactly the one a spam filter reads.
 */
export function renderText(input: LayoutInput): string {
  const footer = FOOTER[input.locale];
  const reason = footer[input.reason ?? "requested"];

  const body = input.blocks
    .map((block) => {
      if (block.paragraph !== undefined) return block.paragraph;
      if (block.lines !== undefined) return block.lines.join("\n");
      if (block.code !== undefined) return block.code;
      if (block.button) return `${block.button.label}: ${sanitizeUrl(block.button.url)}`;
      if (block.fallbackUrl) {
        return `${block.fallbackUrl.label}\n${sanitizeUrl(block.fallbackUrl.url)}`;
      }
      return "";
    })
    .filter((line) => line.length > 0)
    .join("\n\n");

  return tidyText(
    [
      input.heading,
      "",
      body,
      input.notice ? `\n${input.notice}` : "",
      "",
      "—",
      footer.help,
      reason,
      `${LEGAL_NAME} · ${LEGAL_ADDRESS}`,
    ].join("\n"),
  );
}
