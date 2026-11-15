// Generates supabase/migrations/002_seed_egypt_and_drugs.sql from src/data/*.json
// Run: node scripts/generate-seed-sql.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const egypt = JSON.parse(fs.readFileSync(path.join(root, "src/data/egypt.json"), "utf8"));

const q = (value) => (value === null || value === undefined ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);

const lines = [];
lines.push(`-- ============================================================================`);
lines.push(`-- 002_seed_egypt_and_drugs.sql`);
lines.push(`-- Reference data only: 27 Egyptian governorates + cities.`);
lines.push(`-- Production data is created only by real pharmacy users through the app.`);
lines.push(`-- No demo pharmacies, listings, proposals, or seeded marketplace records.`);
lines.push(`-- ============================================================================`);
lines.push(``);
lines.push(`begin;`);
lines.push(``);

lines.push(`-- 1) GOVERNORATES (27)`);
lines.push(`insert into public.governorates (id, name_ar, name_en) values`);
lines.push(
  egypt.governorates
    .map((g) => `  (${g.id}, ${q(g.name_ar)}, ${q(g.name_en)})`)
    .join(",\n"),
);
lines.push(`on conflict (id) do update set name_ar = excluded.name_ar, name_en = excluded.name_en;`);
lines.push(``);

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

lines.push(`-- 3) No demo pharmacies, listings, or proposals are inserted.`);
lines.push(`-- Real records must be created by authenticated licensed pharmacy accounts only.`);
lines.push(``);
lines.push(`commit;`);

const outDir = path.join(root, "supabase/migrations");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "002_seed_egypt_and_drugs.sql"), lines.join("\n"), "utf8");

console.log(
  `002_seed_egypt_and_drugs.sql written: ${egypt.governorates.length} governorates and ${cityRows.length} cities with no demo marketplace records.`,
);
