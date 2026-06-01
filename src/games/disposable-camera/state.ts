// Disposable Camera — host-driven photo-capture game. Each player has a
// host-configured budget of N photos for the night; all uploads pool into a
// single grid; in the voting phase, each player picks their favourites
// (up to a host-configured cap, no self-votes); host opens the reveal which
// shows the top-voted shots + photographers.
//
// Non-competitive in the leaderboard sense (score() returns {}). The
// "Photographer of the Night" recognition is on the big-screen reveal,
// not in session_players.score, so it doesn't dominate the persistent
// leaderboards.

export type CameraDirection = "front" | "back" | "either";

export type DisposableCameraConfig = {
  /** Cap on uploads per player. */
  photosPerPlayer: number;
  /** front = selfie only; back = environment only; either = player picks per shot. */
  cameraDirection: CameraDirection;
  /** Cap on votes per player in the voting phase. Self-votes are silently
   *  filtered by the reducer regardless of cap. Ignored when unlimitedVotes. */
  votesPerPlayer: number;
  /** When true there's no per-player cap — every right-swipe is a +1 to that
   *  photo (popularity contest). When false, votesPerPlayer is the cap. */
  unlimitedVotes?: boolean;
  /** Presence tier required to VOTE: 0 none · 1 venue (static QR) · 2 session
   *  (dynamic QR). Lets the around-town contest keep capture open while gating
   *  party voting. Capture presence is the game's generic config.presence tier. */
  votePresenceTier?: number;
};

export const DEFAULT_DISPOSABLE_CAMERA_CONFIG: DisposableCameraConfig = {
  photosPerPlayer: 5,
  cameraDirection: "either",
  votesPerPlayer: 3,
  unlimitedVotes: false,
  votePresenceTier: 0,
};

export type DisposablePhoto = {
  /** = the upload event's id (also matches photos table id). */
  id: string;
  uploaderId: string;
  url: string;
  uploadedAt: number;
};

export type DisposableCameraState = {
  started: boolean;
  /** Who started the game; the only user authorized to push host events. */
  hostId: string | null;
  config: DisposableCameraConfig;
  /** Phase machine: capturing → voting → revealed → ended. Host transitions. */
  phase: "capturing" | "voting" | "revealed" | "ended";
  /** All current (non-deleted) uploads, in upload order. */
  photos: DisposablePhoto[];
  /** votes[voterId] = list of photo ids they voted for. Replaces on each vote
   *  event (clients send the full ballot). */
  votes: Record<string, string[]>;
};

export const EMPTY_DISPOSABLE_CAMERA_STATE: DisposableCameraState = {
  started: false,
  hostId: null,
  config: DEFAULT_DISPOSABLE_CAMERA_CONFIG,
  phase: "capturing",
  photos: [],
  votes: {},
};

export type DisposableEvent =
  | {
      kind: "disposable_start";
      hostId: string;
      config: DisposableCameraConfig;
      createdAt: number;
    }
  | {
      kind: "disposable_photo_upload";
      id: string;
      uploaderId: string;
      url: string;
      uploadedAt: number;
    }
  | { kind: "disposable_photo_delete"; photoId: string; at: number }
  | { kind: "disposable_open_voting"; at: number }
  | {
      kind: "disposable_vote";
      voterId: string;
      photoIds: string[];
      at: number;
    }
  | { kind: "disposable_open_reveal"; at: number }
  | { kind: "disposable_end"; at: number };

/** Vote tally helper — used by big-screen + host panel. Pure. */
export function tallyVotes(state: DisposableCameraState): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ids of Object.values(state.votes)) {
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}
