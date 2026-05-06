/// <reference types="@cloudflare/workers-types" />

import type { SessionRoom } from "./src/durable-objects/session-room";

// Augment the global CloudflareEnv interface declared by @opennextjs/cloudflare
// with this app's specific bindings (declared in wrangler.jsonc).
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    SESSION_ROOM: DurableObjectNamespace<SessionRoom>;
    PHOTOS: R2Bucket;
    // Public base URL of the PHOTOS bucket (e.g. https://photos.realitydn.com).
    // Set with `wrangler secret put PHOTOS_BASE_URL` in production.
    PHOTOS_BASE_URL?: string;
  }
}

export {};
