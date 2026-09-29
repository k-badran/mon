/**
 * The smallest rendering layer that is still safe.
 *
 * There is deliberately no template engine here. Every value these emails
 * interpolate is a name, a six-digit code or a URL this codebase built, so the
 * work is escaping and string joining — and a dependency that parses templates
 * at runtime would add a way to get HTML injection back by writing the wrong
 * kind of placeholder.
 */

/**
 * Escapes text for an HTML context.
 *
 * Applied to every interpolated value without exception, including ones that
 * "cannot" contain markup: `fullName` comes from a registration form, and an
 * email is one of the few places where a stored name is rendered as HTML and
 * then sent somewhere this application does not control.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapes a value that lands in an `href`.
 *
 * HTML-escaping alone does not make a URL safe: `javascript:` survives it
 * intact. Only the two schemes an email has any business linking to are
 * allowed, and anything else collapses to a harmless anchor rather than
 * throwing — a malformed link should not stop a password reset from being sent.
 */
export function safeUrl(value: string): string {
  return escapeHtml(sanitizeUrl(value));
}

/**
 * Reduces a URL to one that is safe to show or follow, or to "#".
 *
 * Split out from `safeUrl` because the check is needed in two places and only
 * one of them is an attribute. Emails print the destination under the button
 * for clients that will not render a link, and that copy has to go through the
 * same filter: escaping makes `javascript:alert(1)` inert as markup, but it
 * still reads as a link the recipient is being invited to paste into their
 * address bar. Escaping answers "can this run here"; this answers "should
 * anyone be handed this at all".
 */
export function sanitizeUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return "#";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "#";

  return parsed.toString();
}

/**
 * Collapses the whitespace that authoring a plain-text body in a template
 * literal introduces, without touching the blank lines that separate
 * paragraphs — those are the only structure plain text has.
 */
export function tidyText(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
