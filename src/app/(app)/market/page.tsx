import type { Metadata } from "next";

import { MarketView } from "@/components/market/market-view";
import { getListingViews } from "@/lib/data";
import { catalogSize } from "@/lib/drugs/local-catalog";
import { cities, governorates } from "@/lib/geo";
import { getSessionPharmacyId } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "السوق الحي — تبادل الأدوية قرب الانتهاء والرواكد",
  description:
    "تصفح عروض الأدوية قرب الانتهاء والرواكد وطلبات النواقص من الصيدليات المصرية المرخصة حسب المحافظة والمدينة وطريقة التسليم.",
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; tab?: string }>;
}) {
  const [listings, pharmacyId, params] = await Promise.all([
    getListingViews(),
    getSessionPharmacyId(),
    searchParams,
  ]);

  return (
    <MarketView
      listings={listings}
      governorates={governorates}
      cities={cities}
      currentPharmacyId={pharmacyId}
      showWelcome={params.welcome === "1"}
      catalogSize={catalogSize()}
    />
  );
}
