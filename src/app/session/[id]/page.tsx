import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession, listPlayers } from "@/lib/sessions";
import { getCurrentUser } from "@/lib/session";
import AttendeeList from "@/components/AttendeeList";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import Wordmark from "@/components/Wordmark";

export default async function PlayerSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/s/${id}`);

  const players = await listPlayers(id);
  const t = await getTranslations("player");

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <LocaleSwitcher />
      </header>
      <section className="flex-1 px-6 max-w-md w-full mx-auto pb-10">
        <p
          className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("youreIn")}
        </p>
        <h1
          className="font-display font-bold text-3xl uppercase mb-1"
          style={{ letterSpacing: "0.05em" }}
        >
          {session.name}
        </h1>
        <p className="font-body text-ink/60 text-sm mb-8">
          {t("playingAs")}{" "}
          <span className="font-display font-semibold uppercase text-ink" style={{ letterSpacing: "0.05em" }}>
            {user.name ?? "Guest"}
          </span>
        </p>

        <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50 mb-8">
          {t("gamesComingSoon")}
        </div>

        <h2
          className="font-display font-semibold text-sm uppercase mb-4"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("inTheRoom", { count: players.length })}
        </h2>
        <AttendeeList sessionId={session.id} initial={players} />
      </section>
    </main>
  );
}
