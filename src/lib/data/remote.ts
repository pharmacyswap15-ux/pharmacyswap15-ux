import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateListingInput,
  Listing,
  ListingView,
  Pharmacy,
  PharmacyRegistrationInput,
  ProposalView,
  SwapProposal,
} from "@/lib/types";

type Row = Record<string, any>;

export function remoteEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function publicClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;

  return createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

let serviceClient: SupabaseClient | null = null;

function admin(): SupabaseClient | null {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || (!serviceKey && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    return null;
  }

  serviceClient = createClient(
    url,
    serviceKey ?? (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return serviceClient;
}

function requireAdminClient(): SupabaseClient {
  const client = admin();
  if (!client) {
    throw new Error("Supabase admin client is unavailable. Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.");
  }
  return client;
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown Supabase error"}`);
}

export function toPharmacy(row: Row): Pharmacy {
  return {
    id: row.id,
    user_id: row.user_id ?? null,
    pharmacy_name: row.pharmacy_name,
    owner_name: row.owner_name,
    phone: row.phone,
    email: row.email ?? null,
    governorate_id: Number(row.governorate_id ?? 0),
    city_id: Number(row.city_id ?? 0),
    address_details: row.address_details ?? "",
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    delivery_preferences: Array.isArray(row.delivery_preferences) ? row.delivery_preferences : [],
    is_verified: Boolean(row.is_verified),
    license_doc_url: row.license_doc_url ?? null,
    rating_avg: Number(row.rating_avg ?? 5),
    swaps_count: Number(row.swaps_count ?? 0),
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

export function toListing(row: Row): Listing {
  return {
    id: row.id,
    pharmacy_id: row.pharmacy_id,
    listing_type: row.listing_type,
    drug_name: row.drug_name,
    active_ingredient: row.active_ingredient ?? null,
    dosage_form: row.dosage_form,
    quantity: Number(row.quantity ?? 0),
    public_price_egp: Number(row.public_price_egp ?? 0),
    expiry_date: row.expiry_date ?? null,
    batch_number: row.batch_number ?? null,
    swap_preference: row.swap_preference ?? "",
    delivery_method: row.delivery_method ?? "استلام من الصيدلية",
    images: Array.isArray(row.images) ? row.images : [],
    status: row.status,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

function toProposal(row: Row): SwapProposal {
  return {
    id: row.id,
    listing_id: row.listing_id,
    proposer_pharmacy_id: row.proposer_pharmacy_id,
    offered_items: Array.isArray(row.offered_items) ? row.offered_items : [],
    offered_items_description: row.offered_items_description ?? "",
    offered_total_value_egp: Number(row.offered_total_value_egp ?? 0),
    handover_method: row.handover_method ?? "",
    notes: row.notes ?? null,
    status: row.status,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

function toListingView(row: Row): ListingView {
  const pharmacyRow = row.pharmacy ?? {};
  return {
    ...toListing(row),
    pharmacy: toPharmacy(pharmacyRow),
    governorate: pharmacyRow.governorate
      ? {
          id: Number(pharmacyRow.governorate.id),
          name_ar: pharmacyRow.governorate.name_ar,
          name_en: pharmacyRow.governorate.name_en,
        }
      : null,
    city: pharmacyRow.city
      ? {
          id: Number(pharmacyRow.city.id),
          governorate_id: Number(pharmacyRow.city.governorate_id),
          name_ar: pharmacyRow.city.name_ar,
          name_en: pharmacyRow.city.name_en,
        }
      : null,
  };
}

const LISTING_SELECT =
  "*, pharmacy:pharmacies(*, governorate:governorates(*), city:cities(*))";

export async function remoteListListingViews(): Promise<ListingView[]> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient
    .from("listings")
    .select(LISTING_SELECT)
    .order("created_at", { ascending: false });
  if (error) fail("load listings", error);
  return (data ?? []).map((row) => toListingView(row as Row));
}

export async function remoteGetListingView(id: string): Promise<ListingView | null> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("load listing", error);
  return data ? toListingView(data as Row) : null;
}

export async function remoteListPharmacies(): Promise<Pharmacy[]> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient.from("pharmacies").select("*");
  if (error) fail("load pharmacies", error);
  return (data ?? []).map((row) => toPharmacy(row as Row));
}

export async function remoteGetPharmacy(id: string): Promise<Pharmacy | null> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient.from("pharmacies").select("*").eq("id", id).maybeSingle();
  if (error) fail("load pharmacy", error);
  return data ? toPharmacy(data as Row) : null;
}

export async function remoteCreatePharmacy(
  pharmacy: Omit<Pharmacy, "id" | "created_at"> & { id?: string; created_at?: string },
): Promise<Pharmacy> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient.from("pharmacies").insert(pharmacy).select("*").single();
  if (error) fail("create pharmacy", error);
  return toPharmacy(data as Row);
}

export async function remoteUpdatePharmacy(
  id: string,
  patch: Partial<Pharmacy>,
): Promise<Pharmacy | null> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient
    .from("pharmacies")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) fail("update pharmacy", error);
  return data ? toPharmacy(data as Row) : null;
}

export async function remoteCreateListing(
  pharmacyId: string,
  input: CreateListingInput,
): Promise<Listing> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient
    .from("listings")
    .insert({
      pharmacy_id: pharmacyId,
      listing_type: input.listing_type,
      drug_name: input.drug_name,
      active_ingredient: input.active_ingredient || null,
      dosage_form: input.dosage_form,
      quantity: input.quantity,
      public_price_egp: input.public_price_egp,
      expiry_date: input.expiry_date,
      batch_number: input.batch_number || null,
      swap_preference: input.swap_preference,
      delivery_method: input.delivery_method,
      images: input.images.slice(0, 3),
      status: "ACTIVE",
    })
    .select("*")
    .single();
  if (error) fail("create listing", error);
  return toListing(data as Row);
}

