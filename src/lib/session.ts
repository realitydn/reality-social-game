import { cookies } from "next/headers";
import { auth } from "./auth";
import { getDB } from "./db";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

const GUEST_COOKIE = "reality_guest_id";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  locale: Locale;
  newsletter_opt_in: boolean;
  is_guest: boolean;
  member_id: string | null;
};

async function getGuestId(): Promise<string | null> {
  return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
}

async function loadUser(id: string): Promise<CurrentUser | null> {
  const db = await getDB();
  const row = await db
    .prepare(
      "SELECT id, name, email, image, locale, newsletter_opt_in, is_guest, member_id FROM users WHERE id = ?",
    )
    .bind(id)
    .first<{
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      locale: string;
      newsletter_opt_in: number;
      is_guest: number;
      member_id: string | null;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    locale: (row.locale as Locale) ?? DEFAULT_LOCALE,
    newsletter_opt_in: row.newsletter_opt_in === 1,
    is_guest: row.is_guest === 1,
    member_id: row.member_id,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (session?.user?.id) return loadUser(session.user.id);
  const guestId = await getGuestId();
  if (guestId) return loadUser(guestId);
  return null;
}

export async function createGuest(displayName: string, locale: Locale): Promise<CurrentUser> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO users (id, name, locale, newsletter_opt_in, is_guest, created_at, updated_at)
       VALUES (?, ?, ?, 0, 1, ?, ?)`,
    )
    .bind(id, displayName, locale, now, now)
    .run();
  (await cookies()).set(GUEST_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_YEAR,
    path: "/",
  });
  const user = await loadUser(id);
  if (!user) throw new Error("Failed to create guest user");
  return user;
}

export async function clearGuest(): Promise<void> {
  // Remove the guest cookie (path matches how createGuest set it).
  (await cookies()).set(GUEST_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function updateProfile(
  userId: string,
  patch: { name?: string; locale?: Locale; newsletter_opt_in?: boolean },
): Promise<void> {
  const db = await getDB();
  const sets: string[] = [];
  const binds: (string | number)[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    binds.push(patch.name);
  }
  if (patch.locale !== undefined) {
    sets.push("locale = ?");
    binds.push(patch.locale);
  }
  if (patch.newsletter_opt_in !== undefined) {
    sets.push("newsletter_opt_in = ?");
    binds.push(patch.newsletter_opt_in ? 1 : 0);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = ?");
  binds.push(Date.now());
  binds.push(userId);
  await db
    .prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}
