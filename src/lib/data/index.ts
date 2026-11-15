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
  if (remote.remoteEnabled()) return remote.remoteListListingViews();
  const [listings, pharmacies] = await Promise.all([local.listListings(), local.listPharmacies()]);
  return decorateListings(listings, pharmacies);
}

export async function getListingView(id: string): Promise<ListingView | null> {
  if (remote.remoteEnabled()) return remote.remoteGetListingView(id);
  const listing = await local.getListing(id);
  if (!listing) return null;
  const pharmacy = await local.getPharmacy(listing.pharmacy_id);
  return decorateListings([listing], pharmacy ? [pharmacy] : [])[0] ?? null;
}

export async function getPharmacyById(id: string): Promise<Pharmacy | null> {
  if (remote.remoteEnabled()) return remote.remoteGetPharmacy(id);
  return local.getPharmacy(id);
}

export async function getAllPharmacies(): Promise<Pharmacy[]> {
  if (remote.remoteEnabled()) return remote.remoteListPharmacies();
  return local.listPharmacies();
}

export async function getProposalViews(): Promise<ProposalView[]> {
  if (remote.remoteEnabled()) return remote.remoteListProposalViews();
  const [proposals, listings, pharmacies] = await Promise.all([
    local.listProposals(),
    local.listListings(),
    local.listPharmacies(),
  ]);
  const listingViews = decorateListings(listings, pharmacies);
  const byListing = new Map(listingViews.map((listing) => [listing.id, listing]));
  const byId = new Map(pharmacies.map((pharmacy) => [pharmacy.id, pharmacy]));

  return proposals
    .map((proposal) => {
      const listing = byListing.get(proposal.listing_id);
      if (!listing) return null;
      return {
        ...proposal,
        listing,
        proposer: byId.get(proposal.proposer_pharmacy_id) ?? PLACEHOLDER_PHARMACY,
      } satisfies ProposalView;
    })
    .filter((proposal): proposal is ProposalView => proposal !== null);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

export async function createListingRecord(
  pharmacyId: string,
  input: CreateListingInput,
): Promise<Listing> {
  if (remote.remoteEnabled()) return remote.remoteCreateListing(pharmacyId, input);

  return local.createListing({
    id: local.newId("lst"),
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
    created_at: new Date().toISOString(),
  });
}

export async function setListingStatus(id: string, status: ListingStatus): Promise<void> {
  if (remote.remoteEnabled()) {
    await remote.remoteUpdateListing(id, { status });
    return;
  }
  await local.updateListing(id, { status });
}

export async function createProposalRecord(
  pharmacyId: string,
  input: CreateProposalInput,
): Promise<SwapProposal> {
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

  if (remote.remoteEnabled()) {
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

  return local.createProposal({
    id: local.newId("prop"),
    listing_id: input.listing_id,
    proposer_pharmacy_id: pharmacyId,
    offered_items: offeredItems,
    offered_items_description: description,
    offered_total_value_egp: total,
    handover_method: input.handover_method,
    notes: input.notes || null,
    status: "PENDING",
    created_at: new Date().toISOString(),
  });
}

export async function setProposalStatus(id: string, status: ProposalStatus): Promise<void> {
  if (remote.remoteEnabled()) {
    await remote.remoteUpdateProposal(id, { status });
    return;
  }
  const proposal = await local.getProposal(id);
  if (!proposal) return;

  await local.updateProposal(id, { status });

  if (status === "ACCEPTED") {
    await local.updateListing(proposal.listing_id, { status: "RESERVED" });
    const siblings = await local.listProposals();
    for (const sibling of siblings) {
      if (
        sibling.listing_id === proposal.listing_id &&
        sibling.id !== proposal.id &&
        sibling.status === "PENDING"
      ) {
        await local.updateProposal(sibling.id, { status: "REJECTED" });
      }
    }
  }

  if (status === "COMPLETED") {
    await local.updateListing(proposal.listing_id, { status: "COMPLETED" });
    const listing = await local.getListing(proposal.listing_id);
    if (listing) {
      const owner = await local.getPharmacy(listing.pharmacy_id);
      const proposer = await local.getPharmacy(proposal.proposer_pharmacy_id);
      if (owner) await local.updatePharmacy(owner.id, { swaps_count: owner.swaps_count + 1 });
      if (proposer)
        await local.updatePharmacy(proposer.id, { swaps_count: proposer.swaps_count + 1 });
    }
  }
}

export async function updatePharmacyRecord(
  id: string,
  patch: Partial<Pharmacy>,
): Promise<Pharmacy | null> {
  if (remote.remoteEnabled()) return remote.remoteUpdatePharmacy(id, patch);
  return local.updatePharmacy(id, patch);
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export async function authenticatePharmacy(
  email: string,
  password: string,
): Promise<string | null> {
  if (remote.remoteEnabled()) return remote.remoteAuthenticate(email, password);

  const account = await local.findAccount(email);
  if (!account) return null;
  if (!local.verifyPasswordHash(password, account.password_hash)) return null;
  return account.pharmacy_id;
}

export async function registerPharmacyRecord(
  input: PharmacyRegistrationInput,
): Promise<Pharmacy | null> {
  if (remote.remoteEnabled()) {
    return remote.remoteRegisterPharmacy(input);
  }

  const existing = await local.findAccount(input.email);
  if (existing) return null;

  const pharmacy = await local.createPharmacy({
    id: local.newId("ph"),
    pharmacy_name: input.pharmacy_name,
    owner_name: input.owner_name,
    phone: input.phone,
    email: input.email,
    governorate_id: input.governorate_id,
    city_id: input.city_id,
    address_details: input.address_details,
    latitude: input.latitude,
    longitude: input.longitude,
    delivery_preferences: input.delivery_preferences,
    is_verified: false,
    rating_avg: 5,
    swaps_count: 0,
    created_at: new Date().toISOString(),
  });

  await local.createAccount({
    email: input.email.trim().toLowerCase(),
    password_hash: local.hashPassword(input.password),
    pharmacy_id: pharmacy.id,
  });

  return pharmacy;
}
