// Generates supabase/migrations/002_seed_egypt_and_drugs.sql from src/data/*.json
// Run: node scripts/generate-seed-sql.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const egypt = JSON.parse(fs.readFileSync(path.join(root, "src/data/egypt.json"), "utf8"));
const seed = JSON.parse(fs.readFileSync(path.join(root, "src/data/seed.json"), "utf8"));

const q = (value) => (value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);
const arr = (values) =>
  values && values.length ? `ARRAY[${values.map(q).join(", ")}]::text[]` : `ARRAY[]::text[]`;
const uuidFor = (prefix, index) =>
  `'00000000-0000-4000-8000-${prefix}${String(index).padStart(10, "0")}'`;

const pharmacyIds = new Map();
seed.pharmacies.forEach((p, i) => pharmacyIds.set(p.id, uuidFor("1", i + 1)));
const listingIds = new Map();
seed.listings.forEach((l, i) => listingIds.set(l.id, uuidFor("2", i + 1)));
const proposalIds = new Map();
seed.proposals.forEach((p, i) => proposalIds.set(p.id, uuidFor("3", i + 1)));

const lines = [];
lines.push(`-- ============================================================================`);
lines.push(`-- 002_seed_egypt_and_drugs.sql`);
lines.push(`-- Seed data: 27 Egyptian governorates + cities, 8 licensed pharmacies,`);
lines.push(`-- 12 exchange listings (near-expiry / dead stock) + 4 shortage requests + 3 proposals.`);
lines.push(`-- Generated from src/data/egypt.json + src/data/seed.json — do not edit by hand.`);
lines.push(`-- Expiry dates are relative to CURRENT_DATE so the demo is always meaningful.`);
lines.push(`-- ============================================================================`);
lines.push(``);
lines.push(`begin;`);
lines.push(``);

// Governorates
lines.push(`-- 1) GOVERNORATES (27)`);
lines.push(`insert into public.governorates (id, name_ar, name_en) values`);
lines.push(
  egypt.governorates
    .map((g) => `  (${g.id}, ${q(g.name_ar)}, ${q(g.name_en)})`)
    .join(",\n"),
);
lines.push(`on conflict (id) do update set name_ar = excluded.name_ar, name_en = excluded.name_en;`);
lines.push(``);

// Cities
const cityRows = [];
egypt.governorates.forEach((g) => {
  g.cities.forEach((c, idx) => {
    cityRows.push({ id: g.id * 100 + idx + 1, gov: g.id, ar: c.name_ar, en: c.name_en });
  });
});
lines.push(`-- 2) CITIES / DISTRICTS (${cityRows.length})`);
lines.push(`insert into public.cities (id, governorate_id, name_ar, name_en) values`);
lines.push(cityRows.map((c) => `  (${c.id}, ${c.gov}, ${q(c.ar)}, ${q(c.en)})`).join(",\n"));
lines.push(`on conflict (id) do update set name_ar = excluded.name_ar, name_en = excluded.name_en;`);
lines.push(``);

// Pharmacies
lines.push(`-- 3) PHARMACIES (demo licensed community pharmacies — user_id left null)`);
lines.push(
  `insert into public.pharmacies (id, pharmacy_name, owner_name, phone, governorate_id, city_id, address_details, latitude, longitude, delivery_preferences, is_verified, rating_avg, swaps_count, created_at) values`,
);
lines.push(
  seed.pharmacies
    .map(
      (p) =>
        `  (${pharmacyIds.get(p.id)}, ${q(p.pharmacy_name)}, ${q(p.owner_name)}, ${q(p.phone)}, ${p.governorate_id}, ${p.city_id}, ${q(p.address_details)}, ${p.latitude}, ${p.longitude}, ${arr(p.delivery_preferences)}, ${p.is_verified}, ${p.rating_avg}, ${p.swaps_count}, now() - interval '${30 + p.swaps_count} days')`,
    )
    .join(",\n"),
);
lines.push(`on conflict (id) do nothing;`);
lines.push(``);

// Listings
lines.push(`-- 4) LISTINGS — near expiry, dead stock & shortage requests`);
lines.push(
  `insert into public.listings (id, pharmacy_id, listing_type, drug_name, active_ingredient, dosage_form, quantity, public_price_egp, expiry_date, batch_number, swap_preference, delivery_method, images, status, created_at) values`,
);
lines.push(
  seed.listings
    .map((l, i) => {
      const expiry =
        l.expiry_offset_days === null
          ? "NULL"
          : `(CURRENT_DATE + INTERVAL '${l.expiry_offset_days} days')::date`;
      return `  (${listingIds.get(l.id)}, ${pharmacyIds.get(l.pharmacy_id)}, '${l.listing_type}', ${q(l.drug_name)}, ${q(l.active_ingredient)}, '${l.dosage_form}', ${l.quantity}, ${l.public_price_egp}, ${expiry}, ${q(l.batch_number)}, ${q(l.swap_preference)}, ${q(l.delivery_method)}, ${arr(l.images)}, '${l.status}', now() - interval '${i + 1} days')`;
    })
    .join(",\n"),
);
lines.push(`on conflict (id) do nothing;`);
lines.push(``);

// Proposals
lines.push(`-- 5) SWAP PROPOSALS (pending negotiation examples)`);
lines.push(
  `insert into public.swap_proposals (id, listing_id, proposer_pharmacy_id, offered_items, offered_items_description, offered_total_value_egp, handover_method, notes, status, created_at) values`,
);
lines.push(
  seed.proposals
    .map(
      (p) =>
        `  (${proposalIds.get(p.id)}, ${listingIds.get(p.listing_id)}, ${pharmacyIds.get(p.proposer_pharmacy_id)}, ${q(JSON.stringify(p.offered_items))}::jsonb, ${q(p.offered_items_description)}, ${p.offered_total_value_egp}, ${q(p.handover_method)}, ${q(p.notes)}, '${p.status}', now() - interval '${p.created_offset_days} days')`,
    )
    .join(",\n"),
);
lines.push(`on conflict (id) do nothing;`);
lines.push(``);
lines.push(`commit;`);
lines.push(``);
lines.push(`-- Demo accounts are intentionally not inserted into auth.users.`);
lines.push(`-- Create your own pharmacy account through /onboarding in the app.`);

const outDir = path.join(root, "supabase/migrations");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "002_seed_egypt_and_drugs.sql"), lines.join("\n"), "utf8");

console.log(
  `002_seed_egypt_and_drugs.sql written: ${egypt.governorates.length} governorates, ${cityRows.length} cities, ${seed.pharmacies.length} pharmacies, ${seed.listings.length} listings, ${seed.proposals.length} proposals.`,
);
