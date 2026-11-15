"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarClock,
  ImageIcon,
  MapPin,
  MessageCircle,
  PackageOpen,
  ScanLine,
  Truck,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { DELIVERY_METHOD_HINT, DOSAGE_FORM_LABEL, whatsappLink } from "@/lib/constants";
import {
  daysUntil,
  expiryCountdown,
  formatExpiry,
  formatInt,
  formatMoney,
  listTotal,
  timeAgo,
} from "@/lib/format";
import type { MarketListing } from "@/lib/types";

import { ListingTypePill, LISTING_TONE } from "./listing-pills";

export function ListingCard({
  listing,
  onPropose,
  onPreview,
  isOwner = false,
}: {
  listing: MarketListing;
  onPropose: (listing: MarketListing) => void;
  onPreview: (listing: MarketListing) => void;
  isOwner?: boolean;
}) {
  const isShortage = listing.listing_type === "SHORTAGE_REQUEST";
  const total = listTotal(listing);
  const days = daysUntil(listing.expiry_date);
  const expired = days !== null && days < 0;
  const thumbnail = listing.images[0];
  const whatsappMessage = `السلام عليكم ${listing.pharmacy.pharmacy_name}، بخصوص عرض "${listing.drug_name}" (${formatInt(listing.quantity)} علبة) على فارماسواب — هل ما زال متاحاً للتبادل؟`;

  return (
    <article
      className={cn(
        "group flex flex-col rounded-md border border-line bg-surface transition-colors",
        "hover:border-line-strong focus-within:border-line-strong",
      )}
    >
      <div className={cn("h-[3px] rounded-t-[5px]", expired ? "bg-crimson" : LISTING_TONE[listing.listing_type].ribbon)} />

      <div className="flex items-start gap-3 p-3 pb-2.5">
        {thumbnail ? (
          <button
            type="button"
            onClick={() => onPreview(listing)}
            className="relative size-[86px] shrink-0 overflow-hidden rounded-sm border border-line bg-sunken no-tap-highlight"
            aria-label={`تكبير صورة ${listing.drug_name}`}
          >
            <img
              src={thumbnail}
              alt={listing.drug_name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-surface/95 py-0.5 text-[9px] font-semibold text-ink-secondary"
            >
              <ImageIcon size={10} aria-hidden />
              تكبير · {listing.images.length}
            </span>
          </button>
        ) : (
          <div className="grid size-[86px] shrink-0 place-items-center rounded-sm border border-dashed border-line bg-canvas text-ink-faint">
            <div className="flex flex-col items-center gap-1">
              <PackageOpen size={20} strokeWidth={1.5} aria-hidden />
              <span className="text-[9px]">بدون صورة</span>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ListingTypePill type={listing.listing_type} expiry={listing.expiry_date} />
            {expired && (
              <span className="chip border-crimson-line bg-crimson-soft text-crimson-ink">
                خارج الصلاحية
              </span>
            )}
          </div>

          <h3 className="mt-1.5 text-[13.5px] font-bold leading-[1.45] text-ink">
            <Link
              href={`/listings/${listing.id}`}
              className="line-clamp-2 hover:text-brand-hover hover:underline hover:decoration-brand-line hover:underline-offset-2"
            >
              {listing.drug_name}
            </Link>
          </h3>

          <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-muted">
            {listing.active_ingredient || "بدون اسم علمي مسجل"}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <ScanLine size={11} strokeWidth={1.75} aria-hidden />
              {DOSAGE_FORM_LABEL[listing.dosage_form]}
            </span>
            {listing.batch_number && (
              <span className="inline-flex items-center gap-1">
                تشغيلة <span className="num text-ink-secondary">{listing.batch_number}</span>
              </span>
            )}
            <span>{timeAgo(listing.created_at)}</span>
          </div>
        </div>
      </div>

      <div className="mx-3 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
        <div className="bg-surface px-2 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wide text-ink-faint">
            {isShortage ? "سعر الجمهور" : "سعر العلبة"}
          </p>
          <p className="num mt-0.5 text-[13px] font-semibold text-ink">
            {formatMoney(listing.public_price_egp)}
            <span className="ms-1 font-sans text-[9px] font-medium text-ink-muted">ج.م</span>
          </p>
        </div>
        <div className="bg-surface px-2 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wide text-ink-faint">
            {isShortage ? "الكمية المطلوبة" : "الكمية"}
          </p>
          <p className="num mt-0.5 text-[13px] font-semibold text-ink">
            {formatInt(listing.quantity)}
            <span className="ms-1 font-sans text-[9px] font-medium text-ink-muted">علبة</span>
          </p>
        </div>
        <div className="bg-canvas px-2 py-1.5">
          <p className="text-[9px] font-medium uppercase tracking-wide text-ink-faint">
            {isShortage ? "القيمة المرجعية" : "إجمالي الجمهور"}
          </p>
          <p className="num mt-0.5 text-[13px] font-bold text-brand-ink">
            {formatMoney(total)}
            <span className="ms-1 font-sans text-[9px] font-medium text-ink-muted">ج.م</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2 text-[10.5px]">
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <CalendarClock size={12} strokeWidth={1.75} aria-hidden />
          {isShortage ? "تاريخ الانتهاء غير مطلوب" : "ينتهي"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="num text-[11.5px] font-semibold text-ink-secondary">
            {formatExpiry(listing.expiry_date)}
          </span>
          {!isShortage && (
            <span
              className={cn(
                "num rounded-sm px-1 py-0.5 text-[9.5px] font-semibold",
                expired
                  ? "bg-crimson-soft text-crimson-ink"
                  : (days ?? 0) < 90
                    ? "bg-amber-soft text-amber-ink"
                    : "bg-sunken text-ink-secondary",
              )}
            >
              {expiryCountdown(listing.expiry_date)}
            </span>
          )}
        </span>
      </div>

      <div className="mx-3 mb-2.5 rounded-sm border border-brand-line/70 bg-brand-soft/60 px-2.5 py-2">
        <p className="mb-0.5 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-ink/80">
          <ArrowLeftRight size={10} strokeWidth={2} aria-hidden />
          {isShortage ? "طريقة التسوية المطلوبة" : "مطلوب للبدل"}
        </p>
        <p className="line-clamp-2 text-[11.5px] leading-relaxed text-ink-secondary">
          {listing.swap_preference}
        </p>
      </div>

      <div className="mt-auto border-t border-line px-3 pb-2.5 pt-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-[11.5px] font-semibold text-ink">
              {listing.pharmacy.pharmacy_name}
              {listing.pharmacy.is_verified && (
                <>
                  <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  <span className="sr-only">صيدلية موثقة</span>
                </>
              )}
            </p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-ink-muted">
              <MapPin size={10} strokeWidth={1.75} aria-hidden />
              {listing.governorate?.name_ar ?? "—"} · {listing.city?.name_ar ?? "—"}
              {listing.distanceKm !== null && listing.distanceKm !== undefined && (
                <span className="num ms-0.5 text-brand-ink">· {listing.distanceKm} كم</span>
              )}
            </p>
          </div>
          <span
            className="chip shrink-0 border-line bg-canvas text-ink-secondary"
            title={DELIVERY_METHOD_HINT[listing.delivery_method] ?? ""}
          >
            <Truck size={10} strokeWidth={1.75} aria-hidden />
            {listing.delivery_method}
          </span>
        </div>

        {isOwner ? (
          <Link href="/dashboard" className="btn btn-outline btn-sm mt-2 w-full">
            إدارة هذا العرض
          </Link>
        ) : (
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => onPropose(listing)}
              className="btn btn-primary btn-sm flex-1"
            >
              <ArrowLeftRight size={13} strokeWidth={2} aria-hidden />
              {isShortage ? "توفير الصنف" : "تقديم عرض بدل"}
            </button>
            <a
              href={whatsappLink(listing.pharmacy.phone, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm w-9 px-0"
              aria-label="تواصل واتساب"
              title="تواصل واتساب"
            >
              <MessageCircle size={14} strokeWidth={1.75} aria-hidden />
            </a>
          </div>
        )}
      </div>
    </article>
  );
}
