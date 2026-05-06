import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession, listPlayers } from "@/lib/sessions";
import { getActiveGame, getGameState } from "@/lib/games";
import { getCurrentUser } from "@/lib/session";
import type { QuizRoundState } from "@/games/quiz-round/state";
import HostControlPanel from "@/components/HostControlPanel";
import Wordmark from "@/components/Wordmark";

// Live host control during a running Quiz Round game. Authorization is enforced
// by the reducer (state.hostId === actorId for host events) — the page only
// guards rendering as a UX courtesy.
export default async function SessionHostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/s/${id}`);

  const game = await getActiveGame(id);

  if (!game || game.type !== "quiz-round") {
    return (
      <main className="min-h-dvh flex flex-col">
        <header className="flex items-center justify-between p-6">
          <Wordmark />
          <Link
            href={`/admin/session/${id}`}
            className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink"
            style={{ letterSpacing: "0.05em" }}
          >
            ← Admin
          </Link>
        </header>
        <section className="flex-1 px-6 max-w-3xl w-full mx-auto pb-12 flex items-center justify-center">
          <p className="font-body text-ink/60 text-center">
            No active Quiz Round game in this session.
          </p>
        </section>
      </main>
    );
  }

  const state = (await getGameState(game)) as QuizRoundState;
  const players = await listPlayers(id);

  if (state.hostId && state.hostId !== user.id) {
    return (
      <main className="min-h-dvh flex flex-col">
        <header className="flex items-center justify-between p-6">
          <Wordmark />
        </header>
        <section className="flex-1 px-6 max-w-3xl w-full mx-auto pb-12 flex items-center justify-center">
          <p className="font-body text-ink/60 text-center">
            You aren&apos;t the host of this game.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6 sticky top-0 bg-cream z-10 border-b border-ink/10">
        <Wordmark />
        <div className="flex gap-3">
          <Link
            href={`/big-screen/${id}`}
            target="_blank"
            className="border-2 border-ink text-ink font-display font-bold uppercase px-4 py-2 transition hover:bg-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            Big screen ↗
          </Link>
          <Link
            href={`/admin/session/${id}`}
            className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink self-center"
            style={{ letterSpacing: "0.05em" }}
          >
            ← Admin
          </Link>
        </div>
      </header>
      <section className="flex-1 px-6 max-w-3xl w-full mx-auto py-6">
        <HostControlPanel
          sessionId={id}
          gameId={game.id}
          initialState={state}
          initialPlayers={players}
        />
      </section>
    </main>
  );
}
