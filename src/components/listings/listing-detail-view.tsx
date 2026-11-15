"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  CircleAlert,
  Clock,
  ImageIcon,
  MapPin,
  MessageCircle,
  PackageOpen,
  ScanLine,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from "lucide-react";

import { ListingTypePill, VerifiedBadge } from "@/components/market/listing-pills";
import { ImageLightbox } from "@/components/market/image-lightbox";
import { SwapDrawer } from "@/components/swap/swap-drawer";
import { LocationPreview } from "@/components/map/location-picker";
import { cn } from "@/lib/cn";
import {
  DELIVERY_METHOD_HINT,
  DOSAGE_FORM_LABEL,
  LISTING_STATUS_LABEL,
  LISTING_TYPE_LABEL,
  whatsappLink,
} from "@/lib/constants";
import {
  expiryCountdown,
  formatDate,
  formatExpiry,
  formatInt,
  formatMoney,
  initials,
  listTotal,
  timeAgo,
} from "@/lib/format";
import type { ListingView } from "@/lib/types";

export function ListingDetailView({
  listing,
  isAuthenticated,
  isOwner,
}: {
  listing: ListingView;
  isAuthenticated: boolean;
  isOwner: boolean;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const isShortage = listing.listing_type === "SHORTAGE_REQUEST";
  const total = listTotal(listing);
  const pharmacy = listing.pharmacy;
  const location = `${listing.governorate?.name_ar ?? "—"} · ${listing.city?.name_ar ?? "—"}`;
  const whatsappMessage = `السلام عليكم ${pharmacy.pharmacy_name}، بخصوص عرض "${listing.drug_name}" (${formatInt(listing.quantity)} علبة) على فارماسواب — هل ما زال متاحاً للتبادل؟`;

  const specs: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "نوع العرض", value: LISTING_TYPE_LABEL[listing.listing_type] },
    { label: "الشكل الدوائي", value: DOSAGE_FORM_LABEL[listing.dosage_form] },
    { label: "تاريخ الانتهاء", value: formatExpiry(listing.expiry_date), mono: true },
    { label: "رقم التشغيلة", value: listing.batch_number || "غير مسجل", mono: Boolean(listing.batch_number) },
    { label: "الكمية المتاحة", value: `${formatInt(listing.quantity)} علبة`, mono: true },
    { label: "طريقة التسليم", value: listing.delivery_method },
    { label: "حالة العرض", value: LISTING_STATUS_LABEL[listing.status] },
    { label: "تاريخ النشر", value: formatDate(listing.created_at) },
  ];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-3 py-4 pb-24 sm:px-5 lg:pb-6">
      <nav className="mb-2 flex items-center gap-1 text-[10.5px] text-ink-faint" aria-label="مسار التنقل">
        <Link href="/market" className="hover:text-brand">
          السوق الحي
        </Link>
        <span>/</span>
        <span className="text-ink-muted">{LISTING_TYPE_LABEL[listing.listing_type]}</span>
        <span>/</span>
        <span className="truncate text-ink-secondary">{listing.drug_name}</span>
      </nav>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="space-y-3">
          <section className="panel overflow-hidden">
            <div className="relative aspect-[16/10] w-full bg-sunken sm:aspect-[16/8]">
              {listing.images[activeImage] ? (
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="group block size-full"
                  aria-label="تكبير صورة العلبة"
                >
                  <img
                    src={listing.images[activeImage]}
                    alt={listing.drug_name}
                    className="size-full object-contain p-2"
                  />
                  <span className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-2 py-1 text-[10px] font-semibold text-ink-secondary">
                    <ImageIcon size={11} aria-hidden />
                    تكبير · افحص تاريخ الانتهاء
                  </span>
                </button>
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1.5 text-ink-faint">
                  <PackageOpen size={30} strokeWidth={1.5} aria-hidden />
                  <p className="text-[11px]">لا توجد صور مرفوعة لهذا العرض</p>
                  <a
                    href={whatsappLink(pharmacy.phone, whatsappMessage)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] font-semibold text-brand hover:underline"
                  >
                    اطلب صورة العلبة عبر واتساب
                  </a>
                </div>
              )}

              <div className="absolute start-2 top-2">
                <ListingTypePill type={listing.listing_type} expiry={listing.expiry_date} />
              </div>
            </div>

            {listing.images.length > 1 && (
              <div className="flex gap-1.5 border-t border-line p-2">
                {listing.images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={cn(
                      "size-14 overflow-hidden rounded-sm border bg-sunken",
                      index === activeImage ? "border-brand" : "border-line opacity-75 hover:opacity-100",
                    )}
                    aria-label={`الصورة ${index + 1}`}
                  >
                    <img src={image} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel p-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="chip border-line bg-sunken text-ink-secondary">
                <Clock size={10} aria-hidden />
                {timeAgo(listing.created_at)}
              </span>
              {listing.status !== "ACTIVE" && (
                <span className="chip border-amber-line bg-amber-soft text-amber-ink">
                  {LISTING_STATUS_LABEL[listing.status]}
                </span>
              )}
              {listing.pharmacy.is_verified && (
                <span className="chip border-brand-line bg-brand-soft text-brand-ink">
                  <ShieldCheck size={10} strokeWidth={2} aria-hidden />
                  بيانات موثقة
                </span>
              )}
            </div>

            <h1 className="mt-2 text-[21px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {listing.drug_name}
            </h1>
            <p className="mt-1 text-[12px] text-ink-muted">
              {listing.active_ingredient || "لم تُسجل المادة الفعالة"} ·{" "}
              {DOSAGE_FORM_LABEL[listing.dosage_form]}
            </p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} aria-hidden />
                {location}
              </span>
              {listing.batch_number && (
                <span className="inline-flex items-center gap-1">
                  <ScanLine size={11} aria-hidden />
                  تشغيلة <span className="num text-ink-secondary">{listing.batch_number}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Truck size={11} aria-hidden />
                {listing.delivery_method}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
              <div className="bg-surface px-3 py-2">
                <p className="text-[9.5px] uppercase tracking-wide text-ink-faint">
                  {isShortage ? "سعر الجمهور المرجعي" : "سعر الجمهور للعلبة"}
                </p>
                <p className="num mt-0.5 text-[17px] font-bold text-ink">
                  {formatMoney(listing.public_price_egp)}
                  <span className="ms-1 font-sans text-[10px] font-medium text-ink-muted">ج.م</span>
                </p>
              </div>
              <div className="bg-surface px-3 py-2">
                <p className="text-[9.5px] uppercase tracking-wide text-ink-faint">
                  {isShortage ? "الكمية المطلوبة" : "الكمية المتاحة"}
                </p>
                <p className="num mt-0.5 text-[17px] font-bold text-ink">
                  {formatInt(listing.quantity)}
                  <span className="ms-1 font-sans text-[10px] font-medium text-ink-muted">علبة</span>
                </p>
              </div>
              <div className="bg-brand-soft px-3 py-2">
                <p className="text-[9.5px] uppercase tracking-wide text-brand-ink/70">
                  {isShortage ? "القيمة المرجعية" : "إجمالي الجمهور"}
                </p>
                <p className="num mt-0.5 text-[17px] font-bold text-brand-ink">
                  {formatMoney(total)}
                  <span className="ms-1 font-sans text-[10px] font-medium text-brand-ink/70">ج.م</span>
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-sm border border-brand-line bg-brand-soft/60 px-3 py-2.5">
              <p className="mb-1 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-ink/80">
                <ArrowLeftRight size={10} strokeWidth={2} aria-hidden />
                {isShortage ? "التسوية المطلوبة من الصيدلية الموفرة" : "مطلوب للبدل — جمهور في جمهور"}
              </p>
              <p className="text-[12.5px] leading-relaxed text-ink-secondary">{listing.swap_preference}</p>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <header className="flex items-center justify-between border-b border-line bg-canvas px-3.5 py-2">
              <h2 className="text-[12px] font-bold text-ink">بيانات العلبة والعرض</h2>
              <span className="text-[9.5px] text-ink-faint">بيانات مُدخلة من الصيدلية</span>
            </header>
            <dl className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
              {specs.map((spec) => (
                <div key={spec.label} className="flex items-center justify-between gap-2 bg-surface px-3 py-2">
                  <dt className="text-[10.5px] text-ink-muted">{spec.label}</dt>
                  <dd className={cn("text-[11.5px] font-medium text-ink", spec.mono && "num")}>{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="panel p-3.5">
            <h2 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-ink">
              <ShieldCheck size={13} className="text-brand" aria-hidden />
              قبل إتمام التبادل
            </h2>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink-secondary">
              <li className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                افحص التاريخ المطبوع على العلبة والتشغيلة — الصورة قد تكون قديمة.
              </li>
              <li className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                سوِّ أي فرق في القيمة نقداً بسعر الجمهور المعلن، ولا تُضف هامشاً على السعر.
              </li>
              <li className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                أدوية سلسلة التبريد (الأنسولين) تُسلَّم في حاوية مبردة وبسرعة.
              </li>
              <li className="flex gap-1.5">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-faint" aria-hidden />
                وثّق التسليم (صورة الكمية + إقرار استلام) لحماية الطرفين.
              </li>
            </ul>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-[73px]">
          <section className="panel p-3.5">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              إجمالي قيمة الجمهور
            </p>
            <div className="mt-0.5 flex items-end justify-between gap-2">
              <p className="num text-[24px] font-bold leading-none text-ink">
                {formatMoney(total)}
                <span className="ms-1 font-sans text-[11px] font-medium text-ink-muted">ج.م</span>
              </p>
              <span className="chip border-line bg-canvas text-ink-secondary">
                <CalendarClock size={10} aria-hidden />
                {isShortage ? "نواقص" : formatExpiry(listing.expiry_date)}
              </span>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-ink-muted">
              {isShortage
                ? "الكمية المطلوبة بسعر الجمهور المرجعي — يُسوَّى الفرق نقداً أو ببدل مكافئ."
                : `متبقي ${expiryCountdown(listing.expiry_date)} — التبادل بقيمة الجمهور الرسمية.`}
            </p>

            {isOwner ? (
              <div className="mt-2.5 rounded-sm border border-amber-line bg-amber-soft px-2.5 py-2">
                <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-ink">
                  <CircleAlert size={12} aria-hidden />
                  هذا العرض تابع لصيدليتك
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-amber-ink/80">
                  تابع عروض البدل الواردة واقبل أو ارفض من لوحة التحكم.
                </p>
                <Link href="/dashboard" className="btn btn-outline btn-sm mt-1.5 w-full bg-surface">
                  إدارة العرض والعروض الواردة
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="btn btn-primary mt-2.5 w-full"
              >
                <ArrowLeftRight size={15} strokeWidth={2} aria-hidden />
                {isShortage ? "توفير هذا الصنف" : "تقديم عرض بدل"}
              </button>
            )}

            <a
              href={whatsappLink(pharmacy.phone, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline mt-1.5 w-full"
            >
              <MessageCircle size={15} strokeWidth={1.75} aria-hidden />
              تواصل واتساب مباشر
            </a>

            <div className="mt-2.5 flex items-center gap-1.5 border-t border-line pt-2 text-[10px] text-ink-faint">
              <ShieldCheck size={11} className="text-brand" aria-hidden />
              بيانات الصيدلية محمية — لا تُعرض أرقام إلا بموافقتك.
            </div>
          </section>

          <section className="panel overflow-hidden">
            <header className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-brand-soft font-display text-[12px] font-bold text-brand-ink ring-1 ring-brand-line">
                {initials(pharmacy.pharmacy_name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-bold text-ink">{pharmacy.pharmacy_name}</p>
                <p className="truncate text-[10px] text-ink-muted">{pharmacy.owner_name}</p>
              </div>
              <span className="ms-auto shrink-0">
                <VerifiedBadge verified={pharmacy.is_verified} compact />
              </span>
            </header>

            <div className="grid grid-cols-2 gap-px bg-line">
              <div className="bg-surface px-3 py-2">
                <p className="text-[9px] uppercase tracking-wide text-ink-faint">التقييم</p>
                <p className="mt-0.5 flex items-center gap-1">
                  <Star size={11} className="fill-amber text-amber-strong" aria-hidden />
                  <span className="num text-[13px] font-bold text-ink">{pharmacy.rating_avg.toFixed(1)}</span>
                  <span className="text-[9.5px] text-ink-faint">/ 5</span>
                </p>
              </div>
              <div className="bg-surface px-3 py-2">
                <p className="text-[9px] uppercase tracking-wide text-ink-faint">تبادلات ناجحة</p>
                <p className="num mt-0.5 text-[13px] font-bold text-ink">
                  {formatInt(pharmacy.swaps_count)}
                  <span className="ms-1 font-sans text-[9px] font-normal text-ink-faint">عملية</span>
                </p>
              </div>
            </div>

            <div className="space-y-2 px-3.5 py-2.5">
              <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink-secondary">
                <MapPin size={12} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
                <span>
                  {pharmacy.address_details}
                  <span className="mt-0.5 block text-[10px] text-ink-faint">{location}</span>
                </span>
              </p>

              <div className="flex flex-wrap gap-1">
                {pharmacy.delivery_preferences.map((method) => (
                  <span key={method} className="chip border-line bg-canvas text-ink-secondary">
                    <Truck size={9} aria-hidden />
                    {method}
                  </span>
                ))}
              </div>

              <LocationPreview
                latitude={pharmacy.latitude}
                longitude={pharmacy.longitude}
                label={`موقع ${pharmacy.pharmacy_name}`}
                height="h-[150px]"
              />

              <p className="flex items-center gap-1 text-[9.5px] text-ink-faint">
                <Store size={10} aria-hidden />
                {DELIVERY_METHOD_HINT[listing.delivery_method] ?? "تنسيق مباشر بين الصيدليتين"}
              </p>
            </div>
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[62px] z-30 border-t border-line bg-surface px-3 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-ink-muted">إجمالي قيمة الجمهور</p>
            <p className="num text-[15px] font-bold text-ink">
              {formatMoney(total)} <span className="font-sans text-[9.5px] font-medium">ج.م</span>
            </p>
          </div>
          {isOwner ? (
            <Link href="/dashboard" className="btn btn-outline btn-sm">
              إدارة العرض
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <ArrowLeftRight size={13} aria-hidden />
              {isShortage ? "توفير الصنف" : "عرض بدل"}
            </button>
          )}
          <a
            href={whatsappLink(pharmacy.phone, whatsappMessage)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-outline btn-sm w-9 px-0"
            aria-label="واتساب"
          >
            <MessageCircle size={14} aria-hidden />
          </a>
        </div>
      </div>

      <SwapDrawer
        listing={listing}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        authenticated={isAuthenticated}
      />

      <ImageLightbox
        open={previewOpen}
        images={listing.images}
        drugName={listing.drug_name}
        expiry={listing.expiry_date}
        batch={listing.batch_number}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
