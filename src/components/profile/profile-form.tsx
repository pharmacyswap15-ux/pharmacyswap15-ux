"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeftRight,
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Phone,
  Save,
  ShieldCheck,
  Star,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import { updateProfileAction } from "@/app/actions/profile";
import { LocationPicker } from "@/components/map/location-picker";
import { VerifiedBadge } from "@/components/market/listing-pills";
import { cn } from "@/lib/cn";
import { DELIVERY_METHODS, DELIVERY_METHOD_HINT } from "@/lib/constants";
import { citiesOf } from "@/lib/geo";
import { formatDate, formatInt, initials } from "@/lib/format";
import type { City, Governorate, Pharmacy } from "@/lib/types";

export function ProfileForm({
  pharmacy,
  governorates,
  cities,
  localMode,
  stats,
}: {
  pharmacy: Pharmacy;
  governorates: Governorate[];
  cities: City[];
  localMode: boolean;
  stats: { active: number; incoming: number; outgoing: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const [form, setForm] = useState({
    pharmacy_name: pharmacy.pharmacy_name,
    owner_name: pharmacy.owner_name,
    phone: pharmacy.phone,
    governorate_id: pharmacy.governorate_id,
    city_id: pharmacy.city_id,
    address_details: pharmacy.address_details,
    latitude: pharmacy.latitude,
    longitude: pharmacy.longitude,
    delivery_preferences: pharmacy.delivery_preferences,
  });

  const cityOptions = useMemo(() => citiesOf(form.governorate_id), [form.governorate_id]);

  const toggleMethod = (method: string) => {
    setForm((current) => ({
      ...current,
      delivery_preferences: current.delivery_preferences.includes(method)
        ? current.delivery_preferences.filter((item) => item !== method)
        : [...current.delivery_preferences, method],
    }));
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfileAction(form);
      if (result.ok) {
        setMessage({ kind: "ok", text: "تم حفظ بيانات الصيدلية وتحديث بطاقتها في السوق." });
        router.refresh();
      } else {
        setMessage({ kind: "error", text: result.error ?? "تعذر حفظ البيانات." });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-brand">
            <Store size={11} strokeWidth={2} aria-hidden />
            ملف الصيدلية
          </p>
          <h1 className="mt-1 text-[21px] font-bold tracking-[-0.02em]">{pharmacy.pharmacy_name}</h1>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            بيانات الموقع وطرق التسليم تُستخدم في كل عرض جديد تنشره.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href="/market" className="btn btn-outline btn-sm h-9">
            بطاقة السوق
          </Link>
          <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm h-9">
            {pending ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Save size={13} aria-hidden />}
            {pending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px]",
            message.kind === "ok"
              ? "border-brand-line bg-brand-soft text-brand-ink"
              : "border-crimson-line bg-crimson-soft text-crimson-ink",
          )}
        >
          {message.kind === "ok" ? <CheckCircle2 size={13} aria-hidden /> : <CircleAlert size={13} aria-hidden />}
          {message.text}
        </p>
      )}

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <section className="panel overflow-hidden">
            <header className="border-b border-line bg-canvas px-3.5 py-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <UserRound size={12} className="text-ink-muted" aria-hidden />
                بيانات الصيدلية والمسؤول
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="profile-name">
                  اسم الصيدلية
                </label>
                <input
                  id="profile-name"
                  value={form.pharmacy_name}
                  onChange={(event) => setForm({ ...form, pharmacy_name: event.target.value })}
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="profile-owner">
                  الصيدلي المسؤول
                </label>
                <input
                  id="profile-owner"
                  value={form.owner_name}
                  onChange={(event) => setForm({ ...form, owner_name: event.target.value })}
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="profile-phone">
                  رقم الواتساب
                </label>
                <div className="relative">
                  <Phone size={13} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden />
                  <input
                    id="profile-phone"
                    dir="ltr"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    className="field num pe-8 text-start"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="label mb-1.5">البريد الإلكتروني للحساب</p>
                <p className="flex h-10 items-center justify-between rounded-md border border-line bg-sunken px-3 text-[12px] text-ink-secondary">
                  <span dir="ltr" className="num">
                    {pharmacy.email ?? "غير مسجل"}
                  </span>
                  <span className="chip border-line bg-surface text-[9px] text-ink-faint">غير قابل للتعديل</span>
                </p>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <header className="border-b border-line bg-canvas px-3.5 py-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <MapPin size={12} className="text-ink-muted" aria-hidden />
                العنوان وإحداثيات GPS
              </h2>
            </header>
            <div className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="profile-gov">
                  المحافظة
                </label>
                <select
                  id="profile-gov"
                  value={form.governorate_id || ""}
                  onChange={(event) =>
                    setForm({ ...form, governorate_id: Number(event.target.value), city_id: 0 })
                  }
                  className="field"
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
                <label className="label" htmlFor="profile-city">
                  المدينة / المنطقة
                </label>
                <select
                  id="profile-city"
                  value={form.city_id || ""}
                  onChange={(event) => setForm({ ...form, city_id: Number(event.target.value) })}
                  className="field"
                  disabled={!form.governorate_id}
                >
                  <option value="" disabled>
                    {form.governorate_id ? "اختر المدينة" : "اختر المحافظة أولاً"}
                  </option>
                  {cityOptions.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name_ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="profile-address">
                  العنوان التفصيلي
                </label>
                <input
                  id="profile-address"
                  value={form.address_details}
                  onChange={(event) => setForm({ ...form, address_details: event.target.value })}
                  className="field"
                />
              </div>
              <div className="sm:col-span-2">
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  governorateId={form.governorate_id || null}
                  onChange={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
                  height="h-[248px]"
                />
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <header className="border-b border-line bg-canvas px-3.5 py-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <Truck size={12} className="text-ink-muted" aria-hidden />
                طرق التسليم الافتراضية
              </h2>
            </header>
            <div className="grid gap-1.5 p-3.5 sm:grid-cols-3">
              {DELIVERY_METHODS.map((method) => {
                const checked = form.delivery_preferences.includes(method);
                return (
                  <label
                    key={method}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-sm border p-2.5 transition-colors",
                      checked ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-line-strong",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMethod(method)}
                      className="mt-0.5 size-3.5 accent-[#0b4a6e]"
                    />
                    <span>
                      <span className="block text-[11px] font-semibold text-ink">{method}</span>
                      <span className="mt-0.5 block text-[9.5px] leading-relaxed text-ink-muted">
                        {DELIVERY_METHOD_HINT[method]}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2">
            <p className="text-[10PX] text-ink-faint">
              آخر تحديث للبيانات يُطبق فوراً على كل عروضك في السوق.
            </p>
            <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm">
              {pending ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Save size={13} aria-hidden />}
              حفظ التغييرات
            </button>
          </div>
        </div>

        <aside className="space-y-2.5 lg:sticky lg:top-[73px]">
          <section className="panel overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-line px-3 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-brand-soft font-display text-[13px] font-bold text-brand-ink ring-1 ring-brand-line">
                {initials(pharmacy.pharmacy_name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-bold text-ink">{pharmacy.pharmacy_name}</p>
                <p className="truncate text-[10px] text-ink-muted">{pharmacy.owner_name}</p>
              </div>
              <span className="ms-auto shrink-0">
                <VerifiedBadge verified={pharmacy.is_verified} compact />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-px bg-line">
              <div className="bg-surface px-3 py-2">
                <p className="text-[9px] uppercase tracking-wide text-ink-faint">التقييم</p>
                <p className="mt-0.5 flex items-center gap-1">
                  <Star size={11} className="fill-amber text-amber" aria-hidden />
                  <span className="num text-[13px] font-bold text-ink">{pharmacy.rating_avg.toFixed(1)}</span>
                </p>
              </div>
              <div className="bg-surface px-3 py-2">
                <p className="text-[9px] uppercase tracking-wide text-ink-faint">تبادلات ناجحة</p>
                <p className="num mt-0.5 text-[13px] font-bold text-ink">{formatInt(pharmacy.swaps_count)}</p>
              </div>
            </div>

            <dl className="space-y-1 px-3 py-2.5 text-[10.5px]">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">عروض نشطة</dt>
                <dd className="num text-ink">{formatInt(stats.active)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">عروض بدل واردة</dt>
                <dd className="num text-ink">{formatInt(stats.incoming)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">عروض بدل صادرة</dt>
                <dd className="num text-ink">{formatInt(stats.outgoing)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-ink-muted">تاريخ الانضمام</dt>
                <dd className="num text-ink">{formatDate(pharmacy.created_at)}</dd>
              </div>
            </dl>

            <div className="border-t border-line p-2">
              <Link href="/dashboard" className="btn btn-outline btn-sm w-full">
                <Package size={12} aria-hidden />
                لوحة التحكم
              </Link>
              <Link href="/dashboard/swaps" className="btn btn-outline btn-sm mt-1.5 w-full">
                <ArrowLeftRight size={12} aria-hidden />
                عروض البدل
              </Link>
            </div>
          </section>

          <section className="panel p-3">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              <ShieldCheck size={11} aria-hidden />
              حالة التوثيق
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-muted">
              {pharmacy.is_verified
                ? "تم التحقق من ترخيص الصيدلية. تظهر شارة «موثقة» على كل عروضك."
                : "ملفك قيد المراجعة. أرسل صورة ترخيص الصيدلية عبر واتساب الدعم لتفعيل شارة التوثيق."}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[9.5px] text-ink-faint">
              <BadgeCheck size={11} aria-hidden />
              {localMode ? "بيانات التطوير المحلية" : "متصل بقاعدة Supabase + RLS"}
            </div>
          </section>

          <form action="/api/session/logout" method="post">
            <button type="submit" className="btn btn-outline w-full text-crimson hover:border-crimson-line hover:bg-crimson-soft">
              <LogOut size={13} aria-hidden />
              تسجيل الخروج
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
