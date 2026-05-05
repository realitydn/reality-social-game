import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getActiveGame, getGameState, getScores } from "@/lib/games";
import { getPlayer, getSession, listPlayers, type SessionPlayer } from "@/lib/sessions";

// Dashboard endpoint — one round-trip for everything a player or big-screen
// needs to render. Polled every 2-3s by GameView and Leaderboard.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const players = await listPlayers(id);
  const game = await getActiveGame(id);

  let gameState: unknown = null;
  let scores: Record<string, number> = {};
  if (game) {
    gameState = await getGameState(game);
    scores = await getScores(game);
  }

  const user = await getCurrentUser();
  let me: { user_id: string; code: string | null; display_name: string | null } | null = null;
  if (user) {
    const sp: SessionPlayer | null = await getPlayer(id, user.id);
    if (sp) me = { user_id: user.id, code: sp.code, display_name: user.name };
  }

  return NextResponse.json({
    session: { id: session.id, name: session.name, ends_at: session.ends_at },
    players,
    game: game ? { id: game.id, type: game.type, status: game.status } : null,
    gameState,
    scores,
    me,
  });
}
