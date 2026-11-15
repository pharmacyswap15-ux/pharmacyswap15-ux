"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, Loader2, Package, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { normalizeDrugKey } from "@/lib/drugs/normalize";
import { DOSAGE_FORM_AR, type CatalogDrug } from "@/lib/drugs/types";
import { formatMoney } from "@/lib/format";

/**
 * Live search over the official Egyptian public-price catalogue extracted from
 * the TITAN pharmacy files. Filters as soon as the pharmacist types two
 * characters, and links straight into the listing form with the price filled.
 */

interface CatalogSearchProps {
  catalogSize: number;
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 180;
const RESULT_LIMIT = 12;

export function CatalogSearch({ catalogSize }: CatalogSearchProps) {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<CatalogDrug[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const cache = useRef(new Map<string, CatalogDrug[]>());
  const boxRef = useRef<HTMLDivElement | null>(null);

  const needle = normalizeDrugKey(value);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (needle.length < MIN_CHARS) {
      setResults([]);
      setStatus("idle");
      return;
    }

    const cached = cache.current.get(needle);
    if (cached) {
      setResults(cached);
      setStatus(cached.length ? "idle" : "empty");
      setActive(0);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/drugs/search?q=${encodeURIComponent(value.trim())}&limit=${RESULT_LIMIT}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("request failed");
        const payload = (await response.json()) as { results?: CatalogDrug[] };
        const list = payload.results ?? [];
        cache.current.set(needle, list);
        setResults(list);
        setStatus(list.length ? "idle" : "empty");
        setActive(0);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [needle, value]);

  const choose = useCallback((drug: CatalogDrug) => {
    window.location.assign(`/listings/new?drug=${drug.id}`);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActive((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  const showResults = open && needle.length >= MIN_CHARS;

  return (
    <div ref={boxRef} className="panel mb-3 overflow-visible p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-sm border border-gold bg-gold-soft text-gold-ink">
            <Package size={14} strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2 className="text-[13px] font-bold text-ink">دليل سعر الجمهور الرسمي</h2>
            <p className="text-[10.5px] text-ink-muted">
              كتالوج تيتان المصري — ابحث واسحب السعر مباشرة في عرضك.
            </p>
          </div>
        </div>
        <span className="chip border-line bg-sunken text-[10px] text-ink-muted">
          <span className="num">{catalogSize.toLocaleString("en-US")}</span> صنف بسعر الجمهور
        </span>
      </div>

      <div className="relative mt-2.5">
        <Search
          size={15}
          strokeWidth={1.75}
          className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <input
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="اكتب اسم الدواء أو المادة الفعالة… مثال: كونكور، أوجمنتين، panadol"
          aria-label="بحث في كتالوج أسعار الجمهور الرسمي"
          className="field h-11 pe-9 ps-10 text-[13.5px]"
          autoComplete="off"
          spellCheck={false}
        />
        {status === "loading" && (
          <Loader2 size={15} className="absolute start-3 top-1/2 -translate-y-1/2 animate-spin text-ink-faint" aria-hidden />
        )}
        {value && status !== "loading" && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setResults([]);
              setStatus("idle");
            }}
            className="absolute start-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-ink-faint hover:bg-sunken hover:text-ink"
            aria-label="مسح البحث"
          >
            <X size={13} aria-hidden />
          </button>
        )}
      </div>

      {needle.length < MIN_CHARS && (
        <p className="mt-1.5 text-[10.5px] text-ink-faint">
          اكتب حرفين على الأقل ليبدأ الفلترة الفورية من قاعدة بيانات تيتان.
        </p>
      )}

      {showResults && (
        <div className="absolute inset-x-3 top-[calc(100%-4px)] z-40 overflow-hidden rounded-md border border-gold bg-surface shadow-raised">
          <div className="max-h-[360px] overflow-y-auto">
            {status === "empty" && (
              <p className="px-3 py-3 text-[11px] text-ink-muted">
                لا يوجد صنف بهذا الاسم في الكتالوج — جرّب الاسم التجاري أو المادة الفعالة.
              </p>
            )}
            {status === "error" && (
              <p className="px-3 py-3 text-[11px] text-crimson-ink">تعذر الاتصال بكتالوج الأسعار.</p>
            )}

            {results.map((drug, index) => (
              <div
                key={drug.id}
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-0",
                  index === active ? "bg-brand-soft" : "bg-surface",
                )}
              >
                <Link href={`/listings/new?drug=${drug.id}`} className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[12.5px] font-bold text-ink">
                      {drug.name_ar || drug.name_en}
                    </span>
                    {drug.name_ar && drug.name_en && (
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.02em] text-ink-muted">
                        {drug.name_en}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-ink-faint">
                    {drug.active_ingredient && <span className="truncate">{drug.active_ingredient}</span>}
                    {drug.company && (
                      <span className="flex items-center gap-0.5 truncate">
                        <Building2 size={9} aria-hidden />
                        {drug.company}
                      </span>
                    )}
                    <span>{DOSAGE_FORM_AR[drug.dosage_form]}</span>
                    {drug.pack_size ? <span className="num">· {drug.pack_size}</span> : null}
                  </span>
                </Link>

                <span className="flex items-center gap-2">
                  <span className="num text-[13px] font-bold text-action">{formatMoney(drug.public_price_egp)}</span>
                  <span className="text-[9.5px] text-ink-faint">ج.م</span>
                  <Link href={`/listings/new?drug=${drug.id}`} className="btn btn-primary btn-sm h-8 px-2.5 text-[11px]">
                    <Plus size={12} strokeWidth={2} aria-hidden />
                    أضف للعرض
                  </Link>
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-gold-line bg-gold-soft px-3 py-1.5 text-[9.5px] text-gold-ink">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={10} strokeWidth={2} aria-hidden />
              سعر الجمهور الرسمي — بدون عمولة
            </span>
            <span className="num">{results.length} نتيجة</span>
          </div>
        </div>
      )}
    </div>
  );
}
