import type { TargetHuntEvent, TargetHuntState } from "./state";

export function reduceTargetHunt(state: TargetHuntState, event: TargetHuntEvent): TargetHuntState {
  switch (event.kind) {
    case "target_hunt_start": {
      if (state.started) return state;
      const order = event.players;
      const targets: Record<string, string | null> = {};
      // Ring assignment: each player targets the next one. Last targets first.
      for (let i = 0; i < order.length; i++) {
        targets[order[i]] = order.length > 1 ? order[(i + 1) % order.length] : null;
      }
      const scores: Record<string, number> = {};
      for (const u of order) scores[u] = 0;
      return { ...state, started: true, order, targets, scores };
    }

    case "target_hunt_tag_claim": {
      if (state.pending[event.id]) return state;
      const taggerTarget = state.targets[event.taggerId];
      if (taggerTarget !== event.taggedId) return state;          // tagger must be hunting tagged
      const conflicting = Object.values(state.pending).find(
        (p) => p.taggerId === event.taggerId,
      );
      if (conflicting) return state;                              // one pending claim per tagger at a time
      return {
        ...state,
        pending: {
          ...state.pending,
          [event.id]: {
            id: event.id,
            taggerId: event.taggerId,
            taggedId: event.taggedId,
            createdAt: event.createdAt,
          },
        },
      };
    }

    case "target_hunt_tag_confirm": {
      const claim = state.pending[event.claimId];
      if (!claim || claim.taggedId !== event.confirmerId) return state;
      const { [event.claimId]: _consumed, ...restPending } = state.pending;
      // Tagger inherits whoever the tagged was targeting.
      const newTaggerTarget = state.targets[claim.taggedId] ?? null;
      const newTargets = { ...state.targets, [claim.taggerId]: newTaggerTarget };
      const newScores = {
        ...state.scores,
        [claim.taggerId]: (state.scores[claim.taggerId] ?? 0) + 1,
      };
      return {
        ...state,
        pending: restPending,
        targets: newTargets,
        scores: newScores,
        history: [...state.history, { taggerId: claim.taggerId, taggedId: claim.taggedId, at: event.at }],
      };
    }

    case "target_hunt_tag_deny": {
      const claim = state.pending[event.claimId];
      if (!claim || claim.taggedId !== event.confirmerId) return state;
      const { [event.claimId]: _consumed, ...restPending } = state.pending;
      return { ...state, pending: restPending };
    }
  }
}
