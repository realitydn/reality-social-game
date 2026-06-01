"use client";

import { standings, type QuizScoreboardState } from "@/games/quiz-scoreboard/state";

type Props = {
  state: QuizScoreboardState;
  labels: Record<string, string>;
};

// Read-only standings for players' phones — the host runs the board, players
// just watch. Top-3 get chromatic swatches (matches the /leaderboard look).
const PODIUM = ["bg-yellow", "bg-amber", "bg-red"];

export default function QuizScoreboardView({ state, labels }: Props) {
  if (!state.started) {
    return (
      <div className="border-2 border-dashed border-ink/30 p-6 text-center font-body text-sm text-ink/50">
        {labels.waitingToStart}
      </div>
    );
  }

  const ranked = standings(state);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2
          className="font-display font-bold text-2xl uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.title}
        </h2>
        <span
          className="font-display font-semibold text-xs uppercase text-ink/60"
          style={{ letterSpacing: "0.05em" }}
        >
          {state.ended ? labels.finalScores : labels.standings}
        </span>
      </div>

      {ranked.length === 0 ? (
        <p className="font-body text-ink/50 text-sm">{labels.watchBigScreen}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {ranked.map((team, i) => (
            <li
              key={team.id}
              className={`flex items-center gap-3 p-3 border-2 border-ink ${
                i < 3 ? PODIUM[i] : "bg-cream"
              }`}
            >
              <span className="font-display font-bold text-xl tabular-nums w-7">
                {i + 1}
              </span>
              <span
                className="font-display font-bold uppercase truncate flex-1"
                style={{ letterSpacing: "0.05em" }}
              >
                {team.name}
              </span>
              <span className="font-display font-bold text-2xl tabular-nums">
                {team.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
