import { hasBingo } from "./card";
import type { BingoEvent, BingoState } from "./state";

export function reduceBingo(state: BingoState, event: BingoEvent): BingoState {
  switch (event.kind) {
    case "bingo_claim": {
      // Reject if claim with this id already exists, or if claimer's square is already filled.
      if (state.pending[event.id]) return state;
      const filled = state.filled[event.claimerId] ?? [];
      if (filled.includes(event.squareIdx)) return state;
      // Reject if there's already a pending claim from claimer for the same square.
      const conflicting = Object.values(state.pending).find(
        (p) => p.claimerId === event.claimerId && p.squareIdx === event.squareIdx,
      );
      if (conflicting) return state;
      return {
        ...state,
        pending: {
          ...state.pending,
          [event.id]: {
            id: event.id,
            claimerId: event.claimerId,
            targetId: event.targetId,
            squareIdx: event.squareIdx,
            promptId: event.promptId,
            createdAt: event.createdAt,
          },
        },
      };
    }

    case "bingo_confirm": {
      const claim = state.pending[event.claimId];
      if (!claim || claim.targetId !== event.confirmerId) return state;
      const { [event.claimId]: _removed, ...restPending } = state.pending;
      const claimerFilled = new Set(state.filled[claim.claimerId] ?? []);
      claimerFilled.add(claim.squareIdx);
      const newFilled = { ...state.filled, [claim.claimerId]: [...claimerFilled] };
      const bingos = [...state.bingos];
      if (
        hasBingo(claimerFilled) &&
        !bingos.find((b) => b.userId === claim.claimerId)
      ) {
        bingos.push({ userId: claim.claimerId, at: event.at });
      }
      return {
        ...state,
        pending: restPending,
        filled: newFilled,
        confirmed: [...state.confirmed, { ...claim, confirmedAt: event.at }],
        bingos,
      };
    }

    case "bingo_deny": {
      const claim = state.pending[event.claimId];
      if (!claim || claim.targetId !== event.confirmerId) return state;
      const { [event.claimId]: _removed, ...restPending } = state.pending;
      return { ...state, pending: restPending };
    }
  }
}
