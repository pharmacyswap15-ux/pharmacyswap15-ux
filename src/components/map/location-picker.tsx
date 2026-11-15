"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";

import { governorateCenter } from "@/lib/geo-centers";

const MapInner = dynamic(() => import("./map-inner"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-sunken">
      <span className="flex items-center gap-1.5 text-[11px] text-ink-muted">
        <Loader2 size={13} className="animate-spin" aria-hidden />
        جارٍ تحميل خريطة OpenStreetMap…
      </span>
    </div>
  ),
});

export function LocationPicker({
  latitude,
  longitude,
  governorateId,
  onChange,
  height = "h-[268px]",
}: {
  latitude: number | null;
  longitude: number | null;
  governorateId: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: string;
}) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPoint = latitude !== null && longitude !== null;
  const center = hasPoint ? { lat: latitude, lng: longitude } : governorateCenter(governorateId);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setError("المتصفح لا يدعم تحديد الموقع — حدد النقطة يدوياً على الخريطة.");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(
          Math.round(position.coords.latitude * 1e6) / 1e6,
          Math.round(position.coords.longitude * 1e6) / 1e6,
        );
        setLocating(false);
      },
      () => {
        setError("تعذر الوصول لموقعك — اسمح بالوصول أو حدد النقطة يدوياً.");
        setLocating(false);
      },
      { timeout: 9000, maximumAge: 120_000 },
    );
  };

  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <div className={height}>
        <MapInner
          center={center}
          zoom={hasPoint ? 15 : 12}
          marker={hasPoint ? { lat: latitude, lng: longitude } : null}
          onPick={onChange}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-canvas px-2.5 py-1.5">
        <span className="flex items-center gap-1 text-[10px] text-ink-muted">
          <MapPin size={11} strokeWidth={1.75} aria-hidden />
          {hasPoint ? (
            <span className="num text-ink-secondary">
              {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
            </span>
          ) : (
            "اضغط على الخريطة لتحديد موقع الصيدلية"
          )}
        </span>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1 rounded-sm border border-line bg-surface px-1.5 py-1 text-[10px] font-semibold text-ink-secondary hover:border-line-strong hover:text-ink disabled:opacity-60"
        >
          {locating ? (
            <Loader2 size={11} className="animate-spin" aria-hidden />
          ) : (
            <Crosshair size={11} strokeWidth={2} aria-hidden />
          )}
          استخدم موقعي
        </button>
      </div>
      {error && <p className="border-t border-amber-line bg-amber-soft px-2.5 py-1 text-[10px] text-amber-ink">{error}</p>}
    </div>
  );
}

export function LocationPreview({
  latitude,
  longitude,
  label,
  height = "h-[180px]",
}: {
  latitude: number | null;
  longitude: number | null;
  label: string;
  height?: string;
}) {
  if (latitude === null || longitude === null) {
    return (
      <div className="grid h-[120px] place-items-center rounded-md border border-dashed border-line bg-canvas px-4 text-center text-[11px] text-ink-muted">
        لم يتم تحديد إحداثيات GPS لهذه الصيدلية بعد.
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-md border border-line ${height}`}>
      <MapInner
        center={{ lat: latitude, lng: longitude }}
        zoom={15}
        marker={{ lat: latitude, lng: longitude }}
        interactive={false}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
