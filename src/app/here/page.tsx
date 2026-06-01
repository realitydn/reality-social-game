import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { joinSession, listActiveSessions, setPresence } from "@/lib/sessions";
import { createGuest, getCurrentUser } from "@/lib/session";
import { PRESENCE } from "@/lib/presence";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locales";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Wordmark from "@/components/Wordmark";

// Static, reusable "I'm in the venue" QR target — print it once and put copies
// around the space. Unlike /s/[id] (the session-specific dynamic QR on the
// projector), this resolves whatever session is currently active, joins you,
// and marks venue-tier presence (tier 1). Works every night, no reprint.
export default async function HerePage() {
  const active = (await listActiveSessions())[0] ?? null;
  if (!active) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
        <Wordmark className="mb-6" />
        <h1 className="font-display font-bold text-3xl uppercase" style={{ letterSpacing: "0.05em" }}>
          No game running
        </h1>
        <p className="font-body text-ink/60 mt-2">Check back when something&apos;s on.</p>
      </main>
    );
  }

  const user = await getCurrentUser();
  if (user) {
    await joinSession(active.id, user.id);
    await setPresence(active.id, user.id, PRESENCE.VENUE);
    redirect(`/session/${active.id}`);
  }

  const t = await getTranslations("scan");
  async function joinAsGuest(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "Guest";
    const localeRaw = (await cookies()).get("NEXT_LOCALE")?.value ?? "";
    const locale: Locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;
    const guest = await createGuest(name, locale);
    await joinSession(active.id, guest.id);
    await setPresence(active.id, guest.id, PRESENCE.VENUE);
    redirect(`/session/${active.id}`);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <LocaleSwitcher />
      </header>
      <section className="flex-1 flex flex-col items-center px-6 pb-10">
        <div className="w-full max-w-md">
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            {t("joiningHeading")}
          </p>
          <h1 className="font-display font-bold text-3xl uppercase mb-8" style={{ letterSpacing: "0.05em" }}>
            {active.name}
          </h1>
          <form action={joinAsGuest} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="name"
                className="font-display font-semibold text-xs uppercase block mb-2"
                style={{ letterSpacing: "0.05em" }}
              >
                {t("displayName")}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder={t("displayNamePlaceholder")}
                maxLength={60}
                required
                className="w-full border-2 border-ink bg-cream px-3 py-2 font-body focus:outline-none focus:bg-yellow"
              />
            </div>
            <button
              type="submit"
              className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5"
              style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
            >
              {t("join")}
            </button>
          </form>
          <p className="font-body text-xs text-ink/50 mt-6 text-center">
            {t("orSignInPrefix")}{" "}
            {/* Full navigation to the Auth.js sign-in endpoint (an API route,
                not a page), so a plain anchor is correct here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/auth/signin/google?callbackUrl=/here" className="underline">
              {t("orSignInLink")}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
