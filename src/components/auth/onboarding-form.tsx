"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import { registerAction, type AuthFormState } from "@/app/actions/auth";
import { LocationPicker } from "@/components/map/location-picker";
import { DELIVERY_METHODS, DELIVERY_METHOD_HINT } from "@/lib/constants";
import { citiesOf } from "@/lib/geo";
import type { City, Governorate } from "@/lib/types";

export function OnboardingForm({
  governorates,
  cities,
  localMode,
}: {
  governorates: Governorate[];
  cities: City[];
  localMode: boolean;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  const [governorateId, setGovernorateId] = useState(0);
  const [cityId, setCityId] = useState(0);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [deliveryPreferences, setDeliveryPreferences] = useState<string[]>([
    DELIVERY_METHODS[0],
    DELIVERY_METHODS[1],
  ]);

  const cityOptions = citiesOf(governorateId);

  const toggleMethod = (method: string) => {
    setDeliveryPreferences((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1120px] px-3 py-5 sm:px-5">
      <div className="mb-3">
        <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-brand">
          <Store size={11} strokeWidth={2} aria-hidden />
          تسجيل صيدلية جديدة
        </p>
        <h1 className="mt-1 text-[21px] font-bold tracking-[-0.02em]">إنشاء ملف صيدلية على فارماسواب</h1>
        <p className="mt-0.5 text-[11.5px] text-ink-muted">
          بيانات الترخيص والموقع تُستخدم لعرض عروضك للصيدليات القريبة فقط — لن تظهر للجمهور.
        </p>
      </div>

      <form action={formAction} className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <input type="hidden" name="latitude" value={coords.lat ?? ""} />
        <input type="hidden" name="longitude" value={coords.lng ?? ""} />

        <div className="space-y-3">
          <section className="panel overflow-hidden">
            <header className="border-b border-line bg-canvas px-4 py-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <span className="num text-[10px] text-ink-faint">01</span>
                بيانات الصيدلية
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="pharmacy_name">
                  اسم الصيدلية كما في الترخيص <span className="text-crimson">*</span>
                </label>
                <input
                  id="pharmacy_name"
                  name="pharmacy_name"
                  className="field"
                  placeholder="صيدلية الأمل"
                  required
                  autoComplete="organization"
                />
              </div>
              <div>
                <label className="label" htmlFor="owner_name">
                  اسم الصيدلي المسؤول <span className="text-crimson">*</span>
                </label>
                <input
                  id="owner_name"
                  name="owner_name"
                  className="field"
                  placeholder="د. أحمد سمير"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  رقم الواتساب <span className="text-crimson">*</span>
                </label>
                <div className="relative">
                  <Phone size={13} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <input
                    id="phone"
                    name="phone"
                    dir="ltr"
                    inputMode="tel"
                    className="field num pe-8 text-start"
                    placeholder="01001234567"
                    pattern="01[0-9]{9}"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="email">
                  البريد الإلكتروني <span className="text-crimson">*</span>
                </label>
                <div className="relative">
                  <Mail size={13} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    className="field num pe-8 text-start"
                    placeholder="pharmacy@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="password">
                  كلمة المرور <span className="text-crimson">*</span>
                </label>
                <div className="relative">
                  <LockKeyhole size={13} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    className="field pe-8"
                    placeholder="6 أحرف على الأقل"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <header className="border-b border-line bg-canvas px-4 py-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <span className="num text-[10px] text-ink-faint">02</span>
                العنوان والموقع
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="governorate_id">
                  المحافظة <span className="text-crimson">*</span>
                </label>
                <select
                  id="governorate_id"
                  name="governorate_id"
                  className="field"
                  value={governorateId || ""}
                  onChange={(event) => {
                    setGovernorateId(Number(event.target.value));
                    setCityId(0);
                  }}
                  required
                >
                  <option value="" disabled>
                    اختر المحافظة
                  </option>
                  {governorates.map((governorate) => (
                    <option key={governorate.id} value={governorate.id}>
                      {governorate.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="city_id">
                  المدينة / المنطقة <span className="text-crimson">*</span>
                </label>
                <select
                  id="city_id"
                  name="city_id"
                  className="field"
                  value={cityId || ""}
                  onChange={(event) => setCityId(Number(event.target.value))}
                  disabled={!governorateId}
                  required
                >
                  <option value="" disabled>
                    {governorateId ? "اختر المدينة" : "اختر المحافظة أولاً"}
                  </option>
                  {cityOptions.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="address_details">
                  العنوان التفصيلي <span className="text-crimson">*</span>
                </label>
                <input
                  id="address_details"
                  name="address_details"
                  className="field"
                  placeholder="مثال: ١٢ شارع عباس العقاد — أمام محطة المترو"
                  required
                />
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <header className="border-b border-line bg-canvas px-4 py-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <span className="num text-[10px] text-ink-faint">03</span>
                طرق التسليم الافتراضية
              </h2>
            </header>
            <div className="grid gap-1.5 p-4 sm:grid-cols-3">
              {DELIVERY_METHODS.map((method) => {
                const checked = deliveryPreferences.includes(method);
                return (
                  <label
                    key={method}
                    className={`flex cursor-pointer items-start gap-2 rounded-sm border p-2.5 transition-colors ${
                      checked ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="delivery_preferences"
                      value={method}
                      checked={checked}
                      onChange={() => toggleMethod(method)}
                      className="mt-0.5 size-3.5 accent-[#0b4a6e]"
                    />
                    <span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-ink">
                        <Truck size={11} strokeWidth={1.75} aria-hidden />
                        {method}
                      </span>
                      <span className="mt-0.5 block text-[9.5px] leading-relaxed text-ink-muted">
                        {DELIVERY_METHOD_HINT[method]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {state.error && (
            <p className="flex items-start gap-1.5 rounded-sm border border-crimson-line bg-crimson-soft px-3 py-2 text-[11px] text-crimson-ink">
              <CircleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
              {state.error}
            </p>
          )}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-[73px]">
          <section className="panel overflow-hidden">
            <header className="flex items-center justify-between border-b border-line bg-canvas px-3 py-2">
              <h2 className="flex items-center gap-1 text-[11.5px] font-bold text-ink">
                <MapPin size={12} className="text-ink-muted" aria-hidden />
                موقع الصيدلية على الخريطة
              </h2>
              <span className="text-[9px] text-ink-faint">OpenStreetMap</span>
            </header>
            <div className="p-2.5">
              <LocationPicker
                latitude={coords.lat}
                longitude={coords.lng}
                governorateId={governorateId || null}
                onChange={(lat, lng) => setCoords({ lat, lng })}
                height="h-[236px]"
              />
              <p className="mt-1.5 text-[9.5px] leading-relaxed text-ink-faint">
                حدد النقطة بدقة أمام باب الصيدلية — تُستخدم لحساب المسافة مع الصيدليات القريبة في
                فلتر «الأقرب لموقعي».
              </p>
            </div>
          </section>

          <section className="panel p-3">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              <ShieldCheck size={11} aria-hidden />
              التوثيق والخصوصية
            </p>
            <ul className="space-y-1 text-[10px] leading-relaxed text-ink-muted">
              <li className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                يتم إنشاء الملف بحالة «قيد التوثيق» حتى مراجعة ترخيص الصيدلية.
              </li>
              <li className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                رقم الواتساب يظهر للصيدليات المسجلة فقط عند تقديم عرض بدل.
              </li>
              <li className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                {localMode
                  ? "البيانات تُدار محلياً أثناء التطوير."
                  : "متصل بقاعدة Supabase مع تفعيل RLS على كل الجداول."}
              </li>
            </ul>
          </section>

          <div className="panel p-3">
            <button type="submit" disabled={pending} className="btn btn-primary w-full">
              {pending ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <Store size={15} aria-hidden />
              )}
              {pending ? "جارٍ إنشاء الملف…" : "إنشاء ملف الصيدلية"}
            </button>
            <p className="mt-2 text-center text-[10px] text-ink-muted">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                تسجيل الدخول
              </Link>
            </p>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[9px] text-ink-faint">
              <UserRound size={9} aria-hidden />
              بالإنشاء أنت توافق على شروط التبادل بسعر الجمهور الرسمي.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
