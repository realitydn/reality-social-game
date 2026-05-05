import { getCloudflareContext } from "@opennextjs/cloudflare";

// Notify all WebSocket subscribers of a session that something changed. The
// payload is intentionally light — clients refetch /api/sessions/[id]/state
// rather than trusting the broadcast to carry data. Best-effort: failures
// don't block the action that triggered the broadcast.
export async function notifySession(sessionId: string, kind: string): Promise<void> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const id = env.SESSION_ROOM.idFromName(sessionId);
    const stub = env.SESSION_ROOM.get(id);
    await stub.fetch("https://internal/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, at: Date.now() }),
    });
  } catch {
    // Realtime is a hint; polling keeps clients fresh if the DO is unreachable.
  }
}
