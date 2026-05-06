"use client";

import { useRef, useState } from "react";
import { resizeImage } from "@/lib/image-resize";

type Props = {
  initialUrl: string | null;
  labels: {
    chooseFile: string;
    uploading: string;
    error: string;
    helper: string;
  };
};

export default function AvatarUpload({ initialUrl, labels }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(file: File) {
    setUploading(true);
    setError(null);
    try {
      const resized = await resizeImage(file, { maxSize: 512, mimeType: "image/jpeg", quality: 0.85 });
      const formData = new FormData();
      formData.append(
        "file",
        new File([resized], "avatar.jpg", { type: "image/jpeg" }),
      );
      formData.append("purpose", "avatar");
      const res = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? labels.error);
      }
      const body = (await res.json()) as { url: string };
      setPreviewUrl(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : labels.error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 border-2 border-ink overflow-hidden bg-cream flex items-center justify-center shrink-0">
        {previewUrl ? (
          // Plain <img> rather than next/image so we don't have to register
          // the R2 host in next.config.ts before R2's custom domain is set up.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className="font-display font-bold text-3xl text-ink/30"
            style={{ letterSpacing: "0.05em" }}
          >
            ?
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 min-w-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPick(f);
            e.target.value = "";
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-ink text-cream font-display font-bold uppercase px-4 py-2 transition hover:translate-y-0.5 disabled:opacity-50"
          style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
        >
          {uploading ? labels.uploading : labels.chooseFile}
        </button>
        <p className="font-body text-xs text-ink/50">{labels.helper}</p>
        {error && <p className="font-body text-xs text-red break-words">{error}</p>}
      </div>
    </div>
  );
}
