/// <reference types="@cloudflare/workers-types" />

// Augment the global CloudflareEnv interface declared by @opennextjs/cloudflare
// with this app's specific bindings (declared in wrangler.jsonc).
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    // AVATARS: R2Bucket;  // uncomment after enabling R2 + creating the bucket
  }
}

export {};
