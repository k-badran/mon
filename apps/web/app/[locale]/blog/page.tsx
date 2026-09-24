import { permanentRedirect } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";

/**
 * The guide index lives at /ratgeber.
 *
 * Kept as a redirect rather than removed: "page-blog" is the frame's own name
 * and the English word is what a visitor reading the English site would try,
 * so the path stays reachable. 308 rather than a second copy of the page, so
 * the guide keeps one canonical URL instead of two addresses serving identical
 * content — and so the footer link, which points at /ratgeber, costs no hop.
 */
export default function BlogRedirect({ params }: { params: { locale: Locale } }) {
  permanentRedirect(`/${params.locale}/ratgeber`);
}