export async function remoteUpdateListing(
  id: string,
  patch: Partial<Listing>,
): Promise<void> {
  const adminClient = requireAdminClient();
  const { error } = await adminClient.from("listings").update(patch).eq("id", id);
  if (error) fail("update listing", error);
}

export async function remoteListProposalViews(): Promise<ProposalView[]> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient
    .from("swap_proposals")
    .select("*, listing:listings(*, pharmacy:pharmacies(*, governorate:governorates(*), city:cities(*))), proposer:pharmacies(*)")
    .order("created_at", { ascending: false });
  if (error) fail("load proposals", error);
  return (data ?? []).map((row) => {
    const record = row as Row;
    return {
      ...toProposal(record),
      listing: toListingView(record.listing ?? {}),
      proposer: toPharmacy(record.proposer ?? {}),
    };
  });
}

export async function remoteCreateProposal(
  pharmacyId: string,
  proposal: Omit<SwapProposal, "id" | "created_at" | "proposer_pharmacy_id">,
): Promise<SwapProposal> {
  const adminClient = requireAdminClient();
  const { data, error } = await adminClient
    .from("swap_proposals")
    .insert({ ...proposal, proposer_pharmacy_id: pharmacyId })
    .select("*")
    .single();
  if (error) fail("create proposal", error);
  return toProposal(data as Row);
}

export async function remoteUpdateProposal(
  id: string,
  patch: Partial<SwapProposal>,
): Promise<void> {
  const adminClient = requireAdminClient();
  const { error } = await adminClient.from("swap_proposals").update(patch).eq("id", id);
  if (error) fail("update proposal", error);
}

export async function remoteAuthenticate(email: string, password: string): Promise<string | null> {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;

  const anon = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;

  const adminClient = admin();
  if (!adminClient) return null;

  const { data: pharmacy, error: pharmacyError } = await adminClient
    .from("pharmacies")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (pharmacyError) fail("load pharmacy for user", pharmacyError);
  return pharmacy?.id ?? null;
}

export async function remoteRegisterPharmacy(
  input: PharmacyRegistrationInput,
): Promise<Pharmacy | null> {
  const redirectTo = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!redirectTo) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL must be set before email verification redirects can be created.",
    );
  }

  const authClient = publicClient();
  if (!authClient) {
    throw new Error("Supabase public client is not configured.");
  }

  const emailRedirectTo = new URL("/auth/callback", redirectTo).toString();

  const { data, error } = await authClient.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo,
      data: {
        pharmacy_name: input.pharmacy_name,
        owner_name: input.owner_name,
        phone: input.phone,
        governorate_id: input.governorate_id,
        city_id: input.city_id,
        address_details: input.address_details,
        latitude: input.latitude,
        longitude: input.longitude,
        delivery_preferences: input.delivery_preferences,
      },
    },
  });

  if (error || !data.user) {
    fail("create auth user", error ? { message: error.message } : null);
  }

  const adminClient = admin();
  if (!adminClient) {
    return null;
  }

  const { data: existingPharmacy } = await adminClient
    .from("pharmacies")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (existingPharmacy) {
    return toPharmacy(existingPharmacy as Row);
  }

  return null;
}
