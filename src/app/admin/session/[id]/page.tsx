import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { endSession, getSession, listPlayers } from "@/lib/sessions";
import { endGame, getActiveGame, startGame } from "@/lib/games";
import {
  GAMES_REQUIRING_PACKAGE,
  GAMES_WITH_CUSTOM_START_FORM,
  HOST_DRIVEN_GAMES,
  PLAYABLE_GAME_TYPES,
} from "@/games/registry";
import { getPackage, listPackages } from "@/lib/packages";
import { getCurrentUser } from "@/lib/session";
import { isAdmin, listStaffUsers } from "@/lib/roles";
import {
  DEFAULT_QUIZ_ROUND_CONFIG,
  type QuizRoundConfig,
  type QuizRoundQuestion,
} from "@/games/quiz-round/state";
import type { QuizRoundSeed } from "@/games/quiz-round";
import {
  DEFAULT_DISPOSABLE_CAMERA_CONFIG,
  type CameraDirection,
  type DisposableCameraConfig,
} from "@/games/disposable-camera/state";
import type { DisposableCameraSeed } from "@/games/disposable-camera";
import { getBaseUrl } from "@/lib/url";
import AttendeeList from "@/components/AttendeeList";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import Wordmark from "@/components/Wordmark";

export default async function AdminSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();

  const baseUrl = await getBaseUrl();
  const joinUrl = `${baseUrl}/s/${session.id}`;
  const players = await listPlayers(session.id);
  const game = await getActiveGame(session.id);
  const quizPackages = await listPackages({ gameType: "quiz-round" });
  // Staff with signed-in accounts — populates the host picker on host-driven
  // game start forms. The current user is preselected when present.
  const staffUsers = await listStaffUsers();
  const currentUser = await getCurrentUser();
  const staffUserIds = new Set(staffUsers.map((s) => s.user_id));

  // Resolve the host for a host-driven game from the form's "hostId" picker:
  // honor it only if it's a real staff user_id, otherwise fall back to the
  // acting admin. Closes over staffUserIds (fetched per request above).
  async function resolveHostId(formData: FormData, fallbackId: string): Promise<string> {
    "use server";
    const picked = String(formData.get("hostId") ?? "");
    return staffUserIds.has(picked) ? picked : fallbackId;
  }

  async function end() {
    "use server";
    const u = await getCurrentUser();
    if (!u || !(await isAdmin(u.email))) return;
    await endSession(id);
    redirect("/admin");
  }

  async function startSimpleGame(formData: FormData) {
    "use server";
    const u = await getCurrentUser();
    if (!u || !(await isAdmin(u.email))) return;
    const type = String(formData.get("type") ?? "");
    if (!type) return;
    if (GAMES_REQUIRING_PACKAGE.has(type)) return;
    // Host-driven games (no package) need the hostId in seedData so the
    // reducer can lock host events to a designated staff user. The admin may
    // pick any signed-in staff member; otherwise we fall back to the admin.
    let options: Parameters<typeof startGame>[2] = {};
    if (HOST_DRIVEN_GAMES.has(type)) {
      options = { seedData: { hostId: await resolveHostId(formData, u.id) } };
    }
    await startGame(id, type, options);
    redirect(`/admin/session/${id}`);
  }

  async function startQuizRound(formData: FormData) {
    "use server";
    const user = await getCurrentUser();
    if (!user || !(await isAdmin(user.email))) return;
    const packageId = String(formData.get("packageId") ?? "");
    if (!packageId) return;
    const pkg = await getPackage(packageId);
    if (!pkg || pkg.game_type !== "quiz-round") return;
    const seedConfig: QuizRoundConfig = {
      ...DEFAULT_QUIZ_ROUND_CONFIG,
      ...(pkg.config as Partial<QuizRoundConfig>),
    };
    const questions =
      ((pkg.content as { questions?: QuizRoundQuestion[] }).questions) ?? [];
    const seed: QuizRoundSeed = {
      hostId: await resolveHostId(formData, user.id),
      questions,
      config: seedConfig,
    };
    await startGame(id, "quiz-round", {
      config: { packageId, packageName: pkg.name },
      seedData: seed,
    });
    redirect(`/admin/session/${id}`);
  }

  async function startDisposableCamera(formData: FormData) {
    "use server";
    const user = await getCurrentUser();
    if (!user || !(await isAdmin(user.email))) return;
    const photosRaw = parseInt(String(formData.get("photosPerPlayer") ?? "5"), 10);
    const votesRaw = parseInt(String(formData.get("votesPerPlayer") ?? "3"), 10);
    const directionRaw = String(formData.get("cameraDirection") ?? "either");
    const config: DisposableCameraConfig = {
      photosPerPlayer: Math.min(50, Math.max(1, Number.isFinite(photosRaw) ? photosRaw : 5)),
      cameraDirection: (["front", "back", "either"] as const).includes(
        directionRaw as CameraDirection,
      )
        ? (directionRaw as CameraDirection)
        : "either",
      votesPerPlayer: Math.min(20, Math.max(1, Number.isFinite(votesRaw) ? votesRaw : 3)),
    };
    await startGame(id, "disposable-camera", {
      config,
      seedData: {
        hostId: await resolveHostId(formData, user.id),
        config,
      } satisfies DisposableCameraSeed,
    });
    redirect(`/admin/session/${id}`);
  }

  async function endActiveGame() {
    "use server";
    const u = await getCurrentUser();
    if (!u || !(await isAdmin(u.email))) return;
    if (game) await endGame(game.id);
    redirect(`/admin/session/${id}`);
  }

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between p-6">
        <Wordmark />
        <Link
          href="/admin"
          className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink"
          style={{ letterSpacing: "0.05em" }}
        >
          ← All sessions
        </Link>
      </header>
      <section className="flex-1 px-6 max-w-3xl w-full mx-auto pb-12">
        <h1
          className="font-display font-bold text-3xl uppercase mb-1"
          style={{ letterSpacing: "0.05em" }}
        >
          {session.name}
        </h1>
        <p className="font-body text-ink/60 text-sm mb-8">
          ID <code>{session.id}</code> · {session.ends_at ? "ended" : "active"}
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href={`/big-screen/${session.id}`}
            target="_blank"
            className="bg-ink text-cream font-display font-bold uppercase px-5 py-2 transition hover:translate-y-0.5"
            style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
          >
            Open big screen ↗
          </Link>
          <Link
            href={joinUrl}
            target="_blank"
            className="border-2 border-ink text-ink font-display font-bold uppercase px-5 py-2 transition hover:bg-yellow"
            style={{ letterSpacing: "0.05em" }}
          >
            Player link ↗
          </Link>
          {game && HOST_DRIVEN_GAMES.has(game.type) && game.status === "running" && (
            <Link
              href={`/session/${session.id}/host`}
              className="bg-yellow text-ink font-display font-bold uppercase px-5 py-2 border-2 border-ink transition hover:translate-y-0.5"
              style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
            >
              Host control →
            </Link>
          )}
          {!session.ends_at && (
            <form action={end}>
              <ConfirmSubmitButton
                className="border-2 border-red text-red font-display font-bold uppercase px-5 py-2 transition hover:bg-red hover:text-cream"
                style={{ letterSpacing: "0.05em" }}
                title="End session?"
                body="Ends the night for everyone and flips the big screen to the recap. Can't be undone."
                confirmLabel="End session"
              >
                End session
              </ConfirmSubmitButton>
            </form>
          )}
        </div>

        <div className="border-2 border-ink p-4 mb-10">
          <p
            className="font-display font-semibold text-xs uppercase text-ink/60 mb-3"
            style={{ letterSpacing: "0.05em" }}
          >
            Game
          </p>
          <p
            className="font-display font-bold text-lg uppercase mb-4"
            style={{ letterSpacing: "0.05em" }}
          >
            {game ? `${game.type} · running` : "No active game"}
          </p>
          <div className="flex flex-col gap-3">
            {!session.ends_at && (
              <div className="flex flex-wrap gap-2">
                {PLAYABLE_GAME_TYPES.filter(
                  // Karaoke is host-driven, so it gets its own form with a host
                  // picker below (rather than a bare one-tap start button).
                  (g) => !GAMES_WITH_CUSTOM_START_FORM.has(g.key) && g.key !== "karaoke-queue",
                ).map((g) => (
                  <form key={g.key} action={startSimpleGame}>
                    <input type="hidden" name="type" value={g.key} />
                    {game ? (
                      <ConfirmSubmitButton
                        className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
                        style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
                        title="Switch game?"
                        body={`This ends the current game (scores are saved) and starts ${g.label}.`}
                        confirmLabel={`Switch to ${g.label}`}
                      >
                        {`Switch to ${g.label}`}
                      </ConfirmSubmitButton>
                    ) : (
                      <button
                        type="submit"
                        className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
                        style={{
                          letterSpacing: "0.05em",
                          boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                        }}
                      >
                        {`Start ${g.label}`}
                      </button>
                    )}
                  </form>
                ))}
              </div>
            )}

            {!session.ends_at && (
              <form
                action={startDisposableCamera}
                className="flex flex-wrap gap-2 items-stretch border border-dashed border-ink/30 p-2"
              >
                <span
                  className="font-display font-semibold text-xs uppercase text-ink/60 self-center px-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Disposable Camera
                </span>
                <label className="flex items-center gap-1 font-body text-xs text-ink/60">
                  Photos
                  <input
                    type="number"
                    name="photosPerPlayer"
                    min={1}
                    max={50}
                    defaultValue={DEFAULT_DISPOSABLE_CAMERA_CONFIG.photosPerPlayer}
                    className="border-2 border-ink px-1 py-0.5 w-16 font-body text-sm"
                  />
                </label>
                <label className="flex items-center gap-1 font-body text-xs text-ink/60">
                  Camera
                  <select
                    name="cameraDirection"
                    defaultValue={DEFAULT_DISPOSABLE_CAMERA_CONFIG.cameraDirection}
                    className="border-2 border-ink px-1 py-0.5 font-body text-sm"
                  >
                    <option value="either">Either</option>
                    <option value="front">Front (selfie)</option>
                    <option value="back">Back (room)</option>
                  </select>
                </label>
                <label className="flex items-center gap-1 font-body text-xs text-ink/60">
                  Votes
                  <input
                    type="number"
                    name="votesPerPlayer"
                    min={1}
                    max={20}
                    defaultValue={DEFAULT_DISPOSABLE_CAMERA_CONFIG.votesPerPlayer}
                    className="border-2 border-ink px-1 py-0.5 w-16 font-body text-sm"
                  />
                </label>
                <HostPicker staffUsers={staffUsers} currentUserId={currentUser?.id ?? null} />
                {game ? (
                  <ConfirmSubmitButton
                    className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
                    style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
                    title="Switch game?"
                    body="This ends the current game (scores saved) and starts Disposable Camera."
                    confirmLabel="Switch"
                  >
                    Switch to Disposable Camera
                  </ConfirmSubmitButton>
                ) : (
                  <button
                    type="submit"
                    className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
                    style={{
                      letterSpacing: "0.05em",
                      boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                    }}
                  >
                    Start Disposable Camera
                  </button>
                )}
              </form>
            )}

            {!session.ends_at && (
              <form
                action={startQuizRound}
                className="flex flex-wrap gap-2 items-stretch border border-dashed border-ink/30 p-2"
              >
                <span
                  className="font-display font-semibold text-xs uppercase text-ink/60 self-center px-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Quiz Round
                </span>
                <select
                  name="packageId"
                  required
                  className="border-2 border-ink px-2 py-1 font-body text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Pick a package…
                  </option>
                  {quizPackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ·{" "}
                      {((p.content as { questions?: unknown[] }).questions?.length) ?? 0}q
                    </option>
                  ))}
                </select>
                <HostPicker staffUsers={staffUsers} currentUserId={currentUser?.id ?? null} />
                {game ? (
                  <ConfirmSubmitButton
                    disabled={quizPackages.length === 0}
                    className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5 disabled:opacity-50"
                    style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
                    title="Switch game?"
                    body="This ends the current game (scores saved) and starts the Quiz Round."
                    confirmLabel="Switch"
                  >
                    Switch to Quiz Round
                  </ConfirmSubmitButton>
                ) : (
                  <button
                    type="submit"
                    disabled={quizPackages.length === 0}
                    className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5 disabled:opacity-50"
                    style={{
                      letterSpacing: "0.05em",
                      boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                    }}
                  >
                    Start Quiz Round
                  </button>
                )}
                <Link
                  href="/host"
                  className="font-display font-semibold text-xs uppercase text-ink/60 hover:text-ink self-center px-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Host →
                </Link>
              </form>
            )}

            {!session.ends_at && (
              <form
                action={startSimpleGame}
                className="flex flex-wrap gap-2 items-stretch border border-dashed border-ink/30 p-2"
              >
                <input type="hidden" name="type" value="karaoke-queue" />
                <span
                  className="font-display font-semibold text-xs uppercase text-ink/60 self-center px-1"
                  style={{ letterSpacing: "0.05em" }}
                >
                  Karaoke Queue
                </span>
                <HostPicker staffUsers={staffUsers} currentUserId={currentUser?.id ?? null} />
                {game ? (
                  <ConfirmSubmitButton
                    className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
                    style={{ letterSpacing: "0.05em", boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)" }}
                    title="Switch game?"
                    body="This ends the current game (scores saved) and starts the Karaoke Queue."
                    confirmLabel="Switch"
                  >
                    Switch to Karaoke Queue
                  </ConfirmSubmitButton>
                ) : (
                  <button
                    type="submit"
                    className="bg-yellow text-ink font-display font-bold uppercase px-4 py-2 border-2 border-ink transition hover:translate-y-0.5"
                    style={{
                      letterSpacing: "0.05em",
                      boxShadow: "0 8px 2px rgba(13, 9, 5, 0.18)",
                    }}
                  >
                    Start Karaoke Queue
                  </button>
                )}
              </form>
            )}

            {game && (
              <form action={endActiveGame}>
                <ConfirmSubmitButton
                  className="border-2 border-red text-red font-display font-bold uppercase px-4 py-2 transition hover:bg-red hover:text-cream"
                  style={{ letterSpacing: "0.05em" }}
                  title="End game?"
                  body="Finalizes scores and stops the current game."
                  confirmLabel="End game"
                >
                  End game
                </ConfirmSubmitButton>
              </form>
            )}
          </div>
        </div>

        <h2
          className="font-display font-semibold text-sm uppercase mb-4"
          style={{ letterSpacing: "0.05em" }}
        >
          Players ({players.length})
        </h2>
        <AttendeeList sessionId={session.id} initial={players} />
      </section>
    </main>
  );
}

// Host picker for host-driven game start forms. Lists signed-in staff (locked
// to a user_id); preselects the acting user when they're in the list, with a
// "Me / default" first option that falls back to the acting admin server-side.
function HostPicker({
  staffUsers,
  currentUserId,
}: {
  staffUsers: { user_id: string; name: string | null; email: string }[];
  currentUserId: string | null;
}) {
  const selfIsStaff = currentUserId !== null && staffUsers.some((s) => s.user_id === currentUserId);
  return (
    <label className="flex items-center gap-1 font-body text-xs text-ink/60">
      Host
      <select
        name="hostId"
        defaultValue={selfIsStaff ? (currentUserId as string) : ""}
        className="border-2 border-ink px-1 py-0.5 font-body text-sm max-w-[10rem]"
      >
        <option value="">Me / default</option>
        {staffUsers.map((s) => (
          <option key={s.user_id} value={s.user_id}>
            {s.name || s.email}
          </option>
        ))}
      </select>
    </label>
  );
}
