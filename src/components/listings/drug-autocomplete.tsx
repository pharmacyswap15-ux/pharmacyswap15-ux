"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BadgeCheck, Building2, Loader2, Package, Search, Star, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { DOSAGE_FORM_AR, type CatalogDrug } from "@/lib/drugs/types";
import { normalizeDrugKey } from "@/lib/drugs/normalize";
import { formatMoney } from "@/lib/format";

interface DrugAutocompleteProps {
  id?: string;
  value: string;
  onQueryChange: (value: string) => void;
  onPick: (drug: CatalogDrug) => void;
  onClearSelection: () => void;
  selected: CatalogDrug | null;
  loadingSelection?: boolean;
  catalogSize: number;
  disabled?: boolean;
}

interface SearchState {
  results: CatalogDrug[];
  loading: boolean;
  error: string | null;
}

const EMPTY: SearchState = { results: [], loading: false, error: null };
const MIN_CHARS = 2;

export function DrugAutocomplete({
  id,
  value,
  onQueryChange,
  onPick,
  onClearSelection,
  selected,
  loadingSelection = false,
  catalogSize,
  disabled = false,
}: DrugAutocompleteProps) {
  const listboxId = useId();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [state, setState] = useState<SearchState>(EMPTY);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const cache = useRef(new Map<string, CatalogDrug[]>());
  const boxRef = useRef<HTMLDivElement | null>(null);

  const needle = normalizeDrugKey(value);

  useEffect(() => {
    if (selected) {
      setState(EMPTY);
      setOpen(false);
      return;
    }
    if (needle.length < MIN_CHARS) {
      setState(EMPTY);
      return;
    }

    const cached = cache.current.get(needle);
    if (cached) {
      setState({ results: cached, loading: false, error: null });
      setActive(-1);
      return;
    }

    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/drugs/search?q=${encodeURIComponent(value.trim())}&limit=8`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("request failed");
        const payload = (await response.json()) as { results?: CatalogDrug[] };
        const results = payload.results ?? [];
        cache.current.set(needle, results);
        setState({ results, loading: false, error: null });
        setActive(-1);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState({ results: [], loading: false, error: "تعذر الاتصال بكتالوج الأسعار." });
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [needle, selected, value]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const choose = useCallback(
    (drug: CatalogDrug) => {
      onPick(drug);
      setOpen(false);
      setActive(-1);
    },
    [onPick],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || state.results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => (current + 1) % state.results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => (current <= 0 ? state.results.length - 1 : current - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      choose(state.results[active]);
    }
  };

  const showList = open && !selected && needle.length >= MIN_CHARS;

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search
          size={13}
          strokeWidth={1.75}
          className="pointer-events-none absolute inset-y-0 end-2.5 my-auto text-ink-faint"
          aria-hidden
        />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listboxId}-${active}` : undefined}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onClearSelection();
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="اكتب اسم الدواء… مثال: كونكور 5"
          className="field pe-9"
          autoComplete="off"
          spellCheck={false}
        />
        {state.loading && (
          <Loader2
            size={13}
            className="absolute inset-y-0 start-2.5 my-auto animate-spin text-ink-faint"
            aria-hidden
          />
        )}
      </div>

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="أصناف كتالوج الأسعار"
          className="absolute inset-x-0 top-[calc(100%+4px)] z-50 max-h-[286px] overflow-y-auto rounded-md border border-line bg-surface shadow-raised"
        >
          {state.error && (
            <li className="px-3 py-2 text-[10.5px] text-crimson-ink">{state.error}</li>
          )}

          {!state.error && state.results.length === 0 && !state.loading && (
            <li className="px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-muted">
              لا يوجد صنف مطابق في الكتالوج — أكمل البيانات يدوياً أو جرّب اسماً آخر.
            </li>
          )}

          {state.results.map((drug, index) => {
            const title = drug.name_ar || drug.name_en;
            const subtitle = drug.name_ar ? drug.name_en : "";
            return (
              <li key={drug.id} id={`${listboxId}-${index}`} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(drug)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex w-full items-start gap-2 border-b border-line px-2.5 py-1.5 text-start last:border-0",
                    index === active ? "bg-brand-soft" : "bg-surface hover:bg-canvas",
                  )}
                >
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm border border-line bg-canvas text-brand">
                    <Package size={11} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="truncate text-[12px] font-bold text-ink">{title}</span>
                      <span className="num shrink-0 text-[11px] font-semibold text-brand-ink">
                        {formatMoney(drug.public_price_egp)} ج.م
                      </span>
                    </span>
                    {subtitle && (
                      <span className="mt-0.5 block truncate font-mono text-[9.5px] uppercase tracking-[0.02em] text-ink-muted">
                        {subtitle}
                      </span>
                    )}
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9.5px] text-ink-faint">
                      {drug.active_ingredient && (
                        <span className="truncate">{drug.active_ingredient}</span>
                      )}
                      {drug.company && <span className="truncate">· {drug.company}</span>}
                      <span>· {DOSAGE_FORM_AR[drug.dosage_form]}</span>
                      {drug.pack_size ? <span className="num">· {drug.pack_size}</span> : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}

          <li className="flex items-center justify-between gap-2 bg-canvas px-2.5 py-1 text-[9px] text-ink-faint">
            <span>كتالوج سعر الجمهور الرسمي</span>
            <span className="num">{catalogSize.toLocaleString("en-US")} صنف</span>
          </li>
        </ul>
      )}

      {loadingSelection && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-ink-muted">
          <Loader2 size={10} className="animate-spin" aria-hidden />
          جارٍ تحميل بيانات الصنف…
        </p>
      )}

      {selected && (
        <div className="mt-1.5 rounded-sm border border-brand-line bg-brand-soft px-2.5 py-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="flex items-center gap-1 text-[10px] font-bold text-brand-ink">
              <BadgeCheck size={11} strokeWidth={2} aria-hidden />
              بيانات من كتالوج الأسعار الرسمي
            </p>
            <button
              type="button"
              onClick={onClearSelection}
              className="flex items-center gap-0.5 text-[9.5px] text-ink-muted hover:text-crimson"
            >
              <X size={9} aria-hidden />
              مسح
            </button>
          </div>
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] sm:grid-cols-4">
            <div className="flex items-center gap-1">
              <dt className="text-ink-muted">الجمهور</dt>
              <dd className="num font-bold text-brand-ink">
                {formatMoney(selected.public_price_egp)} ج.م
              </dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="text-ink-muted">العبوة</dt>
              <dd className="num text-ink">{selected.pack_size ?? "—"}</dd>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <Building2 size={9} className="shrink-0 text-ink-faint" aria-hidden />
              <dd className="truncate text-ink" title={selected.company}>
                {selected.company || "—"}
              </dd>
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <Star size={9} className="shrink-0 fill-amber text-amber" aria-hidden />
              <dd className="truncate text-ink" title={selected.category}>
                {selected.category || "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {!selected && !showList && (
        <p className="mt-1 text-[10px] text-ink-faint">
          اكتب حرفين على الأقل ليظهر سعر الجمهور الرسمي تلقائياً —{" "}
          <span className="num">{catalogSize.toLocaleString("en-US")}</span> صنف في الكتالوج.
        </p>
      )}
    </div>
  );
}
