import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

import { getPharmacyById } from "@/lib/data";
import type { Pharmacy } from "@/lib/types";

const COOKIE_NAME = "ps_session";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  return process.env.SESSION_SECRET || "pharmaswap-local-development-secret";
}

function signature(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function setSession(pharmacyId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, `${pharmacyId}.${signature(pharmacyId)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSessionPharmacyId(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;
  const pharmacyId = raw.slice(0, separator);
  const provided = raw.slice(separator + 1);
  const expected = signature(pharmacyId);
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  return pharmacyId;
}

export async function getCurrentPharmacy(): Promise<Pharmacy | null> {
  const id = await getSessionPharmacyId();
  if (!id) return null;
  return getPharmacyById(id);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^01[0-9]{9}$/.test(phone.replace(/\s|-/g, ""));
}
