"use server";

import { revalidatePath } from "next/cache";

import { DELIVERY_METHODS } from "@/lib/constants";
import { createListingRecord, getListingView, setListingStatus } from "@/lib/data";
import { getCurrentPharmacy } from "@/lib/session";
import type { ActionResult, CreateListingInput, ListingStatus } from "@/lib/types";

const LISTING_TYPES = ["NEAR_EXPIRY", "DEAD_STOCK", "SHORTAGE_REQUEST"] as const;
const DOSAGE_FORMS = ["TABLETS", "SYRUP", "INJECTION", "CREAM", "DROPS", "OTHER"] as const;

function validate(input: CreateListingInput): string | null {
  if (!LISTING_TYPES.includes(input.listing_type)) return "نوع العرض غير صحيح.";
  if (!input.drug_name || input.drug_name.trim().length < 3) return "اكتب اسم الدواء التجاري.";
  if (!DOSAGE_FORMS.includes(input.dosage_form)) return "اختر الشكل الدوائي.";
  if (!Number.isFinite(input.quantity) || input.quantity < 1) return "الكمية يجب أن تكون رقماً أكبر من صفر.";
  if (!Number.isFinite(input.public_price_egp) || input.public_price_egp < 0)
    return "سعر الجمهور غير صحيح.";
  if (input.listing_type !== "SHORTAGE_REQUEST" && !input.expiry_date)
    return "تاريخ الانتهاء مطلوب لعروض النير إكسباير والرواكد.";
  if (input.swap_preference.trim().length < 5) return "اكتب ما تريده مقابل هذا العرض.";
  if (!(DELIVERY_METHODS as readonly string[]).includes(input.delivery_method))
    return "اختر طريقة تسليم صحيحة.";
  if (input.images.length > 3) return "الحد الأقصى 3 صور للعرض.";
  return null;
}

export async function createListingAction(input: CreateListingInput): Promise<ActionResult> {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) {
    return { ok: false, error: "سجّل الدخول كصيدلية لنشر عرض جديد." };
  }

  const error = validate(input);
  if (error) return { ok: false, error };

  const listing = await createListingRecord(pharmacy.id, {
    ...input,
    drug_name: input.drug_name.trim(),
    active_ingredient: input.active_ingredient.trim(),
    batch_number: input.batch_number.trim(),
    swap_preference: input.swap_preference.trim(),
    expiry_date: input.listing_type === "SHORTAGE_REQUEST" ? null : input.expiry_date,
    quantity: Math.round(input.quantity),
    public_price_egp: Math.round(input.public_price_egp * 100) / 100,
  });

  revalidatePath("/market");
  revalidatePath("/dashboard");

  return { ok: true, id: listing.id };
}

export async function changeListingStatusAction(
  listingId: string,
  status: ListingStatus,
): Promise<ActionResult> {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) return { ok: false, error: "الجلسة منتهية." };

  const listing = await getListingView(listingId);
  if (!listing || listing.pharmacy_id !== pharmacy.id) {
    return { ok: false, error: "لا تملك صلاحية تعديل هذا العرض." };
  }

  if (!["ACTIVE", "RESERVED", "COMPLETED", "CANCELLED"].includes(status)) {
    return { ok: false, error: "حالة العرض غير صحيحة." };
  }

  await setListingStatus(listingId, status);
  revalidatePath("/market");
  revalidatePath("/dashboard");

  return { ok: true };
}
