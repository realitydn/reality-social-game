/// <reference types="@cloudflare/workers-types" />

// Custom Worker entry. Wraps the OpenNext-built Next.js worker and exposes the
// SessionRoom Durable Object alongside it. We intercept WebSocket-upgrade
// requests for /api/sessions/<id>/ws here (Next.js can't return a 101 with a
// `webSocket` field cleanly), and forward everything else to OpenNext.
//
// `opennextjs-cloudflare build` writes ./.open-next/worker.js — that file is
// generated, not committed. The dynamic import below works at runtime because
// wrangler bundles relative-path modules.

// @ts-expect-error generated at build time by opennextjs-cloudflare build
import nextHandler from "./.open-next/worker.js";

export { SessionRoom } from "./src/durable-objects/session-room";

const WS_ROUTE = /^\/api\/sessions\/([^/]+)\/ws$/;

export default {
  async fetch(req: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(WS_ROUTE);
    if (m) {
      const sessionId = m[1];
      const id = env.SESSION_ROOM.idFromName(sessionId);
      const stub = env.SESSION_ROOM.get(id);
      const forward = new URL("/connect", url.origin);
      return stub.fetch(forward.toString(), req);
    }
    return (nextHandler as ExportedHandler<CloudflareEnv>).fetch!(req, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;
