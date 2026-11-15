-- ============================================================================
-- 001_init.sql — PHARMASWAP core schema (Supabase / PostgreSQL)
-- B2B pharmaceutical stock exchange · Egypt · جمهور في جمهور
-- Run order: 001_init.sql -> 002_seed_egypt_and_drugs.sql
-- ============================================================================

begin;

create extension if not exists "pgcrypto";
-- PostGIS ships with Supabase. The app stores plain lat/lng (double precision)
-- so the schema still works on a vanilla Postgres instance, but the extension
-- is enabled for future proximity queries (ST_DWithin / KNN).
create extension if not exists "postgis";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_type') then
    create type public.listing_type as enum ('NEAR_EXPIRY', 'DEAD_STOCK', 'SHORTAGE_REQUEST');
  end if;
  if not exists (select 1 from pg_type where typname = 'dosage_form') then
    create type public.dosage_form as enum ('TABLETS', 'SYRUP', 'INJECTION', 'CREAM', 'DROPS', 'OTHER');
  end if;
  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type public.listing_status as enum ('ACTIVE', 'RESERVED', 'COMPLETED', 'CANCELLED');
  end if;
  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type public.proposal_status as enum ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- GEOGRAPHY: 27 governorates + cities / districts
-- ----------------------------------------------------------------------------
create table if not exists public.governorates (
  id        integer primary key,
  name_ar   text not null,
  name_en   text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cities (
  id             integer primary key,
  governorate_id integer not null references public.governorates(id) on delete cascade,
  name_ar        text not null,
  name_en        text not null,
  created_at     timestamptz not null default now()
);

create index if not exists cities_governorate_idx on public.cities (governorate_id);

-- ----------------------------------------------------------------------------
-- PHARMACIES (profile of a licensed pharmacy; linked to auth.users via user_id)
-- ----------------------------------------------------------------------------
create table if not exists public.pharmacies (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid unique references auth.users(id) on delete cascade,
  pharmacy_name         text not null,
  owner_name            text not null,
  phone                 text not null,
  governorate_id        integer references public.governorates(id),
  city_id               integer references public.cities(id),
  address_details       text not null default '',
  latitude              double precision,
  longitude             double precision,
  delivery_preferences  text[] not null default array['استلام من الصيدلية']::text[],
  is_verified           boolean not null default false,
  license_doc_url       text,
  rating_avg            numeric(3,2) not null default 5.0,
  swaps_count           integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint pharmacies_phone_ck check (char_length(phone) between 8 and 20),
  constraint pharmacies_lat_ck check (latitude is null or latitude between -90 and 90),
  constraint pharmacies_lng_ck check (longitude is null or longitude between -180 and 180)
);

create index if not exists pharmacies_geo_idx on public.pharmacies (governorate_id, city_id);
create index if not exists pharmacies_user_idx on public.pharmacies (user_id);

-- ----------------------------------------------------------------------------
-- LISTINGS: near-expiry, dead stock and shortage requests
-- ----------------------------------------------------------------------------
create table if not exists public.listings (
  id                  uuid primary key default gen_random_uuid(),
  pharmacy_id         uuid not null references public.pharmacies(id) on delete cascade,
  listing_type        public.listing_type not null,
  drug_name           text not null,
  active_ingredient   text,
  dosage_form         public.dosage_form not null default 'OTHER',
  quantity            integer not null,
  public_price_egp    numeric(10,2) not null,
  expiry_date         date,
  batch_number        text,
  swap_preference     text not null default '',
  delivery_method     text not null default 'استلام من الصيدلية',
  images              text[] not null default array[]::text[],
  status              public.listing_status not null default 'ACTIVE',
  views_count         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint listings_quantity_ck check (quantity > 0),
  constraint listings_price_ck check (public_price_egp >= 0),
  constraint listings_images_ck check (array_length(images, 1) is null or array_length(images, 1) <= 3),
  -- Near-expiry / dead stock must carry an expiry date; shortage requests must not.
  constraint listings_expiry_ck check (
    (listing_type = 'SHORTAGE_REQUEST' and expiry_date is null)
    or (listing_type <> 'SHORTAGE_REQUEST' and expiry_date is not null)
  )
);

create index if not exists listings_status_idx on public.listings (status, listing_type, created_at desc);
create index if not exists listings_pharmacy_idx on public.listings (pharmacy_id, status);
create index if not exists listings_expiry_idx on public.listings (expiry_date);
create index if not exists listings_search_idx on public.listings
  using gin (to_tsvector('simple', coalesce(drug_name, '') || ' ' || coalesce(active_ingredient, '')));

-- ----------------------------------------------------------------------------
-- SWAP PROPOSALS (offers, balanced by public price)
-- ----------------------------------------------------------------------------
create table if not exists public.swap_proposals (
  id                        uuid primary key default gen_random_uuid(),
  listing_id                uuid not null references public.listings(id) on delete cascade,
  proposer_pharmacy_id      uuid not null references public.pharmacies(id) on delete cascade,
  offered_items             jsonb not null default '[]'::jsonb,
  offered_items_description text not null,
  offered_total_value_egp   numeric(10,2) not null default 0,
  handover_method           text not null,
  notes                     text,
  status                    public.proposal_status not null default 'PENDING',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint proposals_total_ck check (offered_total_value_egp >= 0)
);

create index if not exists proposals_listing_idx on public.swap_proposals (listing_id, status);
create index if not exists proposals_proposer_idx on public.swap_proposals (proposer_pharmacy_id, status);
create index if not exists proposals_created_idx on public.swap_proposals (created_at desc);

-- ----------------------------------------------------------------------------
-- HELPERS
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pharmacies_touch on public.pharmacies;
create trigger pharmacies_touch before update on public.pharmacies
  for each row execute function public.touch_updated_at();

drop trigger if exists listings_touch on public.listings;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

drop trigger if exists proposals_touch on public.swap_proposals;
create trigger proposals_touch before update on public.swap_proposals
  for each row execute function public.touch_updated_at();

-- Resolves the pharmacy row owned by the signed-in auth user.
create or replace function public.current_pharmacy_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.pharmacies where user_id = auth.uid() limit 1;
$$;

create or replace function public.handle_proposal_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_pharmacy uuid;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.status = 'ACCEPTED' and coalesce(old.status::text, '') <> 'ACCEPTED' then
    update public.listings set status = 'RESERVED' where id = new.listing_id;
    update public.swap_proposals
       set status = 'REJECTED'
     where listing_id = new.listing_id
       and id <> new.id
       and status = 'PENDING';
  end if;

  if new.status = 'COMPLETED' and coalesce(old.status::text, '') <> 'COMPLETED' then
    update public.listings set status = 'COMPLETED' where id = new.listing_id;

    select pharmacy_id into owner_pharmacy from public.listings where id = new.listing_id;
    update public.pharmacies set swaps_count = swaps_count + 1
     where id in (new.proposer_pharmacy_id, owner_pharmacy);
  end if;

  return new;
end;
$$;

drop trigger if exists proposals_status_flow on public.swap_proposals;
create trigger proposals_status_flow after update of status on public.swap_proposals
  for each row execute function public.handle_proposal_status();

-- Public value of a listing (quantity × MOH public price), used by the balancer.
create or replace function public.listing_total_value(p_listing_id uuid)
returns numeric
language sql
stable
as $$
  select round(quantity * public_price_egp, 2) from public.listings where id = p_listing_id;
$$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.governorates    enable row level security;
alter table public.cities          enable row level security;
alter table public.pharmacies      enable row level security;
alter table public.listings        enable row level security;
alter table public.swap_proposals  enable row level security;

-- Reference data: readable by everyone (including anonymous marketplace visitors).
drop policy if exists "governorates are public" on public.governorates;
create policy "governorates are public" on public.governorates for select using (true);

drop policy if exists "cities are public" on public.cities;
create policy "cities are public" on public.cities for select using (true);

-- Pharmacies: storefront data is public, writes are owner-only.
drop policy if exists "pharmacies are public" on public.pharmacies;
create policy "pharmacies are public" on public.pharmacies for select using (true);

drop policy if exists "pharmacy owner inserts" on public.pharmacies;
create policy "pharmacy owner inserts" on public.pharmacies
  for insert with check (auth.uid() = user_id);

drop policy if exists "pharmacy owner updates" on public.pharmacies;
create policy "pharmacy owner updates" on public.pharmacies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Listings: active listings are public; owners manage their own rows.
drop policy if exists "listings readable" on public.listings;
create policy "listings readable" on public.listings
  for select using (status <> 'CANCELLED' or pharmacy_id = public.current_pharmacy_id());

drop policy if exists "listing owner inserts" on public.listings;
create policy "listing owner inserts" on public.listings
  for insert with check (pharmacy_id = public.current_pharmacy_id());

drop policy if exists "listing owner updates" on public.listings;
create policy "listing owner updates" on public.listings
  for update using (pharmacy_id = public.current_pharmacy_id())
  with check (pharmacy_id = public.current_pharmacy_id());

drop policy if exists "listing owner deletes" on public.listings;
create policy "listing owner deletes" on public.listings
  for delete using (pharmacy_id = public.current_pharmacy_id());

-- Proposals: visible to the proposer and to the listing owner.
drop policy if exists "proposals readable by parties" on public.swap_proposals;
create policy "proposals readable by parties" on public.swap_proposals
  for select using (
    proposer_pharmacy_id = public.current_pharmacy_id()
    or exists (
      select 1 from public.listings l
       where l.id = listing_id and l.pharmacy_id = public.current_pharmacy_id()
    )
  );

drop policy if exists "proposal created by its pharmacy" on public.swap_proposals;
create policy "proposal created by its pharmacy" on public.swap_proposals
  for insert with check (
    proposer_pharmacy_id = public.current_pharmacy_id()
    and exists (
      select 1 from public.listings l
       where l.id = listing_id
         and l.status = 'ACTIVE'
         and l.pharmacy_id <> public.current_pharmacy_id()
    )
  );

drop policy if exists "proposal updated by parties" on public.swap_proposals;
create policy "proposal updated by parties" on public.swap_proposals
  for update using (
    proposer_pharmacy_id = public.current_pharmacy_id()
    or exists (
      select 1 from public.listings l
       where l.id = listing_id and l.pharmacy_id = public.current_pharmacy_id()
    )
  );

-- ----------------------------------------------------------------------------
-- GRANTS
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.governorates, public.cities to anon, authenticated;
grant select on public.pharmacies, public.listings to anon, authenticated;
grant all on public.pharmacies, public.listings, public.swap_proposals to authenticated;

comment on table public.listings is 'Near-expiry / dead-stock exchange offers and shortage requests (نواقص)';
comment on column public.listings.public_price_egp is 'Official Egyptian MOH public price per box (سعر الجمهور)';
comment on table public.swap_proposals is 'Public-price-balanced swap offers between pharmacies';

commit;
