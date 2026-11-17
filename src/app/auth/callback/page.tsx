import { redirect } from "next/navigation";

import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; token_hash?: string; next?: string }>;
}) {
  const params = await searchParams;
  const code = params.code;
  const tokenHash = params.token_hash;
  const next = params.next && params.next.startsWith("/") ? params.next : "/login?verified=1";

  if (!code && !tokenHash) {
    redirect("/login?error=missing_auth_code");
  }

  const supabase = createServerSupabaseClient();

  try {
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.user) {
        redirect("/login?error=auth_callback_failed");
      }
    }

    if (tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (error || !data.user) {
        redirect("/login?error=auth_callback_failed");
      }
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      redirect("/login?error=auth_callback_failed");
    }

    const adminClient = createAdminSupabaseClient();
    const metadata = userData.user.user_metadata ?? {};
    const pharmacyPayload = {
      user_id: userData.user.id,
      pharmacy_name: metadata.pharmacy_name ?? "صيدلية جديدة",
      owner_name: metadata.owner_name ?? "صيدلي",
      phone: metadata.phone ?? "",
      governorate_id: Number(metadata.governorate_id ?? 0),
      city_id: Number(metadata.city_id ?? 0),
      address_details: metadata.address_details ?? "",
      latitude: metadata.latitude ?? null,
      longitude: metadata.longitude ?? null,
      delivery_preferences: Array.isArray(metadata.delivery_preferences)
        ? metadata.delivery_preferences
        : ["استلام من الصيدلية"],
      is_verified: true,
    };

    const { data: existingPharmacy } = await adminClient
      .from("pharmacies")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!existingPharmacy) {
      const { error: insertError } = await adminClient.from("pharmacies").insert(pharmacyPayload);
      if (insertError) {
        redirect("/login?error=pharmacy_profile_creation_failed");
      }
    }
  } catch {
    redirect("/login?error=auth_callback_failed");
  }

  redirect(next);
}
