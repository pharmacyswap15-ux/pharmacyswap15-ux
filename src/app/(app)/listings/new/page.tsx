import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ListingForm } from "@/components/listings/listing-form";
import { cityName, governorateName } from "@/lib/constants";
import { getCatalogEntry } from "@/lib/drugs";
import { catalogSize } from "@/lib/drugs/local-catalog";
import { cities, governorates } from "@/lib/geo";
import { getCurrentPharmacy } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نشر عرض أو طلب نواقص",
};

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<{ drug?: string }>;
}) {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) redirect("/login?next=/listings/new");

  const params = await searchParams;
  const initialDrug = params.drug ? await getCatalogEntry(params.drug) : null;

  return (
    <ListingForm
      catalogSize={catalogSize()}
      initialDrug={initialDrug}
      pharmacy={{
        pharmacy_name: pharmacy.pharmacy_name,
        owner_name: pharmacy.owner_name,
        governorate: governorateName(governorates, pharmacy.governorate_id),
        city: cityName(cities, pharmacy.city_id),
        address: pharmacy.address_details,
        delivery_preferences: pharmacy.delivery_preferences,
      }}
    />
  );
}
