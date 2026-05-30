import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDB } from "./db";

export type PhotoPurpose =
  | "avatar"
  | "photo-bingo"
  | "disposable"
  | "quiz-question"
  | "quiz-audio";

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
  "quiz-audio",
]);
// 3 MB covers Disposable Camera's 2048px-long-edge JPEGs at q=0.9 with
// headroom; avatars + quiz-question images stay well under this anyway.
const MAX_BYTES_IMAGE = 3_000_000;
const MAX_BYTES_AUDIO = 5_000_000; // 5 MB covers ~3 min of decent-quality MP3
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);
const ALLOWED_TYPES = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES]);

export function isAllowedPurpose(value: string): value is PhotoPurpose {
  return ALLOWED_PURPOSES.has(value as PhotoPurpose);
}

export function validatePhotoUpload(file: File): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_TYPES.has(file.type))
    return { ok: false, reason: "unsupported file type" };
  const isAudio = ALLOWED_AUDIO_TYPES.has(file.type);
  const limit = isAudio ? MAX_BYTES_AUDIO : MAX_BYTES_IMAGE;
  if (file.size > limit) return { ok: false, reason: "file too large" };
  if (file.size === 0) return { ok: false, reason: "empty file" };
  return { ok: true };
}

export function buildR2Key(
  purpose: PhotoPurpose,
  userId: string,
  photoId: string,
  contentType: string,
): string {
  const ext = extensionFor(contentType);
  return `${purpose}/${userId}/${photoId}.${ext}`;
}

function extensionFor(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
      return "jpg";
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
      return "m4a";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
      return "wav";
    case "audio/webm":
      return "weba";
    default:
      return "bin";
  }
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

// Avatars are "latest wins": each upload gets a fresh UUID key, so the previous
// R2 object + photos row would otherwise leak forever. Delete all of a user's
// prior avatars, keeping only the one just uploaded. Best-effort per object.
export async function pruneOldAvatars(
  bucket: R2Bucket,
  userId: string,
  keepPhotoId: string,
): Promise<void> {
  const db = await getDB();
  const old = await db
    .prepare(
      "SELECT id, r2_key FROM photos WHERE user_id = ? AND purpose = 'avatar' AND id != ?",
    )
    .bind(userId, keepPhotoId)
    .all<{ id: string; r2_key: string }>();
  const rows = old.results ?? [];
  if (rows.length === 0) return;
  await Promise.all(rows.map((r) => bucket.delete(r.r2_key).catch(() => {})));
  await db
    .prepare("DELETE FROM photos WHERE user_id = ? AND purpose = 'avatar' AND id != ?")
    .bind(userId, keepPhotoId)
    .run();
}
