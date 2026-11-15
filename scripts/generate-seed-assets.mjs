// Generates the neutral, clinical carton "photos" used by the seed listings.
// Run: node scripts/generate-seed-assets.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "public/seed");
fs.mkdirSync(outDir, { recursive: true });

const drugs = [
  { file: "panadol", latin: "PANADOL ADVANCE", arabic: "بانادول أدفانس", sub: "Paracetamol 500 mg", form: "24 TABLETS", color: "#0f766e", batch: "PN-8842", exp: "02/2027" },
  { file: "catafly", latin: "CAT A FLY", arabic: "كاتافلاي", sub: "Diclofenac Potassium 12.5 mg / 5 ml", form: "120 ml SYRUP", color: "#b45309", batch: "CT-1120", exp: "01/2027" },
  { file: "augmentin", latin: "AUGMENTIN 1g", arabic: "أوجمنتين 1 جم", sub: "Amoxicillin + Clavulanic Acid", form: "14 FILM COATED TABLETS", color: "#0f766e", batch: "AG-7741", exp: "12/2026" },
  { file: "concor", latin: "CONCOR 5", arabic: "كونكور 5 مجم", sub: "Bisoprolol Fumarate", form: "30 TABLETS", color: "#334155", batch: "CN-5520", exp: "04/2028" },
  { file: "voltaren", latin: "VOLTAREN 50", arabic: "فولتارين 50 مجم", sub: "Diclofenac Sodium", form: "20 TABLETS", color: "#b45309", batch: "VL-3389", exp: "02/2027" },
  { file: "lantus", latin: "LANTUS SOLOSTAR", arabic: "لانتوس سولوستار", sub: "Insulin Glargine 100 U/ml", form: "5 x 3 ml PENS", color: "#0f172a", batch: "LN-9902", exp: "01/2028" },
  { file: "claritine", latin: "CLARITINE", arabic: "كلاريتين", sub: "Loratadine 10 mg", form: "20 TABLETS", color: "#0f766e", batch: "CL-2281", exp: "01/2027" },
  { file: "cetotax", latin: "CETOTAX 1g", arabic: "سيفوتاكس 1 جم", sub: "Cefotaxime Sodium", form: "1 VIAL", color: "#b91c1c", batch: "CF-6612", exp: "09/2027" },
  { file: "nurofen", latin: "NUROFEN", arabic: "نيوروفين", sub: "Ibuprofen 100 mg / 5 ml", form: "120 ml SYRUP", color: "#b45309", batch: "NR-4471", exp: "12/2026" },
  { file: "diclofenac-gel", latin: "DICLOFENAC GEL", arabic: "ديكلوفيناك جل", sub: "Diclofenac Diethylamine 1%", form: "50 g TUBE", color: "#0f766e", batch: "DK-1190", exp: "05/2028" },
  { file: "zithromax", latin: "ZITHROMAX 500", arabic: "زيثروماكس 500", sub: "Azithromycin", form: "3 TABLETS", color: "#334155", batch: "ZT-7723", exp: "01/2027" },
  { file: "gastreg", latin: "GAST-REG 50", arabic: "جاست ريج 50", sub: "Etopride 50 mg — GI antispasmodic", form: "30 TABLETS", color: "#0f766e", batch: "GR-2245", exp: "10/2027" },
];

const svg = (d) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${d.latin}">
  <defs>
    <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f1f5f9"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="800" height="800" fill="url(#surface)"/>
  <rect x="40" y="40" width="720" height="720" fill="none" stroke="#cbd5e1" stroke-width="2"/>
  <g filter="url(#soft)" transform="translate(185 130) rotate(-3 215 280)">
    <rect width="430" height="540" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
    <rect width="430" height="96" fill="${d.color}"/>
    <text x="24" y="46" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-size="26" font-weight="700" fill="#ffffff" letter-spacing="1">${d.latin}</text>
    <text x="24" y="76" font-family="'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif" font-size="19" fill="#e2e8f0">${d.arabic}</text>
    <text x="24" y="150" font-family="'Segoe UI', Tahoma, sans-serif" font-size="17" fill="#334155">${d.sub}</text>
    <line x1="24" y1="176" x2="406" y2="176" stroke="#e2e8f0" stroke-width="2"/>
    <rect x="24" y="198" width="382" height="112" fill="#f8fafc" stroke="#e2e8f0"/>
    <text x="42" y="240" font-family="'Segoe UI', Tahoma, sans-serif" font-size="15" fill="#64748b" letter-spacing="1">PACK SIZE</text>
    <text x="42" y="272" font-family="'Plus Jakarta Sans', 'Segoe UI', sans-serif" font-size="21" font-weight="600" fill="#0f172a">${d.form}</text>
    <text x="42" y="298" font-family="'Segoe UI', Tahoma, sans-serif" font-size="12" fill="#94a3b8">Rx — Store below 25°C, protect from light</text>
    <g transform="translate(24 336)">
      <text font-family="'JetBrains Mono', 'Consolas', monospace" font-size="14" fill="#64748b" letter-spacing="2">BATCH</text>
      <text y="26" font-family="'JetBrains Mono', 'Consolas', monospace" font-size="22" fill="#0f172a">${d.batch}</text>
    </g>
    <g transform="translate(232 336)">
      <text font-family="'JetBrains Mono', 'Consolas', monospace" font-size="14" fill="#64748b" letter-spacing="2">EXP</text>
      <text y="26" font-family="'JetBrains Mono', 'Consolas', monospace" font-size="22" fill="${d.color}">${d.exp}</text>
    </g>
    <g transform="translate(24 410)" fill="#0f172a">
      ${[3, 6, 2, 8, 4, 3, 7, 2, 6, 4, 8, 3, 2, 7, 4, 6, 3, 8, 2, 4, 6, 3, 8, 2, 5, 7, 3, 4]
        .map((w, i) => `<rect x="${i * 15}" y="0" width="${w}" height="${i % 3 === 0 ? 60 : 48}" />`)
        .join("")}
    </g>
    <text x="24" y="502" font-family="'JetBrains Mono', 'Consolas', monospace" font-size="12" fill="#94a3b8" letter-spacing="3">8901234567890</text>
    <rect x="0" y="524" width="430" height="16" fill="${d.color}" opacity="0.14"/>
  </g>
  <text x="400" y="748" text-anchor="middle" font-family="'JetBrains Mono', 'Consolas', monospace" font-size="14" fill="#94a3b8" letter-spacing="4">PHARMASWAP · DEMO CARTON</text>
</svg>
`;

for (const d of drugs) {
  fs.writeFileSync(path.join(outDir, `${d.file}.svg`), svg(d), "utf8");
}
console.log(`Generated ${drugs.length} seed carton images in public/seed/`);
