import { AppShell } from "@/components/shell/app-shell";
import { cityName, governorateName } from "@/lib/constants";
import { getProposalViews, remoteEnabled } from "@/lib/data";
import { cities, governorates } from "@/lib/geo";
import { getCurrentPharmacy } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const pharmacy = await getCurrentPharmacy();

  let pendingCount = 0;
  if (pharmacy) {
    const proposals = await getProposalViews();
    pendingCount = proposals.filter(
      (proposal) =>
        proposal.listing.pharmacy_id === pharmacy.id && proposal.status === "PENDING",
    ).length;
  }

  return (
    <AppShell
      pharmacy={
        pharmacy
          ? {
              id: pharmacy.id,
              pharmacy_name: pharmacy.pharmacy_name,
              owner_name: pharmacy.owner_name,
              is_verified: pharmacy.is_verified,
              governorate: governorateName(governorates, pharmacy.governorate_id),
              city: cityName(cities, pharmacy.city_id),
            }
          : null
      }
      pendingCount={pendingCount}
      localMode={!remoteEnabled()}
    >
      {children}
    </AppShell>
  );
}
