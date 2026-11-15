import { NextResponse } from "next/server";

import { catalogMeta, catalogSize } from "@/lib/drugs/local-catalog";
import { searchDrugs } from "@/lib/drugs";

export const dynamic = "force-dynamic";

/**
 * GET /api/drugs/search?q=بانادول&limit=8
 *
 * Official public-price autocomplete for the listing form.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const limitParam = Number(url.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 8;

  if (query.length < 2) {
    return NextResponse.json(
      { ok: true, query, results: [], catalog: { size: catalogSize() } },
      { headers: { "Cache-Control": "public, max-age=60" } },
    );
  }

  try {
    const [results, meta] = await Promise.all([searchDrugs(query, limit), Promise.resolve(catalogMeta())]);
    return NextResponse.json(
      {
        ok: true,
        query,
        results,
        catalog: { size: meta?.records_kept ?? catalogSize(), generated_at: meta?.generated_at ?? null },
      },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    console.error("[api/drugs/search]", error);
    return NextResponse.json({ ok: false, error: "تعذر البحث في كتالوج الأسعار." }, { status: 500 });
  }
}
