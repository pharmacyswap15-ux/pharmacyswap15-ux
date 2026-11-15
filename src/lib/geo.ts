import egyptData from "@/data/egypt.json";
import type { City, Governorate } from "@/lib/types";

interface RawGeography {
  governorates: Array<{
    id: number;
    name_ar: string;
    name_en: string;
    cities: Array<{ name_ar: string; name_en: string }>;
  }>;
}

const raw = egyptData as RawGeography;

export const governorates: Governorate[] = raw.governorates.map(({ id, name_ar, name_en }) => ({
  id,
  name_ar,
  name_en,
}));

export const cities: City[] = raw.governorates.flatMap((governorate) =>
  governorate.cities.map((city, index) => ({
    id: governorate.id * 100 + index + 1,
    governorate_id: governorate.id,
    name_ar: city.name_ar,
    name_en: city.name_en,
  })),
);

export function citiesOf(governorateId: number | null | undefined): City[] {
  if (!governorateId) return [];
  return cities.filter((city) => city.governorate_id === governorateId);
}
