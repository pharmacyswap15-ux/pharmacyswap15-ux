"use server";

import { presignR2Upload, r2Enabled, saveLocalUpload, type UploadTarget } from "@/lib/storage";
import { getCurrentPharmacy } from "@/lib/session";

export interface UploadTargetResponse extends UploadTarget {
  error?: string;
}

export async function requestUploadTargetAction(input: {
  contentType: string;
  extension: string;
}): Promise<UploadTargetResponse> {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) return { mode: "local", error: "سجّل الدخول أولاً لرفع الصور." };

  if (!r2Enabled()) return { mode: "local" };

  const allowed = ["webp", "jpg", "jpeg", "png"];
  const extension = allowed.includes(input.extension.toLowerCase()) ? input.extension.toLowerCase() : "webp";
  const contentType = input.contentType.startsWith("image/") ? input.contentType : "image/webp";

  try {
    const target = await presignR2Upload(contentType, extension);
    return target;
  } catch (error) {
    console.warn("[pharmaswap] R2 presign failed, falling back to local upload:", error);
    return { mode: "local" };
  }
}

export async function uploadLocalImageAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const pharmacy = await getCurrentPharmacy();
  if (!pharmacy) return { error: "سجّل الدخول أولاً لرفع الصور." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "لم يتم اختيار صورة صالحة." };
  }

  try {
    const url = await saveLocalUpload(file);
    return { url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "تعذر حفظ الصورة." };
  }
}
