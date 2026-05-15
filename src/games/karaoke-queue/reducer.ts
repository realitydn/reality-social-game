import type { KaraokeEvent, KaraokeQueueState, KaraokeRequest } from "./state";

const MAX_TITLE_LENGTH = 200;

function sanitizeTitle(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
}

export function reduceKaraokeQueue(
  state: KaraokeQueueState,
  event: KaraokeEvent,
): KaraokeQueueState {
  switch (event.kind) {
    case "karaoke_start": {
      if (state.started) return state;
      return { ...state, started: true, hostId: event.hostId };
    }

    case "karaoke_submit": {
      if (!state.started || state.ended) return state;
      const title = sanitizeTitle(event.songTitle);
      if (!title) return state;
      // One active request per user — silently drop duplicates.
      const existing = state.queue.find((r) => r.playerId === event.playerId);
      if (existing) return state;
      const request: KaraokeRequest = {
        id: event.id,
        playerId: event.playerId,
        songTitle: title,
        submittedAt: event.submittedAt,
      };
      return { ...state, queue: [...state.queue, request] };
    }

    case "karaoke_edit": {
      const title = sanitizeTitle(event.songTitle);
      if (!title) return state;
      const idx = state.queue.findIndex((r) => r.id === event.requestId);
      if (idx === -1) return state;
      const next = [...state.queue];
      next[idx] = { ...next[idx], songTitle: title };
      return { ...state, queue: next };
    }

    case "karaoke_reorder": {
      // Ignore unknown ids and duplicates. Append any current items the host
      // forgot at the end, so reorder is never destructive.
      const seen = new Set<string>();
      const reordered: KaraokeRequest[] = [];
      for (const id of event.orderedIds) {
        if (seen.has(id)) continue;
        const item = state.queue.find((r) => r.id === id);
        if (!item) continue;
        seen.add(id);
        reordered.push(item);
      }
      for (const item of state.queue) {
        if (!seen.has(item.id)) reordered.push(item);
      }
      return { ...state, queue: reordered };
    }

    case "karaoke_complete": {
      const idx = state.queue.findIndex((r) => r.id === event.requestId);
      if (idx === -1) return state;
      const item = state.queue[idx];
      const queue = state.queue.filter((_, i) => i !== idx);
      return {
        ...state,
        queue,
        completed: [...state.completed, item],
      };
    }

    case "karaoke_delete": {
      const idx = state.queue.findIndex((r) => r.id === event.requestId);
      if (idx === -1) return state;
      const item = state.queue[idx];
      const queue = state.queue.filter((_, i) => i !== idx);
      return {
        ...state,
        queue,
        removed: [...state.removed, item],
      };
    }

    case "karaoke_end": {
      return { ...state, ended: true };
    }
  }
}
