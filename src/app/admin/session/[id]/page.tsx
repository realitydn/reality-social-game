import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { endSession, getSession, listPlayers } from "@/lib/sessions";
import { endGame, getActiveGame, startGame } from "@/lib/games";
import { GAMES_REQUIRING_PACKAGE, PLAYABLE_GAME_TYPES } from "@/games/registry";
import { getPackage, listPackages } from "@/lib/packages";
import { getCurrentUser } from "@/lib/session";
import {
  DEFAULT_QUIZ_ROUND_CONFIG,
  type QuizRoundConfig,
  type QuizRoundQuestion,
} from "@/games/quiz-round/state";
import type { QuizRoundSeed } from "@/games/quiz-round";
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
  const quizPackages = await listPackages({ gameType: "quiz-round" });

  async function end() {
    "use server";
    await endSession(id);
    redirect("/admin");
  }

  async function startSimpleGame(formData: FormData) {
    "use server";
    const type = String(formData.get("type") ?? "");
    if (!type) return;
    if (GAMES_REQUIRING_PACKAGE.has(type)) return;
    await startGame(id, type);
    redirect(`/admin/session/${id}`);
  }

  async function startQuizRound(formData: FormData) {
    "use server";
    const packageId = String(formData.get("packageId") ?? "");
    if (!packageId) return;
    const user = await getCurrentUser();
    if (!user) return;
    const pkg = await getPackage(packageId);
    if (!pkg || pkg.game_type !== "quiz-round") return;
    const seedConfig: QuizRoundConfig = {
      ...DEFAULT_QUIZ_ROUND_CONFIG,
      ...(pkg.config as Partial<QuizRoundConfig>),
    };
    const questions =
      ((pkg.content as { questions?: QuizRoundQuestion[] }).questions) ?? [];
    const seed: QuizRoundSeed = {
      hostId: user.id,
      questions,
      config: seedConfig,
    };
    await startGame(id, "quiz-round", {
      config: { packageId, packageName: pkg.name },
      seedData: seed,
    });
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
          {game?.type === "quiz-round" && game.status === "running" && (
            <Link
              href={`/session/${session.id}/host`}
              className="bg-yellow text-ink font-display font-bold uppercase px-5 py-2 border-2 border-ink transition hover:translate-y-0.5"
              style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
            >
              Host control →
            </Link>
          )}
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

        <div className="border-2 border-ink p-4 mb-10">
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-3"
            style={{ letterSpacing: "0.05em" }}
          >
            Game
          </p>
          <p
            className="font-display font-bold text-lg uppercase mb-4"
            style={{ letterSpacing: "0.05em" }}
          >
            {game ? `${game.type} · running` : "No active game"}
          </p>
          <div className="flex flex-col gap-3">
            {!session.ends_at && (
              <div className="flex flex-wrap gap-2">
                {PLAYABLE_GAME_TYPES.filter(
                  (g) => !GAMES_REQUIRING_PACKAGE.has(g.key),
                ).map((g) => (
                  <form key={g.key} action={startSimpleGame}>
                    <input type="hidden" name="type" value={g.key} />
                    <button
                      type="submit"
                      className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
                      style={{
                        letterSpacing: "0.05em",
                        boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                      }}
                    >
                      {game ? `Switch to ${g.label}` : `Start ${g.label}`}
                    </button>
                  </form>
                ))}
              </div>
            )}

            {!session.ends_at && (
              <form
                action={startQuizRound}
                className="flex flex-wrap gap-2 items-stretch border border-dashed border-ink/30 p-2"
              >
                <span
                  className="font-display font-semibold text-xs uppercase text-ink/60 self-center px-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Quiz Round
                </span>
                <select
                  name="packageId"
                  required
                  className="border-2 border-ink px-2 py-1 font-body text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Pick a package…
                  </option>
                  {quizPackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ·{" "}
                      {((p.content as { questions?: unknown[] }).questions?.length) ?? 0}q
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={quizPackages.length === 0}
                  className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5 disabled:opacity-50"
                  style={{
                    letterSpacing: "0.05em",
                    boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                  }}
                >
                  {game ? "Switch to Quiz Round" : "Start Quiz Round"}
                </button>
                <Link
                  href="/host"
                  className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink self-center px-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Host →
                </Link>
              </form>
            )}

            {game && (
              <form action={endActiveGame}>
                <button
                  type="submit"
                  className="border-2 border-red text-red font-display font-bold uppercase px-4 py-2 transition hover:bg-red hover:text-cream"
                  style={{ letterSpacing: "0.05em" }}
                >
                  End game
                </button>
              </form>
            )}
          </div>
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
