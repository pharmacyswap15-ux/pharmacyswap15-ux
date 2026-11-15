"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Crosshair,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { DELIVERY_METHODS } from "@/lib/constants";
import { formatInt, formatMoney } from "@/lib/format";
import { citiesOf } from "@/lib/geo";
import {
  applyFilters,
  HORIZON_OPTIONS,
  MARKET_TABS,
  marketSummary,
  SORT_OPTIONS,
  tabCounts,
  type GeoPoint,
  type HorizonFilter,
  type MarketFilters,
  type MarketTab,
} from "@/lib/market";
import type { City, Governorate, ListingView, MarketListing } from "@/lib/types";

import { SwapDrawer } from "@/components/swap/swap-drawer";

import { CatalogSearch } from "./catalog-search";
import { ImageLightbox } from "./image-lightbox";
import { ListingCard } from "./listing-card";

const VALID_TABS: MarketTab[] = ["ALL", "NEAR_EXPIRY", "DEAD_STOCK", "SHORTAGE_REQUEST"];

export function MarketView({
  listings,
  governorates,
  cities,
  currentPharmacyId,
  showWelcome,
  catalogSize,
}: {
  listings: ListingView[];
  governorates: Governorate[];
  cities: City[];
  currentPharmacyId: string | null;
  showWelcome: boolean;
  catalogSize: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "ALL";
  const urlTab: MarketTab = VALID_TABS.includes(rawTab as MarketTab) ? (rawTab as MarketTab) : "ALL";

  const [tab, setTab] = useState<MarketTab>(urlTab);
  const [governorateId, setGovernorateId] = useState(0);
  const [cityId, setCityId] = useState(0);
  const [horizon, setHorizon] = useState<HorizonFilter>("ALL");
  const [delivery, setDelivery] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<MarketFilters["sort"]>("recent");
  const [gps, setGps] = useState<GeoPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(showWelcome);
  const [drawerListing, setDrawerListing] = useState<MarketListing | null>(null);
  const [previewListing, setPreviewListing] = useState<MarketListing | null>(null);

  useEffect(() => {
    setTab(urlTab);
  }, [urlTab]);

  const changeTab = (next: MarketTab) => {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "ALL") params.delete("tab");
    else params.set("tab", next);
    params.delete("welcome");
    const queryString = params.toString();
    router.replace(queryString ? `/market?${queryString}` : "/market", { scroll: false });
  };

  const filters: MarketFilters = {
    tab,
    governorateId,
    cityId,
    horizon,
    delivery,
    query,
    sort,
  };

  const results = useMemo(() => applyFilters(listings, filters, gps), [listings, filters, gps]);
  const counts = useMemo(() => tabCounts(listings, filters), [listings, filters]);
  const summary = useMemo(() => marketSummary(results), [results]);
  const cityOptions = useMemo(() => citiesOf(governorateId), [governorateId]);

  const activeFilterCount =
    (governorateId ? 1 : 0) +
    (cityId ? 1 : 0) +
    (horizon !== "ALL" ? 1 : 0) +
    (delivery ? 1 : 0) +
    (query.trim() ? 1 : 0) +
    (gps ? 1 : 0);

  const resetFilters = () => {
    setGovernorateId(0);
    setCityId(0);
    setHorizon("ALL");
    setDelivery("");
    setQuery("");
    setGps(null);
    setSort("recent");
    setGeoError(null);
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("المتصفح لا يدعم تحديد الموقع — اختر المحافظة والمدينة يدوياً.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({ lat: position.coords.latitude, lng: position.coords.longitude });
        setSort("distance");
        setLocating(false);
      },
      () => {
        setGeoError("تم رفض الوصول للموقع. اختر المحافظة والمدينة يدوياً.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const governorateLabel = governorates.find((g) => g.id === governorateId)?.name_ar ?? null;
  const cityLabel = cities.find((c) => c.id === cityId)?.name_ar ?? null;

  return (
    <div className="mx-auto w-full max-w-[1680px] px-3 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-3 pt-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[21px] font-bold tracking-[-0.02em] text-ink">السوق الحي</h1>
            <span className="chip border-line bg-sunken text-ink-secondary">
              <span className="size-1.5 rounded-full bg-brand" aria-hidden />
              <span className="num">{formatInt(counts.ALL)}</span> عرض
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] text-ink-muted">
            تبادل الأدوية قرب الانتهاء والرواكد بنظام <span className="font-semibold text-ink-secondary">جمهور في جمهور</span> — بدون عمولات.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className={cn("btn btn-outline btn-sm h-9", gps && "border-brand-line text-brand-ink")}
          >
            {locating ? (
              <RefreshCw size={14} className="animate-spin" aria-hidden />
            ) : (
              <Crosshair size={14} strokeWidth={1.75} aria-hidden />
            )}
            {gps ? "الموقع مفعّل" : "الأقرب لموقعي"}
          </button>
          <Link href="/listings/new" className="btn btn-primary btn-sm h-9">
            <Plus size={14} strokeWidth={2} aria-hidden />
            عرض / طلب جديد
          </Link>
        </div>
      </div>

      {welcomeOpen && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-md border border-brand-line bg-brand-soft px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11.5px] text-brand-ink">
            <CheckCircle2 size={14} strokeWidth={2} aria-hidden />
            تم تجهيز حساب صيدليتك — انشر أول عرض أو طلب نواقص ليظهر لباقي الصيدليات في محافظتك.
          </p>
          <button
            type="button"
            onClick={() => setWelcomeOpen(false)}
            className="grid size-6 place-items-center rounded-sm text-brand-ink hover:bg-brand-line/40"
            aria-label="إغلاق التنبيه"
          >
            <X size={13} aria-hidden />
          </button>
        </div>
      )}

      <CatalogSearch catalogSize={catalogSize} />

      <div className="sticky top-[57px] z-30 -mx-3 border-y border-line bg-canvas px-3 py-2 sm:-mx-5 sm:px-5">
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none border-b border-line">
          {MARKET_TABS.map((entry) => {
            const active = tab === entry.value;
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => changeTab(entry.value)}
                className={cn(
                  "relative flex h-9 shrink-0 items-center gap-1.5 px-3 text-[12.5px] transition-colors",
                  active
                    ? "font-semibold text-brand-ink"
                    : "font-medium text-ink-muted hover:text-ink",
                )}
                aria-pressed={active}
              >
                {entry.label}
                <span
                  className={cn(
                    "num rounded-sm px-1 text-[10px] font-semibold leading-4",
                    active ? "bg-brand-soft text-brand-ink" : "bg-sunken text-ink-muted",
                  )}
                >
                  {formatInt(counts[entry.value])}
                </span>
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              strokeWidth={1.75}
              className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم الدواء أو المادة الفعالة أو الصيدلية…"
              className="field h-9 pe-8 text-[12px]"
              aria-label="بحث فوري في السوق"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute start-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-ink-faint hover:bg-sunken hover:text-ink"
                aria-label="مسح البحث"
              >
                <X size={12} aria-hidden />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className={cn("btn btn-outline h-9 shrink-0 px-2.5 sm:hidden", activeFilterCount && "border-brand-line text-brand-ink")}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden />
            فلاتر
            {activeFilterCount > 0 && (
              <span className="num rounded-sm bg-brand px-1 text-[9px] font-bold leading-4 text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div
          className={cn(
            "mt-1.5 flex-wrap items-center gap-1.5",
            showFilters ? "flex" : "hidden sm:flex",
          )}
        >
          <FilterSelect
            ariaLabel="المحافظة"
            value={governorateId}
            onChange={(value) => {
              setGovernorateId(Number(value));
              setCityId(0);
            }}
            options={governorates.map((governorate) => ({
              value: String(governorate.id),
              label: governorate.name_ar,
            }))}
            placeholder="كل المحافظات"
            width="w-[132px]"
          />

          <FilterSelect
            ariaLabel="المدينة أو المنطقة"
            value={cityId}
            onChange={(value) => setCityId(Number(value))}
            options={cityOptions.map((city) => ({ value: String(city.id), label: city.name_ar }))}
            placeholder={governorateId ? "كل المدن" : "اختر المحافظة أولاً"}
            disabled={!governorateId}
            width="w-[132px]"
          />

          <FilterSelect
            ariaLabel="فترة الصلاحية"
            value={horizon}
            onChange={(value) => setHorizon(value as HorizonFilter)}
            options={HORIZON_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="الصلاحية"
            width="w-[130px]"
          />

          <FilterSelect
            ariaLabel="طريقة التسليم"
            value={delivery}
            onChange={setDelivery}
            options={DELIVERY_METHODS.map((method) => ({ value: method, label: method }))}
            placeholder="طريقة التسليم"
            width="w-[146px]"
          />

          <FilterSelect
            ariaLabel="الترتيب"
            value={sort}
            onChange={(value) => setSort(value as MarketFilters["sort"])}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            placeholder="الترتيب"
            width="w-[130px]"
          />

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center gap-1 rounded-sm px-2 text-[11px] font-medium text-crimson transition-colors hover:bg-crimson-soft"
            >
              <X size={12} aria-hidden />
              مسح الفلاتر
            </button>
          )}
        </div>

        {(geoError || activeFilterCount > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {governorateLabel && (
              <FilterChip label={`${governorateLabel}${cityLabel ? ` / ${cityLabel}` : ""}`} onClear={() => { setGovernorateId(0); setCityId(0); }} />
            )}
            {horizon !== "ALL" && (
              <FilterChip
                label={HORIZON_OPTIONS.find((option) => option.value === horizon)?.label ?? ""}
                onClear={() => setHorizon("ALL")}
              />
            )}
            {delivery && <FilterChip label={delivery} onClear={() => setDelivery("")} />}
            {gps && (
              <FilterChip
                label={`موقعك · ${gps.lat.toFixed(3)}, ${gps.lng.toFixed(3)}`}
                onClear={() => {
                  setGps(null);
                  setSort("recent");
                }}
              />
            )}
            {geoError && (
              <span className="text-[10px] text-crimson">{geoError}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4">
        <Metric label="عروض مطابقة" value={formatInt(summary.count)} hint={`من ${formatInt(counts.ALL)} عرض متاح`} />
        <Metric
          label="إجمالي قيمة الجمهور"
          value={`${formatMoney(summary.totalValue)} ج.م`}
          hint="مجموع العروض القابلة للتبديل"
          accent
        />
        <Metric label="طلبات نواقص" value={formatInt(summary.shortages)} hint="بحاجة توفير من الصيدليات" />
        <Metric
          label={gps ? "أقرب صيدلية" : "صيدليات موثقة"}
          value={gps ? `${summary.nearest ?? "—"} كم` : formatInt(summary.verified)}
          hint={gps ? "المسافة التقديرية بالخط المستقيم" : "ترخيص ساري وبيانات مؤكدة"}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-secondary">
          <Store size={13} strokeWidth={1.75} className="text-ink-muted" aria-hidden />
          {tab === "SHORTAGE_REQUEST"
            ? "طلبات النواقص"
            : tab === "NEAR_EXPIRY"
              ? "عروض قرب الانتهاء"
              : tab === "DEAD_STOCK"
                ? "عروض الرواكد"
                : "كل العروض"}
          <span className="num font-normal text-ink-faint">({formatInt(results.length)})</span>
        </h2>
        <span className="hidden items-center gap-1 text-[10px] text-ink-faint sm:flex">
          <ShieldCheck size={11} aria-hidden />
          الأسعار معلنة بسعر الجمهور الرسمي
        </span>
      </div>

      {results.length > 0 ? (
        <div className="mt-2 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {results.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isOwner={Boolean(currentPharmacyId && listing.pharmacy_id === currentPharmacyId)}
              onPropose={(selected) => setDrawerListing(selected)}
              onPreview={(selected) => setPreviewListing(selected)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-2 flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
          <span className="grid size-11 place-items-center rounded-sm bg-sunken text-ink-muted">
            <Inbox size={22} strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-[13px] font-semibold text-ink">لا توجد عروض مطابقة لهذه الفلاتر</p>
          <p className="max-w-sm text-[11px] leading-relaxed text-ink-muted">
            جرّب توسيع نطاق المحافظة أو الصلاحية، أو انشر عرضاً جديداً ليصل لباقي الصيدليات في محيطك.
          </p>
          <div className="mt-1 flex gap-1.5">
            <button type="button" onClick={resetFilters} className="btn btn-outline btn-sm">
              مسح كل الفلاتر
            </button>
            <Link href="/listings/new" className="btn btn-primary btn-sm">
              <Plus size={13} aria-hidden />
              نشر عرض
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 pb-4 text-[10px] text-ink-faint">
        <p className="flex items-center gap-1.5">
          <ArrowLeftRight size={11} aria-hidden />
          كل التبادلات تتم بقيمة الجمهور المعلنة — لا توجد عمولات على المنصة.
        </p>
        <p>PHARMASWAP · السوق المصري · 27 محافظة</p>
      </div>

      <SwapDrawer
        listing={drawerListing}
        open={Boolean(drawerListing)}
        onClose={() => setDrawerListing(null)}
        authenticated={Boolean(currentPharmacyId)}
      />

      <ImageLightbox
        open={Boolean(previewListing)}
        images={previewListing?.images ?? []}
        drugName={previewListing?.drug_name ?? ""}
        expiry={previewListing?.expiry_date ?? null}
        batch={previewListing?.batch_number ?? null}
        onClose={() => setPreviewListing(null)}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface px-3 py-2">
      <p className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      <p
        className={cn(
          "num mt-0.5 truncate text-[16px] font-bold",
          accent ? "text-brand-ink" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="truncate text-[9.5px] text-ink-faint">{hint}</p>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-line bg-sunken px-1.5 py-0.5 text-[10px] text-ink-secondary">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="grid size-3.5 place-items-center rounded-sm text-ink-muted hover:bg-line hover:text-ink"
        aria-label={`إزالة ${label}`}
      >
        <X size={9} aria-hidden />
      </button>
    </span>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
  width = "w-[130px]",
}: {
  value: string | number;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
  width?: string;
}) {
  return (
    <div className={cn("relative shrink-0", width)}>
      <select
        aria-label={ariaLabel}
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "h-9 w-full appearance-none rounded-sm border border-line bg-surface ps-2 pe-7 text-[11.5px] outline-none transition-colors hover:border-line-strong focus:border-brand disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint",
          value === "" || value === 0 || value === "ALL" ? "text-ink-secondary" : "font-medium text-ink",
        )}
      >
        {(value === "" || value === 0 || value === "ALL") && (
          <option value={value}>{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-ink-faint">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M1 3.5L5 7.5L9 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}
