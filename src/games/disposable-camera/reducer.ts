import type {
  DisposableCameraState,
  DisposableEvent,
  DisposablePhoto,
} from "./state";

export function reduceDisposableCamera(
  state: DisposableCameraState,
  event: DisposableEvent,
): DisposableCameraState {
  switch (event.kind) {
    case "disposable_start": {
      if (state.started) return state;
      return {
        ...state,
        started: true,
        hostId: event.hostId,
        config: event.config,
        phase: "capturing",
      };
    }

    case "disposable_photo_upload": {
      if (!state.started || state.phase !== "capturing") return state;
      // No dupes (idempotent on retried events)
      if (state.photos.some((p) => p.id === event.id)) return state;
      // Enforce per-player limit defensively
      const count = state.photos.filter((p) => p.uploaderId === event.uploaderId).length;
      if (count >= state.config.photosPerPlayer) return state;
      const photo: DisposablePhoto = {
        id: event.id,
        uploaderId: event.uploaderId,
        url: event.url,
        uploadedAt: event.uploadedAt,
      };
      return { ...state, photos: [...state.photos, photo] };
    }

    case "disposable_photo_delete": {
      const idx = state.photos.findIndex((p) => p.id === event.photoId);
      if (idx === -1) return state;
      // Strip the deleted id from any cast votes too.
      const cleanedVotes: Record<string, string[]> = {};
      for (const [voter, ids] of Object.entries(state.votes)) {
        const next = ids.filter((id) => id !== event.photoId);
        if (next.length) cleanedVotes[voter] = next;
      }
      return {
        ...state,
        photos: state.photos.filter((_, i) => i !== idx),
        votes: cleanedVotes,
      };
    }

    case "disposable_open_voting": {
      if (state.phase !== "capturing") return state;
      return { ...state, phase: "voting" };
    }

    case "disposable_vote": {
      if (state.phase !== "voting") return state;
      const validIds = new Set(state.photos.map((p) => p.id));
      const photoOwner = new Map<string, string>();
      for (const p of state.photos) photoOwner.set(p.id, p.uploaderId);

      const seen = new Set<string>();
      const accepted: string[] = [];
      for (const id of event.photoIds) {
        if (accepted.length >= state.config.votesPerPlayer) break;
        if (typeof id !== "string") continue;
        if (!validIds.has(id) || seen.has(id)) continue;
        // Silently drop self-votes — the validator allows them through but
        // we never let them count, so manipulated clients can't game it.
        if (photoOwner.get(id) === event.voterId) continue;
        seen.add(id);
        accepted.push(id);
      }
      return {
        ...state,
        votes: { ...state.votes, [event.voterId]: accepted },
      };
    }

    case "disposable_open_reveal": {
      if (state.phase !== "voting") return state;
      return { ...state, phase: "revealed" };
    }

    case "disposable_end": {
      return { ...state, phase: "ended" };
    }
  }
}
