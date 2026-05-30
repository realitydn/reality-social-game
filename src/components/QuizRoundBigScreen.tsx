"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizRoundState, TeamStanding } from "@/games/quiz-round/state";
import { teamStandings } from "@/games/quiz-round/state";
import { QuizRoundGame } from "@/games/quiz-round";
import type { SessionPlayer } from "@/lib/sessions";
import type { MCQData } from "@/games/quiz-round/question-types/multiple-choice";
import type { TFData } from "@/games/quiz-round/question-types/true-false";
import type { FreeTextData } from "@/games/quiz-round/question-types/free-text";
import type { OrderingData } from "@/games/quiz-round/question-types/ordering";
import type { AudioMCQData } from "@/games/quiz-round/question-types/audio-mcq";
import { useRoomNotifications } from "@/lib/use-room-notifications";
import { type Locale } from "@/i18n/locales";

type Dashboard = {
  gameState: QuizRoundState | null;
  players: SessionPlayer[];
  scores: Record<string, number>;
};

type Props = {
  sessionId: string;
  initial: Dashboard;
  locale?: Locale;
};

type Labels = Record<string, string>;

const SWATCH_BG = [
  "bg-yellow",
  "bg-amber",
  "bg-red",
  "bg-pink",
  "bg-purple",
  "bg-blue",
  "bg-teal",
  "bg-green",
];

export default function QuizRoundBigScreen({ sessionId, initial, locale = "en" }: Props) {
  const [data, setData] = useState<Dashboard>(initial);
  const labels = QuizRoundGame.prompts(locale);

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

  if (state.phase === "ended") {
    return (
      <FinalPodium
        state={state}
        players={data.players}
        scores={data.scores}
        labels={labels}
      />
    );
  }

  if (state.phase === "lobby" || state.currentIdx === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p
          className="font-display font-bold text-7xl uppercase text-yellow text-center"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.title}
          <br />
          <span className="text-cream/70 text-4xl">{labels.getReady}</span>
        </p>
      </div>
    );
  }

  const idx = state.currentIdx;
  const q = state.questions[idx];
  if (!q) return null;
  const submissions = state.answers[idx] ?? {};
  const totalPlayers = data.players.length;
  const answeredCount = Object.keys(submissions).length;
  const showInterLeaderboard =
    state.phase === "revealed" && state.config.interQuestionLeaderboard;

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-6">
      <div className="flex items-center justify-between">
        <span
          className="font-display font-bold text-3xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          Q{idx + 1} / {state.questions.length}
        </span>
        <span className="font-display font-semibold text-xl text-cream/60 tabular-nums">
          {answeredCount} / {totalPlayers} {labels.answered}
        </span>
      </div>

      {q.type === "multiple-choice" && (
        <MCQBigScreen
          data={q.data as MCQData}
          submissions={submissions}
          phase={state.phase}
        />
      )}
      {q.type === "true-false" && (
        <TFBigScreen
          data={q.data as TFData}
          submissions={submissions}
          phase={state.phase}
          labels={labels}
        />
      )}
      {q.type === "free-text" && (
        <FreeTextBigScreen
          data={q.data as FreeTextData}
          phase={state.phase}
          labels={labels}
        />
      )}
      {q.type === "ordering" && (
        <OrderingBigScreen
          data={q.data as OrderingData}
          phase={state.phase}
          labels={labels}
        />
      )}
      {q.type === "audio-mcq" && (
        <AudioMCQBigScreen
          data={q.data as AudioMCQData}
          submissions={submissions}
          phase={state.phase}
          labels={labels}
        />
      )}

      {state.phase === "question" && state.questionOpenedAt !== null && (
        <BigScreenCountdown
          openedAt={state.questionOpenedAt}
          timerSecs={q.timerSecs ?? state.config.timerSecs}
        />
      )}

      {showInterLeaderboard &&
        (state.config.teamsEnabled ? (
          <TeamLeaderboard standings={teamStandings(state)} labels={labels} />
        ) : (
          <InterLeaderboard players={data.players} scores={state.scores} labels={labels} />
        ))}
    </div>
  );
}

