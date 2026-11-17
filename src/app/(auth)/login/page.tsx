import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { remoteEnabled } from "@/lib/data";
import { getSessionPharmacyId } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دخول الصيدليات",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; verified?: string }>;
}) {
  const pharmacyId = await getSessionPharmacyId();
  if (pharmacyId) redirect("/market");

  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/market";

  return (
    <LoginForm
      next={next}
      localMode={!remoteEnabled()}
      error={params.error}
      verified={params.verified === "1"}
    />
  );
}
