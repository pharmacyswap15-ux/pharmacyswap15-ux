import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { DosageForm } from "@/lib/types";

import { searchLocalCatalog } from "./local-catalog";
import type { CatalogDrug, DrugSuggestion } from "./types";

/**
 * Catalogue gateway.
 *
 * - Supabase configured  → RPC `search_drugs` (trigram + full-text, SQL-side ranking)
 * - otherwise            → local JSON index built by `extract_drugs.py`
 *
 * Both paths return the same shape so the listing form never cares where the
 * official price came from.
 */

let readClient: SupabaseClient | null = null;

function remoteReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

function anon(): SupabaseClient {
  if (readClient) return readClient;
  readClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return readClient;
}

const DOSAGE_FORMS = new Set<DosageForm>([
  "TABLETS",
  "SYRUP",
  "INJECTION",
  "CREAM",
  "DROPS",
  "OTHER",
]);

interface RemoteRow {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  active_ingredient: string | null;
  company: string | null;
  dosage_form: string | null;
  pack_size: number | null;
  category: string | null;
  public_price_egp: number | string | null;
  barcode: string | null;
  score: number | null;
}

function toDrug(row: RemoteRow): DrugSuggestion {
  const form = (row.dosage_form ?? "OTHER") as DosageForm;
  return {
    id: row.id,
    name_en: row.name_en ?? "",
    name_ar: row.name_ar ?? "",
    active_ingredient: row.active_ingredient ?? "",
    company: row.company ?? "",
    dosage_form: DOSAGE_FORMS.has(form) ? form : "OTHER",
    pack_size: row.pack_size ?? null,
    category: row.category ?? "",
    public_price_egp: Number(row.public_price_egp ?? 0),
    barcode: row.barcode ?? null,
    score: Number(row.score ?? 0),
  };
}

export async function searchDrugs(query: string, limit = 8): Promise<DrugSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (remoteReady()) {
    const { data, error } = await anon().rpc("search_drugs", { q: trimmed, lim: limit });
    if (!error && Array.isArray(data)) {
      return (data as RemoteRow[]).map(toDrug);
    }
    console.warn("[drugs] remote search failed, falling back to local catalogue", error?.message);
  }

  return searchLocalCatalog(trimmed, limit);
}

export async function getCatalogEntry(id: string): Promise<CatalogDrug | null> {
  if (!id) return null;

  if (remoteReady()) {
    const { data, error } = await anon()
      .from("drugs_catalog")
      .select(
        "id,name_en,name_ar,active_ingredient,company,dosage_form,pack_size,category,public_price_egp,barcode",
      )
      .eq("id", id)
      .maybeSingle();
    if (!error && data) return toDrug({ ...(data as RemoteRow), score: 0 });
  }

  const { getCatalogDrug } = await import("./local-catalog");
  return getCatalogDrug(id);
}
