# Games catalog

What's playable today and how to add a new game.

## Current games

### Bingo
- **Type key:** `bingo`
- **Folder:** `src/games/bingo/`
- **Mechanic:** Each player gets a deterministic 4×4 card of social prompts (e.g. "Has been to 5+ countries"). Walk up to someone, ask the prompt, if it's true tap the square → modal asks for that person's 4-char code → claim sent. Target sees a pending claim card → confirm fills the claimer's square; deny drops it.
- **Scoring:** +1 per filled square. +5 bonus to the first three players to bingo (4-in-a-row on any row, column, or diagonal).
- **Prompts:** 24 prompts in `src/games/bingo/prompts.ts`, each with EN / VI / RU / UK text. Deterministic card generation seeded by `(sessionId, gameId, userId)`.
- **State shape:** `BingoState` — filled square indexes per player + pending claims + confirmed history + bingo achievement order.

### Target Hunt
- **Type key:** `target-hunt`
- **Folder:** `src/games/target-hunt/`
- **Mechanic:** Non-elimination chase. At start, players are arranged in a randomized ring; each player targets the next in the ring. "I tagged them" sends a tag claim against your current target; they confirm/deny. On confirm, you score +1 and inherit whoever they were targeting (chains converge over time).
- **Scoring:** +1 per confirmed tag. The mechanic creates a converging-chain dynamic where late-game many players target the same person.
- **State shape:** `TargetHuntState` — `targets: { playerId → targetId | null }`, pending tag claims, scores, history.
- **Seed events:** `target_hunt_start` carries the shuffled player order; emitted via `onStart()`.

### Speed Pair
- **Type key:** `speed-pair`
- **Folder:** `src/games/speed-pair/`
- **Mechanic:** Server pairs everyone up at start. Each player sees their partner; tap "done" when ready. When BOTH partners have tapped done, the pair completes (+1 each), both go to a FIFO waiting queue. Server orchestrates re-matching: while ≥2 are waiting, append `speed_pair_assign` events from the front of the queue.
- **Scoring:** Score = number of completed pairings.
- **State shape:** `SpeedPairState` — `partner: { playerId → partnerId | null }`, `done` flags, `waiting` queue, scores.
- **Seed events:** `speed_pair_start` carries the initial pairing list; emitted via `onStart()`.
- **Note:** Re-matching logic intentionally lives in the API handler (`src/app/api/games/[id]/events/route.ts`), not the reducer — generating new pair events from the queue is impure (reads state, writes events) and cleanly belongs at the orchestration layer.

### Quiz Round
- **Type key:** `quiz-round`
- **Folder:** `src/games/quiz-round/`
- **Mechanic:** Host-driven trivia round. The host opens questions one at a time from the host control panel; players answer on their phones (first answer wins, no overwrites); host reveals — close-question stops accepting answers and triggers per-player scoring; host advances to the next question. Optional auto-close timer is a hint to the player UI; the host can always reveal early or let it run past. Big-screen takes over the projector when the game type is `quiz-round`: question + options + live answer count + reveal coloring + inter-question leaderboard.
- **Scoring:** Configurable per package. Default: 1000 points per correct answer with linear speed decay (full at 0ms, down to half at the timer mark). Materialized on reveal (one dramatic leaderboard jump per question), not per-answer. Late joiners can answer current and future questions; missed questions score zero.
- **Content:** Loaded from a host-authored **package** (see `/host` CMS). Snapshotted into the `quiz_round_start` seed event at game start, so post-start edits to the source package don't affect the running game and replay stays deterministic.
- **State shape:** `QuizRoundState` — frozen `questions[]`, `config`, `currentIdx`, `phase: lobby | question | revealed | ended`, `questionOpenedAt`, per-question `answers: { playerId → { value, elapsedMs, submittedAt } }`, `scores`, `reveals` log with per-player point deltas.
- **Seed events:** `quiz_round_start` carries the host id + question snapshot + config; emitted via `onStart()` from `seedData` passed by the admin server action (which resolves the package id from `games.config`).
- **Note:** Host control surfaces at `/session/[id]/host`. The reducer enforces `state.hostId === actorId` for `quiz_round_open_question`, `quiz_round_close_question`, `quiz_round_advance`, and `quiz_round_end` — non-host players' attempts are rejected at the validate step. Server computes `elapsedMs` for answers from `state.questionOpenedAt` rather than trusting client-supplied timing.
- **Question types:** Pluggable. v1 ships `multiple-choice` and `true-false`. Each type is a folder under `src/games/quiz-round/question-types/<type>/` with pure `validateAnswer` / `isCorrect` / `scoreAnswer`. Adding a new type is one folder + one line in the question-type registry; player and big-screen renderers dispatch on `question.type`.

