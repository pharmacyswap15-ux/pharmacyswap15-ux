import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type UploadMode = "r2" | "local";

export interface UploadTarget {
  mode: UploadMode;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function r2Enabled(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL,
  );
}

let client: S3Client | null = null;

function r2Client(): S3Client {
  if (client) return client;
  client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });
  return client;
}

function publicBase(): string {
  return (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

export async function presignR2Upload(contentType: string, extension: string): Promise<UploadTarget> {
  const key = `listings/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME as string,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(r2Client(), command, { expiresIn: 300 });

  return {
    mode: "r2",
    uploadUrl,
    key,
    publicUrl: `${publicBase()}/${key}`,
  };
}

export function localUploadsDir(): string {
  const configured = process.env.PHARMASWAP_DATA_DIR;
  const base = configured ? path.resolve(configured) : path.join(process.cwd(), ".data");
  return path.join(base, "uploads");
}

export async function saveLocalUpload(file: File): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("حجم الصورة أكبر من الحد المسموح (4 ميجابايت)");
  }

  const name = file.name || "photo.webp";
  const extension = (name.split(".").pop() || "webp").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExtension = ["webp", "jpg", "jpeg", "png"].includes(extension) ? extension : "webp";
  const key = `${crypto.randomUUID()}.${safeExtension}`;
  const dir = localUploadsDir();
  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, key), bytes);
  return `/api/uploads/${key}`;
}

export async function readLocalUpload(key: string): Promise<{ bytes: Buffer; type: string } | null> {
  // Prevent path traversal: only allow a flat, generated filename.
  if (!/^[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png)$/.test(key)) return null;
  try {
    const bytes = await fs.readFile(path.join(localUploadsDir(), key));
    const extension = key.split(".").pop() as string;
    const type =
      extension === "png"
        ? "image/png"
        : extension === "jpg" || extension === "jpeg"
          ? "image/jpeg"
          : "image/webp";
    return { bytes, type };
  } catch {
    return null;
  }
}
