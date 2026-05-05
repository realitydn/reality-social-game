import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { endSession, getSession, listPlayers } from "@/lib/sessions";
import { endGame, getActiveGame, startGame } from "@/lib/games";
import { getBaseUrl } from "@/lib/url";
import AttendeeList from "@/components/AttendeeList";
import Wordmark from "@/components/Wordmark";

export default async function AdminSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const baseUrl = await getBaseUrl();
  const joinUrl = `${baseUrl}/s/${session.id}`;
  const players = await listPlayers(session.id);
  const game = await getActiveGame(session.id);

  async function end() {
    "use server";
    await endSession(id);
    redirect("/admin");
  }

  async function startBingo() {
    "use server";
    await startGame(id, "bingo");
    redirect(`/admin/session/${id}`);
  }

  async function endActiveGame() {
    "use server";
    if (game) await endGame(game.id);
    redirect(`/admin/session/${id}`);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <Link
          href="/admin"
          className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink"
          style={{ letterSpacing: "0.05em" }}
        >
          ← All sessions
        </Link>
      </header>
      <section className="flex-1 px-6 max-w-3xl w-full mx-auto pb-12">
        <h1
          className="font-display font-bold text-3xl uppercase mb-1"
          style={{ letterSpacing: "0.05em" }}
        >
          {session.name}
        </h1>
        <p className="font-body text-ink/60 text-sm mb-8">
          ID <code>{session.id}</code> · {session.ends_at ? "ended" : "active"}
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href={`/big-screen/${session.id}`}
            target="_blank"
            className="bg-ink text-cream font-display font-bold uppercase px-5 py-2 transition hover:translate-y-0.5"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Open big screen ↗
          </Link>
          <Link
            href={joinUrl}
            target="_blank"
            className="border-2 border-ink text-ink font-display font-bold uppercase px-5 py-2 transition hover:bg-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            Player link ↗
          </Link>
          {!session.ends_at && (
            <form action={end}>
              <button
                type="submit"
                className="border-2 border-red text-red font-display font-bold uppercase px-5 py-2 transition hover:bg-red hover:text-cream"
                style={{ letterSpacing: "0.05em" }}
              >
                End session
              </button>
            </form>
          )}
        </div>

        {/* Game controls */}
        <div className="border-2 border-ink p-4 mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p
              className="font-display font-semibold text-xs uppercase text-ink/60 mb-1"
              style={{ letterSpacing: "0.05em" }}
            >
              Game
            </p>
            <p className="font-display font-bold text-lg uppercase" style={{ letterSpacing: "0.05em" }}>
              {game ? `${game.type} · running` : "No active game"}
            </p>
          </div>
          {!game && !session.ends_at && (
            <form action={startBingo}>
              <button
                type="submit"
                className="bg-yellow text-ink font-display font-bold uppercase px-5 py-2 border-2 border-ink transition hover:translate-y-0.5"
                style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
              >
                Start Bingo
              </button>
            </form>
          )}
          {game && (
            <form action={endActiveGame}>
              <button
                type="submit"
                className="border-2 border-red text-red font-display font-bold uppercase px-5 py-2 transition hover:bg-red hover:text-cream"
                style={{ letterSpacing: "0.05em" }}
              >
                End game
              </button>
            </form>
          )}
        </div>

        <h2
          className="font-display font-semibold text-sm uppercase mb-4"
          style={{ letterSpacing: "0.05em" }}
        >
          Players ({players.length})
        </h2>
        <AttendeeList sessionId={session.id} initial={players} />
      </section>
    </main>
  );
}
