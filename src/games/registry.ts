import type { GameType } from "./types";
import { BingoGame } from "./bingo";
import { TargetHuntGame } from "./target-hunt";
import { SpeedPairGame } from "./speed-pair";
import { QuizRoundGame } from "./quiz-round";
import { KaraokeQueueGame } from "./karaoke-queue";

// Registry of all playable game types. Adding a new game = importing it here
// and listing it. Everything else (lifecycle, persistence, scoring) is generic.
const REGISTRY = {
  bingo: BingoGame,
  "target-hunt": TargetHuntGame,
  "speed-pair": SpeedPairGame,
  "quiz-round": QuizRoundGame,
  "karaoke-queue": KaraokeQueueGame,
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
  "karaoke-queue",
]);

export const PLAYABLE_GAME_TYPES: { key: GameTypeKey; label: string }[] = [
  { key: "bingo", label: "Bingo" },
  { key: "target-hunt", label: "Target Hunt" },
  { key: "speed-pair", label: "Speed Pair" },
  { key: "quiz-round", label: "Quiz Round" },
  { key: "karaoke-queue", label: "Karaoke Queue" },
];

export function getGameType(key: string): GameType<unknown, unknown> | null {
  return (REGISTRY as Record<string, GameType<unknown, unknown>>)[key] ?? null;
}