## Big-screen + leaderboard integration

Every game gets the same projector treatment for free:

- `Leaderboard` component reads `gameType.score(state)` via `/api/sessions/[id]/state`, sorts, displays top-5 in REALITY chromatic swatches
- `AttendeeList` shows live player roster with codes
- End-of-session recap (when `session.ends_at` is set) reads `session_players.score` for the final podium

`session_players.score` is populated by `finalizeGame()` (in `src/lib/games.ts`) when a game ends — it adds the GameType's final score map to the persistent column. So persistent leaderboards (`/leaderboard?tab=tonight|week|all`) work uniformly across game types.

## How to add a new game

Concrete recipe — should take 1-2 evenings for a simple game.

### 1. Create the folder

```
src/games/<your-game>/
  state.ts        # State + Event types
  reducer.ts      # Pure reducer
  index.ts        # GameType<State, Event> implementation
  prompts.ts      # (optional) translated prompt library, like Bingo
```

### 2. Define state and events

`state.ts`:

```ts
export type YourGameState = {
  // ... whatever shape your game needs ...
};

export type YourGameEvent =
  | { kind: "your_game_action_a"; ... }
  | { kind: "your_game_action_b"; ... };

export const EMPTY_YOUR_GAME_STATE: YourGameState = { ... };
```