function MCQBigScreen({
  data,
  submissions,
  phase,
}: {
  data: MCQData;
  submissions: Record<string, { value: unknown }>;
  phase: QuizRoundState["phase"];
}) {
  const showCorrect = phase === "revealed";
  const counts: Record<string, number> = {};
  for (const a of Object.values(submissions)) {
    const optId = (a.value as { optionId?: string }).optionId;
    if (optId) counts[optId] = (counts[optId] ?? 0) + 1;
  }
  const total = Object.values(submissions).length;

  return (
    <div className="flex flex-col gap-6">
      {data.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={data.image}
          alt=""
          className="max-h-64 object-contain mx-auto border-2 border-cream"
        />
      )}
      <h1
        className="font-display font-bold text-5xl md:text-6xl uppercase text-cream leading-tight"
        style={{ letterSpacing: "0.05em" }}
      >
        {data.prompt}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.options.map((opt) => {
          const isCorrect = showCorrect && opt.id === data.correctOptionId;
          const count = counts[opt.id] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={opt.id}
              className={`relative border-4 p-4 overflow-hidden ${
                showCorrect
                  ? isCorrect
                    ? "border-yellow bg-yellow text-ink"
                    : "border-cream/30 text-cream/40"
                  : "border-cream text-cream"
              }`}
            >
              {showCorrect && (
                <div
                  className={`absolute inset-y-0 left-0 ${isCorrect ? "bg-ink/15" : "bg-cream/30"}`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center gap-4">
                {opt.image && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={opt.image}
                    alt=""
                    className="h-24 w-24 object-cover border-2 border-cream/30 shrink-0"
                  />
                )}
                <span
                  className="font-display font-bold text-3xl uppercase line-clamp-2 flex-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {isCorrect && <span className="mr-2">✓</span>}
                  {opt.text}
                </span>
                {showCorrect && (
                  <span className="font-display font-bold text-2xl tabular-nums">{count}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TFBigScreen({
  data,
  submissions,
  phase,
  labels,
}: {
  data: TFData;
  submissions: Record<string, { value: unknown }>;
  phase: QuizRoundState["phase"];
  labels: Labels;
}) {
  const showCorrect = phase === "revealed";
  let trueCount = 0;
  let falseCount = 0;
  for (const a of Object.values(submissions)) {
    const v = (a.value as { value?: boolean }).value;
    if (v === true) trueCount++;
    else if (v === false) falseCount++;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="font-display font-bold text-5xl md:text-6xl uppercase text-cream leading-tight"
        style={{ letterSpacing: "0.05em" }}
      >
        {data.prompt}
      </h1>
      <div className="grid grid-cols-2 gap-4">
        {[
          { v: true, label: labels.trueLabel, count: trueCount },
          { v: false, label: labels.falseLabel, count: falseCount },
        ].map(({ v, label, count }) => {
          const isCorrect = showCorrect && data.correctValue === v;
          return (
            <div
              key={label}
              className={`border-4 p-8 text-center ${
                showCorrect
                  ? isCorrect
                    ? "border-yellow bg-yellow text-ink"
                    : "border-cream/30 text-cream/40"
                  : "border-cream text-cream"
              }`}
            >
              <p
                className="font-display font-bold text-5xl uppercase"
                style={{ letterSpacing: "0.05em" }}
              >
                {isCorrect && <span className="mr-2">✓</span>}
                {label}
              </p>
              {showCorrect && (
                <p className="font-display font-bold text-3xl tabular-nums mt-2">{count}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FreeTextBigScreen({
  data,
  phase,
  labels,
}: {
  data: FreeTextData;
  phase: QuizRoundState["phase"];
  labels: Labels;
}) {
  return (
    <div className="flex flex-col gap-6">
      {data.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={data.image} alt="" className="max-h-64 object-contain mx-auto border-2 border-cream" />
      )}
      <h1
        className="font-display font-bold text-5xl md:text-6xl uppercase text-cream leading-tight"
        style={{ letterSpacing: "0.05em" }}
      >
        {data.prompt}
      </h1>
      <p className="font-display font-semibold text-2xl uppercase text-cream/60" style={{ letterSpacing: "0.05em" }}>
        {labels.answerOnPhone}
      </p>
      {phase === "revealed" && (
        <div className="border-4 border-yellow bg-yellow/20 p-6">
          <p className="font-display font-semibold text-base uppercase text-cream/70 mb-2" style={{ letterSpacing: "0.05em" }}>
            {labels.acceptedAnswers}
          </p>
          <p
            className="font-display font-bold text-4xl uppercase text-yellow leading-tight"
            style={{ letterSpacing: "0.05em" }}
          >
            {data.acceptedAnswers.filter((a) => a.trim()).join("  ·  ")}
          </p>
        </div>
      )}
    </div>
  );
}

function OrderingBigScreen({
  data,
  phase,
  labels,
}: {
  data: OrderingData;
  phase: QuizRoundState["phase"];
  labels: Labels;
}) {
  return (
    <div className="flex flex-col gap-6">
      {data.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={data.image} alt="" className="max-h-48 object-contain mx-auto border-2 border-cream" />
      )}
      <h1
        className="font-display font-bold text-5xl md:text-6xl uppercase text-cream leading-tight"
        style={{ letterSpacing: "0.05em" }}
      >
        {data.prompt}
      </h1>
      <p className="font-display font-semibold text-xl uppercase text-cream/60" style={{ letterSpacing: "0.05em" }}>
        {phase === "revealed" ? labels.correctOrder : labels.orderOnPhone}
      </p>
      <ol className="flex flex-col gap-2">
        {data.items.map((it, i) => (
          <li
            key={it.id}
            className={`border-4 p-3 flex items-center gap-3 ${
              phase === "revealed"
                ? "border-yellow bg-yellow/10 text-cream"
                : "border-cream/40 text-cream/80"
            }`}
          >
            {phase === "revealed" ? (
              <span className="font-display font-bold text-3xl text-yellow tabular-nums w-12">
                {i + 1}.
              </span>
            ) : (
              <span className="font-display font-bold text-3xl text-cream/40 w-12">·</span>
            )}
            <span
              className="font-display font-bold text-2xl uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              {it.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AudioMCQBigScreen({
  data,
  submissions,
  phase,
  labels,
}: {
  data: AudioMCQData;
  submissions: Record<string, { value: unknown }>;
  phase: QuizRoundState["phase"];
  labels: Labels;
}) {
  const [playing, setPlaying] = useState(false);
  const showCorrect = phase === "revealed";
  const counts: Record<string, number> = {};
  for (const a of Object.values(submissions)) {
    const optId = (a.value as { optionId?: string }).optionId;
    if (optId) counts[optId] = (counts[optId] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="font-display font-bold text-5xl md:text-6xl uppercase text-cream leading-tight"
        style={{ letterSpacing: "0.05em" }}
      >
        {data.prompt}
      </h1>
      {data.audioUrl && (
        <div className="flex items-center gap-4">
          <audio
            src={data.audioUrl}
            controls
            className="flex-1"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <span className="font-display font-semibold text-cream/60 text-base">
            {playing ? labels.nowPlaying : labels.tapPlay}
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.options.map((opt) => {
          const isCorrect = showCorrect && opt.id === data.correctOptionId;
          const count = counts[opt.id] ?? 0;
          return (
            <div
              key={opt.id}
              className={`border-4 p-4 ${
                showCorrect
                  ? isCorrect
                    ? "border-yellow bg-yellow text-ink"
                    : "border-cream/30 text-cream/40"
                  : "border-cream text-cream"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span
                  className="font-display font-bold text-3xl uppercase line-clamp-2 flex-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {isCorrect && <span className="mr-2">✓</span>}
                  {opt.text}
                </span>
                {showCorrect && (
                  <span className="font-display font-bold text-2xl tabular-nums shrink-0">{count}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BigScreenCountdown({
  openedAt,
  timerSecs,
}: {
  openedAt: number;
  timerSecs?: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timerSecs) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [timerSecs]);

  if (!timerSecs) return null;
  const elapsed = (now - openedAt) / 1000;
  const remaining = Math.max(0, timerSecs - elapsed);
  const pct = Math.max(0, Math.min(100, (remaining / timerSecs) * 100));

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-3 bg-cream/10 overflow-hidden">
        <div
          className="h-full bg-yellow transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-display font-bold text-3xl text-yellow tabular-nums w-16 text-right">
        {Math.ceil(remaining)}s
      </span>
    </div>
  );
}

function InterLeaderboard({
  players,
  scores,
  labels,
}: {
  players: SessionPlayer[];
  scores: Record<string, number>;
  labels: Labels;
}) {
  const ranked = players
    .map((p) => ({ player: p, score: scores[p.user_id] ?? 0 }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (ranked.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p
        className="font-display font-semibold text-sm uppercase text-cream/60"
        style={{ letterSpacing: "0.05em" }}
      >
        {labels.leaderboard}
      </p>
      {ranked.map((r, i) => (
        <div
          key={r.player.user_id}
          className={`flex items-center justify-between gap-4 p-2 ${SWATCH_BG[i % SWATCH_BG.length]} text-ink`}
        >
          <span
            className="font-display font-bold text-2xl uppercase line-clamp-2"
            style={{ letterSpacing: "0.05em" }}
          >
            {i + 1}. {r.player.display_name}
          </span>
          <span className="font-display font-bold text-2xl tabular-nums shrink-0">{r.score}</span>
        </div>
      ))}
    </div>
  );
}

// Inter-question leaderboard, team variant (config.teamsEnabled). A team's
// score is the sum of its members' individual scores — see teamStandings.
function TeamLeaderboard({
  standings,
  labels,
}: {
  standings: TeamStanding[];
  labels: Labels;
}) {
  const ranked = standings.filter((s) => s.score > 0).slice(0, 5);
  if (ranked.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p
        className="font-display font-semibold text-sm uppercase text-cream/60"
        style={{ letterSpacing: "0.05em" }}
      >
        {labels.teamLeaderboard}
      </p>
      {ranked.map((t, i) => (
        <div
          key={t.teamId}
          className={`flex items-center justify-between gap-4 p-2 ${SWATCH_BG[i % SWATCH_BG.length]} text-ink`}
        >
          <span
            className="font-display font-bold text-2xl uppercase line-clamp-2"
            style={{ letterSpacing: "0.05em" }}
          >
            {i + 1}. {t.name}
          </span>
          <span className="font-display font-bold text-2xl tabular-nums shrink-0">{t.score}</span>
        </div>
      ))}
    </div>
  );
}

function FinalPodium({
  state,
  players,
  scores,
  labels,
}: {
  state: QuizRoundState;
  players: SessionPlayer[];
  scores: Record<string, number>;
  labels: Labels;
}) {
  if (state.config.teamsEnabled) {
    return <TeamPodium standings={teamStandings(state)} labels={labels} />;
  }

  const ranked = players
    .map((p) => ({ player: p, score: scores[p.user_id] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 gap-6">
      <p
        className="font-display font-bold text-6xl uppercase text-yellow"
        style={{ letterSpacing: "0.05em" }}
      >
        {labels.roundComplete}
      </p>
      <div className="flex flex-col gap-2 w-full max-w-2xl">
        {ranked.map((r, i) => (
          <div
            key={r.player.user_id}
            className={`flex items-center justify-between gap-4 p-4 ${SWATCH_BG[i % SWATCH_BG.length]} text-ink`}
          >
            <span
              className="font-display font-bold text-3xl uppercase line-clamp-2"
              style={{ letterSpacing: "0.05em" }}
            >
              {i + 1}. {r.player.display_name}
            </span>
            <span className="font-display font-bold text-3xl tabular-nums shrink-0">{r.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Final podium, team variant. Biggest team first; the winning team gets the
// outsized treatment so the room can read the result at a glance.
function TeamPodium({
  standings,
  labels,
}: {
  standings: TeamStanding[];
  labels: Labels;
}) {
  const ranked = standings.slice(0, 5);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12 gap-6">
      <p
        className="font-display font-bold text-6xl uppercase text-yellow"
        style={{ letterSpacing: "0.05em" }}
      >
        {labels.roundComplete}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-2xl">
        {ranked.map((t, i) => {
          const top = i === 0;
          return (
            <div
              key={t.teamId}
              className={`flex items-center justify-between gap-4 ${top ? "p-6" : "p-4"} ${SWATCH_BG[i % SWATCH_BG.length]} text-ink`}
            >
              <span
                className={`font-display font-bold uppercase line-clamp-2 ${top ? "text-5xl" : "text-3xl"}`}
                style={{ letterSpacing: "0.05em" }}
              >
                {i + 1}. {t.name}
              </span>
              <span
                className={`font-display font-bold tabular-nums shrink-0 ${top ? "text-5xl" : "text-3xl"}`}
              >
                {t.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
