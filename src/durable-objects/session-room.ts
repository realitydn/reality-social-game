/// <reference types="@cloudflare/workers-types" />

// SessionRoom is a single-purpose Durable Object: one instance per game session,
// a fan-out hub that pings connected clients when something changes. The source
// of truth stays in D1 — clients refetch /api/sessions/[id]/state on each ping —
// so losing or replacing the DO costs nothing more than a brief reconnect.
//
// We use the WebSocket Hibernation API (acceptWebSocket / getWebSockets) rather
// than holding sockets in an in-memory Set. The runtime owns the socket set and
// can evict this DO from memory while a room is idle, so a quiet bar night costs
// nothing — instead of billing wall-clock for every hour dozens of phones stay
// connected — and the connections survive hibernation.
export class SessionRoom implements DurableObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/connect") {
      const upgrade = req.headers.get("Upgrade");
      if (upgrade?.toLowerCase() !== "websocket") {
        return new Response("Expected websocket upgrade", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
      // Hand the server side to the runtime; it persists across hibernation.
      this.state.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/broadcast" && req.method === "POST") {
      const body = await req.text();
      for (const ws of this.state.getWebSockets()) {
        try {
          ws.send(body);
        } catch {
          // Dead socket; the runtime reaps it from getWebSockets() on close.
        }
      }
      return new Response(null, { status: 204 });
    }

    return new Response("Not found", { status: 404 });
  }

  // Clients never send messages — the room is a one-way fan-out — but the
  // handler must exist so an unexpected inbound frame doesn't error the
  // hibernating object. We simply ignore it.
  async webSocketMessage(): Promise<void> {}
}
