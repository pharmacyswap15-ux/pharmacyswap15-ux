"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, PackageOpen, X } from "lucide-react";

import { formatExpiry } from "@/lib/format";

export function ImageLightbox({
  open,
  images,
  drugName,
  expiry,
  batch,
  initialIndex = 0,
  onClose,
}: {
  open: boolean;
  images: string[];
  drugName: string;
  expiry?: string | null;
  batch?: string | null;
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
    }
  }, [open, initialIndex, images.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) {
        setIndex((value) => (value + 1) % images.length);
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        setIndex((value) => (value - 1 + images.length) % images.length);
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, images.length, onClose]);

  if (!open) return null;

  const current = images[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`صور ${drugName}`}
      className="fixed inset-0 z-[90] flex animate-fade-in flex-col bg-ink/92 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-4xl flex-1 flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="min-w-0 text-white">
            <p className="truncate text-[14px] font-semibold">{drugName}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
              <span>
                تاريخ الانتهاء:{" "}
                <span className="num text-white">{formatExpiry(expiry ?? null)}</span>
              </span>
              {batch && (
                <span>
                  التشغيلة: <span className="num text-white">{batch}</span>
                </span>
              )}
              {images.length > 1 && (
                <span className="num">
                  {index + 1} / {images.length}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-sm border border-white/25 text-white transition-colors hover:bg-white/10"
            aria-label="إغلاق الصورة"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-surface">
          {current ? (
            <img
              src={current}
              alt={`صورة علبة ${drugName} — افحص تاريخ الانتهاء`}
              className="max-h-[68vh] w-full object-contain p-2"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-ink-muted">
              <PackageOpen size={32} strokeWidth={1.5} aria-hidden />
              <p className="text-[13px] font-medium">لا توجد صور مرفوعة لهذا العرض</p>
              <p className="text-center text-[11px] text-ink-faint">
                اطلب صورة العلبة من الصيدلية عبر واتساب للتأكد من التشغيلة وتاريخ الانتهاء.
              </p>
            </div>
          )}

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setIndex((value) => (value + 1) % images.length)}
                className="absolute start-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-sm border border-line bg-surface text-ink shadow-panel hover:bg-sunken"
                aria-label="الصورة التالية"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setIndex((value) => (value - 1 + images.length) % images.length)}
                className="absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-sm border border-line bg-surface text-ink shadow-panel hover:bg-sunken"
                aria-label="الصورة السابقة"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
            </>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="hidden text-[10.5px] leading-relaxed text-slate-300 sm:block">
            افحص الطباعة على العلبة: التشغيلة، وتاريخ الانتهاء (شهر/سنة) قبل إتمام أي تبادل.
          </p>
          <div className="flex gap-2">
            {images.map((image, imageIndex) => (
              <button
                key={`${image}-${imageIndex}`}
                type="button"
                onClick={() => setIndex(imageIndex)}
                className={`size-14 overflow-hidden rounded-sm border-2 bg-surface ${
                  imageIndex === index ? "border-brand-line" : "border-white/20 opacity-70"
                }`}
                aria-label={`عرض الصورة ${imageIndex + 1}`}
              >
                <img src={image} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
