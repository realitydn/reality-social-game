import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getGame, getGameState } from "@/lib/games";
import { findPlayerByCode, getPlayer } from "@/lib/sessions";
import { isAdminEmail } from "@/lib/admin";
import { appendEvent } from "@/lib/events";
import { notifySession } from "@/lib/realtime";
import { getGameType } from "@/games/registry";
import { promptIdAt } from "@/games/bingo/card";
import { getPhotosBaseUrl } from "@/lib/photos";
import type { BingoEvent, BingoState } from "@/games/bingo/state";
import type { TargetHuntEvent, TargetHuntState } from "@/games/target-hunt/state";
import type { SpeedPairEvent, SpeedPairState } from "@/games/speed-pair/state";
import type { QuizRoundEvent, QuizRoundState } from "@/games/quiz-round/state";
import type { KaraokeEvent, KaraokeQueueState } from "@/games/karaoke-queue/state";
import type {
  DisposableCameraState,
  DisposableEvent,
} from "@/games/disposable-camera/state";

// Runtime validation for every event body. Casting untrusted JSON straight to a
// type (the old approach) let malformed or out-of-range payloads — string/NaN
// square indexes, multi-megabyte strings — reach the reducer and the database.
// zod was already a dependency; it just wasn't used here.
const str = (max: number) => z.string().min(1).max(max);
const idx = z.number().int().min(0).max(1000);

