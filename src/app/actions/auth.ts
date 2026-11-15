"use server";

import { redirect } from "next/navigation";

import { authenticatePharmacy, registerPharmacyRecord } from "@/lib/data";
import { isValidEmail, isValidPhone, setSession } from "@/lib/session";
import { DELIVERY_METHODS } from "@/lib/constants";

export interface AuthFormState {
  error?: string;
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "أدخل البريد الإلكتروني وكلمة المرور للمتابعة." };
  }

  const pharmacyId = await authenticatePharmacy(email, password);
  if (!pharmacyId) {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  await setSession(pharmacyId);
  redirect("/market");
}

export async function logoutAction(): Promise<void> {
  const { clearSession } = await import("@/lib/session");
  await clearSession();
  redirect("/market");
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const value = (key: string) => String(formData.get(key) ?? "").trim();

  const pharmacyName = value("pharmacy_name");
  const ownerName = value("owner_name");
  const phone = value("phone").replace(/\s|-/g, "");
  const email = value("email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const governorateId = Number(value("governorate_id"));
  const cityId = Number(value("city_id"));
  const address = value("address_details");
  const latitude = Number(value("latitude"));
  const longitude = Number(value("longitude"));
  const deliveryPreferences = formData
    .getAll("delivery_preferences")
    .map((entry) => String(entry))
    .filter((entry) => (DELIVERY_METHODS as readonly string[]).includes(entry));

  if (pharmacyName.length < 3) return { error: "اكتب اسم الصيدلية كما هو في الترخيص." };
  if (ownerName.length < 3) return { error: "اكتب اسم الصيدلي المسؤول." };
  if (!isValidPhone(phone)) return { error: "رقم الهاتف يجب أن يكون رقماً مصرياً صحيحاً (01xxxxxxxxx)." };
  if (!isValidEmail(email)) return { error: "البريد الإلكتروني غير صحيح." };
  if (password.length < 6) return { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." };
  if (!governorateId || !cityId) return { error: "اختر المحافظة والمدينة." };
  if (address.length < 5) return { error: "اكتب العنوان التفصيلي للصيدلية." };
  if (!deliveryPreferences.length) return { error: "اختر طريقة تسليم واحدة على الأقل." };

  const pharmacy = await registerPharmacyRecord({
    pharmacy_name: pharmacyName,
    owner_name: ownerName,
    phone,
    email,
    password,
    governorate_id: governorateId,
    city_id: cityId,
    address_details: address,
    latitude: Number.isFinite(latitude) && latitude !== 0 ? latitude : null,
    longitude: Number.isFinite(longitude) && longitude !== 0 ? longitude : null,
    delivery_preferences: deliveryPreferences,
  });

  if (!pharmacy) {
    return { error: "هذا البريد الإلكتروني مسجل بالفعل — سجّل الدخول بدلاً من ذلك." };
  }

  await setSession(pharmacy.id);
  redirect("/market?welcome=1");
}
