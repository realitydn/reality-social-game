import type { GameType } from "./types";
import { BingoGame } from "./bingo";
import { TargetHuntGame } from "./target-hunt";

// Registry of all playable game types. Adding a new game = importing it here
// and listing it. Everything else (lifecycle, persistence, scoring) is generic.
const REGISTRY = {
  bingo: BingoGame,
  "target-hunt": TargetHuntGame,
} as const satisfies Record<string, GameType<unknown, unknown>>;

export type GameTypeKey = keyof typeof REGISTRY;
export const GAME_TYPES = REGISTRY;

export const PLAYABLE_GAME_TYPES: { key: GameTypeKey; label: string }[] = [
  { key: "bingo", label: "Bingo" },
  { key: "target-hunt", label: "Target Hunt" },
];

export function getGameType(key: string): GameType<unknown, unknown> | null {
  return (REGISTRY as Record<string, GameType<unknown, unknown>>)[key] ?? null;
}
