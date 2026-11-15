import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";

import { cn } from "@/lib/cn";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/market"
      className={cn("flex select-none items-center gap-2.5 no-tap-highlight", className)}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-brand text-white">
        <ArrowLeftRight size={17} strokeWidth={2} aria-hidden />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-ink">
            PHARMASWAP
          </span>
          <span className="mt-1 text-[9.5px] font-medium tracking-[0.04em] text-ink-muted">
            بورصة تبادل الأدوية · مصر
          </span>
        </span>
      )}
    </Link>
  );
}
