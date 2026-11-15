import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/cn";
import { expiryCountdown, daysUntil } from "@/lib/format";
import type { ListingType } from "@/lib/types";

export const LISTING_TONE: Record<
  ListingType,
  { ribbon: string; pill: string; dot: string; label: string }
> = {
  NEAR_EXPIRY: {
    ribbon: "bg-amber",
    pill: "border-amber-line bg-amber-soft text-amber-ink",
    dot: "bg-amber",
    label: "نير إكسباير",
  },
  DEAD_STOCK: {
    ribbon: "bg-brand",
    pill: "border-brand-line bg-brand-soft text-brand-ink",
    dot: "bg-brand",
    label: "رواكد",
  },
  SHORTAGE_REQUEST: {
    ribbon: "bg-crimson",
    pill: "border-crimson-line bg-crimson-soft text-crimson-ink",
    dot: "bg-crimson",
    label: "مطلوب نواقص",
  },
};

export function ListingTypePill({
  type,
  expiry,
  className,
  showCountdown = true,
}: {
  type: ListingType;
  expiry?: string | null;
  className?: string;
  showCountdown?: boolean;
}) {
  const tone = LISTING_TONE[type];
  const expired = type !== "SHORTAGE_REQUEST" && expiry ? (daysUntil(expiry) ?? 1) < 0 : false;

  return (
    <span
      className={cn(
        "chip",
        expired ? "border-crimson bg-crimson text-white" : tone.pill,
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", expired ? "bg-white" : tone.dot)}
        aria-hidden
      />
      {expired ? "منتهي الصلاحية" : tone.label}
      {showCountdown && expiry && !expired && (
        <span className="opacity-70">· {expiryCountdown(expiry)}</span>
      )}
    </span>
  );
}

export function VerifiedBadge({
  verified,
  compact = false,
}: {
  verified: boolean;
  compact?: boolean;
}) {
  if (!verified) {
    return (
      <span className="chip border-line bg-sunken text-ink-muted" title="قيد مراجعة الترخيص">
        قيد التوثيق
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border border-brand-line bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-ink"
      title="صيدلية موثقة بترخيص ساري"
    >
      <ShieldCheck size={11} strokeWidth={2} aria-hidden />
      {compact ? "موثقة" : "صيدلية موثقة"}
    </span>
  );
}
