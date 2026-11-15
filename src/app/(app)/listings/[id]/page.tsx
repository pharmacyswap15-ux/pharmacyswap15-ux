import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ListingDetailView } from "@/components/listings/listing-detail-view";
import { getListingView } from "@/lib/data";
import { getSessionPharmacyId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingView(id);
  if (!listing) return { title: "عرض غير موجود" };
  return {
    title: `${listing.drug_name} — ${LISTING_TITLE_BY_TYPE[listing.listing_type]}`,
    description: `${listing.drug_name} — ${listing.quantity} علبة بسعر الجمهور ${listing.public_price_egp} ج.م من ${listing.pharmacy.pharmacy_name}.`,
  };
}

const LISTING_TITLE_BY_TYPE = {
  NEAR_EXPIRY: "نير إكسباير",
  DEAD_STOCK: "رواكد",
  SHORTAGE_REQUEST: "مطلوب نواقص",
} as const;

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [listing, pharmacyId] = await Promise.all([getListingView(id), getSessionPharmacyId()]);

  if (!listing) notFound();

  return (
    <ListingDetailView
      listing={listing}
      isAuthenticated={Boolean(pharmacyId)}
      isOwner={Boolean(pharmacyId && listing.pharmacy_id === pharmacyId)}
    />
  );
}
