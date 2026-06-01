import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { isLocale, type Locale } from "@/i18n/locales";
import { getSession, listPlayers } from "@/lib/sessions";
import { getActiveGame, getGameState, getScores } from "@/lib/games";
import { getBaseUrl } from "@/lib/url";
import QRCodeSVG from "@/components/QRCode";
import AttendeeList from "@/components/AttendeeList";
import Leaderboard from "@/components/Leaderboard";
import SessionRecap from "@/components/SessionRecap";
import QuizRoundBigScreen from "@/components/QuizRoundBigScreen";
import QuizScoreboardBigScreen from "@/components/QuizScoreboardBigScreen";
import KaraokeQueueBigScreen from "@/components/KaraokeQueueBigScreen";
import DisposableCameraBigScreen from "@/components/DisposableCameraBigScreen";
import type { QuizRoundState } from "@/games/quiz-round/state";
import type { QuizScoreboardState } from "@/games/quiz-scoreboard/state";
import type { KaraokeQueueState } from "@/games/karaoke-queue/state";
import type { DisposableCameraState } from "@/games/disposable-camera/state";
import { REALITY_LINKS } from "@/lib/reality-links";

// Big-screen / projector view. Public, no auth. Inverted REALITY palette
// (ink ground + cream + a chromatic accent) for high contrast on the projector.
export default async function BigScreenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const players = await listPlayers(session.id);

  // Session ended → recap splash, no QR, no polling.
  if (session.ends_at) {
    return (
      <main className="min-h-dvh bg-ink text-cream flex flex-col">
        <header className="flex items-center justify-between px-10 pt-10">
          <div
            className="font-mark font-semibold text-3xl uppercase"
            style={{ letterSpacing: "0.1em" }}
          >
            REALITY
          </div>
        </header>
        <SessionRecap sessionName={session.name} players={players} />
        <footer className="px-10 pb-8 text-center font-body text-xs text-cream/50">
          86 Mai Thúc Lân, Đà Nẵng · realitydn.com
        </footer>
      </main>
    );
  }

  const baseUrl = await getBaseUrl();
  const joinUrl = `${baseUrl}/s/${session.id}`;
  const game = await getActiveGame(session.id);
  const localeRaw = await getLocale();
  const locale: Locale = isLocale(localeRaw) ? localeRaw : "en";
  const t = await getTranslations("bigScreen");
  const gameState = game ? await getGameState(game) : null;
  const scores = game ? await getScores(game) : {};

  const initialDashboard = {
    game: game ? { id: game.id, type: game.type, status: game.status } : null,
    players,
    scores,
  };

  // Game types that take over the whole projector. Other game types keep
  // the QR-plus-sidebar layout below.
  const fullScreenGame =
    game?.type === "quiz-round" ||
    game?.type === "quiz-scoreboard" ||
    game?.type === "karaoke-queue" ||
    game?.type === "disposable-camera";

  if (fullScreenGame) {
    return (
      <main className="min-h-dvh bg-ink text-cream flex flex-col">
        <header className="flex items-center justify-between px-10 pt-8">
          <div
            className="font-mark font-semibold text-2xl uppercase"
            style={{ letterSpacing: "0.1em" }}
          >
            REALITY
          </div>
          <div
            className="font-display font-bold text-xl uppercase text-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            {session.name}
          </div>
          <div className="flex flex-col items-end gap-1">
            <QRCodeSVG value={joinUrl} size={120} />
            <p
              className="font-display font-bold text-[10px] uppercase text-cream/70"
              style={{ letterSpacing: "0.05em" }}
            >
              {t("scanToJoin")}
            </p>
          </div>
        </header>
        {game?.type === "quiz-round" && (
          <QuizRoundBigScreen
            sessionId={session.id}
            locale={locale}
            initial={{
              gameState: gameState as QuizRoundState | null,
              players,
              scores,
            }}
          />
        )}
        {game?.type === "quiz-scoreboard" && (
          <QuizScoreboardBigScreen
            sessionId={session.id}
            locale={locale}
            initial={{ gameState: gameState as QuizScoreboardState | null }}
            socialsQr={<QRCodeSVG value={REALITY_LINKS.socials} size={200} />}
          />
        )}
        {game?.type === "karaoke-queue" && (
          <KaraokeQueueBigScreen
            sessionId={session.id}
            locale={locale}
            initial={{
              gameState: gameState as KaraokeQueueState | null,
              players,
            }}
          />
        )}
        {game?.type === "disposable-camera" && (
          <DisposableCameraBigScreen
            sessionId={session.id}
            locale={locale}
            initial={{
              gameState: gameState as DisposableCameraState | null,
              players,
            }}
          />
        )}
        <footer className="px-10 pb-6 text-center font-body text-xs text-cream/50">
          86 Mai Thúc Lân, Đà Nẵng · realitydn.com
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-ink text-cream flex flex-col">
      <header className="flex items-center justify-between px-10 pt-10">
        <div
          className="font-mark font-semibold text-3xl uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          REALITY
        </div>
        <div
          className="font-display font-bold text-xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          {session.name}
        </div>
      </header>

      <section className="flex-1 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 px-10 py-10 items-start">
        <div className="flex flex-col items-center gap-4">
          <QRCodeSVG value={joinUrl} size={420} />
          <p
            className="font-display font-bold text-sm uppercase text-cream"
            style={{ letterSpacing: "0.05em" }}
          >
            {t("scanToJoin")}
          </p>
          <p className="font-body text-cream/60 text-xs break-all max-w-[420px] text-center">
            {joinUrl}
          </p>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          {game && <Leaderboard sessionId={session.id} initial={initialDashboard} />}
          <div>
            <p
              className="font-display font-semibold text-xs uppercase text-cream/60 mb-3"
              style={{ letterSpacing: "0.05em" }}
            >
              {t("inTheRoom")}
            </p>
            <AttendeeList
              sessionId={session.id}
              initial={players}
              variant="big-screen"
              pollMs={2000}
            />
          </div>
        </div>
      </section>

      <span hidden>{gameState ? "1" : "0"}</span>

      <footer className="px-10 pb-8 text-center font-body text-xs text-cream/50">
        86 Mai Thúc Lân, Đà Nẵng · realitydn.com
      </footer>
    </main>
  );
}
