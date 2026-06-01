"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { QuizScoreboardGame } from "@/games/quiz-scoreboard";
import { standings, type QuizScoreboardState } from "@/games/quiz-scoreboard/state";
import { type Locale } from "@/i18n/locales";
import { useRoomNotifications } from "@/lib/use-room-notifications";

type Dashboard = {
  gameState: QuizScoreboardState | null;
};

type Props = {
  sessionId: string;
  initial: Dashboard;
  locale?: Locale;
  /** Server-rendered "follow our socials" QR (QRCodeSVG is an async server
   *  component, so the page renders it and passes the element down here). */
  socialsQr?: ReactNode;
};

// Top-3 get strong chromatic blocks; the rest are quiet cream rows. Mirrors the
// /leaderboard "top three are colored" treatment, inverted for the projector.
const PODIUM = ["bg-yellow", "bg-amber", "bg-red"];

export default function QuizScoreboardBigScreen({
  sessionId,
  initial,
  locale = "en",
  socialsQr,
}: Props) {
  const [data, setData] = useState<Dashboard>(initial);
  const labels = QuizScoreboardGame.prompts(locale);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/state`, { cache: "no-store" });
      if (res.ok) setData((await res.json()) as Dashboard);
    } catch {
      /* swallow */
    }
  }, [sessionId]);

  useEffect(() => {
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [refresh]);

  useRoomNotifications(sessionId, refresh);

  const state = data.gameState;
  if (!state) return null;

  const ranked = standings(state);
  const shown = ranked.slice(0, 10);
  const overflow = ranked.length - shown.length;

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 px-12 py-6 items-start">
      <div className="flex flex-col gap-5 min-w-0">
        <div className="flex items-baseline gap-4">
          <p
            className="font-display font-bold text-5xl uppercase text-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.title}
          </p>
          <p
            className="font-display font-semibold text-xl uppercase text-cream/60"
            style={{ letterSpacing: "0.05em" }}
          >
            {state.ended ? labels.finalScores : labels.standings}
          </p>
        </div>

        {shown.length === 0 ? (
          <p
            className="font-display font-semibold text-2xl uppercase text-cream/50"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.noTeams}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {shown.map((team, i) => {
              const podium = i < 3;
              return (
                <li
                  key={team.id}
                  className={`flex items-center gap-5 px-5 py-3 ${
                    podium ? `${PODIUM[i]} text-ink` : "border-b border-cream/10 text-cream"
                  }`}
                >
                  <span className="font-display font-bold text-4xl tabular-nums w-12">
                    {i + 1}
                  </span>
                  <span
                    className="font-display font-bold text-4xl uppercase truncate flex-1"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {team.name}
                  </span>
                  <span className="font-display font-bold text-5xl tabular-nums">
                    {team.score}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {overflow > 0 && (
          <p className="font-body text-cream/40 text-lg">+{overflow} more</p>
        )}
      </div>

      {socialsQr && (
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="bg-cream p-3">{socialsQr}</div>
          <p
            className="font-display font-bold text-base uppercase text-yellow text-center"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.followUs}
          </p>
          <p
            className="font-display font-semibold text-xs uppercase text-cream/60 text-center"
            style={{ letterSpacing: "0.05em" }}
          >
            {labels.scanSocials}
          </p>
        </div>
      )}
    </div>
  );
}
