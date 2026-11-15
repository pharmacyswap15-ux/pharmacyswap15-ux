import type { ListingType, ListingView, MarketListing } from "@/lib/types";
import { daysUntil, expiryHorizon, haversineKm, monthsUntil } from "@/lib/format";

export type MarketTab = "ALL" | ListingType;
export type MarketSort = "recent" | "expiry" | "price_desc" | "price_asc" | "distance";
export type HorizonFilter = "ALL" | "lt3" | "m3to6" | "gt6";

export interface MarketFilters {
  tab: MarketTab;
  governorateId: number;
  cityId: number;
  horizon: HorizonFilter;
  delivery: string;
  query: string;
  sort: MarketSort;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export const MARKET_TABS: Array<{ value: MarketTab; label: string; hint: string }> = [
  { value: "ALL", label: "الكل", hint: "كل عروض السوق" },
  { value: "NEAR_EXPIRY", label: "نير إكسباير", hint: "قرب الانتهاء" },
  { value: "DEAD_STOCK", label: "رواكد", hint: "صلاحية طويلة" },
  { value: "SHORTAGE_REQUEST", label: "مطلوب نواقص", hint: "طلبات توفير" },
];

export const HORIZON_OPTIONS: Array<{ value: HorizonFilter; label: string }> = [
  { value: "ALL", label: "كل الصلاحيات" },
  { value: "lt3", label: "أقل من 3 شهور" },
  { value: "m3to6", label: "3 - 6 شهور" },
  { value: "gt6", label: "أكثر من 6 شهور" },
];

export const SORT_OPTIONS: Array<{ value: MarketSort; label: string }> = [
  { value: "recent", label: "الأحدث نشراً" },
  { value: "expiry", label: "الأقرب انتهاءً" },
  { value: "price_desc", label: "الأعلى قيمة" },
  { value: "price_asc", label: "الأقل قيمة" },
  { value: "distance", label: "الأقرب لموقعي" },
];

const TASHKEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Normalizes Arabic variants so "أوجمنتين" matches "اوجمنتين" and vice versa. */
export function normalizeArabic(value: string): string {
  return value
    .toString()
    .toLowerCase()
    .replace(TASHKEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesQuery(listing: ListingView, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const haystack = normalizeArabic(
    [
      listing.drug_name,
      listing.active_ingredient ?? "",
      listing.pharmacy.pharmacy_name,
      listing.city?.name_ar ?? "",
      listing.governorate?.name_ar ?? "",
      listing.batch_number ?? "",
    ].join(" "),
  );
  return tokens.every((token) => haystack.includes(token));
}

function withDistance(listing: ListingView, gps: GeoPoint | null): MarketListing {
  if (!gps || listing.pharmacy.latitude === null || listing.pharmacy.longitude === null) {
    return { ...listing, distanceKm: null };
  }
  return {
    ...listing,
    distanceKm: haversineKm(gps, {
      lat: listing.pharmacy.latitude,
      lng: listing.pharmacy.longitude,
    }),
  };
}

export function applyFilters(
  listings: ListingView[],
  filters: MarketFilters,
  gps: GeoPoint | null,
): MarketListing[] {
  const tokens = normalizeArabic(filters.query).split(" ").filter(Boolean);

  const filtered = listings.filter((listing) => {
    if (listing.status !== "ACTIVE") return false;
    if (filters.tab !== "ALL" && listing.listing_type !== filters.tab) return false;
    if (filters.governorateId && listing.pharmacy.governorate_id !== filters.governorateId)
      return false;
    if (filters.cityId && listing.pharmacy.city_id !== filters.cityId) return false;
    if (
      filters.horizon !== "ALL" &&
      listing.listing_type !== "SHORTAGE_REQUEST" &&
      expiryHorizon(listing.expiry_date) !== filters.horizon
    )
      return false;
    if (filters.delivery && listing.delivery_method !== filters.delivery) return false;
    return matchesQuery(listing, tokens);
  });

  const enriched = filtered.map((listing) => withDistance(listing, gps));
  const total = (listing: ListingView) => listing.quantity * listing.public_price_egp;

  switch (filters.sort) {
    case "expiry":
      enriched.sort((a, b) => {
        const da = daysUntil(a.expiry_date);
        const db = daysUntil(b.expiry_date);
        return (da ?? Number.MAX_SAFE_INTEGER) - (db ?? Number.MAX_SAFE_INTEGER);
      });
      break;
    case "price_desc":
      enriched.sort((a, b) => total(b) - total(a));
      break;
    case "price_asc":
      enriched.sort((a, b) => total(a) - total(b));
      break;
    case "distance":
      enriched.sort(
        (a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
      );
      break;
    default:
      enriched.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return enriched;
}

export function tabCounts(
  listings: ListingView[],
  filters: MarketFilters,
): Record<MarketTab, number> {
  const base = applyFilters(listings, { ...filters, tab: "ALL" }, null);
  return {
    ALL: base.length,
    NEAR_EXPIRY: base.filter((listing) => listing.listing_type === "NEAR_EXPIRY").length,
    DEAD_STOCK: base.filter((listing) => listing.listing_type === "DEAD_STOCK").length,
    SHORTAGE_REQUEST: base.filter((listing) => listing.listing_type === "SHORTAGE_REQUEST").length,
  };
}

export function marketSummary(results: MarketListing[]) {
  const exchange = results.filter((listing) => listing.listing_type !== "SHORTAGE_REQUEST");
  const totalValue = exchange.reduce(
    (sum, listing) => sum + listing.quantity * listing.public_price_egp,
    0,
  );
  const shortages = results.filter((listing) => listing.listing_type === "SHORTAGE_REQUEST").length;
  const verified = new Set(
    results.filter((listing) => listing.pharmacy.is_verified).map((listing) => listing.pharmacy.id),
  ).size;
  const nearest = results.reduce<number | null>((min, listing) => {
    if (listing.distanceKm === null || listing.distanceKm === undefined) return min;
    return min === null ? listing.distanceKm : Math.min(min, listing.distanceKm);
  }, null);

  return {
    count: results.length,
    totalValue: Math.round(totalValue * 100) / 100,
    shortages,
    verified,
    nearest,
    avgHorizon:
      exchange.length > 0
        ? Math.round(
            exchange.reduce((sum, listing) => sum + (monthsUntil(listing.expiry_date) ?? 0), 0) /
              exchange.length,
          )
        : null,
  };
}
