// Karaoke Queue — non-competitive GameType. Players submit one song at a
// time (free-text title); host arranges / edits / completes / deletes from
// the queue; big-screen shows up-next + history. No scoring (score()
// returns {}, so finalizeGame is a no-op for this game type).
//
// "One active request per user" is enforced at validate time AND in the
// reducer (defensive — replay correctness for any client-side races).

export type KaraokeRequest = {
  /** Stable id (= the submit event's id). */
  id: string;
  playerId: string;
  songTitle: string;
  submittedAt: number;
};

export type KaraokeQueueState = {
  started: boolean;
  /** Who started the game; the only user authorized to push host events. */
  hostId: string | null;
  /** Active requests, ordered. Top of list = currently up. */
  queue: KaraokeRequest[];
  /** Performed requests, in completion order — useful for the big-screen
   *  history strip + end-of-night recap. */
  completed: KaraokeRequest[];
  /** Removed requests, in deletion order — kept so we can show "took back"
   *  feedback on the UI without re-querying. Could be elided in v2. */
  removed: KaraokeRequest[];
  ended: boolean;
};

export const EMPTY_KARAOKE_QUEUE_STATE: KaraokeQueueState = {
  started: false,
  hostId: null,
  queue: [],
  completed: [],
  removed: [],
  ended: false,
};

export type KaraokeEvent =
  | { kind: "karaoke_start"; hostId: string; createdAt: number }
  | {
      kind: "karaoke_submit";
      id: string;
      playerId: string;
      songTitle: string;
      submittedAt: number;
    }
  | { kind: "karaoke_edit"; requestId: string; songTitle: string; at: number }
  | { kind: "karaoke_reorder"; orderedIds: string[]; at: number }
  | { kind: "karaoke_complete"; requestId: string; at: number }
  | { kind: "karaoke_delete"; requestId: string; at: number }
  | { kind: "karaoke_end"; at: number };
