import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getGame, getGameState } from "@/lib/games";
import { findPlayerByCode } from "@/lib/sessions";
import { appendEvent } from "@/lib/events";
import { getGameType } from "@/games/registry";
import { promptIdAt } from "@/games/bingo/card";
import type { BingoEvent, BingoState } from "@/games/bingo/state";

type ClaimBody = { kind: "bingo_claim"; squareIdx: number; promptId: string; targetCode: string };
type ResolveBody = { kind: "bingo_confirm" | "bingo_deny"; claimId: string };
type EventBody = ClaimBody | ResolveBody;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const game = await getGame(id);
  if (!game) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (game.status !== "running")
    return NextResponse.json({ error: "game not running" }, { status: 400 });

  const gt = getGameType(game.type);
  if (!gt) return NextResponse.json({ error: "unknown game type" }, { status: 500 });

  const body = (await req.json().catch(() => null)) as EventBody | null;
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const ctx = { gameId: game.id, sessionId: game.session_id };
  const state = (await getGameState(game)) as BingoState;
  const now = Date.now();

  if (body.kind === "bingo_claim") {
    const target = await findPlayerByCode(game.session_id, body.targetCode);
    if (!target)
      return NextResponse.json({ error: "no player with that code" }, { status: 400 });
    const expected = promptIdAt(game.session_id, game.id, user.id, body.squareIdx);
    if (expected !== body.promptId)
      return NextResponse.json({ error: "prompt mismatch" }, { status: 400 });

    const eventId = crypto.randomUUID();
    const event: BingoEvent = {
      kind: "bingo_claim",
      id: eventId,
      claimerId: user.id,
      targetId: target.user_id,
      squareIdx: body.squareIdx,
      promptId: body.promptId,
      createdAt: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

    await appendEvent({
      id: eventId,
      gameId: game.id,
      kind: "bingo_claim",
      actorId: user.id,
      targetId: target.user_id,
      payload: {
        id: eventId,
        claimerId: user.id,
        targetId: target.user_id,
        squareIdx: body.squareIdx,
        promptId: body.promptId,
        createdAt: now,
      },
    });
    return NextResponse.json({ ok: true, claimId: eventId });
  }

  if (body.kind === "bingo_confirm" || body.kind === "bingo_deny") {
    const event: BingoEvent = {
      kind: body.kind,
      claimId: body.claimId,
      confirmerId: user.id,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });

    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: body.kind,
      actorId: user.id,
      targetId: null,
      payload: { claimId: body.claimId, confirmerId: user.id, at: now },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown event kind" }, { status: 400 });
}
