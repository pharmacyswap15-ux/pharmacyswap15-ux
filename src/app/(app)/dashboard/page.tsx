import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  CircleAlert,
  Package,
  Plus,
  ShieldCheck,
  Star,
  Store,
  Truck,
} from "lucide-react";

import { MyListings } from "@/components/dashboard/my-listings";
import { cityName, governorateName, PROPOSAL_STATUS_LABEL } from "@/lib/constants";
import { getListingViews, getProposalViews } from "@/lib/data";
import { cities, governorates } from "@/lib/geo";
import { formatInt, formatMoney, listTotal, timeAgo } from "@/lib/format";
import { getCurrentPharmacy } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "لوحة التحكم",
};

export default async function DashboardPage() {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) redirect("/login?next=/dashboard");

  const [listings, proposals] = await Promise.all([getListingViews(), getProposalViews()]);

  const mine = listings.filter((listing) => listing.pharmacy_id === pharmacy.id);
  const incoming = proposals.filter((proposal) => proposal.listing.pharmacy_id === pharmacy.id);
  const outgoing = proposals.filter(
    (proposal) => proposal.proposer_pharmacy_id === pharmacy.id,
  );

  const proposalCounts: Record<string, number> = {};
  for (const proposal of incoming) {
    proposalCounts[proposal.listing_id] = (proposalCounts[proposal.listing_id] ?? 0) + 1;
  }

  const activeListings = mine.filter((listing) => listing.status === "ACTIVE");
  const exchangeActive = activeListings.filter(
    (listing) => listing.listing_type !== "SHORTAGE_REQUEST",
  );
  const shortageActive = activeListings.filter(
    (listing) => listing.listing_type === "SHORTAGE_REQUEST",
  );
  const pendingIncoming = incoming.filter((proposal) => proposal.status === "PENDING");
  const stockValue = exchangeActive.reduce((sum, listing) => sum + listTotal(listing), 0);

  const latestIncoming = [...incoming]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[21px] font-bold tracking-[-0.02em]">لوحة التحكم</h1>
            <span className="chip border-line bg-sunken text-ink-secondary">
              <Store size={10} aria-hidden />
              {pharmacy.pharmacy_name}
            </span>
            {pharmacy.is_verified ? (
              <span className="chip border-brand-line bg-brand-soft text-brand-ink">
                <ShieldCheck size={10} strokeWidth={2} aria-hidden />
                موثقة
              </span>
            ) : (
              <span className="chip border-amber-line bg-amber-soft text-amber-ink">
                <CircleAlert size={10} aria-hidden />
                التوثيق قيد المراجعة
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            أهلاً {pharmacy.owner_name} — {cityName(cities, pharmacy.city_id)}،{" "}
            {governorateName(governorates, pharmacy.governorate_id)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href="/market" className="btn btn-outline btn-sm h-9">
            السوق الحي
          </Link>
          <Link href="/dashboard/swaps" className="btn btn-outline btn-sm h-9">
            <ArrowLeftRight size={13} aria-hidden />
            عروض البدل
          </Link>
          <Link href="/listings/new" className="btn btn-primary btn-sm h-9">
            <Plus size={13} strokeWidth={2} aria-hidden />
            عرض جديد
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
        <Metric
          icon={Package}
          label="عروض نشطة"
          value={formatInt(activeListings.length)}
          hint={`${formatInt(exchangeActive.length)} تبادل · ${formatInt(shortageActive.length)} نواقص`}
        />
        <Metric
          icon={ArrowLeftRight}
          label="عروض بدل واردة"
          value={formatInt(pendingIncoming.length)}
          hint={`${formatInt(incoming.length)} إجمالي · ${formatInt(outgoing.length)} صادرة`}
          accent={pendingIncoming.length > 0}
        />
        <Metric
          icon={CalendarClock}
          label="قيمة مخزون التبادل"
          value={`${formatMoney(stockValue)} ج.م`}
          hint="بسعر الجمهور للعروض النشطة"
        />
        <Metric
          icon={Star}
          label="سجل التبادل"
          value={formatInt(pharmacy.swaps_count)}
          hint={`تقييم ${pharmacy.rating_avg.toFixed(1)} / 5`}
        />
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_324px]">
        <MyListings listings={mine} proposalCounts={proposalCounts} />

        <aside className="space-y-2.5">
          <section className="panel overflow-hidden">
            <header className="flex items-center justify-between border-b border-line bg-canvas px-3 py-2">
              <h2 className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                <ArrowLeftRight size={13} className="text-ink-muted" aria-hidden />
                أحدث العروض الواردة
              </h2>
              <Link href="/dashboard/swaps" className="text-[10px] font-semibold text-brand hover:underline">
                الكل
              </Link>
            </header>

            {latestIncoming.length === 0 ? (
              <p className="px-3 py-5 text-center text-[10.5px] leading-relaxed text-ink-muted">
                لا توجد عروض بدل واردة بعد. انشر عروضاً أكثر ليصل صوت صيدليتك لباقي المحافظة.
              </p>
            ) : (
              <ul>
                {latestIncoming.map((proposal) => {
                  const requested = listTotal(proposal.listing);
                  const difference = proposal.offered_total_value_egp - requested;
                  return (
                    <li key={proposal.id} className="border-b border-line px-3 py-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-[11px] font-semibold text-ink">
                          {proposal.listing.drug_name}
                        </p>
                        <span className="chip shrink-0 border-line bg-canvas text-[9px] text-ink-muted">
                          {PROPOSAL_STATUS_LABEL[proposal.status]}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-ink-muted">
                        من {proposal.proposer.pharmacy_name}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="num text-[10px] text-ink-secondary">
                          {formatMoney(proposal.offered_total_value_egp)} ج.م
                        </span>
                        <span
                          className={`num text-[9.5px] font-semibold ${
                            Math.abs(difference) < 5
                              ? "text-brand"
                              : difference > 0
                                ? "text-amber-strong"
                                : "text-crimson"
                          }`}
                        >
                          {Math.abs(difference) < 5
                            ? "متكافئ"
                            : `${difference > 0 ? "+" : "−"}${formatMoney(Math.abs(difference))}`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[9px] text-ink-faint">{timeAgo(proposal.created_at)}</p>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="border-t border-line p-2">
              <Link href="/dashboard/swaps" className="btn btn-outline btn-sm w-full">
                إدارة كل عروض البدل
                <ArrowLeft size={12} aria-hidden />
              </Link>
            </div>
          </section>

          <section className="panel p-3">
            <h2 className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink">
              <Store size={12} className="text-ink-muted" aria-hidden />
              بيانات الصيدلية
            </h2>
            <dl className="mt-2 space-y-1 text-[10.5px]">
              <Line label="المحافظة" value={governorateName(governorates, pharmacy.governorate_id)} />
              <Line label="المدينة" value={cityName(cities, pharmacy.city_id)} />
              <Line label="الهاتف" value={pharmacy.phone} mono />
              <Line label="التبادلات" value={`${formatInt(pharmacy.swaps_count)} عملية`} mono />
              <Line label="التقييم" value={`${pharmacy.rating_avg.toFixed(1)} / 5`} mono />
            </dl>
            <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
              {pharmacy.delivery_preferences.map((method) => (
                <span key={method} className="chip border-line bg-canvas text-[9px] text-ink-secondary">
                  <Truck size={8} aria-hidden />
                  {method}
                </span>
              ))}
            </div>
            <Link href="/profile" className="btn btn-outline btn-sm mt-2 w-full">
              تعديل بيانات الصيدلية
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface px-3 py-2.5">
      <p className="flex items-center gap-1 text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">
        <Icon size={10} aria-hidden />
        {label}
      </p>
      <p className={`num mt-0.5 text-[17px] font-bold ${accent ? "text-crimson" : "text-ink"}`}>{value}</p>
      <p className="truncate text-[9.5px] text-ink-faint">{hint}</p>
    </div>
  );
}

function Line({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`max-w-[170px] truncate text-ink ${mono ? "num" : ""}`}>{value}</dd>
    </div>
  );
}
