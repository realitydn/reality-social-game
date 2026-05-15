import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getSession, listPlayers, getPlayer } from "@/lib/sessions";
import { getActiveGame, getGameState, getScores } from "@/lib/games";
import { getCurrentUser } from "@/lib/session";
import { BingoGame } from "@/games/bingo";
import { TargetHuntGame } from "@/games/target-hunt";
import { SpeedPairGame } from "@/games/speed-pair";
import { QuizRoundGame } from "@/games/quiz-round";
import { KaraokeQueueGame } from "@/games/karaoke-queue";
import { DisposableCameraGame } from "@/games/disposable-camera";
import type { BingoState } from "@/games/bingo/state";
import type { TargetHuntState } from "@/games/target-hunt/state";
import type { SpeedPairState } from "@/games/speed-pair/state";
import type { QuizRoundState } from "@/games/quiz-round/state";
import type { KaraokeQueueState } from "@/games/karaoke-queue/state";
import type { DisposableCameraState } from "@/games/disposable-camera/state";
import { isLocale, type Locale } from "@/i18n/locales";
import GameView from "@/components/GameView";
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
  const me = await getPlayer(id, user.id);

  const t = await getTranslations("player");
  const localeRaw = await getLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";

  // Session ended → render a recap card instead of the live game UI.
  if (session.ends_at) {
    const myScore = me?.score ?? 0;
    const myRank =
      [...players].sort((a, b) => b.score - a.score).findIndex((p) => p.user_id === user.id) + 1;
    return (
      <main className="min-h-dvh flex flex-col">
        <header className="flex items-center justify-between p-6">
          <Wordmark />
          <LocaleSwitcher />
        </header>
        <section className="flex-1 px-6 max-w-md w-full mx-auto pb-10 flex flex-col gap-6">
          <div>
            <p
              className="font-display font-semibold text-xs uppercase text-ink/60 mb-2"
              style={{ letterSpacing: "0.05em" }}
            >
              {t("sessionEndedHeading")}
            </p>
            <h1
              className="font-display font-bold text-3xl uppercase mb-1"
              style={{ letterSpacing: "0.05em" }}
            >
              {session.name}
            </h1>
          </div>

          <div
            className="bg-yellow text-ink p-6 flex items-center justify-between"
            style={{ boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            <div>
              <p
                className="font-display font-semibold text-xs uppercase text-ink/60 mb-1"
                style={{ letterSpacing: "0.05em" }}
              >
                {t("yourScore")}
              </p>
              <p
                className="font-display font-bold text-5xl"
                style={{ letterSpacing: "0.05em" }}
              >
                {myScore}
              </p>
            </div>
            {myRank > 0 && (
              <div className="text-right">
                <p
                  className="font-display font-semibold text-xs uppercase text-ink/60 mb-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {t("yourRank")}
                </p>
                <p
                  className="font-display font-bold text-5xl"
                  style={{ letterSpacing: "0.05em" }}
                >
                  #{myRank}
                </p>
              </div>
            )}
          </div>

          <Link
            href="/leaderboard"
            className="block text-center bg-ink text-cream font-display font-bold uppercase px-6 py-3 transition hover:translate-y-0.5"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            {t("seeLeaderboard")}
          </Link>

          <p className="font-body text-center text-ink/50 text-sm pt-4">
            {t("untilNextTime")}
          </p>
        </section>
      </main>
    );
  }

  const game = await getActiveGame(id);
  const gameState = game
    ? ((await getGameState(game)) as
        | BingoState
        | TargetHuntState
        | SpeedPairState
        | QuizRoundState
        | KaraokeQueueState
        | DisposableCameraState)
    : null;
  const scores = game ? await getScores(game) : {};

  const bingoLabels = BingoGame.prompts(locale);
  const targetHuntLabels = TargetHuntGame.prompts(locale);
  const speedPairLabels = SpeedPairGame.prompts(locale);
  const quizRoundLabels = QuizRoundGame.prompts(locale);
  const karaokeQueueLabels = KaraokeQueueGame.prompts(locale);
  const disposableCameraLabels = DisposableCameraGame.prompts(locale);

  const initialDashboard = {
    session: { id: session.id, name: session.name, ends_at: session.ends_at },
    players,
    game: game ? { id: game.id, type: game.type, status: game.status } : null,
    gameState,
    scores,
    me: me ? { user_id: user.id, code: me.code, display_name: user.name } : null,
  };

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
        <p className="font-body text-ink/60 text-sm mb-6">
          {t("playingAs")}{" "}
          <span
            className="font-display font-semibold uppercase text-ink"
            style={{ letterSpacing: "0.05em" }}
          >
            {user.name ?? "Guest"}
          </span>
        </p>

        {me?.code && (
          <div
            className="bg-ink text-cream p-4 mb-8 flex items-center justify-between"
            style={{ boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            <span
              className="font-display font-semibold text-xs uppercase text-cream/70"
              style={{ letterSpacing: "0.05em" }}
            >
              {t("yourCode")}
            </span>
            <span
              className="font-display font-bold text-3xl tracking-widest text-yellow"
              style={{ letterSpacing: "0.15em" }}
            >
              {me.code}
            </span>
          </div>
        )}

        <div className="mb-10">
          <GameView
            sessionId={session.id}
            initial={initialDashboard}
            locale={locale}
            bingoLabels={bingoLabels}
            targetHuntLabels={targetHuntLabels}
            speedPairLabels={speedPairLabels}
            quizRoundLabels={quizRoundLabels}
            karaokeQueueLabels={karaokeQueueLabels}
            disposableCameraLabels={disposableCameraLabels}
            noActiveGameMessage={t("noActiveGame")}
          />
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
