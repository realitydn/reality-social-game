import type { SpeedPairEvent, SpeedPairState } from "./state";

export function reduceSpeedPair(state: SpeedPairState, event: SpeedPairEvent): SpeedPairState {
  switch (event.kind) {
    case "speed_pair_start": {
      if (state.started) return state;
      const partner: Record<string, string | null> = {};
      const scores: Record<string, number> = {};
      const waiting: string[] = [];
      for (const pair of event.pairs) {
        for (const p of pair) scores[p] = 0;
        if (pair.length === 2) {
          partner[pair[0]] = pair[1];
          partner[pair[1]] = pair[0];
        } else if (pair.length === 1) {
          partner[pair[0]] = null;
          waiting.push(pair[0]);
        }
      }
      return { ...state, started: true, partner, done: {}, waiting, scores };
    }

    case "speed_pair_done": {
      const me = event.playerId;
      const partnerId = state.partner[me] ?? null;
      if (!partnerId) return state;
      if (state.done[me]) return state;

      const newDone = { ...state.done, [me]: true };
      const partnerDone = newDone[partnerId] === true;

      if (!partnerDone) {
        return { ...state, done: newDone };
      }

      // Both partners done — pair completes, score, both go to waiting.
      const newPartner = { ...state.partner, [me]: null, [partnerId]: null };
      const clearedDone = { ...newDone, [me]: false, [partnerId]: false };
      const newScores = {
        ...state.scores,
        [me]: (state.scores[me] ?? 0) + 1,
        [partnerId]: (state.scores[partnerId] ?? 0) + 1,
      };
      return {
        ...state,
        partner: newPartner,
        done: clearedDone,
        waiting: [...state.waiting, me, partnerId],
        scores: newScores,
      };
    }

    case "speed_pair_assign": {
      const [a, b] = event.players;
      // Both must currently be waiting and unpaired.
      if (state.partner[a] != null || state.partner[b] != null) return state;
      const newWaiting = state.waiting.filter((p) => p !== a && p !== b);
      return {
        ...state,
        partner: { ...state.partner, [a]: b, [b]: a },
        waiting: newWaiting,
      };
    }
  }
}
