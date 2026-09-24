import { permanentRedirect } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";

/**
 * The guide index moved to /blog.
 *
 * Kept as a redirect rather than removed: this path was already being served,
 * and the German nav label ("Ratgeber") makes it the URL a visitor is most
 * likely to guess. 308 rather than a rendered copy so the page keeps a single
 * canonical URL instead of two addresses serving identical content.
 */
export default function GuideRedirect({ params }: { params: { locale: Locale } }) {
  permanentRedirect(`/${params.locale}/blog`);
}
