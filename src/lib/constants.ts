import type { DosageForm, Governorate, City, ListingStatus, ListingType, ProposalStatus } from "./types";

export const LISTING_TYPE_LABEL: Record<ListingType, string> = {
  NEAR_EXPIRY: "نير إكسباير",
  DEAD_STOCK: "رواكد",
  SHORTAGE_REQUEST: "مطلوب نواقص",
};

export const LISTING_TYPE_HINT: Record<ListingType, string> = {
  NEAR_EXPIRY: "قرب الانتهاء — صلاحية أقل من 6 شهور",
  DEAD_STOCK: "راكد بالمخزن — صلاحية طويلة وحركة بطيئة",
  SHORTAGE_REQUEST: "نواقص — مطلوب توفير من صيدلية قريبة",
};

export const DOSAGE_FORM_LABEL: Record<DosageForm, string> = {
  TABLETS: "أقراص",
  SYRUP: "شراب",
  INJECTION: "حقن",
  CREAM: "كريم / مرهم",
  DROPS: "قطرة / بخاخ",
  OTHER: "أخرى",
};

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  ACTIVE: "متاح",
  RESERVED: "محجوز",
  COMPLETED: "مكتمل",
  CANCELLED: "ملغي",
};

export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  PENDING: "قيد المراجعة",
  ACCEPTED: "مقبول",
  REJECTED: "مرفوض",
  COMPLETED: "منفذ",
};

export const DELIVERY_METHODS = [
  "استلام من الصيدلية",
  "مندوب شحن داخلي",
  "توصيل متبادل",
] as const;

export const DELIVERY_METHOD_HINT: Record<string, string> = {
  "استلام من الصيدلية": "تسليم يد بيد داخل الصيدلية",
  "مندوب شحن داخلي": "مندوب الصيدلية يغطي المحافظة",
  "توصيل متبادل": "تبادل على منتصف الطريق بين الصيدليتين",
};

export interface EgyptianGeography {
  governorates: Array<Governorate & { cities: Array<Omit<City, "governorate_id">> }>;
}

export function governorateName(
  governorates: Governorate[],
  id: number | null | undefined,
): string {
  return governorates.find((g) => g.id === id)?.name_ar ?? "غير محدد";
}

export function cityName(cities: City[], id: number | null | undefined): string {
  return cities.find((c) => c.id === id)?.name_ar ?? "غير محدد";
}

export function whatsappLink(phone: string, message: string): string {
  const clean = phone.replace(/[^\d]/g, "");
  const normalized = clean.startsWith("0") ? `20${clean.slice(1)}` : clean;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