Event `kind` strings should be globally unique (they're stored in `game_events.kind`). Prefix with the game type for clarity.

### 3. Write the reducer

`reducer.ts`:

```ts
export function reduceYourGame(state: YourGameState, event: YourGameEvent): YourGameState {
  switch (event.kind) {
    case "your_game_action_a": {
      // Pure transformation; return new state.
    }
    // ...
  }
}
```

Keep it pure: no I/O, no `Date.now()`, no `Math.random()`. Anything stochastic should be in the seed event (see `onStart` below) or in the API handler that constructs the event before calling `reduce`.

### 4. Implement the GameType

`index.ts`:

```ts
import type { GameType, GameValidation } from "@/games/types";
import { reduceYourGame } from "./reducer";
import { EMPTY_YOUR_GAME_STATE } from "./state";

const LABELS: Record<Locale, Record<string, string>> = { en: {...}, vi: {...}, ru: {...}, uk: {...} };

export const YourGame: GameType<YourGameState, YourGameEvent> = {
  type: "your-game",
  init() { return EMPTY_YOUR_GAME_STATE; },
  reduce(state, event) { return reduceYourGame(state, event); },
  validate(state, event, actorId): GameValidation { /* authorize */ },
  score(state) { return { ...state.scores }; },
  prompts(locale) { return LABELS[locale] ?? LABELS.en; },
  onStart(ctx, players) {
    // Optional: return seed events to append on game start.
    return [];
  },
};
```

### 5. Register it

`src/games/registry.ts`:

```ts
import { YourGame } from "./your-game";

const REGISTRY = {
  bingo: BingoGame,
  "target-hunt": TargetHuntGame,
  "speed-pair": SpeedPairGame,
  "your-game": YourGame,           // ← add it here
} as const satisfies Record<string, GameType<unknown, unknown>>;

export const PLAYABLE_GAME_TYPES: { key: GameTypeKey; label: string }[] = [
  { key: "bingo", label: "Bingo" },
  { key: "target-hunt", label: "Target Hunt" },
  { key: "speed-pair", label: "Speed Pair" },
  { key: "your-game", label: "Your Game" },   // ← shows up as a Start button
];
```

The admin page reads `PLAYABLE_GAME_TYPES` and renders a Start button for each.

### 6. Add a UI component

`src/components/YourGameView.tsx` — client component that takes the game state, the current player's ID, the player roster, the labels from `prompts(locale)`, and callbacks (e.g. `onAction`) and renders the player-facing UI.

### 7. Wire the API handler

`src/app/api/games/[id]/events/route.ts` — add a branch for your game's event kinds. Cast the loaded state to your game's State type, construct the event, validate via the registered GameType, append, broadcast.

### 8. Wire the GameView dispatch

`src/components/GameView.tsx` — add a branch for `data.game.type === "your-game"` that renders `<YourGameView ... />` with the appropriate props and `postEvent`-driven callbacks.

### 9. Update `src/app/session/[id]/page.tsx`

Pass the game's `prompts(locale)` labels through to `GameView`'s props.

### 10. (Optional) Update `messages/*.json`

If your game has any app-level strings (not game-internal labels), add them to the message files for all four locales.

That's the whole loop. A simple game (no facial recognition, no hardware) is roughly 200-400 lines of new code spread across the above files.

## How to add a new question type (within Quiz Round)

If your game *is* a new flavor of trivia (e.g. image-options MCQ, audio clip, free-text with fuzzy matching), don't make a new GameType — extend Quiz Round's question-type plugins instead. You inherit the host CMS, host control panel, big-screen renderer, scoring, and reveal flow for free.

### 1. Create the plugin folder

```
src/games/quiz-round/question-types/<your-type>/
  index.ts        # exports the QuestionType<Q, A> impl
```

### 2. Implement the contract

`index.ts`:

```ts
import type { QuestionType } from "../types";

export type YourQData = { /* shape */ };
export type YourQAnswer = { /* shape */ };

export const YourType: QuestionType<YourQData, YourQAnswer> = {
  type: "your-type",
  validateAnswer(q, a) { /* shape check */ },
  isCorrect(q, a) { /* boolean */ },
  scoreAnswer({ question, answer, elapsedMs, config }) { /* points */ },
};
```

The plugin must be **pure** — no I/O, no `Date.now`, no `Math.random`. The reducer calls `scoreAnswer` deterministically during reveal, so any non-determinism breaks replay.

### 3. Register

`src/games/quiz-round/question-types/index.ts`:

```ts
import { YourType } from "./your-type";

const REGISTRY = {
  "multiple-choice": MultipleChoiceType,
  "true-false": TrueFalseType,
  "your-type": YourType,
} as const satisfies Record<string, QuestionType<unknown, unknown>>;

export const AUTHORABLE_QUESTION_TYPES = [
  // ...existing...
  { key: "your-type", label: "Your type" },
];
```

### 4. Author-side editor

`src/components/host/YourTypeEditor.tsx` — client component. Props: `{ questionId, data, onChange }`. Render whatever inputs your data shape needs.

Wire dispatch in `src/components/host/QuestionEditor.tsx`:

```tsx
{question.type === "your-type" && (
  <YourTypeEditor
    questionId={question.id}
    data={question.data as YourQData}
    onChange={(d) => onChange({ ...question, data: d })}
  />
)}
```

### 5. Player + big-screen render

Add render branches in `src/components/QuizRoundView.tsx` (player) and `src/components/QuizRoundBigScreen.tsx` (projector), keyed on `question.type`. Same dispatch pattern as the editor.

That's it. Adding a 5th question type is roughly 100-200 lines spread across plugin + 3 render components. No core changes, no schema migration.

## Quiz packages

Authored content lives in the `packages` table — separate from `games`. A package is `{ id, name, game_type, author_id, config (JSON), content (JSON), status }`. The `content` blob's shape is owned by the consuming game type; for Quiz Round it's `{ questions: QuizRoundQuestion[] }`. No nested tables, so question shapes can evolve without migrations.

The host CMS at `/host/*` is where authors build packages. Library lists everything (any signed-in user can create + edit; obscurity model for v1). Editor has a sticky save bar, per-question-type sub-editors, and per-question overrides for points + timer. Solo Preview at `/host/packages/[id]/preview` lets the host dry-run content without touching a session.

To slot a package into a session, an admin picks it from the dropdown on the session page. The admin server action loads the package, builds a `QuizRoundSeed` (host id + questions snapshot + config), and passes it to `startGame(sessionId, "quiz-round", { config: { packageId }, seedData })`. The GameType's `onStart` reads `seedData` and emits `quiz_round_start` with the snapshot — replay-deterministic, immune to subsequent edits to the source package.

Image media for question stems reuses the Phase 7 photo pipeline with `purpose='quiz-question'`. Video upload is deferred to v2 (Cloudflare Stream).

## Why state lives in events

Storing state as the reduction of an append-only event log gets us:

- **Free history** — every action is a row, sortable by time, queryable by actor / target
- **Free replay** — bug in a reducer? Fix it, re-reduce existing events, get the corrected state
- **Free anti-cheat audit** — every claim is forever attributable
- **Free new-game-onboarding** — a player joining mid-game just reads the current reduced state
- **No schema churn** — adding events is free, not a migration

The cost is reducer speed at scale. We'll snapshot per game once a real bottleneck shows up; until then the simplicity is worth more than the optimization.
