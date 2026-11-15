"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, ZoomIn } from "lucide-react";

import { uploadLocalImageAction, requestUploadTargetAction } from "@/app/actions/upload";
import { cn } from "@/lib/cn";
import { ImageLightbox } from "@/components/market/image-lightbox";

const MAX_IMAGES = 3;

async function compress(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("الملف المختار ليس صورة.");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("حجم الصورة كبير جداً قبل الضغط (الحد 12 ميجابايت).");
  }

  const { default: imageCompression } = await import("browser-image-compression");
  let compressed: File | Blob;
  try {
    compressed = await imageCompression(file, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.82,
    });
  } catch {
    compressed = await imageCompression(file, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1200,
      useWebWorker: false,
      fileType: "image/webp",
    });
  }

  return new File([compressed], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.webp`, {
    type: "image/webp",
  });
}

async function upload(file: File): Promise<string> {
  const target = await requestUploadTargetAction({ contentType: file.type, extension: "webp" });

  if (target.error && target.mode !== "r2") {
    throw new Error(target.error);
  }

  if (target.mode === "r2" && target.uploadUrl && target.publicUrl) {
    try {
      const response = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`R2 ${response.status}`);
      return target.publicUrl;
    } catch {
      // Seamless fallback: never block a pharmacy because of storage credentials.
    }
  }

  const formData = new FormData();
  formData.append("file", file);
  const local = await uploadLocalImageAction(formData);
  if (!local.url) throw new Error(local.error ?? "تعذر حفظ الصورة.");
  return local.url;
}

export function ImageUploader({
  value,
  onChange,
  onBusyChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (value.length >= MAX_IMAGES) {
      setError("الحد الأقصى 3 صور لكل عرض.");
      return;
    }

    setError(null);
    const remaining = MAX_IMAGES - value.length;
    const selected = Array.from(files).slice(0, remaining);
    const uploaded: string[] = [];

    setBusy(selected.length);
    onBusyChange?.(true);

    for (const file of selected) {
      try {
        const compressed = await compress(file);
        const url = await upload(compressed);
        uploaded.push(url);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصورة.");
      } finally {
        setBusy((count) => Math.max(0, count - 1));
      }
    }

    onBusyChange?.(false);
    if (uploaded.length) {
      onChange([...value, ...uploaded].slice(0, MAX_IMAGES));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative size-[84px] overflow-hidden rounded-sm border border-line bg-sunken"
          >
            <img src={url} alt={`صورة العرض ${index + 1}`} className="size-full object-cover" />
            <button
              type="button"
              onClick={() => setPreviewIndex(index)}
              className="absolute inset-0 grid place-items-center bg-ink/0 text-transparent transition-colors hover:bg-ink/35 hover:text-white"
              aria-label={`تكبير الصورة ${index + 1}`}
            >
              <ZoomIn size={16} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
              className="absolute -start-0 -top-0 grid size-5 place-items-center rounded-br-sm border-b border-e border-crimson-line bg-crimson-soft text-crimson hover:bg-crimson hover:text-white"
              aria-label={`حذف الصورة ${index + 1}`}
            >
              <Trash2 size={10} aria-hidden />
            </button>
          </div>
        ))}

        {value.length < MAX_IMAGES && (
          <>
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              disabled={busy > 0}
              className={cn(
                "flex size-[84px] flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line-strong bg-canvas text-ink-muted transition-colors",
                "hover:border-brand hover:bg-brand-soft hover:text-brand-ink disabled:opacity-60",
              )}
            >
              {busy > 0 ? (
                <Loader2 size={18} className="animate-spin" aria-hidden />
              ) : (
                <ImagePlus size={18} strokeWidth={1.5} aria-hidden />
              )}
              <span className="text-[9.5px] font-medium">{busy > 0 ? "جارٍ الضغط…" : "من الجهاز"}</span>
            </button>
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              disabled={busy > 0}
              className="flex size-[84px] flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line-strong bg-canvas text-ink-muted transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand-ink disabled:opacity-60"
            >
              <Camera size={18} strokeWidth={1.5} aria-hidden />
              <span className="text-[9.5px] font-medium">كاميرا</span>
            </button>
          </>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
        تُضغط الصور تلقائياً إلى WebP (بحد أقصى 0.2 ميجابايت) قبل الرفع — التقط صورة واضحة لتاريخ
        الانتهاء والتشغيلة على العلبة.
      </p>

      {error && (
        <p className="mt-1.5 rounded-sm border border-crimson-line bg-crimson-soft px-2 py-1 text-[10.5px] text-crimson-ink">
          {error}
        </p>
      )}

      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <ImageLightbox
        open={previewIndex !== null}
        images={value}
        drugName="صور العرض"
        initialIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
      />
    </div>
  );
}
