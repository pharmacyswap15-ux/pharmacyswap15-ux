"use server";

import { revalidatePath } from "next/cache";

import { DELIVERY_METHODS } from "@/lib/constants";
import { updatePharmacyRecord } from "@/lib/data";
import { getCurrentPharmacy, isValidPhone } from "@/lib/session";
import type { ActionResult } from "@/lib/types";

export interface ProfileUpdateInput {
  pharmacy_name: string;
  owner_name: string;
  phone: string;
  governorate_id: number;
  city_id: number;
  address_details: string;
  latitude: number | null;
  longitude: number | null;
  delivery_preferences: string[];
}

export async function updateProfileAction(input: ProfileUpdateInput): Promise<ActionResult> {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) return { ok: false, error: "سجّل الدخول أولاً." };

  const phone = input.phone.replace(/\s|-/g, "");
  if (input.pharmacy_name.trim().length < 3) return { ok: false, error: "اسم الصيدلية قصير جداً." };
  if (input.owner_name.trim().length < 3) return { ok: false, error: "اسم المسؤول قصير جداً." };
  if (!isValidPhone(phone)) return { ok: false, error: "رقم الهاتف غير صحيح (01xxxxxxxxx)." };
  if (!input.governorate_id || !input.city_id)
    return { ok: false, error: "اختر المحافظة والمدينة." };
  if (input.address_details.trim().length < 5)
    return { ok: false, error: "اكتب عنواناً تفصيلياً للصيدلية." };

  const preferences = input.delivery_preferences.filter((method) =>
    (DELIVERY_METHODS as readonly string[]).includes(method),
  );
  if (!preferences.length) return { ok: false, error: "اختر طريقة تسليم واحدة على الأقل." };

  await updatePharmacyRecord(pharmacy.id, {
    pharmacy_name: input.pharmacy_name.trim(),
    owner_name: input.owner_name.trim(),
    phone,
    governorate_id: input.governorate_id,
    city_id: input.city_id,
    address_details: input.address_details.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    delivery_preferences: preferences,
  });

  revalidatePath("/profile");
  revalidatePath("/market");
  revalidatePath("/dashboard");

  return { ok: true };
}
