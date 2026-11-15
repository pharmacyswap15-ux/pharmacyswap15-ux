import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftRight, Inbox, Scale, Send, ShieldCheck } from "lucide-react";

import { SwapsBoard } from "@/components/dashboard/swaps-board";
import { getProposalViews } from "@/lib/data";
import { cities, governorates } from "@/lib/geo";
import { formatInt } from "@/lib/format";
import { getCurrentPharmacy } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "عروض البدل",
};

export default async function SwapsPage() {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) redirect("/login?next=/dashboard/swaps");

  const proposals = await getProposalViews();
  const incoming = proposals.filter(
    (proposal) => proposal.listing.pharmacy_id === pharmacy.id,
  );
  const outgoing = proposals.filter(
    (proposal) => proposal.proposer_pharmacy_id === pharmacy.id,
  );

  const pendingIncoming = incoming.filter((proposal) => proposal.status === "PENDING").length;
  const accepted = [...incoming, ...outgoing].filter(
    (proposal) => proposal.status === "ACCEPTED",
  ).length;
  const completed = [...incoming, ...outgoing].filter(
    (proposal) => proposal.status === "COMPLETED",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-brand">
            <ArrowLeftRight size={11} strokeWidth={2} aria-hidden />
            إدارة التبادلات
          </p>
          <h1 className="mt-1 text-[21px] font-bold tracking-[-0.02em]">عروض البدل</h1>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            راجع العروض الواردة على أصنافك، وتابع العروض التي قدّمتها للصيدليات الأخرى.
          </p>
        </div>
        <Link href="/market" className="btn btn-outline btn-sm h-9">
          تصفح السوق الحي
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
        <Stat icon={Inbox} label="عروض واردة" value={formatInt(incoming.length)} hint={`${formatInt(pendingIncoming)} بانتظار قرارك`} accent={pendingIncoming > 0} />
        <Stat icon={Send} label="عروض صادرة" value={formatInt(outgoing.length)} hint="قدّمتها لصيدليات أخرى" />
        <Stat icon={Scale} label="تم قبولها" value={formatInt(accepted)} hint="بانتظار التسليم والتنفيذ" />
        <Stat icon={ShieldCheck} label="تبادلات منفذة" value={formatInt(completed)} hint="موثقة في سجل الصيدلية" />
      </div>

      <div className="mt-3">
        <SwapsBoard
          incoming={incoming}
          outgoing={outgoing}
          governorates={governorates}
          cities={cities}
        />
      </div>

      <div className="mt-4 rounded-md border border-line bg-surface p-3">
        <h2 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold text-ink">
          <Scale size={12} className="text-ink-muted" aria-hidden />
          كيف تُحسب عدالة التبادل؟
        </h2>
        <ol className="grid gap-2 text-[10.5px] leading-relaxed text-ink-muted sm:grid-cols-3">
          <li className="border-s-2 border-brand-line ps-2">
            <span className="block font-semibold text-ink">1. قيمة الجمهور</span>
            الكمية × سعر الجمهور المعلن لكل صنف (بدون هامش أو خصم).
          </li>
          <li className="border-s-2 border-brand-line ps-2">
            <span className="block font-semibold text-ink">2. الفرق النقدي</span>
            أي فرق يُسوَّى نقداً عند التسليم أو بتعديل الكميات في العرض.
          </li>
          <li className="border-s-2 border-brand-line ps-2">
            <span className="block font-semibold text-ink">3. القبول والحجز</span>
            قبول عرض يحجز الصنف تلقائياً ويرفض بقية العروض المعلّقة عليه.
          </li>
        </ol>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: typeof Inbox;
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
