import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getGame, getGameState } from "@/lib/games";
import { findPlayerByCode } from "@/lib/sessions";
import { appendEvent } from "@/lib/events";
import { notifySession } from "@/lib/realtime";
import { getGameType } from "@/games/registry";
import { promptIdAt } from "@/games/bingo/card";
import type { BingoEvent, BingoState } from "@/games/bingo/state";
import type { TargetHuntEvent, TargetHuntState } from "@/games/target-hunt/state";
import type { SpeedPairEvent, SpeedPairState } from "@/games/speed-pair/state";
import type { QuizRoundEvent, QuizRoundState } from "@/games/quiz-round/state";

type BingoClaimBody = {
  kind: "bingo_claim";
  squareIdx: number;
  promptId: string;
  targetCode: string;
};
type BingoResolveBody = { kind: "bingo_confirm" | "bingo_deny"; claimId: string };
type TagClaimBody = { kind: "target_hunt_tag_claim" };
type TagResolveBody = {
  kind: "target_hunt_tag_confirm" | "target_hunt_tag_deny";
  claimId: string;
};
type SpeedPairDoneBody = { kind: "speed_pair_done" };
type QuizOpenBody = { kind: "quiz_round_open_question"; questionIdx: number };
type QuizAnswerBody = { kind: "quiz_round_answer"; value: unknown };
type QuizCloseBody = { kind: "quiz_round_close_question" };
type QuizAdvanceBody = { kind: "quiz_round_advance"; nextIdx: number };
type QuizEndBody = { kind: "quiz_round_end" };
type EventBody =
  | BingoClaimBody
  | BingoResolveBody
  | TagClaimBody
  | TagResolveBody
  | SpeedPairDoneBody
  | QuizOpenBody
  | QuizAnswerBody
  | QuizCloseBody
  | QuizAdvanceBody
  | QuizEndBody;

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
  const now = Date.now();

  // ───────────── Bingo ─────────────
  if (body.kind === "bingo_claim") {
    const state = (await getGameState(game)) as BingoState;
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
    await notifySession(game.session_id, "bingo_claim");
    return NextResponse.json({ ok: true, claimId: eventId });
  }

  if (body.kind === "bingo_confirm" || body.kind === "bingo_deny") {
    const state = (await getGameState(game)) as BingoState;
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
    await notifySession(game.session_id, body.kind);
    return NextResponse.json({ ok: true });
  }

  // ───────────── Target Hunt ─────────────
  if (body.kind === "target_hunt_tag_claim") {
    const state = (await getGameState(game)) as TargetHuntState;
    const myTarget = state.targets[user.id];
    if (!myTarget) return NextResponse.json({ error: "no current target" }, { status: 400 });
    const eventId = crypto.randomUUID();
    const event: TargetHuntEvent = {
      kind: "target_hunt_tag_claim",
      id: eventId,
      taggerId: user.id,
      taggedId: myTarget,
      createdAt: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: eventId,
      gameId: game.id,
      kind: "target_hunt_tag_claim",
      actorId: user.id,
      targetId: myTarget,
      payload: {
        id: eventId,
        taggerId: user.id,
        taggedId: myTarget,
        createdAt: now,
      },
    });
    await notifySession(game.session_id, "target_hunt_tag_claim");
    return NextResponse.json({ ok: true, claimId: eventId });
  }

  if (body.kind === "target_hunt_tag_confirm" || body.kind === "target_hunt_tag_deny") {
    const state = (await getGameState(game)) as TargetHuntState;
    const event: TargetHuntEvent = {
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
    await notifySession(game.session_id, body.kind);
    return NextResponse.json({ ok: true });
  }

  // ───────────── Speed Pair ─────────────
  if (body.kind === "speed_pair_done") {
    const state = (await getGameState(game)) as SpeedPairState;
    const event: SpeedPairEvent = { kind: "speed_pair_done", playerId: user.id, at: now };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "speed_pair_done",
      actorId: user.id,
      targetId: null,
      payload: { playerId: user.id, at: now },
    });

    // Re-read state and auto-pair from the head of the waiting queue while we
    // have ≥2 ready. This keeps the matching logic out of the (pure) reducer.
    let next = (await getGameState(game)) as SpeedPairState;
    while (next.waiting.length >= 2) {
      const a = next.waiting[0];
      const b = next.waiting[1];
      const assignAt = Date.now();
      await appendEvent({
        id: crypto.randomUUID(),
        gameId: game.id,
        kind: "speed_pair_assign",
        actorId: null,
        targetId: null,
        payload: { players: [a, b], at: assignAt },
      });
      next = (await getGameState(game)) as SpeedPairState;
    }
    await notifySession(game.session_id, "speed_pair_done");
    return NextResponse.json({ ok: true });
  }

  // ───────────── Quiz Round ─────────────
  if (body.kind === "quiz_round_open_question") {
    const state = (await getGameState(game)) as QuizRoundState;
    const event: QuizRoundEvent = {
      kind: "quiz_round_open_question",
      questionIdx: body.questionIdx,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "quiz_round_open_question",
      actorId: user.id,
      targetId: null,
      payload: { questionIdx: body.questionIdx, at: now },
    });
    await notifySession(game.session_id, "quiz_round_open_question");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "quiz_round_close_question") {
    const state = (await getGameState(game)) as QuizRoundState;
    if (state.currentIdx === null)
      return NextResponse.json({ error: "no question open" }, { status: 400 });
    const event: QuizRoundEvent = {
      kind: "quiz_round_close_question",
      questionIdx: state.currentIdx,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "quiz_round_close_question",
      actorId: user.id,
      targetId: null,
      payload: { questionIdx: state.currentIdx, at: now },
    });
    await notifySession(game.session_id, "quiz_round_close_question");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "quiz_round_advance") {
    const state = (await getGameState(game)) as QuizRoundState;
    const event: QuizRoundEvent = {
      kind: "quiz_round_advance",
      nextIdx: body.nextIdx,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "quiz_round_advance",
      actorId: user.id,
      targetId: null,
      payload: { nextIdx: body.nextIdx, at: now },
    });
    await notifySession(game.session_id, "quiz_round_advance");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "quiz_round_end") {
    const state = (await getGameState(game)) as QuizRoundState;
    const event: QuizRoundEvent = { kind: "quiz_round_end", at: now };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "quiz_round_end",
      actorId: user.id,
      targetId: null,
      payload: { at: now },
    });
    await notifySession(game.session_id, "quiz_round_end");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "quiz_round_answer") {
    const state = (await getGameState(game)) as QuizRoundState;
    if (state.phase !== "question" || state.currentIdx === null || state.questionOpenedAt === null)
      return NextResponse.json({ error: "no question open" }, { status: 400 });
    // Server computes elapsedMs from state — clients can't fudge their speed.
    const elapsedMs = Math.max(0, now - state.questionOpenedAt);
    const event: QuizRoundEvent = {
      kind: "quiz_round_answer",
      playerId: user.id,
      questionIdx: state.currentIdx,
      value: body.value,
      elapsedMs,
      submittedAt: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "quiz_round_answer",
      actorId: user.id,
      targetId: null,
      payload: {
        playerId: user.id,
        questionIdx: state.currentIdx,
        value: body.value,
        elapsedMs,
        submittedAt: now,
      },
    });
    await notifySession(game.session_id, "quiz_round_answer");
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown event kind" }, { status: 400 });
}
