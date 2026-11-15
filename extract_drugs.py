#!/usr/bin/env python3
"""
PHARMASWAP — Egyptian drug catalogue extractor.

Reads the TITAN pharmacy programme's fixed-record drug files
(``egypt.phar.phy`` / ``egypt.cosmo.phy``) and produces a clean JSON/CSV
catalogue that powers the PHARMASWAP "Add Listing" auto-fill.

Reverse-engineered binary format
--------------------------------
The ``.phy`` files are **not** Jet/MDB, SQLite or Firebird. They carry no magic
banner (the first slot of ``egypt.cosmo.phy`` literally spells
``"FILLING ITEM"``), no page headers and no SQLite header string, so they are a
custom flat-file database used by the TITAN/Delphi desktop POS.

Layout (verified against 31,999 records of ``egypt.phar.phy``):

    offset  size   field
    0       856    slot 0 — template record (defaults, no drug)
    856+n*856      one 856-byte record per drug

Per record (offsets relative to the record start):

    0     40   commercial name, English  — Windows-1252, space padded
    40    30   commercial name, Arabic   — Windows-1256, space padded
    70    20   manufacturer / company   — Windows-1252
    90    40   active ingredient + strength — Windows-1252
    130   8    opaque double (internal id / checksum)
    196   4    int32 flag (1 = active row)
    208   4    float32  PUBLIC PRICE in EGP  (سعر الجمهور)
    224   4    float32  duplicate of the public price
    232   4    float32  constant 1.0
    238   2+2  int16 flags / form id
    244   4    float32  pack factor
    264   4    int32    pack size (tabs, ml, gm …)
    780   2    end marker (0xFFFF)
    796   56   pharmacological class / therapeutic group

``egypt.cosmo.phy`` uses the same 856-byte stride but only fills
offset 0 (single mixed Arabic/English name), 208 and 224 (price).

Prices were cross-checked against real Egyptian public prices
(CONCOR 5mg 30 tab = 72.00, AUGMENTIN 625mg 10 tab = 117.00,
PANADOL ADVANCE 24 tab = 46.00, CATAFLAM 25mg 20 tab = 34.00).

Usage
-----
    python extract_drugs.py                       # default Windows path
    python extract_drugs.py --phar /path/egypt.phar.phy
    python extract_drugs.py --include-cosmetics
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import re
import struct
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

try:  # Windows consoles default to cp1252/cp437 — force UTF-8 so Arabic prints.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):  # pragma: no cover - unusual streams
    pass

DEFAULT_DB_DIR = r"D:\Labirdo\TITAN.W1\Files\DB"
DEFAULT_PHAR = os.path.join(DEFAULT_DB_DIR, "egypt.phar.phy")
DEFAULT_COSMO = os.path.join(DEFAULT_DB_DIR, "egypt.cosmo.phy")

RECORD_SIZE = 856
HEADER_SLOTS = 1  # slot 0 holds the template record

# Field boundaries inside a record (start, end)
F_NAME_EN = (0, 40)
F_NAME_AR = (40, 70)
F_COMPANY = (70, 90)
F_INGREDIENT = (90, 130)
F_PRICE_A = (208, 212)
F_PRICE_B = (224, 228)
F_PACK = (264, 268)
F_CLASS = (796, 852)

DOSAGE_FORMS = ("TABLETS", "SYRUP", "INJECTION", "CREAM", "DROPS", "OTHER")

# Ordered rules — first match wins.
DOSAGE_RULES: list[tuple[str, tuple[str, ...]]] = [
    (
        "INJECTION",
        (
            "inj", "i.v", "i.m", "i.v.", "i.m.", "s.c", "infusion", "amp", "ampoule",
            "vial", "syringe", "cartridge", "pen ", "insulin", "حقن", "امبول", "أمبول",
            "فيال", "فايل", "سرنجة", "خرطوشة", "محلول حقن",
        ),
    ),
    (
        "DROPS",
        (
            "drop", "drops", "spray", "ophth", "eye", "ear", "nasal", "nose", "inhaler",
            "aerosol", "nebul", "قطرة", "قطره", "نقط", "بخاخ", "اسبراي", "أنف", "انف",
            "عين", "اذن", "أذن", "استنشاق",
        ),
    ),
    (
        "SYRUP",
        (
            "syrup", "syr", "susp", "suspension", "solution", "elixir", "emulsion",
            "sachet", "sachets", "granules", "شراب", "معلق", "محلول", "اكياس",
            "أكياس", "شيكارة",
        ),
    ),
    (
        "CREAM",
        (
            "cream", "crm", "ointment", "oint", "gel", "emulgel", "lotion", "topical",
            "patch", "foam", "shampoo", "soap", "كريم", "مرهم", "جيل", "لوشن", "غسول",
            "شامبو",
        ),
    ),
    (
        "TABLETS",
        (
            "tab", "tabs", "tablet", "tablets", "cap", "caps", "capsule", "capsules",
            "caplet", "caplets", "f.c", "sugar coated", "chewable", "قرص", "اقراص",
            "أقراص", "كبسول", "كبسولة", "كبسولات",
        ),
    ),
]

# Suppositories / pessaries do not exist in the app's form list — label them OTHER
# instead of mis-bucketing them as cream (CHECK: this must run first, "لبوس" is
# often only present in the Arabic name).
SUPPOSITORY_RE = re.compile(
    r"(?<![a-z])supp(?:ositor(?:y|ies))?(?![a-z])|لبوس|تحاميل|تحميلة|اقماع|أقماع"
)

ARABIC_DIACRITICS = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]")
ARABIC_MAP = {ord(c): None for c in "\u200c\u200d\u200e\u200f\u202a-\u202e"}
NON_PRINTABLE = re.compile(r"[\x00-\x1f\x7f]")
SPACES = re.compile(r"\s+")
EDGE_PUNCT = re.compile(r"^[\s\-.,;:*/\\|_]+|[\s\-.,;:*/\\|_]+$")


# --------------------------------------------------------------------------- #
# Decoding helpers
# --------------------------------------------------------------------------- #
def decode_field(raw: bytes, encoding: str) -> str:
    """Decode a fixed-width, space/NUL padded field."""
    raw = raw.split(b"\x00", 1)[0]
    text = raw.decode(encoding, errors="replace")
    text = NON_PRINTABLE.sub(" ", text)
    text = text.replace("\ufffd", "")
    return SPACES.sub(" ", text).strip(" \t")


def decode_smart(raw: bytes) -> str:
    """Decode a catalogue field that may hold Latin OR Windows-1256 Arabic.

    Several TITAN rows store the Arabic trade name inside the 40-byte
    "English" column (bytes like 0xD3 0xED 0xCC 0xE4 …). Reading those as
    cp1252 produces "ÓíÌäÇá" style junk, so pick the decoding that yields
    actual Arabic letters whenever the field has high bytes.
    """
    raw = raw.split(b"\x00", 1)[0]
    if not raw.strip(b" \t"):
        return ""
    if any(b >= 0x80 for b in raw):
        arabic = raw.decode("cp1256", errors="replace")
        latin = raw.decode("cp1252", errors="replace")
        arabic_letters = len(re.findall(r"[\u0600-\u06ff]", arabic))
        latin_accents = len(re.findall(r"[\u00c0-\u00ff]", latin))
        if arabic_letters >= 2 and arabic_letters >= latin_accents:
            text = arabic
        else:
            text = latin
    else:
        text = raw.decode("cp1252", errors="replace")
    text = NON_PRINTABLE.sub(" ", text).replace("\ufffd", "")
    return SPACES.sub(" ", text).strip(" \t")


def fix_mojibake(text: str) -> str:
    """Repair double-encoded Arabic (UTF-8 bytes read as cp1256/cp1252)."""
    if not text:
        return text
    suspicious = ("Ø", "Ù", "Ã", "Â", "Ð", "Ñ")
    if any(ch in text for ch in suspicious):
        for source in ("cp1256", "cp1252", "latin-1"):
            try:
                repaired = text.encode(source, errors="strict").decode("utf-8", errors="strict")
            except (UnicodeEncodeError, UnicodeDecodeError):
                continue
            if repaired and repaired != text:
                return repaired
    return text


def clean_text(text: str) -> str:
    text = fix_mojibake(text)
    text = ARABIC_DIACRITICS.sub("", text)
    text = text.translate(ARABIC_MAP)
    text = text.replace("\u00ae", "").replace("\u2122", "").replace("\u00a9", "")
    text = SPACES.sub(" ", text).strip()
    return EDGE_PUNCT.sub("", text).strip()


def normalize_key(text: str) -> str:
    """Search key: lowercase, Arabic letters unified, punctuation dropped."""
    if not text:
        return ""
    text = text.casefold()
    text = re.sub(r"[أإآٱ]", "ا", text)
    text = re.sub(r"[ىی]", "ي", text)
    text = re.sub(r"[ةۀ]", "ه", text)
    text = re.sub(r"[ؤئء]", "", text)
    text = re.sub(r"[^\w\u0600-\u06ff]+", " ", text, flags=re.UNICODE)
    return SPACES.sub(" ", text).strip()


def classify_dosage(*sources: str) -> str:
    haystack = " ".join(s for s in sources if s).casefold()
    if not haystack:
        return "OTHER"
    if SUPPOSITORY_RE.search(haystack):
        return "OTHER"
    for form, needles in DOSAGE_RULES:
        for needle in needles:
            if not needle.isascii():
                if needle in haystack:
                    return form
                continue
            # Latin needles need a word start so "oint" does not match "JOINT".
            if re.search(r"(?<![a-z])" + re.escape(needle), haystack):
                return form
    return "OTHER"


def price_of(rec: bytes) -> float:
    a = struct.unpack("<f", rec[F_PRICE_A[0]:F_PRICE_A[1]])[0]
    b = struct.unpack("<f", rec[F_PRICE_B[0]:F_PRICE_B[1]])[0]
    value = a if math.isfinite(a) and a > 0 else b
    if not math.isfinite(value) or value <= 0:
        return 0.0
    return round(float(value), 2)


def pack_of(rec: bytes) -> int | None:
    value = struct.unpack("<i", rec[F_PACK[0]:F_PACK[1]])[0]
    return value if 0 < value <= 100000 else None


BARCODE_RE = re.compile(rb"(?<!\d)(\d{8,14})(?!\d)")


def barcode_of(rec: bytes) -> str | None:
    """The catalogue has no barcode column; keep any plausible GTIN we find."""
    for m in BARCODE_RE.finditer(rec[130:796]):
        candidate = m.group(1).decode("ascii")
        if len(candidate) in (8, 12, 13, 14) and len(set(candidate)) > 2:
            return candidate
    return None


# --------------------------------------------------------------------------- #
# Record parsing
# --------------------------------------------------------------------------- #
@dataclass
class Drug:
    id: str
    source: str
    name_en: str
    name_ar: str
    active_ingredient: str
    company: str
    dosage_form: str
    pack_size: int | None
    category: str
    public_price_egp: float
    barcode: str | None


def iter_records(path: Path):
    data = path.read_bytes()
    if len(data) < RECORD_SIZE * 2:
        raise SystemExit(f"{path} is too small to be a TITAN .phy catalogue")
    total = len(data) // RECORD_SIZE
    if len(data) % RECORD_SIZE:
        print(f"  ! {len(data) % RECORD_SIZE} trailing bytes ignored", file=sys.stderr)
    for slot in range(HEADER_SLOTS, total):
        start = slot * RECORD_SIZE
        yield slot, data[start:start + RECORD_SIZE]


def parse_pharma(rec: bytes, source: str) -> Drug | None:
    name_en = clean_text(decode_smart(rec[F_NAME_EN[0]:F_NAME_EN[1]]))
    name_ar = clean_text(decode_smart(rec[F_NAME_AR[0]:F_NAME_AR[1]]))
    ingredient = clean_text(decode_smart(rec[F_INGREDIENT[0]:F_INGREDIENT[1]]))
    company = clean_text(decode_smart(rec[F_COMPANY[0]:F_COMPANY[1]]))
    category = clean_text(decode_smart(rec[F_CLASS[0]:F_CLASS[1]]))
    price = price_of(rec)

    # If the "English" column actually carried Arabic, move it to the Arabic slot.
    if name_en and re.search(r"[\u0600-\u06ff]", name_en):
        if not name_ar:
            name_ar = name_en
            name_en = ""
        elif normalize_key(name_en) == normalize_key(name_ar):
            name_en = ""

    if not name_en and not name_ar:
        return None
    if not re.search(r"[A-Za-z\u0600-\u06ff]{2,}", name_en or name_ar):
        return None
    if price <= 0:
        return None
    if len(name_en) < 3 and len(name_ar) < 3:
        return None

    return Drug(
        id="",
        source=source,
        name_en=name_en,
        name_ar=name_ar,
        active_ingredient=ingredient,
        company=company,
        dosage_form=classify_dosage(name_en, name_ar, ingredient),
        pack_size=pack_of(rec),
        category=category,
        public_price_egp=price,
        barcode=barcode_of(rec),
    )


def parse_cosmo(rec: bytes, source: str) -> Drug | None:
    name = clean_text(decode_smart(rec[0:40]))
    price = price_of(rec)
    if not name or price <= 0:
        return None
    if not re.search(r"[A-Za-z\u0600-\u06ff]{2,}", name):
        return None
    return Drug(
        id="",
        source=source,
        name_en=name if name.isascii() else "",
        name_ar="" if name.isascii() else name,
        active_ingredient="",
        company="",
        dosage_form=classify_dosage(name),
        pack_size=pack_of(rec),
        category="COSMETICS",
        public_price_egp=price,
        barcode=barcode_of(rec),
    )


# --------------------------------------------------------------------------- #
# Cleaning / de-duplication
# --------------------------------------------------------------------------- #
def display_name(drug: Drug) -> str:
    return drug.name_en or drug.name_ar


def fingerprint(drug: Drug) -> str:
    parts = [
        normalize_key(display_name(drug)),
        normalize_key(drug.name_ar),
        normalize_key(drug.company),
        f"{drug.public_price_egp:.2f}",
    ]
    return "|".join(parts)


def make_id(drug: Drug) -> str:
    digest = hashlib.sha1(
        f"{normalize_key(display_name(drug))}|{normalize_key(drug.name_ar)}|{normalize_key(drug.company)}|{drug.public_price_egp:.2f}".encode(
            "utf-8"
        )
    ).hexdigest()[:12]
    return f"drg_{digest}"


def dedupe(drugs: list[Drug]) -> tuple[list[Drug], int]:
    seen: dict[str, Drug] = {}
    removed = 0
    for drug in drugs:
        key = fingerprint(drug)
        existing = seen.get(key)
        if existing is None:
            seen[key] = drug
            continue
        removed += 1
        # Keep the richer row (more filled fields, longer names).
        score_new = _richness(drug)
        if score_new > _richness(existing):
            seen[key] = drug
    return list(seen.values()), removed


def _richness(drug: Drug) -> tuple:
    return (
        len(drug.name_en) + len(drug.name_ar),
        bool(drug.active_ingredient),
        bool(drug.company),
        len(drug.category),
        len(drug.name_ar),
    )


def finalize(drugs: list[Drug]) -> list[Drug]:
    for drug in drugs:
        drug.id = make_id(drug)
    drugs.sort(key=lambda d: (normalize_key(display_name(d)), d.public_price_egp))
    return drugs


# --------------------------------------------------------------------------- #
# Output writers
# --------------------------------------------------------------------------- #
def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def write_runtime_json(path: Path, drugs: list[Drug], meta: dict) -> None:
    """Compact payload the Next.js app reads at runtime (server-side only)."""
    rows = [
        {
            "id": d.id,
            "n": d.name_en,
            "a": d.name_ar,
            "i": d.active_ingredient,
            "c": d.company,
            "f": d.dosage_form,
            "p": d.public_price_egp,
            "k": d.pack_size,
            "g": d.category,
        }
        for d in drugs
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps({"meta": meta, "drugs": rows}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


CSV_COLUMNS = [
    "id",
    "source",
    "name_en",
    "name_ar",
    "active_ingredient",
    "company",
    "dosage_form",
    "pack_size",
    "category",
    "public_price_egp",
    "barcode",
]


def write_csv(path: Path, drugs: list[Drug]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_COLUMNS, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for drug in drugs:
            row = asdict(drug)
            row["pack_size"] = drug.pack_size if drug.pack_size is not None else ""
            row["barcode"] = drug.barcode or ""
            writer.writerow(row)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def load(path: Path, parser, source: str, limit: int | None, label: str) -> tuple[list[Drug], int]:
    if not path.exists():
        raise SystemExit(
            f"missing {label}: {path}\n"
            "Pass --phar/--cosmo with the real path, or omit the flag to skip."
        )
    size_mb = path.stat().st_size / (1024 * 1024)
    print(f"→ {label}: {path}  ({size_mb:.1f} MB)")
    out: list[Drug] = []
    scanned = 0
    for slot, rec in iter_records(path):
        scanned += 1
        drug = parser(rec, source)
        if drug is not None:
            out.append(drug)
        if limit and len(out) >= limit:
            break
    print(f"  scanned {scanned:,} slots → {len(out):,} usable rows")
    return out, scanned


def main(argv: list[str] | None = None) -> int:
    root = Path(__file__).resolve().parent
    ap = argparse.ArgumentParser(description="Extract the Egyptian drug catalogue from TITAN .phy files")
    ap.add_argument("--phar", default=DEFAULT_PHAR, help="path to egypt.phar.phy")
    ap.add_argument("--cosmo", default=DEFAULT_COSMO, help="path to egypt.cosmo.phy")
    ap.add_argument("--skip-phar", action="store_true")
    ap.add_argument("--include-cosmetics", action="store_true", help="merge cosmetics into the drug catalogue")
    ap.add_argument("--cosmo-only", action="store_true", help="only parse cosmetics")
    ap.add_argument("--out-json", default=str(root / "supabase/seed/drugs_catalog.json"))
    ap.add_argument("--out-csv", default=str(root / "supabase/seed/drugs_catalog.csv"))
    ap.add_argument("--out-cosmo-json", default=str(root / "supabase/seed/cosmetics_catalog.json"))
    ap.add_argument("--out-runtime", default=str(root / "src/data/drugs-catalog.json"))
    ap.add_argument("--limit", type=int, default=None, help="stop after N usable rows (debug)")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv)

    drugs: list[Drug] = []
    scanned_total = 0

    if args.cosmo_only:
        cosmo, scanned = load(Path(args.cosmo), parse_cosmo, "cosmo", args.limit, "cosmetics")
        scanned_total += scanned
        cosmo, removed = dedupe(cosmo)
        cosmo = finalize(cosmo)
        write_json(
            Path(args.out_cosmo_json),
            {
                "meta": {
                    "source": "egypt.cosmo.phy",
                    "format": "TITAN .phy fixed 856-byte records",
                    "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "records_kept": len(cosmo),
                    "duplicates_removed": removed,
                },
                "drugs": [asdict(d) for d in cosmo],
            },
        )
        print(f"✓ {len(cosmo):,} cosmetics → {args.out_cosmo_json}")
        return 0

    if not args.skip_phar:
        pharma, scanned = load(Path(args.phar), parse_pharma, "phar", args.limit, "pharmacy")
        scanned_total += scanned
        drugs.extend(pharma)

    if args.include_cosmetics:
        cosmo, scanned = load(Path(args.cosmo), parse_cosmo, "cosmo", None, "cosmetics")
        scanned_total += scanned
        drugs.extend(cosmo)

    if not drugs:
        raise SystemExit("no records extracted — check the input paths")

    drugs, removed = dedupe(drugs)
    drugs = finalize(drugs)

    meta = {
        "source": "TITAN pharmacy catalogue (egypt.phar.phy)",
        "source_format": "fixed 856-byte records, Windows-1256 Arabic",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "records_scanned": scanned_total,
        "records_kept": len(drugs),
        "duplicates_removed": removed,
        "with_arabic_name": sum(1 for d in drugs if d.name_ar),
        "with_ingredient": sum(1 for d in drugs if d.active_ingredient),
        "with_company": sum(1 for d in drugs if d.company),
        "price_min": min(d.public_price_egp for d in drugs),
        "price_max": max(d.public_price_egp for d in drugs),
    }

    write_json(Path(args.out_json), {"meta": meta, "drugs": [asdict(d) for d in drugs]})
    write_csv(Path(args.out_csv), drugs)
    write_runtime_json(Path(args.out_runtime), drugs, meta)

    if not args.quiet:
        by_form: dict[str, int] = {}
        for d in drugs:
            by_form[d.dosage_form] = by_form.get(d.dosage_form, 0) + 1
        print()
        print(f"✓ kept {len(drugs):,} drugs  (removed {removed:,} duplicates)")
        print(f"  arabic names : {meta['with_arabic_name']:,}")
        print(f"  ingredients  : {meta['with_ingredient']:,}")
        print(f"  companies    : {meta['with_company']:,}")
        print(f"  price range  : {meta['price_min']:.2f} – {meta['price_max']:.2f} EGP")
        print(f"  dosage forms : {', '.join(f'{k}={v:,}' for k, v in sorted(by_form.items()))}")
        print(f"  → {args.out_json}")
        print(f"  → {args.out_csv}")
        print(f"  → {args.out_runtime}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
