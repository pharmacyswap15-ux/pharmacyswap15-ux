import Link from "next/link";

import { cn } from "@/lib/cn";

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link
      href="/market"
      className={cn("flex select-none items-center gap-2.5 no-tap-highlight", className)}
    >
      <img
        src="/logo.svg"
        alt="PHARMASWAP logo"
        className="size-8 shrink-0 rounded-sm border border-line bg-white object-contain p-1"
      />
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
