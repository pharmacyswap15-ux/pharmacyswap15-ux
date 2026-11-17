import "server-only";

import { cities, governorates } from "@/lib/geo";
import type {
  CreateListingInput,
  CreateProposalInput,
  Listing,
  ListingStatus,
  ListingView,
  Pharmacy,
  PharmacyRegistrationInput,
  ProposalStatus,
  ProposalView,
  SwapProposal,
} from "@/lib/types";

import * as local from "./local";
import * as remote from "./remote";

export { remoteEnabled } from "./remote";

const PLACEHOLDER_PHARMACY: Pharmacy = {
  id: "unknown",
  pharmacy_name: "صيدلية غير معروفة",
  owner_name: "—",
  phone: "00000000000",
  governorate_id: 0,
  city_id: 0,
  address_details: "—",
  latitude: null,
  longitude: null,
  delivery_preferences: [],
  is_verified: false,
  rating_avg: 0,
  swaps_count: 0,
  created_at: new Date(0).toISOString(),
};

export function decorateListings(listings: Listing[], pharmacies: Pharmacy[]): ListingView[] {
  const byId = new Map(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));
  return listings.map((listing) => {
    const pharmacy = byId.get(listing.pharmacy_id) ?? PLACEHOLDER_PHARMACY;
    return {
      ...listing,
      pharmacy,
      governorate: governorates.find((g) => g.id === pharmacy.governorate_id) ?? null,
      city: cities.find((c) => c.id === pharmacy.city_id) ?? null,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export async function getListingViews(): Promise<ListingView[]> {
  if (!remote.remoteEnabled()) {
    console.warn("[pharmaswap] Supabase not configured; returning empty listings list.");
    return [];
  }

  try {
    return await remote.remoteListListingViews();
  } catch (error) {
    console.error("[pharmaswap] remote listings unavailable.", error);
    return [];
  }
}

export async function getListingView(id: string): Promise<ListingView | null> {
  if (!remote.remoteEnabled()) {
    console.warn("[pharmaswap] Supabase not configured; listing lookup unavailable.");
    return null;
  }

  try {
    return await remote.remoteGetListingView(id);
  } catch (error) {
    console.error("[pharmaswap] remote listing unavailable.", error);
    return null;
  }
}

export async function getPharmacyById(id: string): Promise<Pharmacy | null> {
  if (!remote.remoteEnabled()) {
    console.warn("[pharmaswap] Supabase not configured; no pharmacy lookup available.");
    return null;
  }

  try {
    return await remote.remoteGetPharmacy(id);
  } catch (error) {
    console.error("[pharmaswap] remote pharmacy unavailable.", error);
    return null;
  }
}

export async function getAllPharmacies(): Promise<Pharmacy[]> {
  if (!remote.remoteEnabled()) {
    console.warn("[pharmaswap] Supabase not configured; returning empty pharmacy list.");
    return [];
  }

  try {
    return await remote.remoteListPharmacies();
  } catch (error) {
    console.error("[pharmaswap] remote pharmacies unavailable.", error);
    return [];
  }
}

export async function getProposalViews(): Promise<ProposalView[]> {
  if (!remote.remoteEnabled()) {
    console.warn("[pharmaswap] Supabase not configured; proposal list is empty.");
    return [];
  }

  try {
    return await remote.remoteListProposalViews();
  } catch (error) {
    console.error("[pharmaswap] remote proposals unavailable.", error);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

export async function createListingRecord(
  pharmacyId: string,
  input: CreateListingInput,
): Promise<Listing> {
  if (!remote.remoteEnabled()) {
    throw new Error("Supabase is not configured; listing creation is unavailable.");
  }

  return remote.remoteCreateListing(pharmacyId, input);
}

export async function setListingStatus(id: string, status: ListingStatus): Promise<void> {
  if (!remote.remoteEnabled()) {
    throw new Error("Supabase is not configured; listing status updates are unavailable.");
  }

  await remote.remoteUpdateListing(id, { status });
}

export async function createProposalRecord(
  pharmacyId: string,
  input: CreateProposalInput,
): Promise<SwapProposal> {
  if (!remote.remoteEnabled()) {
    throw new Error("Supabase is not configured; proposal creation is unavailable.");
  }

  const offeredItems = input.offered_items
    .map((item) => ({
      name: item.name.trim(),
      quantity: Math.max(1, Math.round(item.quantity)),
      unit_price: Math.max(0, Number(item.unit_price) || 0),
    }))
    .filter((item) => item.name.length > 0);

  const total =
    Math.round(offeredItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) * 100) /
    100;

  const description = offeredItems
    .map((item) => `${item.quantity} × ${item.name} (${item.unit_price.toFixed(2)} ج.م)`)
    .join(" + ");

  return remote.remoteCreateProposal(pharmacyId, {
    listing_id: input.listing_id,
    offered_items: offeredItems,
    offered_items_description: description,
    offered_total_value_egp: total,
    handover_method: input.handover_method,
    notes: input.notes || null,
    status: "PENDING",
  });
}

export async function setProposalStatus(id: string, status: ProposalStatus): Promise<void> {
  if (!remote.remoteEnabled()) {
    throw new Error("Supabase is not configured; proposal status updates are unavailable.");
  }

  await remote.remoteUpdateProposal(id, { status });
}

export async function updatePharmacyRecord(
  id: string,
  patch: Partial<Pharmacy>,
): Promise<Pharmacy | null> {
  if (!remote.remoteEnabled()) {
    throw new Error("Supabase is not configured; pharmacy updates are unavailable.");
  }

  return remote.remoteUpdatePharmacy(id, patch);
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export async function authenticatePharmacy(
  email: string,
  password: string,
): Promise<string | null> {
  if (!remote.remoteEnabled()) {
    console.warn("[pharmaswap] Supabase is not configured; authentication is unavailable.");
    return null;
  }

  try {
    return await remote.remoteAuthenticate(email, password);
  } catch (error) {
    console.error("[pharmaswap] remote auth failed.", error);
    return null;
  }
}

export async function registerPharmacyRecord(
  input: PharmacyRegistrationInput,
): Promise<Pharmacy | null> {
  if (!remote.remoteEnabled()) {
    console.warn("[pharmaswap] Supabase is not configured; registration is disabled.");
    return null;
  }

  try {
    return await remote.remoteRegisterPharmacy(input);
  } catch (error) {
    console.error("[pharmaswap] remote pharmacy registration failed.", error);
    return null;
  }
}
