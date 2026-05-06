import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "./db";

export type PhotoPurpose = "avatar" | "photo-bingo" | "disposable" | "quiz-question";

export type Photo = {
  id: string;
  user_id: string;
  session_id: string | null;
  game_id: string | null;
  purpose: PhotoPurpose;
  r2_key: string;
  content_type: string;
  size: number;
  width: number | null;
  height: number | null;
  created_at: number;
};

const ALLOWED_PURPOSES: ReadonlySet<PhotoPurpose> = new Set([
  "avatar",
  "photo-bingo",
  "disposable",
  "quiz-question",
]);
const MAX_BYTES = 1_500_000; // 1.5 MB after client-side resize is plenty for avatars
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isAllowedPurpose(value: string): value is PhotoPurpose {
  return ALLOWED_PURPOSES.has(value as PhotoPurpose);
}

export function validatePhotoUpload(file: File): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_TYPES.has(file.type))
    return { ok: false, reason: "unsupported image type" };
  if (file.size > MAX_BYTES) return { ok: false, reason: "file too large" };
  if (file.size === 0) return { ok: false, reason: "empty file" };
  return { ok: true };
}

export function buildR2Key(
  purpose: PhotoPurpose,
  userId: string,
  photoId: string,
  contentType: string,
): string {
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  return `${purpose}/${userId}/${photoId}.${ext}`;
}

export async function getPhotosBucket(): Promise<R2Bucket | null> {
  const { env } = await getCloudflareContext({ async: true });
  return env.PHOTOS ?? null;
}

export async function getPhotosBaseUrl(): Promise<string | null> {
  const { env } = await getCloudflareContext({ async: true });
  return env.PHOTOS_BASE_URL ?? null;
}

export function publicUrlFor(baseUrl: string, r2Key: string): string {
  const trimmed = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}/${r2Key}`;
}

export async function recordPhoto(input: {
  id: string;
  userId: string;
  sessionId: string | null;
  gameId: string | null;
  purpose: PhotoPurpose;
  r2Key: string;
  contentType: string;
  size: number;
  width: number | null;
  height: number | null;
}): Promise<void> {
  const db = await getDB();
  await db
    .prepare(
      `INSERT INTO photos (id, user_id, session_id, game_id, purpose, r2_key,
                           content_type, size, width, height, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.userId,
      input.sessionId,
      input.gameId,
      input.purpose,
      input.r2Key,
      input.contentType,
      input.size,
      input.width,
      input.height,
      Date.now(),
    )
    .run();
}

export async function setUserAvatar(userId: string, url: string): Promise<void> {
  const db = await getDB();
  await db
    .prepare("UPDATE users SET image = ?, updated_at = ? WHERE id = ?")
    .bind(url, Date.now(), userId)
    .run();
}
