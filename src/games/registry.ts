import type { GameType } from "./types";
import { BingoGame } from "./bingo";
import { TargetHuntGame } from "./target-hunt";
import { SpeedPairGame } from "./speed-pair";
import { QuizRoundGame } from "./quiz-round";

// Registry of all playable game types. Adding a new game = importing it here
// and listing it. Everything else (lifecycle, persistence, scoring) is generic.
const REGISTRY = {
  bingo: BingoGame,
  "target-hunt": TargetHuntGame,
  "speed-pair": SpeedPairGame,
  "quiz-round": QuizRoundGame,
} as const satisfies Record<string, GameType<unknown, unknown>>;

export type GameTypeKey = keyof typeof REGISTRY;
export const GAME_TYPES = REGISTRY;

// Whether the game type needs a content package selected before starting.
// Quiz Round loads its questions from a host-authored package; the others
// generate their content from the player roster + deterministic seeds.
export const GAMES_REQUIRING_PACKAGE: ReadonlySet<string> = new Set([
  "quiz-round",
]);

export const PLAYABLE_GAME_TYPES: { key: GameTypeKey; label: string }[] = [
  { key: "bingo", label: "Bingo" },
  { key: "target-hunt", label: "Target Hunt" },
  { key: "speed-pair", label: "Speed Pair" },
  { key: "quiz-round", label: "Quiz Round" },
];

export function getGameType(key: string): GameType<unknown, unknown> | null {
  return (REGISTRY as Record<string, GameType<unknown, unknown>>)[key] ?? null;
}
