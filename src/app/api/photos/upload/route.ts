import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import {
  buildR2Key,
  getPhotosBaseUrl,
  getPhotosBucket,
  isAllowedPurpose,
  publicUrlFor,
  recordPhoto,
  setUserAvatar,
  validatePhotoUpload,
} from "@/lib/photos";

// POST /api/photos/upload
// multipart/form-data: file, purpose, [session_id], [game_id]
// Returns { id, url } on success.
//
// Bytes are uploaded through the Worker rather than via presigned URLs because
// post-resize avatars are small (<200KB) and a single round-trip is simpler.
// Switch to presigned PUT later if we add larger Disposable Camera uploads.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const bucket = await getPhotosBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: "photo storage not configured (R2 PHOTOS bucket missing)" },
      { status: 503 },
    );
  }
  const baseUrl = await getPhotosBaseUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { error: "PHOTOS_BASE_URL not set — set it via `wrangler secret put`" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const purposeRaw = String(form.get("purpose") ?? "");
  const sessionId = (form.get("session_id") as string | null) || null;
  const gameId = (form.get("game_id") as string | null) || null;

  if (!(file instanceof File))
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  if (!isAllowedPurpose(purposeRaw))
    return NextResponse.json({ error: "unknown purpose" }, { status: 400 });
  const purpose = purposeRaw;

  const v = validatePhotoUpload(file);
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

  const photoId = crypto.randomUUID();
  const r2Key = buildR2Key(purpose, user.id, photoId, file.type);

  const bytes = await file.arrayBuffer();
  await bucket.put(r2Key, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: user.id, purpose },
  });

  await recordPhoto({
    id: photoId,
    userId: user.id,
    sessionId,
    gameId,
    purpose,
    r2Key,
    contentType: file.type,
    size: file.size,
    width: null, // could parse from EXIF later; not needed for v1
    height: null,
  });

  const url = publicUrlFor(baseUrl, r2Key);
  if (purpose === "avatar") {
    await setUserAvatar(user.id, url);
  }

  return NextResponse.json({ ok: true, id: photoId, url });
}
