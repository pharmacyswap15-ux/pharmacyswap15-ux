import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-md border border-line bg-surface p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-sm bg-sunken text-ink-muted">
          <SearchX size={22} strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="mt-3 text-[18px] font-bold text-ink">الصفحة أو العرض غير موجود</h1>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
          قد يكون العرض تم إغلاقه أو حجزه من صيدلية أخرى. تصفح السوق الحي لمعرفة العروض المتاحة
          الآن.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/market" className="btn btn-primary btn-sm">
            <ArrowRight size={13} aria-hidden />
            العودة للسوق الحي
          </Link>
          <Link href="/listings/new" className="btn btn-outline btn-sm">
            نشر عرض جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
