"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DisposableCameraState,
  DisposablePhoto,
} from "@/games/disposable-camera/state";
import { tallyVotes } from "@/games/disposable-camera/state";
import { DisposableCameraGame } from "@/games/disposable-camera";
import type { SessionPlayer } from "@/lib/sessions";
import { useRoomNotifications } from "@/lib/use-room-notifications";
import { type Locale } from "@/i18n/locales";

type Dashboard = {
  gameState: DisposableCameraState | null;
  players: SessionPlayer[];
};

type Props = {
  sessionId: string;
  initial: Dashboard;
  locale?: Locale;
};

// Fill {token} placeholders in a localized template.
function fmt(template: string | undefined, vars: Record<string, string | number>): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export default function DisposableCameraBigScreen({
  sessionId,
  initial,
  locale = "en",
}: Props) {
  const [data, setData] = useState<Dashboard>(initial);
  const labels = DisposableCameraGame.prompts(locale);

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

  const nameOf = (id: string) =>
    data.players.find((p) => p.user_id === id)?.display_name ?? "Someone";

  if (state.phase === "capturing") {
    return <CapturingScreen state={state} nameOf={nameOf} labels={labels} />;
  }
  if (state.phase === "voting") {
    return <VotingScreen state={state} nameOf={nameOf} labels={labels} />;
  }
  // revealed | ended
  return (
    <RevealScreen
      state={state}
      nameOf={nameOf}
      labels={labels}
      ended={state.phase === "ended"}
    />
  );
}

