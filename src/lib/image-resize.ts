// Client-side image resize. We downscale the user's selected image to a
// reasonable max dimension before upload — avatars don't need to be 12MP, and
// shrinking on the device saves uplink bandwidth on a bar Wi-Fi.

export type ResizeOptions = {
  maxSize?: number;          // longest edge in pixels, default 512
  mimeType?: "image/jpeg" | "image/webp";  // output format, default jpeg
  quality?: number;          // 0–1, default 0.85
};

export async function resizeImage(file: File, options: ResizeOptions = {}): Promise<Blob> {
  const { maxSize = 512, mimeType = "image/jpeg", quality = 0.85 } = options;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not decode image"));
    i.src = dataUrl;
  });

  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      mimeType,
      quality,
    );
  });
}
