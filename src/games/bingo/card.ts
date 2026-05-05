import { fnv1a } from "@/lib/hash";
import { BINGO_PROMPTS, type Prompt } from "./prompts";

export const BINGO_CARD_SIZE = 16; // 4x4 grid

// Deterministic per-player card. Same (sessionId, gameId, userId) → same card,
// so refreshing the page or polling never changes which prompt is in which square.
export function generateCard(sessionId: string, gameId: string, userId: string): Prompt[] {
  const seed = `${sessionId}|${gameId}|${userId}`;
  const ranked = BINGO_PROMPTS.map((p) => ({ p, key: fnv1a(seed + ":" + p.id) }));
  ranked.sort((a, b) => a.key - b.key);
  return ranked.slice(0, BINGO_CARD_SIZE).map((r) => r.p);
}

export function promptIdAt(
  sessionId: string,
  gameId: string,
  userId: string,
  squareIdx: number,
): string | null {
  const card = generateCard(sessionId, gameId, userId);
  return card[squareIdx]?.id ?? null;
}

// Bingo win lines on a 4x4 grid: 4 rows, 4 columns, 2 diagonals.
export const BINGO_LINES: number[][] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

export function hasBingo(filled: Set<number>): boolean {
  return BINGO_LINES.some((line) => line.every((i) => filled.has(i)));
}
