import Link from "next/link";

import { Logo } from "@/components/shell/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-[57px] w-full max-w-[1180px] items-center justify-between gap-3 px-4">
          <Logo />
          <Link
            href="/market"
            className="text-[11px] font-semibold text-ink-muted transition-colors hover:text-brand"
          >
            تصفح السوق بدون تسجيل
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line bg-surface py-2.5">
        <p className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 text-[9.5px] text-ink-faint">
          <span>PHARMASWAP · تبادل أدوية بجمهور في جمهور · السوق المصري</span>
          <span>بيانات الصيدليات محمية · لا توجد عمولات على المنصة</span>
        </p>
      </footer>
    </div>
  );
}
