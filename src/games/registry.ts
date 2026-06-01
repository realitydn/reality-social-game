import type { GameType } from "./types";
import { BingoGame } from "./bingo";
import { TargetHuntGame } from "./target-hunt";
import { SpeedPairGame } from "./speed-pair";
import { QuizRoundGame } from "./quiz-round";
import { QuizScoreboardGame } from "./quiz-scoreboard";
import { KaraokeQueueGame } from "./karaoke-queue";
import { DisposableCameraGame } from "./disposable-camera";

// Registry of all playable game types. Adding a new game = importing it here
// and listing it. Everything else (lifecycle, persistence, scoring) is generic.
const REGISTRY = {
  bingo: BingoGame,
  "target-hunt": TargetHuntGame,
  "speed-pair": SpeedPairGame,
  "quiz-round": QuizRoundGame,
  "quiz-scoreboard": QuizScoreboardGame,
  "karaoke-queue": KaraokeQueueGame,
  "disposable-camera": DisposableCameraGame,
} as const satisfies Record<string, GameType<unknown, unknown>>;

export type GameTypeKey = keyof typeof REGISTRY;
export const GAME_TYPES = REGISTRY;

// Whether the game type needs a content package selected before starting.
// Quiz Round loads its questions from a host-authored package; the others
// generate their content from the player roster + deterministic seeds.
export const GAMES_REQUIRING_PACKAGE: ReadonlySet<string> = new Set([
  "quiz-round",
]);

// Whether the game type is host-driven (a designated user controls flow at
// runtime). The startGame caller passes { hostId } via seedData so the
// reducer can lock host events to that user. Other games ignore seedData.
export const HOST_DRIVEN_GAMES: ReadonlySet<string> = new Set([
  "quiz-round",
  "quiz-scoreboard",
  "karaoke-queue",
  "disposable-camera",
]);

// Game types that render their own start form on the admin session page
// (e.g. Quiz Round needs a package picker, Disposable Camera needs config
// sliders). The simple-game start button list filters these out.
export const GAMES_WITH_CUSTOM_START_FORM: ReadonlySet<string> = new Set([
  "quiz-round",
  "disposable-camera",
]);

export const PLAYABLE_GAME_TYPES: { key: GameTypeKey; label: string }[] = [
  { key: "bingo", label: "Bingo" },
  { key: "target-hunt", label: "Target Hunt" },
  { key: "speed-pair", label: "Speed Pair" },
  { key: "quiz-round", label: "Quiz Round" },
  { key: "quiz-scoreboard", label: "Pub Quiz Scoreboard" },
  { key: "karaoke-queue", label: "Karaoke Queue" },
  { key: "disposable-camera", label: "Disposable Camera" },
];

export function getGameType(key: string): GameType<unknown, unknown> | null {
  return (REGISTRY as Record<string, GameType<unknown, unknown>>)[key] ?? null;
}
