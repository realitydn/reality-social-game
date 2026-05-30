"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createGuest, getCurrentUser } from "@/lib/session";
import { DEFAULT_LOCALE, isLocale } from "@/i18n/locales";

// Bootstrap an anonymous guest, then send them to their profile to set a name.
// This MUST run as a server action, not during a page render: createGuest()
// sets the guest cookie, and Next only allows cookie mutation inside a Server
// Action or Route Handler. Calling it during render throws a server-side
// exception (the "Play as guest" 500).
export async function startGuestSession() {
  const existing = await getCurrentUser();
  if (!existing) {
    const localeRaw = (await cookies()).get("NEXT_LOCALE")?.value ?? "";
    const locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;
    await createGuest("Guest", locale);
  }
  redirect("/profile");
}
