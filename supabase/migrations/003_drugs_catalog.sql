-- =============================================================================
-- 003_drugs_catalog.sql — official Egyptian drug price catalogue
-- -----------------------------------------------------------------------------
-- Source: TITAN pharmacy POS flat files (`egypt.phar.phy`), decoded by
--         `extract_drugs.py` into supabase/seed/drugs_catalog.{json,csv}.
-- Purpose: auto-fill the PHARMASWAP "Add Listing" form with the official
--         public price (سعر الجمهور) for any drug the pharmacist types.
--
-- This migration is idempotent: safe to re-run on an existing database.
-- =============================================================================

create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- Normalisation helper (Arabic-aware, immutable so it can back a generated col)
-- -----------------------------------------------------------------------------
create or replace function public.ps_normalize(input text)
returns text
language sql
immutable
parallel safe
as $$
  select btrim(
    regexp_replace(
      translate(lower(coalesce(input, '')), 'أإآٱىیةۀؤئءـ', 'ااااييهه'),
      '\s+', ' ', 'g'
    )
  );
$$;

comment on function public.ps_normalize(text) is
  'Lowercase + Arabic letter unification (alef/ya/ta-marbuta) + whitespace collapse. Used by drugs_catalog.search_text.';

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
create table if not exists public.drugs_catalog (
  id                uuid primary key default gen_random_uuid(),
  source_key        text not null unique,
  name_en           text not null default '',
  name_ar           text not null default '',
  active_ingredient text not null default '',
  company           text not null default '',
  dosage_form       text not null default 'OTHER'
                    check (dosage_form in ('TABLETS', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'OTHER')),
  pack_size         integer check (pack_size is null or pack_size > 0),
  category          text not null default '',
  public_price_egp  numeric(10, 2) not null check (public_price_egp >= 0),
  barcode           text,
  -- Combined, normalised haystack for trigram autocomplete.
  search_text       text generated always as (
                      public.ps_normalize(
                        coalesce(name_en, '') || ' ' ||
                        coalesce(name_ar, '') || ' ' ||
                        coalesce(active_ingredient, '') || ' ' ||
                        coalesce(company, '')
                      )
                    ) stored,
  -- English full-text vector (drug names + ingredients are Latin script).
  search_vector     tsvector generated always as (
                      to_tsvector(
                        'simple',
                        coalesce(name_en, '') || ' ' || coalesce(active_ingredient, '')
                      )
                    ) stored,
  updated_at        timestamptz not null default now()
);

comment on table public.drugs_catalog is
  'Official Egyptian public-price drug catalogue (جمهور في جمهور reference prices). Read-only for app users.';

-- -----------------------------------------------------------------------------
-- Indexes: trigram autocomplete + full-text + filters
-- -----------------------------------------------------------------------------
create index if not exists drugs_catalog_search_trgm
  on public.drugs_catalog using gin (search_text gin_trgm_ops);

create index if not exists drugs_catalog_name_en_trgm
  on public.drugs_catalog using gin (name_en gin_trgm_ops);

create index if not exists drugs_catalog_name_ar_trgm
  on public.drugs_catalog using gin (name_ar gin_trgm_ops);

create index if not exists drugs_catalog_fts
  on public.drugs_catalog using gin (search_vector);

create index if not exists drugs_catalog_form_idx
  on public.drugs_catalog (dosage_form);

create index if not exists drugs_catalog_price_idx
  on public.drugs_catalog (public_price_egp);

create index if not exists drugs_catalog_ingredient_trgm
  on public.drugs_catalog using gin (active_ingredient gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- Autocomplete RPC: ranked, typo tolerant, drives the listing form
-- -----------------------------------------------------------------------------
create or replace function public.search_drugs(q text, lim integer default 8)
returns table (
  id                uuid,
  name_en           text,
  name_ar           text,
  active_ingredient text,
  company           text,
  dosage_form       text,
  pack_size         integer,
  category          text,
  public_price_egp  numeric,
  barcode           text,
  score             real
)
language sql
stable
security definer
set search_path = public
as $$
  with needle as (
    select public.ps_normalize(q) as nq
  )
  select
    d.id,
    d.name_en,
    d.name_ar,
    d.active_ingredient,
    d.company,
    d.dosage_form,
    d.pack_size,
    d.category,
    d.public_price_egp,
    d.barcode,
    greatest(
      similarity(d.search_text, needle.nq),
      case when d.search_text like needle.nq || '%' then 1.0 else 0.0 end,
      case when d.name_en ilike '%' || needle.nq || '%' then 0.9 else 0.0 end
    )::real as score
  from public.drugs_catalog d
  cross join needle
  where length(needle.nq) >= 2
    and (
      d.search_text like '%' || needle.nq || '%'
      or d.search_vector @@ plainto_tsquery('simple', needle.nq)
      or d.search_text % needle.nq
    )
  order by score desc, d.public_price_egp asc
  limit greatest(1, least(coalesce(lim, 8), 50));
$$;

comment on function public.search_drugs(text, integer) is
  'Typo-tolerant autocomplete over drugs_catalog. Used by the PHARMASWAP listing form.';

revoke all on function public.search_drugs(text, integer) from public;
grant execute on function public.search_drugs(text, integer) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Row level security — catalogue prices are public information
-- -----------------------------------------------------------------------------
alter table public.drugs_catalog enable row level security;

drop policy if exists "drugs_catalog_read" on public.drugs_catalog;
create policy "drugs_catalog_read"
  on public.drugs_catalog
  for select
  to anon, authenticated
  using (true);

-- Writes stay service-role only (the seed importer), no policies = denied.

grant select on public.drugs_catalog to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Keep updated_at fresh on re-import
-- -----------------------------------------------------------------------------
create or replace function public.touch_drugs_catalog()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists drugs_catalog_touch on public.drugs_catalog;
create trigger drugs_catalog_touch
  before update on public.drugs_catalog
  for each row execute function public.touch_drugs_catalog();

-- =============================================================================
-- Loading the data
-- -----------------------------------------------------------------------------
-- Option A — psql / supabase CLI (fastest, uses COPY):
--
--   \copy public.drugs_catalog (source_key, name_en, name_ar, active_ingredient,
--         company, dosage_form, pack_size, category, public_price_egp, barcode)
--     from 'supabase/seed/drugs_catalog.csv'
--     with (format csv, header true, null '');
--
--   (the CSV ships an extra leading `id` column; drop it with a staging table
--    or import via Option B which maps columns explicitly)
--
-- Option B — service role script (recommended, batched upserts):
--
--   node scripts/import-drugs-catalog.mjs
--
-- Option C — plain SQL shown in supabase/seed/drugs_catalog_rows.sql
--            (single INSERT ... SELECT from jsonb, generated by extract_drugs.py)
-- =============================================================================
