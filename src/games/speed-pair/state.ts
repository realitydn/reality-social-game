// Speed Pair — players paired up, both tap "done" when ready, server re-pairs
// from a FIFO waiting queue. Score = number of completed pairings.

export type SpeedPairState = {
  started: boolean;
  /** Each player's current partner (null = waiting/unmatched). */
  partner: Record<string, string | null>;
  /** Whether each player has tapped "done" for their current pair. */
  done: Record<string, boolean>;
  /** FIFO queue of players waiting for a new partner. */
  waiting: string[];
  /** Completed-pair count per player. */
  scores: Record<string, number>;
};

export type SpeedPairEvent =
  | {
      kind: "speed_pair_start";
      pairs: string[][]; // either [a,b] for a pair or [solo] who starts in waiting
      createdAt: number;
    }
  | { kind: "speed_pair_done"; playerId: string; at: number }
  | { kind: "speed_pair_assign"; players: [string, string]; at: number };

export const EMPTY_SPEED_PAIR_STATE: SpeedPairState = {
  started: false,
  partner: {},
  done: {},
  waiting: [],
  scores: {},
};
