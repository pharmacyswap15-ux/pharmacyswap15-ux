export type ListingType = "NEAR_EXPIRY" | "DEAD_STOCK" | "SHORTAGE_REQUEST";
export type DosageForm = "TABLETS" | "SYRUP" | "INJECTION" | "CREAM" | "DROPS" | "OTHER";
export type ListingStatus = "ACTIVE" | "RESERVED" | "COMPLETED" | "CANCELLED";
export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COMPLETED";

export interface Governorate {
  id: number;
  name_ar: string;
  name_en: string;
}

export interface City {
  id: number;
  governorate_id: number;
  name_ar: string;
  name_en: string;
}

export interface Pharmacy {
  id: string;
  user_id?: string | null;
  pharmacy_name: string;
  owner_name: string;
  phone: string;
  email?: string | null;
  governorate_id: number;
  city_id: number;
  address_details: string;
  latitude: number | null;
  longitude: number | null;
  delivery_preferences: string[];
  is_verified: boolean;
  license_doc_url?: string | null;
  rating_avg: number;
  swaps_count: number;
  created_at: string;
}

export interface Listing {
  id: string;
  pharmacy_id: string;
  listing_type: ListingType;
  drug_name: string;
  active_ingredient: string | null;
  dosage_form: DosageForm;
  quantity: number;
  public_price_egp: number;
  expiry_date: string | null;
  batch_number: string | null;
  swap_preference: string;
  delivery_method: string;
  images: string[];
  status: ListingStatus;
  created_at: string;
}

export interface OfferedItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface SwapProposal {
  id: string;
  listing_id: string;
  proposer_pharmacy_id: string;
  offered_items: OfferedItem[];
  offered_items_description: string;
  offered_total_value_egp: number;
  handover_method: string;
  notes: string | null;
  status: ProposalStatus;
  created_at: string;
}

export interface ListingView extends Listing {
  pharmacy: Pharmacy;
  governorate: Governorate | null;
  city: City | null;
}

export interface ProposalView extends SwapProposal {
  listing: ListingView;
  proposer: Pharmacy;
}

export interface CreateListingInput {
  listing_type: ListingType;
  drug_name: string;
  active_ingredient: string;
  dosage_form: DosageForm;
  quantity: number;
  public_price_egp: number;
  expiry_date: string | null;
  batch_number: string;
  swap_preference: string;
  delivery_method: string;
  images: string[];
}

export interface CreateProposalInput {
  listing_id: string;
  offered_items: OfferedItem[];
  handover_method: string;
  notes: string;
}

export interface PharmacyRegistrationInput {
  pharmacy_name: string;
  owner_name: string;
  phone: string;
  email: string;
  password: string;
  governorate_id: number;
  city_id: number;
  address_details: string;
  latitude: number | null;
  longitude: number | null;
  delivery_preferences: string[];
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface MarketListing extends ListingView {
  distanceKm?: number | null;
}
