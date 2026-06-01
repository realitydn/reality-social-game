import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession, listPlayers } from "@/lib/sessions";
import { getActiveGame, getGameState } from "@/lib/games";
import { getCurrentUser } from "@/lib/session";
import { HOST_DRIVEN_GAMES } from "@/games/registry";
import type { QuizRoundState } from "@/games/quiz-round/state";
import type { QuizScoreboardState } from "@/games/quiz-scoreboard/state";
import type { KaraokeQueueState } from "@/games/karaoke-queue/state";
import type { DisposableCameraState } from "@/games/disposable-camera/state";
import HostControlPanel from "@/components/HostControlPanel";
import QuizScoreboardHostPanel from "@/components/QuizScoreboardHostPanel";
import KaraokeHostPanel from "@/components/KaraokeHostPanel";
import DisposableHostPanel from "@/components/DisposableHostPanel";
import Wordmark from "@/components/Wordmark";

// Live host control during a host-driven game (Quiz Round, Karaoke Queue,
// future host-driven types). Authorization is enforced by each GameType's
// reducer (state.hostId === actorId for host events) — this page only
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

  if (!game || !HOST_DRIVEN_GAMES.has(game.type)) {
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
            No host-driven game active in this session.
          </p>
        </section>
      </main>
    );
  }

  // Per-game-type state extraction. The hostId check is uniform (all host-
  // driven game states carry hostId at the top level by convention).
  const rawState = await getGameState(game);
  const stateHostId = (rawState as { hostId?: string | null } | null)?.hostId ?? null;

  if (stateHostId && stateHostId !== user.id) {
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

  const players = await listPlayers(id);

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
        {game.type === "quiz-round" && (
          <HostControlPanel
            sessionId={id}
            gameId={game.id}
            initialState={rawState as QuizRoundState}
            initialPlayers={players}
          />
        )}
        {game.type === "quiz-scoreboard" && (
          <QuizScoreboardHostPanel
            sessionId={id}
            gameId={game.id}
            initialState={rawState as QuizScoreboardState}
          />
        )}
        {game.type === "karaoke-queue" && (
          <KaraokeHostPanel
            sessionId={id}
            gameId={game.id}
            initialState={rawState as KaraokeQueueState}
            initialPlayers={players}
          />
        )}
        {game.type === "disposable-camera" && (
          <DisposableHostPanel
            sessionId={id}
            gameId={game.id}
            initialState={rawState as DisposableCameraState}
            initialPlayers={players}
          />
        )}
      </section>
    </main>
  );
}
