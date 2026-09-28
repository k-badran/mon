/**
 * Which image references the website will render from editable content.
 *
 * Photos on the public pages are `content_blocks` rows of kind "image" (and the
 * brand logo is a site setting of the same kind), so their value is typed by
 * an editor. The value lands in an `<img src>` on every page view, which makes
 * it a place a `javascript:` or `data:` payload — or an image hot-linked over
 * plain http — could reach visitors. Two shapes are accepted, nothing else:
 *
 *   - a site-relative path under `/images/`, i.e. a file shipped in
 *     `apps/web/public/images` (what every seeded default is);
 *   - an absolute `https:` URL, for an image hosted elsewhere until the
 *     dashboard has its own upload storage.
 *
 * The API enforces this on write and the website re-checks on read, so a row
 * written some other way (a script, a restore) still cannot inject a scheme.
 */

const MAX_LENGTH = 2000;

export function isSafeImageSrc(value: string): boolean {
  const src = value.trim();

  if (src.length === 0 || src.length > MAX_LENGTH) return false;

  // Whitespace and control characters inside a URL are how scheme filters get
  // slipped ("java\tscript:"); a legitimate image path never needs them.
  if (/[\s\u0000-\u001f\u007f\\]/.test(src)) return false;

  if (src.startsWith("/")) {
    // `//host/x` is protocol-relative — another origin, not a site path.
    if (src.startsWith("//")) return false;
    if (!src.startsWith("/images/")) return false;
    // No climbing out of the images folder, encoded or not.
    return !/(^|\/)\.\.(\/|$)/.test(src) && !/%2e%2e|%2f/i.test(src);
  }

  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname.length > 0 && !url.username && !url.password;
  } catch {
    return false;
  }
}
