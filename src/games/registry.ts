import type { GameType } from "./types";
import { BingoGame } from "./bingo";

// Registry of all playable game types. Adding a new game = importing it here
// and listing it. Everything else (lifecycle, persistence, scoring) is generic.
const REGISTRY = {
  bingo: BingoGame,
} as const satisfies Record<string, GameType<unknown, unknown>>;

export type GameTypeKey = keyof typeof REGISTRY;
export const GAME_TYPES = REGISTRY;

export function getGameType(key: string): GameType<unknown, unknown> | null {
  return (REGISTRY as Record<string, GameType<unknown, unknown>>)[key] ?? null;
}
