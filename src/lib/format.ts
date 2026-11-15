const egpFormatter = new Intl.NumberFormat("en-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFormatter = new Intl.NumberFormat("en-EG", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
  day: "numeric",
  month: "short",
});

/** 45 -> "45.00" (rendered with JetBrains Mono + tabular-nums). */
export function formatMoney(value: number): string {
  return egpFormatter.format(Number.isFinite(value) ? value : 0);
}

/** 10 -> "10" */
export function formatInt(value: number): string {
  return intFormatter.format(Number.isFinite(value) ? value : 0);
}

/** "2027-02-28" -> "02/2027" */
export function formatExpiry(iso: string | null): string {
  if (!iso) return "—";
  const [year, month] = iso.split("-");
  if (!year || !month) return "—";
  return `${month}/${year}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return shortDateFormatter.format(date);
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const date = new Date(`${iso}T23:59:59`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - startOfToday().getTime()) / 86_400_000);
}

/** Whole months remaining, floored, using 30.44 day months. */
export function monthsUntil(iso: string | null): number | null {
  const days = daysUntil(iso);
  if (days === null) return null;
  return Math.floor(days / 30.44);
}

export function expiryCountdown(iso: string | null): string {
  const days = daysUntil(iso);
  if (days === null) return "بدون تاريخ";
  if (days < 0) return `منتهي منذ ${formatInt(Math.abs(days))} يوم`;
  if (days === 0) return "ينتهي اليوم";
  if (days < 45) return `متبقي ${formatInt(days)} يوم`;
  const months = monthsUntil(iso) ?? 0;
  if (months < 1) return `متبقي ${formatInt(days)} يوم`;
  return `متبقي ${formatInt(months)} شهر`;
}

export type ExpiryHorizon = "lt3" | "m3to6" | "gt6" | "none";

/** PRD filter buckets: <3 months, 3-6 months, >6 months. */
export function expiryHorizon(iso: string | null): ExpiryHorizon {
  const days = daysUntil(iso);
  if (days === null) return "none";
  if (days < 90) return "lt3";
  if (days <= 183) return "m3to6";
  return "gt6";
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return minutes <= 1 ? "الآن" : `قبل ${formatInt(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${formatInt(hours)} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${formatInt(days)} يوم`;
  const months = Math.floor(days / 30);
  return `قبل ${formatInt(months)} شهر`;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function listTotal(listing: { quantity: number; public_price_egp: number }): number {
  return Math.round(listing.quantity * listing.public_price_egp * 100) / 100;
}

export function initials(name: string): string {
  const cleaned = name.replace(/^صيدلية\s*/, "").trim();
  return cleaned.slice(0, 2);
}
