"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleAlert,
  Info,
  Loader2,
  MapPin,
  Package,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";

import { createListingAction } from "@/app/actions/listings";
import { cn } from "@/lib/cn";
import {
  DELIVERY_METHODS,
  DELIVERY_METHOD_HINT,
  DOSAGE_FORM_LABEL,
  LISTING_TYPE_HINT,
  LISTING_TYPE_LABEL,
} from "@/lib/constants";
import type { CatalogDrug } from "@/lib/drugs/types";
import { formatExpiry, formatMoney, formatInt } from "@/lib/format";
import type { CreateListingInput, DosageForm, ListingType } from "@/lib/types";

import { DrugAutocomplete } from "./drug-autocomplete";
import { ImageUploader } from "./image-uploader";

export interface ListingFormPharmacy {
  pharmacy_name: string;
  owner_name: string;
  governorate: string;
  city: string;
  address: string;
  delivery_preferences: string[];
}

interface Draft {
  type: ListingType | null;
  drug_name: string;
  active_ingredient: string;
  dosage_form: DosageForm;
  quantity: string;
  price: string;
  expiry: string;
  batch: string;
  swap_preference: string;
  delivery_method: string;
  images: string[];
}

const STEPS = [
  { title: "نوع العرض", hint: "اختر نوع القيد" },
  { title: "بيانات الدواء", hint: "الاسم والكمية والسعر" },
  { title: "صور العلبة", hint: "الصلاحية والتشغيلة" },
  { title: "التسليم والمراجعة", hint: "التأكيد النهائي" },
];

const TYPE_OPTIONS: Array<{
  value: ListingType;
  icon: typeof Package;
  description: string;
  accent: string;
  iconClass: string;
}> = [
  {
    value: "NEAR_EXPIRY",
    icon: CalendarClock,
    description: "دواء قرب الانتهاء تريد تبديله قبل انتهاء الصلاحية.",
    accent: "peer-checked:border-amber peer-checked:bg-amber-soft",
    iconClass: "text-amber-strong",
  },
  {
    value: "DEAD_STOCK",
    icon: Package,
    description: "دواء راكد بحركة بطيئة وصلاحية طويلة — حوّله لصنف متحرك.",
    accent: "peer-checked:border-brand peer-checked:bg-brand-soft",
    iconClass: "text-brand",
  },
  {
    value: "SHORTAGE_REQUEST",
    icon: CircleAlert,
    description: "صنف ناقص في السوق — اطلب توفيره من صيدلية قريبة.",
    accent: "peer-checked:border-crimson peer-checked:bg-crimson-soft",
    iconClass: "text-crimson",
  },
];

