import {
  clampScore,
  sanitizeTeamName,
  type QuizScoreboardEvent,
  type QuizScoreboardState,
  type ScoreTeam,
  MAX_TEAMS,
} from "./state";

export function reduceQuizScoreboard(
  state: QuizScoreboardState,
  event: QuizScoreboardEvent,
): QuizScoreboardState {
  switch (event.kind) {
    case "quiz_scoreboard_start": {
      if (state.started) return state;
      return { ...state, started: true, hostId: event.hostId };
    }

    case "quiz_scoreboard_add_team": {
      if (!state.started || state.ended) return state;
      if (state.teams.length >= MAX_TEAMS) return state;
      const name = sanitizeTeamName(event.name);
      if (!name) return state;
      // Defensive against a double-tap replaying the same event id.
      if (state.teams.some((t) => t.id === event.id)) return state;
      const team: ScoreTeam = { id: event.id, name, score: 0 };
      return { ...state, teams: [...state.teams, team] };
    }

    case "quiz_scoreboard_rename_team": {
      const name = sanitizeTeamName(event.name);
      if (!name) return state;
      const idx = state.teams.findIndex((t) => t.id === event.teamId);
      if (idx === -1) return state;
      const next = [...state.teams];
      next[idx] = { ...next[idx], name };
      return { ...state, teams: next };
    }

    case "quiz_scoreboard_set_score": {
      const idx = state.teams.findIndex((t) => t.id === event.teamId);
      if (idx === -1) return state;
      const next = [...state.teams];
      next[idx] = { ...next[idx], score: clampScore(event.score) };
      return { ...state, teams: next };
    }

    case "quiz_scoreboard_adjust_score": {
      const idx = state.teams.findIndex((t) => t.id === event.teamId);
      if (idx === -1) return state;
      const next = [...state.teams];
      next[idx] = { ...next[idx], score: clampScore(next[idx].score + event.delta) };
      return { ...state, teams: next };
    }

    case "quiz_scoreboard_remove_team": {
      const idx = state.teams.findIndex((t) => t.id === event.teamId);
      if (idx === -1) return state;
      return { ...state, teams: state.teams.filter((_, i) => i !== idx) };
    }

    case "quiz_scoreboard_end": {
      return { ...state, ended: true };
    }
  }
}
