import type { Locale } from "@/i18n/locales";

// The contract every game type implements. Adding a new game = adding a folder
// under src/games/<name>/ that exports a GameType<S, E>; no schema or core
// changes required because state is reduced from the append-only game_events log.

export type GameContext = {
  gameId: string;
  sessionId: string;
};

export type GameValidation = { ok: true } | { ok: false; reason: string };

export interface GameType<State, Event> {
  /** Stable identifier matching the `games.type` column. */
  readonly type: string;

  /** Initial state for a fresh game. */
  init(ctx: GameContext): State;

  /** Pure folder over events. */
  reduce(state: State, event: Event, ctx: GameContext): State;

  /** Authorize an event before it's appended to the log. */
  validate(state: State, event: Event, actorId: string, ctx: GameContext): GameValidation;

  /** Score per player after applying all events. */
  score(state: State, ctx: GameContext): Record<string, number>;

  /** Locale-specific UI strings owned by the game. */
  prompts(locale: Locale): Record<string, string>;

  /**
   * Optional. Events to append when the game is started. Use this to seed
   * shared state that depends on the player roster (e.g. assigning targets)
   * or on resolved upstream config (e.g. a quiz-round game's package
   * snapshot, passed in via `seedData` by the orchestration layer).
   * Pure state lives in the event log — the reducer handles these on replay.
   */
  onStart?(
    ctx: GameContext,
    players: string[],
    seedData?: unknown,
  ): { kind: string; payload: unknown }[];
}

// The common shape of an event row as it's stored in `game_events`.
export type GameEventRow = {
  id: string;
  game_id: string;
  kind: string;
  actor_id: string | null;
  target_id: string | null;
  payload: string;        // JSON
  created_at: number;
};
