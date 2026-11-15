export const GOVERNORATE_CENTERS: Record<number, { lat: number; lng: number }> = {
  1: { lat: 30.0444, lng: 31.2357 },
  2: { lat: 30.0131, lng: 31.2089 },
  3: { lat: 31.2001, lng: 29.9187 },
  4: { lat: 31.0409, lng: 31.3785 },
  5: { lat: 27.2579, lng: 33.8116 },
  6: { lat: 30.8481, lng: 30.3436 },
  7: { lat: 29.3084, lng: 30.8428 },
  8: { lat: 30.7855, lng: 31.0004 },
  9: { lat: 30.5965, lng: 32.2715 },
  10: { lat: 30.5972, lng: 30.9876 },
  11: { lat: 28.0871, lng: 30.7618 },
  12: { lat: 30.4648, lng: 31.1848 },
  13: { lat: 25.439, lng: 30.5586 },
  14: { lat: 29.9668, lng: 32.5498 },
  15: { lat: 24.0889, lng: 32.8998 },
  16: { lat: 27.1809, lng: 31.1837 },
  17: { lat: 29.0661, lng: 31.0994 },
  18: { lat: 31.2653, lng: 32.3019 },
  19: { lat: 31.4165, lng: 31.8133 },
  20: { lat: 30.5877, lng: 31.502 },
  21: { lat: 27.9158, lng: 34.33 },
  22: { lat: 31.1107, lng: 30.9388 },
  23: { lat: 31.3543, lng: 27.2373 },
  24: { lat: 25.6872, lng: 32.6396 },
  25: { lat: 26.1551, lng: 32.716 },
  26: { lat: 31.1316, lng: 33.7984 },
  27: { lat: 26.5591, lng: 31.6957 },
};

export function governorateCenter(id: number | null | undefined): { lat: number; lng: number } {
  if (id && GOVERNORATE_CENTERS[id]) return GOVERNORATE_CENTERS[id];
  return { lat: 30.0444, lng: 31.2357 };
}
