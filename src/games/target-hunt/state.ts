// Target Hunt — non-elimination chase. Each player has one current target.
// Tag your target → +1 point and your target shifts to whoever they were targeting.
// Targets converge over time, leading to satisfying late-game chaos.

export type TagClaim = {
  id: string;            // event id of the original tag_claim event
  taggerId: string;
  taggedId: string;
  createdAt: number;
};

export type TargetHuntState = {
  /** Set true once the start event has been processed. */
  started: boolean;
  /** Each player's current target. null = no target (game over for them). */
  targets: Record<string, string | null>;
  /** Player order at start (used for display + tie-breaks). */
  order: string[];
  /** Pending tag claims awaiting target confirmation. */
  pending: Record<string, TagClaim>;
  /** Per-player tag count. */
  scores: Record<string, number>;
  /** Confirmed tag history. */
  history: { taggerId: string; taggedId: string; at: number }[];
};

export type TargetHuntEvent =
  | { kind: "target_hunt_start"; players: string[]; createdAt: number }
  | {
      kind: "target_hunt_tag_claim";
      id: string;
      taggerId: string;
      taggedId: string;
      createdAt: number;
    }
  | { kind: "target_hunt_tag_confirm"; claimId: string; confirmerId: string; at: number }
  | { kind: "target_hunt_tag_deny"; claimId: string; confirmerId: string; at: number };

export const EMPTY_TARGET_HUNT_STATE: TargetHuntState = {
  started: false,
  targets: {},
  order: [],
  pending: {},
  scores: {},
  history: [],
};