function CapturingScreen({
  state,
  nameOf,
  labels,
}: {
  state: DisposableCameraState;
  nameOf: (id: string) => string;
  labels: Record<string, string>;
}) {
  const photoCount = state.photos.length;
  const photographerCount = new Set(state.photos.map((p) => p.uploaderId)).size;
  const recent = state.photos.slice(-12).reverse();

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-6 min-h-0">
      <div className="flex items-baseline justify-between">
        <p
          className="font-display font-bold text-5xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.title}
        </p>
        <p
          className="font-display font-semibold text-2xl text-cream/70 tabular-nums"
        >
          {photoCount} {labels.bigShots} · {photographerCount} {labels.bigPhotographers}
        </p>
      </div>
      <p
        className="font-display font-semibold text-xl uppercase text-cream/60"
        style={{ letterSpacing: "0.05em" }}
      >
        {fmt(labels.bigShotsEach, { n: state.config.photosPerPlayer })}
      </p>
      {recent.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="font-display font-bold text-3xl text-cream/30 uppercase" style={{ letterSpacing: "0.05em" }}>
            {labels.bigWaitingFirst}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
          {recent.map((p) => (
            <div key={p.id} className="aspect-square border-2 border-cream/30 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-ink/80 text-cream text-base py-1 px-2 font-body truncate text-center">
                {nameOf(p.uploaderId)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// How many tiles fit comfortably on a projector at once (6 cols × 4 rows).
// Beyond this we rotate pages so every photo gets airtime during voting —
// previously the grid lived in `flex-1 overflow-hidden` and extra rows were
// simply CLIPPED, so late uploads (often the voter's own shot) never showed.
const VOTE_PAGE_SIZE = 24;
const VOTE_PAGE_MS = 6000;

function VotingScreen({
  state,
  nameOf,
  labels,
}: {
  state: DisposableCameraState;
  nameOf: (id: string) => string;
  labels: Record<string, string>;
}) {
  const ballotsCast = Object.keys(state.votes).filter(
    (v) => (state.votes[v] ?? []).length > 0,
  ).length;

  const photos = state.photos;
  const pageCount = Math.max(1, Math.ceil(photos.length / VOTE_PAGE_SIZE));
  const [page, setPage] = useState(0);

  // Rotate through pages when there are more photos than fit on screen.
  useEffect(() => {
    if (pageCount <= 1) {
      setPage(0);
      return;
    }
    const id = setInterval(
      () => setPage((p) => (p + 1) % pageCount),
      VOTE_PAGE_MS,
    );
    return () => clearInterval(id);
  }, [pageCount]);

  // Clamp if photos shrank (e.g. host deleted some) so we never show a blank page.
  const safePage = page % pageCount;
  const visible = useMemo(
    () => photos.slice(safePage * VOTE_PAGE_SIZE, safePage * VOTE_PAGE_SIZE + VOTE_PAGE_SIZE),
    [photos, safePage],
  );

  // Lay the visible tiles into a fixed 6-column grid and cap the row count to
  // what we actually need, then let the grid distribute the available height
  // across those rows (min-h-0) — tiles scale to the viewport, nothing clips.
  const cols = 6;
  const rows = Math.max(1, Math.ceil(visible.length / cols));

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-6 min-h-0">
      <div className="flex items-baseline justify-between">
        <p
          className="font-display font-bold text-5xl uppercase text-yellow"
          style={{ letterSpacing: "0.05em" }}
        >
          {labels.bigVoteOnPhone}
        </p>
        <p className="font-display font-semibold text-2xl text-cream/70 tabular-nums">
          {fmt(labels.bigBallotsIn, { n: ballotsCast })}
        </p>
      </div>
      <div className="flex items-baseline justify-between gap-6">
        <p
          className="font-display font-semibold text-xl uppercase text-cream/60"
          style={{ letterSpacing: "0.05em" }}
        >
          {fmt(
            state.config.votesPerPlayer === 1
              ? labels.bigPickFavourites
              : labels.bigPickFavouritesPlural,
            { n: state.config.votesPerPlayer },
          )}
        </p>
        {pageCount > 1 && (
          <p className="font-display font-semibold text-lg text-cream/40 tabular-nums shrink-0">
            {safePage + 1} / {pageCount}
          </p>
        )}
      </div>
      <div
        className="grid gap-3 flex-1 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {visible.map((p) => (
          <div
            key={p.id}
            className="border-2 border-cream/40 relative min-h-0 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="w-full h-full object-cover" />
            <span className="absolute bottom-0 inset-x-0 bg-ink/80 text-cream text-base py-1 px-2 font-body truncate text-center">
              {nameOf(p.uploaderId)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealScreen({
  state,
  nameOf,
  labels,
  ended,
}: {
  state: DisposableCameraState;
  nameOf: (id: string) => string;
  labels: Record<string, string>;
  ended: boolean;
}) {
  const counts = tallyVotes(state);
  const ranked: { photo: DisposablePhoto; count: number }[] = state.photos
    .map((photo) => ({ photo, count: counts.get(photo.id) ?? 0 }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const top = ranked.slice(0, 5);
  const winner = top[0];
  const rest = top.slice(1);

  const votesPhrase = (n: number) =>
    n === 1 ? labels.revealVotesOne : fmt(labels.revealVotesMany, { n });

  return (
    <div className="flex-1 flex flex-col px-12 py-6 gap-6 min-h-0">
      <p
        className="font-display font-bold text-6xl uppercase text-yellow"
        style={{ letterSpacing: "0.05em" }}
      >
        {labels.revealHeading}
      </p>
      {ended && (
        <p className="font-display font-semibold text-xl uppercase text-cream/60" style={{ letterSpacing: "0.05em" }}>
          {labels.bigFinalResults}
        </p>
      )}
      {!winner ? (
        <p className="font-body text-2xl text-cream/40 italic">{labels.bigNoVotes}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 flex-1 min-h-0">
          {/* Winner blown up */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 border-4 border-yellow min-h-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={winner.photo.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-baseline justify-between">
              <p
                className="font-display font-bold text-4xl uppercase text-yellow"
                style={{ letterSpacing: "0.05em" }}
              >
                {nameOf(winner.photo.uploaderId)}
              </p>
              <p className="font-display font-bold text-3xl text-cream tabular-nums">
                {votesPhrase(winner.count)}
              </p>
            </div>
          </div>
          {/* Runners-up */}
          <div className="flex flex-col gap-2 overflow-y-auto">
            {rest.map((r, i) => (
              <div
                key={r.photo.id}
                className="flex items-center gap-3 border-2 border-cream/30 p-2"
              >
                <span className="font-display font-bold text-2xl tabular-nums text-yellow w-6 text-right">
                  {i + 2}.
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.photo.url}
                  alt=""
                  className="w-16 h-16 object-cover border border-cream/30"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-display font-bold uppercase text-cream truncate"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {nameOf(r.photo.uploaderId)}
                  </p>
                  <p className="font-body text-sm text-cream/60">
                    {votesPhrase(r.count)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
