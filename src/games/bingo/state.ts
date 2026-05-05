// Bingo game state — derived purely by reducing `game_events` for the game.

export type BingoClaim = {
  id: string;                 // event id of the original `bingo_claim` event
  claimerId: string;
  targetId: string;
  squareIdx: number;
  promptId: string;
  createdAt: number;
};

export type BingoConfirmed = BingoClaim & { confirmedAt: number };

export type BingoState = {
  // Per-player set of filled square indexes.
  filled: Record<string /* userId */, number[]>;
  // Pending claims, keyed by claim id.
  pending: Record<string, BingoClaim>;
  // Confirmed claim history (for audit + future replay/animation).
  confirmed: BingoConfirmed[];
  // Players who have hit a bingo (in order).
  bingos: { userId: string; at: number }[];
};

export type BingoEvent =
  | {
      kind: "bingo_claim";
      id: string;
      claimerId: string;
      targetId: string;
      squareIdx: number;
      promptId: string;
      createdAt: number;
    }
  | { kind: "bingo_confirm"; claimId: string; confirmerId: string; at: number }
  | { kind: "bingo_deny"; claimId: string; confirmerId: string; at: number };

export const EMPTY_BINGO_STATE: BingoState = {
  filled: {},
  pending: {},
  confirmed: [],
  bingos: [],
};
