"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeftRight,
  CalendarClock,
  Eye,
  Inbox,
  Loader2,
  Package,
  Plus,
  Store,
} from "lucide-react";

import { changeListingStatusAction } from "@/app/actions/listings";
import { ListingTypePill } from "@/components/market/listing-pills";
import { cn } from "@/lib/cn";
import { formatExpiry, formatInt, formatMoney, listTotal, timeAgo } from "@/lib/format";
import type { ListingStatus, ListingView } from "@/lib/types";

type Tab = "EXCHANGE" | "SHORTAGE";

export function MyListings({
  listings,
  proposalCounts,
}: {
  listings: ListingView[];
  proposalCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("EXCHANGE");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const exchange = listings.filter((listing) => listing.listing_type !== "SHORTAGE_REQUEST");
  const shortage = listings.filter((listing) => listing.listing_type === "SHORTAGE_REQUEST");
  const visible = tab === "EXCHANGE" ? exchange : shortage;

  const changeStatus = (id: string, status: ListingStatus) => {
    setPendingId(id);
    startTransition(async () => {
      await changeListingStatusAction(id, status);
      setPendingId(null);
      router.refresh();
    });
  };

  return (
    <section className="panel overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas px-3 py-1.5">
        <div className="flex items-center gap-0.5">
          <TabButton
            active={tab === "EXCHANGE"}
            onClick={() => setTab("EXCHANGE")}
            icon={Package}
            label="عروضي النشطة"
            count={exchange.length}
          />
          <TabButton
            active={tab === "SHORTAGE"}
            onClick={() => setTab("SHORTAGE")}
            icon={Inbox}
            label="طلباتي للنواقص"
            count={shortage.length}
          />
        </div>
        <Link href="/listings/new" className="btn btn-primary btn-sm h-8">
          <Plus size={12} strokeWidth={2} aria-hidden />
          عرض جديد
        </Link>
      </header>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-sm bg-sunken text-ink-muted">
            {tab === "EXCHANGE" ? <Package size={19} strokeWidth={1.5} /> : <Inbox size={19} strokeWidth={1.5} />}
          </span>
          <p className="text-[12.5px] font-semibold text-ink">
            {tab === "EXCHANGE" ? "لا توجد عروض تبادل منشورة" : "لا توجد طلبات نواقص منشورة"}
          </p>
          <p className="max-w-sm text-[10.5px] leading-relaxed text-ink-muted">
            {tab === "EXCHANGE"
              ? "انشر دواءً قرب الانتهاء أو راكداً ليصل لباقي الصيدليات في محافظتك."
              : "اطلب صنفاً ناقصاً من الصيدليات القريبة ليتم توفيره أو مبادلته."}
          </p>
          <Link href="/listings/new" className="btn btn-primary btn-sm mt-1">
            <Plus size={12} aria-hidden />
            {tab === "EXCHANGE" ? "نشر عرض تبادل" : "طلب نواقص"}
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface">
                  <th className="th">الصنف</th>
                  <th className="th">النوع / الصلاحية</th>
                  <th className="th">الكمية × السعر</th>
                  <th className="th">الإجمالي</th>
                  <th className="th">عروض البدل</th>
                  <th className="th">الحالة</th>
                  <th className="th text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((listing) => (
                  <tr key={listing.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span className="size-9 shrink-0 overflow-hidden rounded-sm border border-line bg-sunken">
                          {listing.images[0] ? (
                            <img src={listing.images[0]} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="grid size-full place-items-center text-ink-faint">
                              <Package size={13} aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={`/listings/${listing.id}`}
                            className="block max-w-[220px] truncate text-[12px] font-semibold text-ink hover:text-brand"
                          >
                            {listing.drug_name}
                          </Link>
                          <span className="block text-[9.5px] text-ink-faint">{timeAgo(listing.created_at)}</span>
                        </span>
                      </div>
                    </td>
                    <td className="td">
                      <ListingTypePill
                        type={listing.listing_type}
                        expiry={listing.expiry_date}
                        showCountdown={false}
                      />
                      <span className="num mt-1 flex items-center gap-1 text-[10px] text-ink-muted">
                        <CalendarClock size={9} aria-hidden />
                        {formatExpiry(listing.expiry_date)}
                      </span>
                    </td>
                    <td className="td num">
                      {formatInt(listing.quantity)} × {formatMoney(listing.public_price_egp)}
                    </td>
                    <td className="td num font-semibold text-ink">{formatMoney(listTotal(listing))}</td>
                    <td className="td">
                      {proposalCounts[listing.id] ? (
                        <Link
                          href="/dashboard/swaps"
                          className="num inline-flex items-center gap-1 rounded-sm border border-brand-line bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-ink"
                        >
                          <ArrowLeftRight size={9} aria-hidden />
                          {formatInt(proposalCounts[listing.id])}
                        </Link>
                      ) : (
                        <span className="num text-[10px] text-ink-faint">0</span>
                      )}
                    </td>
                    <td className="td">
                      <StatusChip status={listing.status} />
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/listings/${listing.id}`}
                          className="grid size-7 place-items-center rounded-sm border border-line text-ink-muted hover:bg-sunken hover:text-ink"
                          aria-label="عرض"
                        >
                          <Eye size={12} aria-hidden />
                        </Link>
                        {pendingId === listing.id ? (
                          <Loader2 size={13} className="animate-spin text-brand" aria-hidden />
                        ) : listing.status === "ACTIVE" ? (
                          <button
                            type="button"
                            onClick={() => changeStatus(listing.id, "RESERVED")}
                            className="btn btn-outline btn-sm h-7 px-2 text-[10px]"
                          >
                            حجز
                          </button>
                        ) : listing.status === "CANCELLED" ? (
                          <button
                            type="button"
                            onClick={() => changeStatus(listing.id, "ACTIVE")}
                            className="btn btn-outline btn-sm h-7 px-2 text-[10px]"
                          >
                            إعادة تنشيط
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => changeStatus(listing.id, "COMPLETED")}
                            className="btn btn-outline btn-sm h-7 px-2 text-[10px]"
                          >
                            إتمام
                          </button>
                        )}
                        {listing.status !== "CANCELLED" && listing.status !== "COMPLETED" && (
                          <button
                            type="button"
                            onClick={() => changeStatus(listing.id, "CANCELLED")}
                            className="btn btn-sm h-7 px-1.5 text-[10px] text-crimson hover:bg-crimson-soft"
                          >
                            إلغاء
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 p-2.5 md:hidden">
            {visible.map((listing) => (
              <article key={listing.id} className="rounded-md border border-line bg-surface p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <ListingTypePill
                    type={listing.listing_type}
                    expiry={listing.expiry_date}
                    showCountdown={false}
                  />
                  <StatusChip status={listing.status} />
                </div>
                <Link
                  href={`/listings/${listing.id}`}
                  className="mt-1.5 block text-[12.5px] font-bold text-ink hover:text-brand"
                >
                  {listing.drug_name}
                </Link>
                <div className="mt-1.5 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
                  <Cell label="الكمية" value={`${formatInt(listing.quantity)} علبة`} />
                  <Cell label="سعر الجمهور" value={formatMoney(listing.public_price_egp)} />
                  <Cell label="الإجمالي" value={formatMoney(listTotal(listing))} accent />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-muted">
                  <span className="num flex items-center gap-1">
                    <CalendarClock size={9} aria-hidden />
                    {formatExpiry(listing.expiry_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <ArrowLeftRight size={9} aria-hidden />
                    {formatInt(proposalCounts[listing.id] ?? 0)} عرض بدل
                  </span>
                </div>
                <div className="mt-2 flex gap-1.5">
                  <Link href={`/listings/${listing.id}`} className="btn btn-outline btn-sm flex-1">
                    تفاصيل العرض
                  </Link>
                  {listing.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => changeStatus(listing.id, "RESERVED")}
                      className="btn btn-outline btn-sm"
                    >
                      حجز
                    </button>
                  )}
                  {listing.status !== "CANCELLED" && listing.status !== "COMPLETED" && (
                    <button
                      type="button"
                      onClick={() => changeStatus(listing.id, "CANCELLED")}
                      className="btn btn-sm text-crimson hover:bg-crimson-soft"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Package;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-8 items-center gap-1.5 px-2.5 text-[11.5px] transition-colors",
        active ? "font-semibold text-brand-ink" : "font-medium text-ink-muted hover:text-ink",
      )}
    >
      <Icon size={12} strokeWidth={1.75} aria-hidden />
      {label}
      <span className="num rounded-sm bg-sunken px-1 text-[9.5px] font-semibold text-ink-muted">
        {formatInt(count)}
      </span>
      {active && <span className="absolute inset-x-1.5 -bottom-[7px] h-[2px] bg-brand" aria-hidden />}
    </button>
  );
}

function Cell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("px-2 py-1.5", accent ? "bg-canvas" : "bg-surface")}>
      <p className="text-[8.5px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={cn("num mt-0.5 text-[11.5px] font-semibold", accent ? "text-brand-ink" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}

function StatusChip({ status }: { status: ListingStatus }) {
  const map: Record<ListingStatus, string> = {
    ACTIVE: "border-brand-line bg-brand-soft text-brand-ink",
    RESERVED: "border-amber-line bg-amber-soft text-amber-ink",
    COMPLETED: "border-line bg-sunken text-ink-secondary",
    CANCELLED: "border-crimson-line bg-crimson-soft text-crimson-ink",
  };
  const labels: Record<ListingStatus, string> = {
    ACTIVE: "متاح",
    RESERVED: "محجوز",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغي",
  };
  return <span className={cn("chip", map[status])}>{labels[status]}</span>;
}
