/// <reference types="@cloudflare/workers-types" />

// SessionRoom is a single-purpose Durable Object: one instance per game session,
// holding nothing but the set of currently-connected client WebSockets, used as
// a fan-out hub.
//
// We deliberately keep it stateless beyond the connection set — the source of
// truth stays in D1, and clients fetch fresh state from /api/sessions/[id]/state
// when they receive a ping. The DO is just a notification channel; replacing it
// or losing it costs us nothing more than a brief reconnect.
export class SessionRoom implements DurableObject {
  private state: DurableObjectState;
  private sockets = new Set<WebSocket>();

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
      server.accept();
      this.sockets.add(server);

      const cleanup = () => {
        this.sockets.delete(server);
      };
      server.addEventListener("close", cleanup);
      server.addEventListener("error", cleanup);

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/broadcast" && req.method === "POST") {
      const body = await req.text();
      const dead: WebSocket[] = [];
      for (const ws of this.sockets) {
        try {
          ws.send(body);
        } catch {
          dead.push(ws);
        }
      }
      for (const ws of dead) this.sockets.delete(ws);
      return new Response(null, { status: 204 });
    }

    return new Response("Not found", { status: 404 });
  }
}