function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ListingForm({
  pharmacy,
  catalogSize,
  initialDrug = null,
}: {
  pharmacy: ListingFormPharmacy;
  catalogSize: number;
  initialDrug?: CatalogDrug | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    type: null,
    drug_name: "",
    active_ingredient: "",
    dosage_form: "TABLETS",
    quantity: "1",
    price: "",
    expiry: "",
    batch: "",
    swap_preference: "",
    delivery_method: pharmacy.delivery_preferences[0] ?? DELIVERY_METHODS[0],
    images: [],
  });
  const [catalogDrug, setCatalogDrug] = useState<CatalogDrug | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  /** Prefill from the catalogue search (`/listings/new?drug=…`). */
  useEffect(() => {
    if (!initialDrug) return;
    pickCatalogDrug(initialDrug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDrug]);

  const isShortage = draft.type === "SHORTAGE_REQUEST";
  const quantity = Number(draft.quantity) || 0;
  const price = Number(draft.price) || 0;
  const total = Math.round(quantity * price * 100) / 100;

  const set = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  /** Picking from the official catalogue fills name, ingredient, form and public price. */
  const pickCatalogDrug = (drug: CatalogDrug) => {
    setCatalogDrug(drug);
    setDraft((current) => ({
      ...current,
      drug_name: drug.name_ar || drug.name_en,
      active_ingredient: drug.active_ingredient || current.active_ingredient,
      dosage_form: drug.dosage_form,
      price: drug.public_price_egp > 0 ? drug.public_price_egp.toFixed(2) : current.price,
    }));
    setError(null);
  };

  const clearCatalogDrug = () => setCatalogDrug(null);

  const validateStep = (target: number): string | null => {
    if (target >= 0 && !draft.type) return "اختر نوع العرض أولاً.";
    if (target >= 1) {
      if (draft.drug_name.trim().length < 3) return "اكتب اسم الدواء التجاري كما هو على العلبة.";
      if (!Number.isFinite(quantity) || quantity < 1) return "أدخل كمية صحيحة (أكبر من صفر).";
      if (!Number.isFinite(price) || price <= 0) return "أدخل سعر الجمهور للعلبة.";
      if (!isShortage && !draft.expiry) return "أدخل تاريخ انتهاء الصلاحية (شهر/سنة).";
      if (draft.swap_preference.trim().length < 5)
        return "اكتب ما تريده مقابل هذا العرض (اسم الصنف أو طريقة التسوية).";
    }
    if (target >= 2) {
      if (!draft.delivery_method) return "اختر طريقة التسليم.";
    }
    if (target >= 3 && !agreed) {
      return "يجب التأكيد على صحة بيانات الصلاحية والتشغيلة.";
    }
    return null;
  };

  const goNext = () => {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
    setError(null);
  };

  const submit = () => {
    const problem = validateStep(3);
    if (problem) {
      setError(problem);
      return;
    }
    if (!draft.type) return;

    const input: CreateListingInput = {
      listing_type: draft.type,
      drug_name: draft.drug_name.trim(),
      active_ingredient: draft.active_ingredient.trim(),
      dosage_form: draft.dosage_form,
      quantity: Math.round(quantity),
      public_price_egp: Math.round(price * 100) / 100,
      expiry_date: isShortage ? null : `${draft.expiry}-01`,
      batch_number: draft.batch.trim(),
      swap_preference: draft.swap_preference.trim(),
      delivery_method: draft.delivery_method,
      images: draft.images,
    };

    startTransition(async () => {
      const result = await createListingAction(input);
      if (result.ok && result.id) {
        router.push(`/listings/${result.id}`);
        router.refresh();
      } else {
        setError(result.error ?? "تعذر نشر العرض، حاول مرة أخرى.");
        setStep(1);
      }
    });
  };

  const expiryLabel = useMemo(
    () => (draft.expiry ? formatExpiry(`${draft.expiry}-01`) : "—"),
    [draft.expiry],
  );

  return (
    <div className="mx-auto w-full max-w-[1180px] px-3 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            <Link href="/market" className="hover:text-brand">
              السوق الحي
            </Link>
            <span>/</span>
            <span>عرض جديد</span>
          </p>
          <h1 className="mt-1 text-[21px] font-bold tracking-[-0.02em]">نشر عرض أو طلب نواقص</h1>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            بيانات دقيقة = تبادل أسرع. كل الأسعار بسعر الجمهور الرسمي بدون عمولات.
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-outline btn-sm h-9">
          عروضي الحالية
        </Link>
      </div>

      <ol className="mb-3 flex items-center gap-1 overflow-x-auto scrollbar-none rounded-md border border-line bg-surface px-2 py-2">
        {STEPS.map((entry, index) => {
          const done = index < step;
          const active = index === step;
          return (
            <li key={entry.title} className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (index < step) setStep(index);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-sm px-2 py-1 text-start transition-colors",
                  active && "bg-brand-soft",
                  index < step && "hover:bg-sunken",
                )}
              >
                <span
                  className={cn(
                    "num grid size-5 place-items-center rounded-full border text-[10px] font-bold",
                    done
                      ? "border-brand bg-brand text-white"
                      : active
                        ? "border-brand bg-surface text-brand"
                        : "border-line bg-surface text-ink-faint",
                  )}
                >
                  {done ? <Check size={11} strokeWidth={3} aria-hidden /> : formatInt(index + 1)}
                </span>
                <span className="hidden sm:block">
                  <span
                    className={cn(
                      "block text-[11.5px] font-semibold",
                      active ? "text-brand-ink" : done ? "text-ink-secondary" : "text-ink-muted",
                    )}
                  >
                    {entry.title}
                  </span>
                  <span className="block text-[9px] text-ink-faint">{entry.hint}</span>
                </span>
              </button>
              {index < STEPS.length - 1 && <span className="h-px w-3 bg-line" aria-hidden />}
            </li>
          );
        })}
      </ol>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="panel overflow-hidden">
          <div className="border-b border-line bg-canvas px-4 py-2.5">
            <h2 className="text-[13px] font-bold text-ink">
              {STEPS[step].title}
              <span className="ms-2 text-[10px] font-normal text-ink-muted">الخطوة {step + 1} من 4</span>
            </h2>
          </div>

          <div className="p-4">
            {step === 0 && (
              <div className="space-y-2">
                {TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = draft.type === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => set("type", option.value)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border p-3 text-start transition-colors",
                        selected
                          ? option.value === "NEAR_EXPIRY"
                            ? "border-amber bg-amber-soft"
                            : option.value === "DEAD_STOCK"
                              ? "border-brand bg-brand-soft"
                              : "border-crimson bg-crimson-soft"
                          : "border-line bg-surface hover:border-line-strong hover:bg-canvas",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-sm border bg-surface",
                          selected ? "border-current" : "border-line",
                          option.iconClass,
                        )}
                      >
                        <Icon size={17} strokeWidth={1.75} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-ink">
                            {LISTING_TYPE_LABEL[option.value]}
                          </span>
                          {selected && (
                            <span className="chip border-current bg-surface/70 text-[9px] text-ink-secondary">
                              <Check size={9} strokeWidth={3} aria-hidden />
                              محدد
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-muted">
                          {option.description}
                        </span>
                        <span className="mt-1 block text-[10px] text-ink-faint">
                          {LISTING_TYPE_HINT[option.value]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label className="label" htmlFor="drug-name">
                    اسم الدواء التجاري <span className="text-crimson">*</span>
                    <span className="font-normal normal-case tracking-normal text-ink-faint">
                      — ابحث في كتالوج الأسعار الرسمي
                    </span>
                  </label>
                  <DrugAutocomplete
                    id="drug-name"
                    value={draft.drug_name}
                    onQueryChange={(value) => set("drug_name", value)}
                    onPick={pickCatalogDrug}
                    onClearSelection={clearCatalogDrug}
                    selected={catalogDrug}
                    catalogSize={catalogSize}
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="label" htmlFor="ingredient">
                    المادة الفعالة / التركيز
                    <span className="font-normal normal-case tracking-normal text-ink-faint">اختياري</span>
                  </label>
                  <input
                    id="ingredient"
                    value={draft.active_ingredient}
                    onChange={(event) => set("active_ingredient", event.target.value)}
                    placeholder="مثال: باراسيتامول 500 مجم"
                    className="field"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="dosage">
                    الشكل الدوائي
                  </label>
                  <select
                    id="dosage"
                    value={draft.dosage_form}
                    onChange={(event) => set("dosage_form", event.target.value as DosageForm)}
                    className="field"
                  >
                    {Object.entries(DOSAGE_FORM_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="quantity">
                    الكمية (علب) <span className="text-crimson">*</span>
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min={1}
                    value={draft.quantity}
                    onChange={(event) => set("quantity", event.target.value)}
                    className="field num"
                    inputMode="numeric"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label" htmlFor="price">
                    سعر الجمهور للعلبة (ج.م) <span className="text-crimson">*</span>
                  </label>
                  <input
                    id="price"
                    type="number"
                    min={0}
                    step="0.25"
                    value={draft.price}
                    onChange={(event) => set("price", event.target.value)}
                    placeholder="45.00"
                    className="field num"
                    inputMode="decimal"
                  />
                  <p className="mt-1 text-[10px] text-ink-faint">
                    {catalogDrug && catalogDrug.public_price_egp > 0 ? (
                      <span className="text-brand-ink">
                        سعر رسمي من الكتالوج — عدّله فقط إن اختلفت العلبة.
                      </span>
                    ) : (
                      "سعر الجمهور المطبوع على العلبة."
                    )}
                  </p>
                </div>

                {!isShortage && (
                  <div className="sm:col-span-3">
                    <label className="label" htmlFor="expiry">
                      تاريخ الانتهاء (شهر / سنة) <span className="text-crimson">*</span>
                    </label>
                    <input
                      id="expiry"
                      type="month"
                      min={thisMonth()}
                      value={draft.expiry}
                      onChange={(event) => set("expiry", event.target.value)}
                      className="field num"
                    />
                    <p className="mt-1 text-[10px] text-ink-faint">
                      يظهر في البطاقة كـ <span className="num">{expiryLabel}</span> — افحص العلبة قبل الإدخال.
                    </p>
                  </div>
                )}

                <div className={cn(isShortage ? "sm:col-span-6" : "sm:col-span-3")}>
                  <label className="label" htmlFor="batch">
                    رقم التشغيلة (Batch)
                    <span className="font-normal normal-case tracking-normal text-ink-faint">اختياري</span>
                  </label>
                  <input
                    id="batch"
                    value={draft.batch}
                    onChange={(event) => set("batch", event.target.value)}
                    placeholder="PN-8842"
                    className="field num"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="label" htmlFor="swap">
                    {isShortage ? "طريقة التسوية المطلوبة" : "مطلوب للبدل"} <span className="text-crimson">*</span>
                  </label>
                  <textarea
                    id="swap"
                    value={draft.swap_preference}
                    onChange={(event) => set("swap_preference", event.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder={
                      isShortage
                        ? "مثال: مطلوب توفير فوري — بدل بكاتافلاي أو نيوروفين جمهور في جمهور"
                        : "مثال: كاتافلاي شراب أو أوجمنتين 1جم — جمهور في جمهور"
                    }
                    className="field-area"
                  />
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-faint">
                    <Info size={10} aria-hidden />
                    كن محدداً: الأصناف المطلوبة ترفع فرص قبول العرض.
                  </p>
                </div>

                <div className="sm:col-span-6">
                  <div className="flex items-center justify-between rounded-sm border border-line bg-canvas px-3 py-2">
                    <span className="text-[11px] text-ink-muted">إجمالي قيمة الجمهور</span>
                    <span className="num text-[14px] font-bold text-brand-ink">
                      {formatMoney(total)} <span className="font-sans text-[9.5px]">ج.م</span>
                      <span className="ms-2 font-sans text-[10px] font-normal text-ink-faint">
                        ({formatInt(quantity)} × {formatMoney(price)})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="mb-2 flex items-start gap-2 rounded-sm border border-line bg-canvas p-2.5">
                  <Info size={13} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                  <p className="text-[10.5px] leading-relaxed text-ink-secondary">
                    صورة العلبة تحسم 90% من المفاوضات: أظهر التاريخ المطبوع والتشغيلة بوضوح. الحد
                    الأقصى 3 صور، ويتم ضغطها تلقائياً قبل الرفع.
                  </p>
                </div>
                <ImageUploader
                  value={draft.images}
                  onChange={(next) => set("images", next)}
                  onBusyChange={setUploading}
                />
                {uploading && (
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-brand">
                    <Loader2 size={11} className="animate-spin" aria-hidden />
                    جارٍ رفع الصور…
                  </p>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div>
                  <h3 className="label mb-2">
                    <span>طريقة تسليم هذا العرض</span>
                  </h3>
                  <div className="grid gap-1.5 sm:grid-cols-3">
                    {DELIVERY_METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => set("delivery_method", method)}
                        className={cn(
                          "rounded-sm border p-2.5 text-start transition-colors",
                          draft.delivery_method === method
                            ? "border-brand bg-brand-soft"
                            : "border-line bg-surface hover:border-line-strong",
                        )}
                      >
                        <span className="flex items-center gap-1 text-[11.5px] font-semibold text-ink">
                          <Truck size={12} strokeWidth={1.75} aria-hidden />
                          {method}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-ink-muted">
                          {DELIVERY_METHOD_HINT[method]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-sm border border-line bg-canvas p-3">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    <Store size={11} aria-hidden />
                    صيدلية التسليم
                  </p>
                  <p className="text-[12px] font-semibold text-ink">{pharmacy.pharmacy_name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ink-muted">
                    <MapPin size={10} aria-hidden />
                    {pharmacy.governorate} · {pharmacy.city} — {pharmacy.address}
                  </p>
                  <Link href="/profile" className="mt-1 inline-block text-[10px] font-semibold text-brand hover:underline">
                    تعديل بيانات الموقع في ملف الصيدلية
                  </Link>
                </div>

                <div className="overflow-hidden rounded-md border border-line">
                  <table className="w-full text-[11.5px]">
                    <tbody>
                      <ReviewRow label="نوع العرض" value={draft.type ? LISTING_TYPE_LABEL[draft.type] : "—"} />
                      <ReviewRow label="الدواء" value={draft.drug_name || "—"} />
                      <ReviewRow label="الكمية × السعر" value={`${formatInt(quantity)} × ${formatMoney(price)} ج.م`} mono />
                      <ReviewRow label="الإجمالي" value={`${formatMoney(total)} ج.م`} mono strong />
                      <ReviewRow label="تاريخ الانتهاء" value={isShortage ? "غير مطلوب (نواقص)" : expiryLabel} mono={!isShortage} />
                      <ReviewRow label="التسليم" value={draft.delivery_method} />
                      <ReviewRow label="الصور" value={`${formatInt(draft.images.length)} صورة`} mono />
                    </tbody>
                  </table>
                </div>

                <label className="flex cursor-pointer items-start gap-2 rounded-sm border border-line bg-surface p-2.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(event) => setAgreed(event.target.checked)}
                    className="mt-0.5 size-4 accent-[#0b4a6e]"
                  />
                  <span className="text-[10.5px] leading-relaxed text-ink-secondary">
                    أتعهد بأن بيانات الصلاحية والتشغيلة مطابقة للعلبة الفعلية، وأن الدواء محفوظ في
                    ظروف تخزين صحيحة داخل الصيدلية.
                  </span>
                </label>
              </div>
            )}

            {error && (
              <p className="mt-3 flex items-start gap-1.5 rounded-sm border border-crimson-line bg-crimson-soft px-2.5 py-2 text-[11px] text-crimson-ink">
                <CircleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line bg-canvas px-4 py-2.5">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || pending}
              className="btn btn-outline btn-sm"
            >
              <ArrowRight size={13} aria-hidden />
              السابق
            </button>

            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] text-ink-faint sm:block">
                {step < 3 ? "يمكنك الرجوع وتعديل أي خطوة" : "راجع البيانات ثم انشر العرض"}
              </span>
              {step < 3 ? (
                <button type="button" onClick={goNext} className="btn btn-primary btn-sm">
                  التالي
                  <ArrowLeft size={13} aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending || uploading}
                  className="btn btn-primary btn-sm"
                >
                  {pending ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                  ) : (
                    <ShieldCheck size={13} aria-hidden />
                  )}
                  {pending ? "جارٍ النشر…" : "نشر العرض في السوق"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-2 lg:sticky lg:top-[73px]">
          <div className="panel p-3">
            <p className="label mb-2">ملخص العرض</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">النوع</span>
                <span className="font-semibold text-ink">
                  {draft.type ? LISTING_TYPE_LABEL[draft.type] : "لم يُحدد"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">الدواء</span>
                <span className="max-w-[170px] truncate font-medium text-ink">
                  {draft.drug_name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">الكمية</span>
                <span className="num text-ink">{formatInt(quantity)} علبة</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">سعر الجمهور</span>
                <span className="flex items-center gap-1">
                  {catalogDrug && (
                    <span className="chip border-gold-line bg-gold-soft text-gold-ink">
                      <BadgeCheck size={10} strokeWidth={2} aria-hidden />
                      رسمي
                    </span>
                  )}
                  <span className="num text-ink">{formatMoney(price)} ج.م</span>
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-muted">الصلاحية</span>
                <span className="num text-ink">{isShortage ? "—" : expiryLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line pt-1.5">
                <span className="text-ink-muted">الإجمالي</span>
                <span className="num text-[13px] font-bold text-brand-ink">
                  {formatMoney(total)} ج.م
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-line bg-surface p-3">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              <ShieldCheck size={11} aria-hidden />
              لماذا جمهور في جمهور؟
            </p>
            <p className="text-[10.5px] leading-relaxed text-ink-muted">
              لأن التبادل بقيمة الجمهور الرسمية يمنع المضاربة ويحمي هامش الربح القانوني للصيدلية.
              أي فرق في القيمة يُسوَّى نقداً عند التسليم.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  mono = false,
  strong = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <tr className="border-b border-line last:border-0">
      <th scope="row" className="w-[38%] bg-canvas px-3 py-1.5 text-start font-medium text-ink-muted">
        {label}
      </th>
      <td className={cn("px-3 py-1.5 text-ink", mono && "num", strong && "font-bold")}>{value}</td>
    </tr>
  );
}
