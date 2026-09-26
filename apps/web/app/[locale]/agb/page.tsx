import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { LegalPage } from "@/app/components/site/LegalPage";

export const metadata: Metadata = {
  title: "AGB — m.on",
};

export default async function Page({ params }: { params: { locale: Locale } }) {
  return <LegalPage locale={params.locale} section="page-terms" />;
}
