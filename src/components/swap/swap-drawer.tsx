"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Plus,
  Scale,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import { createProposalAction } from "@/app/actions/proposals";
import { cn } from "@/lib/cn";
import { DELIVERY_METHODS, DELIVERY_METHOD_HINT, whatsappLink } from "@/lib/constants";
import { formatInt, formatMoney, listTotal } from "@/lib/format";
import type { MarketListing, OfferedItem } from "@/lib/types";

interface DraftItem extends OfferedItem {
  key: string;
}

function makeKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function newItem(): DraftItem {
  return { key: makeKey(), name: "", quantity: 1, unit_price: 0 };
}

export function SwapDrawer({
  listing,
  open,
  onClose,
  authenticated,
}: {
  listing: MarketListing | null;
  open: boolean;
  onClose: () => void;
  authenticated: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>([newItem()]);
  const [handover, setHandover] = useState<string>(DELIVERY_METHODS[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const isShortage = listing?.listing_type === "SHORTAGE_REQUEST";
  const requestedTotal = listing ? listTotal(listing) : 0;

  useEffect(() => {
    if (!open) return;
    setItems([newItem()]);
    setHandover(listing?.delivery_method ?? DELIVERY_METHODS[0]);
    setNotes("");
    setError(null);
    setSuccess(false);
  }, [open, listing?.id, listing?.delivery_method]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const offeredTotal = useMemo(
    () =>
      Math.round(
        items.reduce(
          (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unit_price),
          0,
        ) * 100,
      ) / 100,
    [items],
  );

  const difference = Math.round((offeredTotal - requestedTotal) * 100) / 100;
  const tolerance = Math.max(5, requestedTotal * 0.02);
  const balanced = Math.abs(difference) <= tolerance;

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (key: string) => {
    setItems((current) => (current.length === 1 ? [newItem()] : current.filter((item) => item.key !== key)));
  };

  const submit = () => {
    if (!listing) return;
    setError(null);
    startTransition(async () => {
      const result = await createProposalAction({
        listing_id: listing.id,
        offered_items: items.map(({ name, quantity, unit_price }) => ({
          name,
          quantity: Number(quantity) || 0,
          unit_price: Number(unit_price) || 0,
        })),
        handover_method: handover,
        notes,
      });
      if (result.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(result.error ?? "تعذر إرسال العرض، حاول مرة أخرى.");
      }
    });
  };

  if (!open || !listing) return null;

  const whatsappMessage = `السلام عليكم ${listing.pharmacy.pharmacy_name}، أرسلت عرض بدل على فارماسواب بخصوص "${listing.drug_name}".`;

  return (
    <div className="fixed inset-0 z-[80] flex" role="dialog" aria-modal="true" aria-label="تقديم عرض بدل">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-ink/45"
      />

      <aside className="absolute inset-y-0 end-0 flex w-full max-w-[480px] animate-drawer-in flex-col border-s border-line bg-surface shadow-raised">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-brand">
              <Scale size={11} strokeWidth={2} aria-hidden />
              حاسبة التبادل العادل · جمهور في جمهور
            </p>
            <h2 className="mt-1 text-[16px] font-bold text-ink">
              {isShortage ? "تأكيد توفير النواقص" : "تقديم عرض بدل"}
            </h2>
            <p className="mt-0.5 truncate text-[11px] text-ink-muted">
              {listing.drug_name} · {listing.pharmacy.pharmacy_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-sm border border-line text-ink-muted hover:bg-sunken hover:text-ink"
            aria-label="إغلاق العرض"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        {success ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-brand-soft ring-1 ring-brand-line">
              <CheckCircle2 size={28} className="text-brand" strokeWidth={1.75} aria-hidden />
            </span>
            <h3 className="text-[16px] font-bold">تم إرسال عرض البدل</h3>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              وصل العرض إلى {listing.pharmacy.pharmacy_name}. ستصلك نتيجة المراجعة في صفحة عروض البدل،
              ويمكنك تسريع الرد عبر واتساب.
            </p>
            <div className="mt-1 rounded-sm border border-line bg-canvas px-3 py-2">
              <p className="text-[10px] text-ink-muted">قيمة عرضك</p>
              <p className="num text-[16px] font-bold text-brand-ink">
                {formatMoney(offeredTotal)} <span className="font-sans text-[10px]">ج.م</span>
              </p>
            </div>
            <div className="mt-2 flex w-full flex-col gap-1.5">
              <Link href="/dashboard/swaps" className="btn btn-primary btn-sm">
                متابعة العروض
              </Link>
              <a
                href={whatsappLink(listing.pharmacy.phone, whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm"
              >
                تسريع الرد عبر واتساب
              </a>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <section className="border-b border-line px-4 py-3.5">
                <h3 className="label mb-2">
                  <span>{isShortage ? "الكمية المطلوبة" : "الصنف المطلوب"}</span>
                  <span className="num font-normal normal-case tracking-normal text-ink-faint">
                    {formatInt(listing.quantity)} علبة
                  </span>
                </h3>
                <div className="rounded-sm border border-line bg-canvas p-2.5">
                  <Row label="سعر الجمهور للعلبة" value={`${formatMoney(listing.public_price_egp)} ج.م`} />
                  <Row
                    label="عدد العلب"
                    value={`× ${formatInt(listing.quantity)}`}
                  />
                  <div className="mt-1.5 flex items-center justify-between border-t border-line pt-1.5">
                    <span className="text-[11.5px] font-semibold text-ink">إجمالي القيمة</span>
                    <span className="num text-[14px] font-bold text-brand-ink">
                      {formatMoney(requestedTotal)} <span className="font-sans text-[9.5px]">ج.م</span>
                    </span>
                  </div>
                </div>
              </section>

              <section className="border-b border-line px-4 py-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="label mb-0">
                    <span>ما تعرضه من مخزنك</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setItems((current) => [...current, newItem()])}
                    className="inline-flex h-7 items-center gap-1 rounded-sm border border-line px-2 text-[11px] font-semibold text-ink-secondary hover:border-line-strong hover:bg-sunken"
                  >
                    <Plus size={12} aria-hidden />
                    إضافة صنف
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={item.key} className="rounded-sm border border-line bg-surface p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="num w-4 shrink-0 text-[10px] text-ink-faint">
                          {index + 1}
                        </span>
                        <input
                          value={item.name}
                          onChange={(event) => updateItem(item.key, { name: event.target.value })}
                          placeholder="اسم الدواء المعروض (مثال: كونكور 5 مجم)"
                          className="field field-sm flex-1"
                          aria-label="اسم الدواء المعروض"
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          className="grid size-8 shrink-0 place-items-center rounded-sm border border-line text-ink-faint hover:border-crimson-line hover:bg-crimson-soft hover:text-crimson"
                          aria-label="حذف الصنف"
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </div>

                      <div className="mt-1.5 flex items-end gap-1.5 ps-5">
                        <label className="w-[72px]">
                          <span className="mb-0.5 block text-[9px] text-ink-faint">الكمية</span>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(item.key, { quantity: Number(event.target.value) })
                            }
                            className="field field-sm num h-8 text-center"
                            aria-label="الكمية"
                          />
                        </label>
                        <label className="w-[92px]">
                          <span className="mb-0.5 block text-[9px] text-ink-faint">سعر الجمهور</span>
                          <input
                            type="number"
                            min={0}
                            step="0.25"
                            value={item.unit_price}
                            onChange={(event) =>
                              updateItem(item.key, { unit_price: Number(event.target.value) })
                            }
                            className="field field-sm num h-8 text-center"
                            aria-label="سعر الجمهور للعلبة"
                          />
                        </label>
                        <div className="ms-auto text-end">
                          <span className="mb-0.5 block text-[9px] text-ink-faint">قيمة السطر</span>
                          <span className="num block h-8 leading-8 text-[12px] font-semibold text-ink">
                            {formatMoney(Math.max(0, item.quantity) * Math.max(0, item.unit_price))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {isShortage && (
                  <p className="mt-2 rounded-sm border border-amber-line bg-amber-soft px-2 py-1.5 text-[10.5px] leading-relaxed text-amber-ink">
                    هذه طلب نواقص: أدخل الصنف الذي ستوفره بنفس الاسم والتركيز أعلاه.
                  </p>
                )}
              </section>

              <section className="border-b border-line px-4 py-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="label mb-0">ميزان القيمة العامة</h3>
                  <span
                    className={cn(
                      "chip",
                      balanced
                        ? "border-brand-line bg-brand-soft text-brand-ink"
                        : difference > 0
                          ? "border-amber-line bg-amber-soft text-amber-ink"
                          : "border-crimson-line bg-crimson-soft text-crimson-ink",
                    )}
                  >
                    {balanced ? "تبادل متكافئ" : "يحتاج تسوية"}
                  </span>
                </div>

                <div className="rounded-md border border-line bg-canvas p-3">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="text-ink-muted">قيمة ما تعرضه</span>
                    <span className="num font-semibold text-ink">{formatMoney(offeredTotal)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11.5px]">
                    <span className="text-ink-muted">القيمة المطلوبة منك</span>
                    <span className="num font-semibold text-ink">{formatMoney(requestedTotal)}</span>
                  </div>

                  <div className="mt-2 border-t border-line pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-ink">الفرق</span>
                      <span
                        className={cn(
                          "num text-[16px] font-bold",
                          balanced
                            ? "text-brand"
                            : difference > 0
                              ? "text-amber-strong"
                              : "text-crimson",
                        )}
                      >
                        {difference > 0 ? "+" : difference < 0 ? "−" : ""}
                        {formatMoney(Math.abs(difference))}
                        <span className="ms-1 font-sans text-[9.5px] font-medium text-ink-muted">ج.م</span>
                      </span>
                    </div>

                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className={cn(
                          "h-full transition-all",
                          balanced ? "bg-brand" : difference > 0 ? "bg-amber" : "bg-crimson",
                        )}
                        style={{
                          width: `${Math.min(100, requestedTotal > 0 ? (offeredTotal / requestedTotal) * 100 : 100)}%`,
                        }}
                      />
                    </div>

                    <p
                      className={cn(
                        "mt-1.5 text-[10.5px] leading-relaxed",
                        balanced
                          ? "text-brand-ink"
                          : difference > 0
                            ? "text-amber-ink"
                            : "text-crimson-ink",
                      )}
                    >
                      {balanced
                        ? "القيمتان متقاربتان — يمكن إتمام التبادل بدون فرق نقدي."
                        : difference > 0
                          ? `عرضك أعلى من القيمة المطلوبة بـ ${formatMoney(difference)} ج.م — يمكن طلب التسوية أو تعديل الكميات.`
                          : `عرضك أقل من القيمة المطلوبة بـ ${formatMoney(Math.abs(difference))} ج.م — اقترح تسوية نقدية عند التسليم.`}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-line px-4 py-3.5">
                <h3 className="label mb-2">طريقة التسليم</h3>
                <div className="space-y-1.5">
                  {DELIVERY_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setHandover(method)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm border px-2.5 py-2 text-start transition-colors",
                        handover === method
                          ? "border-brand bg-brand-soft"
                          : "border-line bg-surface hover:border-line-strong",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded-full border",
                          handover === method ? "border-brand bg-brand" : "border-line-strong bg-surface",
                        )}
                      >
                        {handover === method && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-[11.5px] font-semibold text-ink">
                          <Truck size={11} strokeWidth={1.75} aria-hidden />
                          {method}
                        </span>
                        <span className="block text-[10px] text-ink-muted">
                          {DELIVERY_METHOD_HINT[method]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="px-4 py-3.5">
                <label className="label mb-1.5" htmlFor="proposal-notes">
                  ملاحظات للتنسيق
                  <span className="font-normal normal-case tracking-normal text-ink-faint">
                    اختياري
                  </span>
                </label>
                <textarea
                  id="proposal-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="مثال: متاح للاستلام اليوم بعد ٦ مساءً — الدفع النقدي للفرق عند التسليم."
                  className="field-area"
                />
              </section>
            </div>

            <footer className="border-t border-line bg-canvas px-4 py-3">
              {error && (
                <p className="mb-2 rounded-sm border border-crimson-line bg-crimson-soft px-2 py-1.5 text-[11px] text-crimson-ink">
                  {error}
                </p>
              )}

              {!authenticated ? (
                <>
                  <p className="mb-2 text-[10.5px] text-ink-muted">
                    سجّل الدخول كصيدلية لإرسال عرض بدل ومتابعة الردود.
                  </p>
                  <Link
                    href={`/login?next=/listings/${listing.id}`}
                    className="btn btn-primary w-full"
                  >
                    تسجيل الدخول لإكمال العرض
                    <ChevronLeft size={15} aria-hidden />
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9.5px] text-ink-muted">إجمالي عرضك</p>
                    <p className="num text-[15px] font-bold text-ink">
                      {formatMoney(offeredTotal)}
                      <span className="ms-1 font-sans text-[9.5px] font-medium text-ink-muted">ج.م</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={pending}
                    className="btn btn-primary h-10 shrink-0 px-5"
                  >
                    {pending ? (
                      <Loader2 size={15} className="animate-spin" aria-hidden />
                    ) : (
                      <ArrowLeftRight size={15} strokeWidth={2} aria-hidden />
                    )}
                    {pending ? "جارٍ الإرسال…" : "إرسال عرض البدل"}
                  </button>
                </div>
              )}
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-[11px]">
      <span className="text-ink-muted">{label}</span>
      <span className="num font-medium text-ink">{value}</span>
    </div>
  );
}
