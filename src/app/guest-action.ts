"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clearGuest, createGuest, getCurrentUser } from "@/lib/session";
import { signOut } from "@/lib/auth";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";

// Bootstrap an anonymous guest, then send them to their profile to set a name.
// This MUST run as a server action, not during a page render: createGuest()
// sets the guest cookie, and Next only allows cookie mutation inside a Server
// Action or Route Handler. Calling it during render throws a server-side
// exception (the "Play as guest" 500).
// Sign out works for both identity types: clear the guest cookie AND end any
// Auth.js (Google) session. Either may be absent — that's fine.
export async function signOutEverywhere() {
  await clearGuest();
  try {
    await signOut({ redirect: false });
  } catch {
    /* no Auth.js session (e.g. a guest) — nothing to clear */
  }
  redirect("/");
}

export async function startGuestSession() {
  const existing = await getCurrentUser();
  if (!existing) {
    const localeRaw = (await cookies()).get("NEXT_LOCALE")?.value ?? "";
    const locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;
    await createGuest("Guest", locale);
  }
  redirect("/profile");
}
