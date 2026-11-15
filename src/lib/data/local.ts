import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { Listing, Pharmacy, SwapProposal } from "@/lib/types";

export interface AccountRow {
  email: string;
  password_hash: string;
  pharmacy_id: string;
}

interface DbFile {
  version: number;
  accounts: AccountRow[];
  pharmacies: Pharmacy[];
  listings: Listing[];
  proposals: SwapProposal[];
}

const globalStore = globalThis as unknown as {
  __pharmaswapDb?: DbFile;
  __pharmaswapQueue?: Promise<unknown>;
};

function dataDir(): string {
  const configured = process.env.PHARMASWAP_DATA_DIR;
  return configured ? path.resolve(configured) : path.join(process.cwd(), ".data");
}

function dbPath(): string {
  return path.join(dataDir(), "db.json");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function emptyDb(): DbFile {
  return {
    version: 1,
    accounts: [],
    pharmacies: [],
    listings: [],
    proposals: [],
  };
}

async function persist(db: DbFile): Promise<void> {
  try {
    const dir = dataDir();
    await fs.mkdir(dir, { recursive: true });
    const tmp = path.join(dir, `db.${process.pid}.tmp`);
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, dbPath());
  } catch (error) {
    console.warn("[pharmaswap] local store could not persist (read-only filesystem?):", error);
  }
}

async function loadDb(): Promise<DbFile> {
  if (globalStore.__pharmaswapDb) return globalStore.__pharmaswapDb;

  try {
    const raw = await fs.readFile(dbPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<DbFile>;
    const db = {
      version: 1,
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      pharmacies: Array.isArray(parsed.pharmacies) ? parsed.pharmacies : [],
      listings: Array.isArray(parsed.listings) ? parsed.listings : [],
      proposals: Array.isArray(parsed.proposals) ? parsed.proposals : [],
    } satisfies DbFile;

    globalStore.__pharmaswapDb = db;
    if (
      parsed.accounts?.length ||
      parsed.pharmacies?.length ||
      parsed.listings?.length ||
      parsed.proposals?.length
    ) {
      await persist(db);
    }
    return db;
  } catch {
    const db = emptyDb();
    globalStore.__pharmaswapDb = db;
    await persist(db);
    return db;
  }
}

async function mutate<T>(fn: (db: DbFile) => T | Promise<T>): Promise<T> {
  const previous = globalStore.__pharmaswapQueue ?? Promise.resolve();
  const run = previous.then(async () => {
    const db = await loadDb();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  globalStore.__pharmaswapQueue = run.catch(() => undefined);
  return run;
}

/* -------------------------------------------------------------------------- */
/* Pharmacies                                                                  */
/* -------------------------------------------------------------------------- */

export async function listPharmacies(): Promise<Pharmacy[]> {
  const db = await loadDb();
  return db.pharmacies;
}

export async function getPharmacy(id: string): Promise<Pharmacy | null> {
  const db = await loadDb();
  return db.pharmacies.find((p) => p.id === id) ?? null;
}

export async function createPharmacy(pharmacy: Pharmacy): Promise<Pharmacy> {
  return mutate((db) => {
    db.pharmacies.push(pharmacy);
    return pharmacy;
  });
}

export async function updatePharmacy(
  id: string,
  patch: Partial<Pharmacy>,
): Promise<Pharmacy | null> {
  return mutate((db) => {
    const pharmacy = db.pharmacies.find((p) => p.id === id);
    if (!pharmacy) return null;
    Object.assign(pharmacy, patch);
    return pharmacy;
  });
}

/* -------------------------------------------------------------------------- */
/* Accounts (local fallback auth)                                               */
/* -------------------------------------------------------------------------- */

export async function findAccount(email: string): Promise<AccountRow | null> {
  const db = await loadDb();
  return db.accounts.find((a) => a.email === email.trim().toLowerCase()) ?? null;
}

export async function createAccount(account: AccountRow): Promise<AccountRow> {
  return mutate((db) => {
    db.accounts = db.accounts.filter((a) => a.email !== account.email);
    db.accounts.push(account);
    return account;
  });
}

/* -------------------------------------------------------------------------- */
/* Listings                                                                    */
/* -------------------------------------------------------------------------- */

export async function listListings(): Promise<Listing[]> {
  const db = await loadDb();
  return [...db.listings].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getListing(id: string): Promise<Listing | null> {
  const db = await loadDb();
  return db.listings.find((l) => l.id === id) ?? null;
}

export async function createListing(listing: Listing): Promise<Listing> {
  return mutate((db) => {
    db.listings.unshift(listing);
    return listing;
  });
}

export async function updateListing(
  id: string,
  patch: Partial<Listing>,
): Promise<Listing | null> {
  return mutate((db) => {
    const listing = db.listings.find((l) => l.id === id);
    if (!listing) return null;
    Object.assign(listing, patch);
    return listing;
  });
}

/* -------------------------------------------------------------------------- */
/* Proposals                                                                   */
/* -------------------------------------------------------------------------- */

export async function listProposals(): Promise<SwapProposal[]> {
  const db = await loadDb();
  return [...db.proposals].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getProposal(id: string): Promise<SwapProposal | null> {
  const db = await loadDb();
  return db.proposals.find((p) => p.id === id) ?? null;
}

export async function createProposal(proposal: SwapProposal): Promise<SwapProposal> {
  return mutate((db) => {
    db.proposals.unshift(proposal);
    return proposal;
  });
}

export async function updateProposal(
  id: string,
  patch: Partial<SwapProposal>,
): Promise<SwapProposal | null> {
  return mutate((db) => {
    const proposal = db.proposals.find((p) => p.id === id);
    if (!proposal) return null;
    Object.assign(proposal, patch);
    return proposal;
  });
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}
