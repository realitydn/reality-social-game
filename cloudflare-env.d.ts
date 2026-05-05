/// <reference types="@cloudflare/workers-types" />

import type { SessionRoom } from "./src/durable-objects/session-room";

// Augment the global CloudflareEnv interface declared by @opennextjs/cloudflare
// with this app's specific bindings (declared in wrangler.jsonc).
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    SESSION_ROOM: DurableObjectNamespace<SessionRoom>;
    // AVATARS: R2Bucket;  // uncomment after enabling R2 + creating the bucket
  }
}

export {};
