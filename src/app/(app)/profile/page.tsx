import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/profile/profile-form";
import { getListingViews, getProposalViews, remoteEnabled } from "@/lib/data";
import { cities, governorates } from "@/lib/geo";
import { getCurrentPharmacy } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ملف الصيدلية",
};

export default async function ProfilePage() {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) redirect("/login?next=/profile");

  const [listings, proposals] = await Promise.all([getListingViews(), getProposalViews()]);
  const mine = listings.filter((listing) => listing.pharmacy_id === pharmacy.id);

  return (
    <ProfileForm
      pharmacy={pharmacy}
      governorates={governorates}
      cities={cities}
      localMode={!remoteEnabled()}
      stats={{
        active: mine.filter((listing) => listing.status === "ACTIVE").length,
        incoming: proposals.filter((proposal) => proposal.listing.pharmacy_id === pharmacy.id).length,
        outgoing: proposals.filter((proposal) => proposal.proposer_pharmacy_id === pharmacy.id).length,
      }}
    />
  );
}
