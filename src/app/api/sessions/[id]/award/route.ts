import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getActiveGame, getGameState } from "@/lib/games";
import { getPlayer } from "@/lib/sessions";
import { isAdmin } from "@/lib/roles";
import { recordLedger } from "@/lib/ledger";
import { getDB } from "@/lib/db";
import { notifySession } from "@/lib/realtime";

// POST /api/sessions/[id]/award  { userId, points, reason }
// Host-awarded points (Sam's quiz winners, karaoke dares, etc.). Writes a
// score_ledger row (so it shows on the everything + per-game-type boards) and
// bumps session_players.score (so the recap reflects it). Authorized to the
// host of the active host-driven game or a site admin.
const Body = z.object({
  userId: z.string().min(1).max(64),
  points: z.number().int().min(-1000).max(1000),
  reason: z.string().min(1).max(32),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const game = await getActiveGame(id);
  let authorized = await isAdmin(user.email);
  if (!authorized && game) {
    const state = (await getGameState(game)) as { hostId?: string | null };
    authorized = !!state?.hostId && state.hostId === user.id;
  }
  if (!authorized)
    return NextResponse.json({ error: "must be the game host or an admin" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = raw == null ? null : Body.safeParse(raw);
  if (!parsed || !parsed.success)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const { userId, points, reason } = parsed.data;
  if (!points) return NextResponse.json({ ok: true }); // no-op

  const target = await getPlayer(id, userId);
  if (!target)
    return NextResponse.json({ error: "not a player in this session" }, { status: 400 });

  await recordLedger([
    {
      userId,
      sessionId: id,
      gameId: game?.id ?? null,
      gameType: game?.type ?? null,
      points,
      reason,
      awardedBy: user.id,
    },
  ]);
  const db = await getDB();
  await db
    .prepare("UPDATE session_players SET score = score + ? WHERE session_id = ? AND user_id = ?")
    .bind(points, id, userId)
    .run();
  await notifySession(id, "award");
  return NextResponse.json({ ok: true });
}
