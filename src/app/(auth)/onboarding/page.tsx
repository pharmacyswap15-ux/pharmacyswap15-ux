import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { remoteEnabled } from "@/lib/data";
import { cities, governorates } from "@/lib/geo";
import { getSessionPharmacyId } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "إنشاء ملف صيدلية",
};

export default async function OnboardingPage() {
  const pharmacyId = await getSessionPharmacyId();
  if (pharmacyId) redirect("/market");

  return (
    <OnboardingForm
      governorates={governorates}
      cities={cities}
      localMode={!remoteEnabled()}
    />
  );
}
