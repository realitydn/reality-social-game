import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, joinSession, listPlayers } from "@/lib/sessions";
import { createGuest, getCurrentUser } from "@/lib/session";
import { isLocale, type Locale } from "@/i18n/locales";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Wordmark from "@/components/Wordmark";

// Public QR target. Lives at the short /s/[id] URL so QR codes stay dense.
// If the visitor is already authenticated (Google or guest), join immediately
// and redirect to the player view. Otherwise show a quick guest signup form.
export default async function ScanLanding({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();
  if (session.ends_at) {
    return <SessionEndedNotice />;
  }

  const user = await getCurrentUser();
  if (user) {
    await joinSession(id, user.id);
    redirect(`/session/${id}`);
  }

  const players = await listPlayers(id);
  const t = await getTranslations("scan");

  async function joinAsGuest(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim().slice(0, 60) || "Guest";
    const localeRaw = formData.get("locale");
    const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
    const guest = await createGuest(name, locale);
    await joinSession(id, guest.id);
    redirect(`/session/${id}`);
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
          <h1
            className="font-display font-bold text-3xl uppercase mb-2"
            style={{ letterSpacing: "0.05em" }}
          >
            {session.name}
          </h1>
          <p className="font-body text-ink/60 mb-8">
            {t("countInRoom", { count: players.length })}
          </p>

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
            <input type="hidden" name="locale" value="en" />
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
            <a href={`/api/auth/signin/google?callbackUrl=/s/${id}`} className="underline">
              {t("orSignInLink")}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

function SessionEndedNotice() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      <Wordmark className="mb-6" />
      <h1
        className="font-display font-bold text-3xl uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        Session ended
      </h1>
      <p className="font-body text-ink/60 mt-2">Catch the next one.</p>
    </main>
  );
}
