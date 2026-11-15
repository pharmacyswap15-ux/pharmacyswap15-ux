import type { DosageForm } from "@/lib/types";

/** One row of the official Egyptian public-price catalogue. */
export interface CatalogDrug {
  id: string;
  name_en: string;
  name_ar: string;
  active_ingredient: string;
  company: string;
  dosage_form: DosageForm;
  pack_size: number | null;
  category: string;
  public_price_egp: number;
  barcode: string | null;
}

export interface DrugSuggestion extends CatalogDrug {
  score: number;
}

export interface CatalogMeta {
  source: string;
  records_kept: number;
  generated_at: string;
  with_arabic_name?: number;
  with_ingredient?: number;
  with_company?: number;
  price_min?: number;
  price_max?: number;
}

export const DOSAGE_FORM_AR: Record<DosageForm, string> = {
  TABLETS: "أقراص / كبسول",
  SYRUP: "شراب / معلق",
  INJECTION: "حقن / أمبول",
  CREAM: "كريم / مرهم",
  DROPS: "قطرة / بخاخ",
  OTHER: "أخرى",
};