const EventSchema = z.discriminatedUnion("kind", [
  // Bingo
  z.object({ kind: z.literal("bingo_claim"), squareIdx: z.number().int().min(0).max(15), promptId: str(64), targetCode: str(16) }),
  z.object({ kind: z.literal("bingo_confirm"), claimId: str(64) }),
  z.object({ kind: z.literal("bingo_deny"), claimId: str(64) }),
  // Target Hunt
  z.object({ kind: z.literal("target_hunt_tag_claim") }),
  z.object({ kind: z.literal("target_hunt_tag_confirm"), claimId: str(64) }),
  z.object({ kind: z.literal("target_hunt_tag_deny"), claimId: str(64) }),
  // Speed Pair
  z.object({ kind: z.literal("speed_pair_done") }),
  // Quiz Round
  z.object({ kind: z.literal("quiz_round_open_question"), questionIdx: idx }),
  z.object({ kind: z.literal("quiz_round_answer"), value: z.unknown() }),
  z.object({ kind: z.literal("quiz_round_close_question") }),
  z.object({ kind: z.literal("quiz_round_advance"), nextIdx: idx }),
  z.object({ kind: z.literal("quiz_round_end") }),
  z.object({ kind: z.literal("quiz_create_team"), name: str(40) }),
  z.object({ kind: z.literal("quiz_join_team"), teamId: str(64) }),
  // Karaoke Queue
  z.object({ kind: z.literal("karaoke_submit"), songTitle: str(200) }),
  z.object({ kind: z.literal("karaoke_edit"), requestId: str(64), songTitle: str(200) }),
  z.object({ kind: z.literal("karaoke_reorder"), orderedIds: z.array(str(64)).max(500) }),
  z.object({ kind: z.literal("karaoke_complete"), requestId: str(64) }),
  z.object({ kind: z.literal("karaoke_delete"), requestId: str(64) }),
  z.object({ kind: z.literal("karaoke_end") }),
  // Disposable Camera
  z.object({ kind: z.literal("disposable_photo_upload"), photoId: str(64), url: str(1000) }),
  z.object({ kind: z.literal("disposable_photo_delete"), photoId: str(64) }),
  z.object({ kind: z.literal("disposable_open_voting") }),
  z.object({ kind: z.literal("disposable_vote"), photoIds: z.array(str(64)).max(50) }),
  z.object({ kind: z.literal("disposable_open_reveal") }),
  z.object({ kind: z.literal("disposable_end") }),
]);
type EventBody = z.infer<typeof EventSchema>;

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

  // ── Authorization ──────────────────────────────────────────────────────
  // Being signed in (or holding a guest cookie) is NOT enough. The actor must
  // be a participant in THIS session, a site admin, or the game's host —
  // otherwise anyone with a leaked game id could act in a session they never
  // joined (cross-session IDOR): inject quiz answers, farm Bingo claims, etc.
  const isMember = !!(await getPlayer(game.session_id, user.id));
  let authorized = isMember || isAdminEmail(user.email);
  if (!authorized) {
    // Non-members are allowed only as the host of a host-driven game — the host
    // runs the game without necessarily joining the roster as a player.
    const probe = (await getGameState(game)) as { hostId?: string | null };
    authorized = !!probe?.hostId && probe.hostId === user.id;
  }
  if (!authorized)
    return NextResponse.json({ error: "not a participant in this session" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = raw == null ? null : EventSchema.safeParse(raw);
  if (!parsed || !parsed.success)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const body: EventBody = parsed.data;

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
    let safety = 0;
    while (next.waiting.length >= 2 && safety++ < 100) {
      const a = next.waiting[0];
      const b = next.waiting[1];
      if (a === b) break; // never pair a player with themselves
      const before = next.waiting.length;
      await appendEvent({
        id: crypto.randomUUID(),
        gameId: game.id,
        kind: "speed_pair_assign",
        actorId: null,
        targetId: null,
        payload: { players: [a, b], at: Date.now() },
      });
      next = (await getGameState(game)) as SpeedPairState;
      // If the assign didn't consume from the queue, stop rather than spin
      // forever appending assign events the reducer keeps rejecting.
      if (next.waiting.length >= before) break;
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

  if (body.kind === "quiz_create_team") {
    const state = (await getGameState(game)) as QuizRoundState;
    const teamId = crypto.randomUUID();
    const event: QuizRoundEvent = {
      kind: "quiz_create_team",
      teamId,
      name: body.name,
      createdBy: user.id,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "quiz_create_team",
      actorId: user.id,
      targetId: null,
      payload: { teamId, name: body.name, createdBy: user.id, at: now },
    });
    await notifySession(game.session_id, "quiz_create_team");
    return NextResponse.json({ ok: true, teamId });
  }

  if (body.kind === "quiz_join_team") {
    const state = (await getGameState(game)) as QuizRoundState;
    const event: QuizRoundEvent = {
      kind: "quiz_join_team",
      playerId: user.id,
      teamId: body.teamId,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "quiz_join_team",
      actorId: user.id,
      targetId: null,
      payload: { playerId: user.id, teamId: body.teamId, at: now },
    });
    await notifySession(game.session_id, "quiz_join_team");
    return NextResponse.json({ ok: true });
  }

  // ───────────── Karaoke Queue ─────────────
  if (body.kind === "karaoke_submit") {
    const state = (await getGameState(game)) as KaraokeQueueState;
    const eventId = crypto.randomUUID();
    const event: KaraokeEvent = {
      kind: "karaoke_submit",
      id: eventId,
      playerId: user.id,
      songTitle: body.songTitle,
      submittedAt: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: eventId,
      gameId: game.id,
      kind: "karaoke_submit",
      actorId: user.id,
      targetId: null,
      payload: {
        id: eventId,
        playerId: user.id,
        songTitle: body.songTitle,
        submittedAt: now,
      },
    });
    await notifySession(game.session_id, "karaoke_submit");
    return NextResponse.json({ ok: true, requestId: eventId });
  }

  if (body.kind === "karaoke_edit") {
    const state = (await getGameState(game)) as KaraokeQueueState;
    const event: KaraokeEvent = {
      kind: "karaoke_edit",
      requestId: body.requestId,
      songTitle: body.songTitle,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "karaoke_edit",
      actorId: user.id,
      targetId: null,
      payload: { requestId: body.requestId, songTitle: body.songTitle, at: now },
    });
    await notifySession(game.session_id, "karaoke_edit");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "karaoke_reorder") {
    const state = (await getGameState(game)) as KaraokeQueueState;
    const event: KaraokeEvent = {
      kind: "karaoke_reorder",
      orderedIds: body.orderedIds,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "karaoke_reorder",
      actorId: user.id,
      targetId: null,
      payload: { orderedIds: body.orderedIds, at: now },
    });
    await notifySession(game.session_id, "karaoke_reorder");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "karaoke_complete" || body.kind === "karaoke_delete") {
    const state = (await getGameState(game)) as KaraokeQueueState;
    const event: KaraokeEvent = {
      kind: body.kind,
      requestId: body.requestId,
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
      payload: { requestId: body.requestId, at: now },
    });
    await notifySession(game.session_id, body.kind);
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "karaoke_end") {
    const state = (await getGameState(game)) as KaraokeQueueState;
    const event: KaraokeEvent = { kind: "karaoke_end", at: now };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "karaoke_end",
      actorId: user.id,
      targetId: null,
      payload: { at: now },
    });
    await notifySession(game.session_id, "karaoke_end");
    return NextResponse.json({ ok: true });
  }

  // ───────────── Disposable Camera ─────────────
  if (body.kind === "disposable_photo_upload") {
    const state = (await getGameState(game)) as DisposableCameraState;
    // The url is client-supplied; require it to be one our R2 pipeline actually
    // produced (under PHOTOS_BASE_URL) so a client can't attach an arbitrary
    // external image to the projector slideshow.
    const photosBase = await getPhotosBaseUrl();
    if (!photosBase || !body.url.startsWith(photosBase))
      return NextResponse.json({ error: "invalid photo url" }, { status: 400 });
    const event: DisposableEvent = {
      kind: "disposable_photo_upload",
      id: body.photoId,
      uploaderId: user.id,
      url: body.url,
      uploadedAt: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: body.photoId,
      gameId: game.id,
      kind: "disposable_photo_upload",
      actorId: user.id,
      targetId: null,
      payload: {
        id: body.photoId,
        uploaderId: user.id,
        url: body.url,
        uploadedAt: now,
      },
    });
    await notifySession(game.session_id, "disposable_photo_upload");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "disposable_photo_delete") {
    const state = (await getGameState(game)) as DisposableCameraState;
    const event: DisposableEvent = {
      kind: "disposable_photo_delete",
      photoId: body.photoId,
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "disposable_photo_delete",
      actorId: user.id,
      targetId: null,
      payload: { photoId: body.photoId, at: now },
    });
    await notifySession(game.session_id, "disposable_photo_delete");
    return NextResponse.json({ ok: true });
  }

  if (body.kind === "disposable_vote") {
    const state = (await getGameState(game)) as DisposableCameraState;
    const event: DisposableEvent = {
      kind: "disposable_vote",
      voterId: user.id,
      photoIds: Array.isArray(body.photoIds) ? body.photoIds : [],
      at: now,
    };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: "disposable_vote",
      actorId: user.id,
      targetId: null,
      payload: { voterId: user.id, photoIds: event.photoIds, at: now },
    });
    await notifySession(game.session_id, "disposable_vote");
    return NextResponse.json({ ok: true });
  }

  if (
    body.kind === "disposable_open_voting" ||
    body.kind === "disposable_open_reveal" ||
    body.kind === "disposable_end"
  ) {
    const state = (await getGameState(game)) as DisposableCameraState;
    const event: DisposableEvent = { kind: body.kind, at: now };
    const v = gt.validate(state, event, user.id, ctx);
    if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 });
    await appendEvent({
      id: crypto.randomUUID(),
      gameId: game.id,
      kind: body.kind,
      actorId: user.id,
      targetId: null,
      payload: { at: now },
    });
    await notifySession(game.session_id, body.kind);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown event kind" }, { status: 400 });
}
