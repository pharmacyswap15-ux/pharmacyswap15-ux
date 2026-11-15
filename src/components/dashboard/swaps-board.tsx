"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  CircleAlert,
  Inbox,
  Loader2,
  MapPin,
  MessageCircle,
  Scale,
  Send,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";

import { respondProposalAction } from "@/app/actions/proposals";
import { ListingTypePill } from "@/components/market/listing-pills";
import { cn } from "@/lib/cn";
import {
  cityName,
  governorateName,
  LISTING_TYPE_LABEL,
  PROPOSAL_STATUS_LABEL,
  whatsappLink,
} from "@/lib/constants";
import { formatInt, formatMoney, listTotal, timeAgo } from "@/lib/format";
import type { City, Governorate, ProposalStatus, ProposalView } from "@/lib/types";

type Tab = "incoming" | "outgoing";

export function SwapsBoard({
  incoming,
  outgoing,
  governorates,
  cities,
}: {
  incoming: ProposalView[];
  outgoing: ProposalView[];
  governorates: Governorate[];
  cities: City[];
}) {
  const [tab, setTab] = useState<Tab>("incoming");
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const list = tab === "incoming" ? incoming : outgoing;
  const pendingIncoming = incoming.filter((proposal) => proposal.status === "PENDING").length;

  const respond = (proposalId: string, status: ProposalStatus) => {
    const key = `${proposalId}:${status}`;
    setActionKey(key);
    setError(null);
    startTransition(async () => {
      const result = await respondProposalAction(proposalId, status);
      if (!result.ok) setError(result.error ?? "تعذر تنفيذ الإجراء.");
      setActionKey(null);
      router.refresh();
    });
  };

  return (
    <div>
      {error && (
        <p className="mb-2 flex items-center gap-1.5 rounded-sm border border-crimson-line bg-crimson-soft px-2.5 py-1.5 text-[11px] text-crimson-ink">
          <CircleAlert size={12} aria-hidden />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line">
        <div className="flex items-center gap-0.5">
          <TabButton
            active={tab === "incoming"}
            onClick={() => setTab("incoming")}
            icon={Inbox}
            label="عروض واردة إلى صيدليتي"
            count={incoming.length}
            highlight={pendingIncoming > 0}
          />
          <TabButton
            active={tab === "outgoing"}
            onClick={() => setTab("outgoing")}
            icon={Send}
            label="عروض قدّمتها"
            count={outgoing.length}
          />
        </div>
        <p className="hidden items-center gap-1 pb-1.5 text-[9.5px] text-ink-faint sm:flex">
          <ShieldCheck size={10} aria-hidden />
          القبول يحجز الصنف تلقائياً ويرفض العروض الأخرى
        </p>
      </div>

      {list.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-surface px-4 py-12 text-center">
          <span className="grid size-10 place-items-center rounded-sm bg-sunken text-ink-muted">
            <Inbox size={19} strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-[12.5px] font-semibold text-ink">
            {tab === "incoming" ? "لا توجد عروض بدل واردة" : "لم تقدّم عروض بدل بعد"}
          </p>
          <p className="max-w-sm text-[10.5px] leading-relaxed text-ink-muted">
            {tab === "incoming"
              ? "عند تقديم صيدلية أخرى عرضاً على أحد أصنافك سيظهر هنا للمراجعة والقبول."
              : "تصفح السوق الحي واختر صنفاً، ثم استخدم حاسبة التبادل العادل لتقديم عرضك."}
          </p>
          <Link href="/market" className="btn btn-primary btn-sm mt-1">
            تصفح السوق الحي
          </Link>
        </div>
      ) : (
        <div className="mt-2.5 grid gap-2.5 xl:grid-cols-2">
          {list.map((proposal) => {
            const requested = listTotal(proposal.listing);
            const offered = proposal.offered_total_value_egp;
            const difference = Math.round((offered - requested) * 100) / 100;
            const balanced = Math.abs(difference) <= Math.max(5, requested * 0.02);
            const counterpart = tab === "incoming" ? proposal.proposer : proposal.listing.pharmacy;
            const counterpartCity = `${governorateName(governorates, counterpart.governorate_id)} · ${cityName(cities, counterpart.city_id)}`;

            return (
              <article key={proposal.id} className="panel overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-canvas px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-9 shrink-0 overflow-hidden rounded-sm border border-line bg-sunken">
                      {proposal.listing.images[0] ? (
                        <img src={proposal.listing.images[0]} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="grid size-full place-items-center text-ink-faint">
                          <ArrowLeftRight size={14} aria-hidden />
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/listings/${proposal.listing.id}`}
                        className="block truncate text-[12px] font-bold text-ink hover:text-brand"
                      >
                        {proposal.listing.drug_name}
                      </Link>
                      <p className="truncate text-[9.5px] text-ink-faint">
                        {LISTING_TYPE_LABEL[proposal.listing.listing_type]} · {timeAgo(proposal.created_at)}
                      </p>
                    </div>
                  </div>
                  <ProposalStatusChip status={proposal.status} />
                </header>

                <div className="grid grid-cols-2 gap-px bg-line">
                  <div className="bg-surface p-2.5">
                    <p className="text-[9px] uppercase tracking-wide text-ink-faint">
                      المطلوب ({formatInt(proposal.listing.quantity)} علبة)
                    </p>
                    <p className="num mt-0.5 text-[15px] font-bold text-ink">
                      {formatMoney(requested)}
                      <span className="ms-1 font-sans text-[9px] font-medium text-ink-muted">ج.م</span>
                    </p>
                    <p className="mt-0.5 text-[9px] text-ink-faint">
                      {formatMoney(proposal.listing.public_price_egp)} × {formatInt(proposal.listing.quantity)}
                    </p>
                  </div>
                  <div className="bg-surface p-2.5">
                    <p className="text-[9px] uppercase tracking-wide text-ink-faint">المعروض</p>
                    <p className="num mt-0.5 text-[15px] font-bold text-brand-ink">
                      {formatMoney(offered)}
                      <span className="ms-1 font-sans text-[9px] font-medium text-ink-muted">ج.م</span>
                    </p>
                    <p className="mt-0.5 text-[9px] text-ink-faint">
                      {formatInt(proposal.offered_items.length)} صنف معروض
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between gap-2 border-b border-line px-3 py-1.5",
                    balanced ? "bg-brand-soft" : difference > 0 ? "bg-amber-soft" : "bg-crimson-soft",
                  )}
                >
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-secondary">
                    <Scale size={11} aria-hidden />
                    {balanced
                      ? "تبادل متكافئ — لا فرق نقدي"
                      : difference > 0
                        ? "فرق لصالح صاحب العرض الأصلي"
                        : "فرق لصالحك — يُسوَّى نقداً"}
                  </span>
                  <span
                    className={cn(
                      "num text-[11px] font-bold",
                      balanced ? "text-brand" : difference > 0 ? "text-amber-strong" : "text-crimson",
                    )}
                  >
                    {difference > 0 ? "+" : difference < 0 ? "−" : ""}
                    {formatMoney(Math.abs(difference))} ج.م
                  </span>
                </div>

                <div className="px-3 py-2">
                  <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                    الأصناف المعروضة
                  </p>
                  <ul className="space-y-0.5">
                    {proposal.offered_items.map((item, index) => (
                      <li
                        key={`${item.name}-${index}`}
                        className="flex items-center justify-between gap-2 text-[10.5px]"
                      >
                        <span className="min-w-0 truncate text-ink-secondary">
                          <span className="num text-ink-faint">{formatInt(item.quantity)} ×</span>{" "}
                          {item.name}
                        </span>
                        <span className="num shrink-0 font-medium text-ink">
                          {formatMoney(item.quantity * item.unit_price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-line px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 truncate text-[10.5px] font-semibold text-ink">
                        {counterpart.pharmacy_name}
                        {counterpart.is_verified && (
                          <span className="size-1.5 rounded-full bg-brand" aria-label="موثقة" />
                        )}
                      </p>
                      <p className="flex items-center gap-1 truncate text-[9px] text-ink-faint">
                        <MapPin size={8} aria-hidden />
                        {counterpartCity}
                        <span className="ms-1 inline-flex items-center gap-1">
                          <Truck size={8} aria-hidden />
                          {proposal.handover_method}
                        </span>
                      </p>
                    </div>
                    <a
                      href={whatsappLink(
                        counterpart.phone,
                        `السلام عليكم ${counterpart.pharmacy_name}، بخصوص عرض البدل على "${proposal.listing.drug_name}" في فارماسواب.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="grid size-7 shrink-0 place-items-center rounded-sm border border-line text-ink-muted hover:border-brand-line hover:bg-brand-soft hover:text-brand"
                      aria-label="واتساب"
                    >
                      <MessageCircle size={12} aria-hidden />
                    </a>
                  </div>

                  {proposal.notes && (
                    <p className="mt-1.5 rounded-sm border border-line bg-canvas px-2 py-1 text-[10px] leading-relaxed text-ink-muted">
                      “{proposal.notes}”
                    </p>
                  )}
                </div>

                <footer className="flex items-center justify-between gap-2 border-t border-line bg-canvas px-3 py-2">
                  <span className="text-[9px] text-ink-faint">
                    {formatInt(proposal.offered_items.length)} صنف · {proposal.handover_method}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {tab === "incoming" && proposal.status === "PENDING" && (
                      <>
                        <button
                          type="button"
                          onClick={() => respond(proposal.id, "REJECTED")}
                          disabled={actionKey !== null}
                          className="btn btn-outline btn-sm h-7 px-2 text-[10px] text-crimson hover:border-crimson-line hover:bg-crimson-soft"
                        >
                          {actionKey === `${proposal.id}:REJECTED` ? (
                            <Loader2 size={11} className="animate-spin" aria-hidden />
                          ) : (
                            <X size={11} aria-hidden />
                          )}
                          رفض
                        </button>
                        <button
                          type="button"
                          onClick={() => respond(proposal.id, "ACCEPTED")}
                          disabled={actionKey !== null}
                          className="btn btn-primary btn-sm h-7 px-2.5 text-[10px]"
                        >
                          {actionKey === `${proposal.id}:ACCEPTED` ? (
                            <Loader2 size={11} className="animate-spin" aria-hidden />
                          ) : (
                            <CheckCircle2 size={11} aria-hidden />
                          )}
                          قبول العرض
                        </button>
                      </>
                    )}

                    {proposal.status === "ACCEPTED" && (
                      <button
                        type="button"
                        onClick={() => respond(proposal.id, "COMPLETED")}
                        disabled={actionKey !== null}
                        className="btn btn-primary btn-sm h-7 px-2.5 text-[10px]"
                      >
                        {actionKey === `${proposal.id}:COMPLETED` ? (
                          <Loader2 size={11} className="animate-spin" aria-hidden />
                        ) : (
                          <CheckCircle2 size={11} aria-hidden />
                        )}
                        تأكيد التنفيذ
                      </button>
                    )}

                    {tab === "outgoing" && proposal.status === "PENDING" && (
                      <span className="chip border-amber-line bg-amber-soft text-[9.5px] text-amber-ink">
                        بانتظار رد {proposal.listing.pharmacy.pharmacy_name}
                      </span>
                    )}

                    {(proposal.status === "REJECTED" || proposal.status === "COMPLETED") && (
                      <span className="text-[9.5px] text-ink-faint">
                        {proposal.status === "COMPLETED"
                          ? "تم توثيق التبادل وإضافة العملية للسجل."
                          : "أُغلق هذا العرض — يمكنك تقديم عرض جديد."}
                      </span>
                    )}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  highlight = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Inbox;
  label: string;
  count: number;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-9 items-center gap-1.5 px-2.5 text-[11.5px] transition-colors",
        active ? "font-semibold text-brand-ink" : "font-medium text-ink-muted hover:text-ink",
      )}
    >
      <Icon size={13} strokeWidth={1.75} aria-hidden />
      {label}
      <span
        className={cn(
          "num rounded-sm px-1 text-[9.5px] font-semibold",
          highlight ? "bg-crimson text-white" : "bg-sunken text-ink-muted",
        )}
      >
        {formatInt(count)}
      </span>
      {active && <span className="absolute inset-x-1.5 -bottom-px h-[2px] bg-brand" aria-hidden />}
    </button>
  );
}

function ProposalStatusChip({ status }: { status: ProposalStatus }) {
  const styles: Record<ProposalStatus, string> = {
    PENDING: "border-amber-line bg-amber-soft text-amber-ink",
    ACCEPTED: "border-brand-line bg-brand-soft text-brand-ink",
    REJECTED: "border-crimson-line bg-crimson-soft text-crimson-ink",
    COMPLETED: "border-line bg-sunken text-ink-secondary",
  };
  return <span className={cn("chip shrink-0", styles[status])}>{PROPOSAL_STATUS_LABEL[status]}</span>;
}
