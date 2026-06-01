import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/session";
import { joinSession, listActiveSessions } from "@/lib/sessions";
import { getStaffRole } from "@/lib/roles";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import SignInButtons from "@/components/SignInButtons";
import GoogleReviewPrompt from "@/components/GoogleReviewPrompt";
import Wordmark from "@/components/Wordmark";

export default async function Home() {
  const t = await getTranslations("home");
  const tFooter = await getTranslations("footer");
  const user = await getCurrentUser();
  const staffRole = user ? await getStaffRole(user.email) : null;
  // Menu-join: a signed-in user can hop into the live session without scanning.
  // This grants no presence (tier 0) — presence-gated games still need a scan.
  const active = (await listActiveSessions())[0] ?? null;
  async function joinActive() {
    "use server";
    const u = await getCurrentUser();
    if (!u || !active) return;
    await joinSession(active.id, u.id);
    redirect(`/session/${active.id}`);
  }
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <LocaleSwitcher />
      </header>
      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <h1
          className="font-display font-bold text-4xl md:text-5xl uppercase max-w-2xl leading-tight"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("title")}
        </h1>
        <p className="font-body text-ink/70 max-w-md">{t("tagline")}</p>
        {user ? (
          // Auth-aware: a signed-in guest/member shouldn't land back on the
          // sign-in screen. Greet them and point at the real way to play
          // (scanning the venue QR), plus profile + standings.
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <p className="font-body text-ink/80">
              {t("signedInAs", { name: user.name ?? "Guest" })}
            </p>
            {active ? (
              <form action={joinActive}>
                <button
                  type="submit"
                  className="w-full bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5"
                  style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
                >
                  {t("joinLive")} →
                </button>
              </form>
            ) : (
              <p className="font-body text-ink/50 text-sm mb-1">{t("joinHint")}</p>
            )}
            <Link
              href="/profile"
              className="bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5"
              style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
            >
              {t("profileCta")}
            </Link>
            <Link
              href="/leaderboard"
              className="border-2 border-ink text-ink font-display font-bold uppercase px-6 py-3 transition hover:bg-ink hover:text-cream"
              style={{ letterSpacing: "0.05em" }}
            >
              {t("leaderboardCta")}
            </Link>
            {staffRole && (
              <Link
                href={staffRole === "admin" ? "/admin" : "/host"}
                className="font-display font-semibold text-xs uppercase text-ink/50 hover:text-ink pt-1"
                style={{ letterSpacing: "0.05em" }}
              >
                {staffRole === "admin" ? "Admin →" : "Host →"}
              </Link>
            )}
          </div>
        ) : (
          <SignInButtons />
        )}
      </section>
      <GoogleReviewPrompt />
      <footer className="p-6 text-center text-xs font-body text-ink/60">
        {tFooter("address")} · realitydn.com
      </footer>
    </main>
  );
}
