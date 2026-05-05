import { headers } from "next/headers";

// Resolve the deployed base URL by reading request headers (proxy-aware), with an
// APP_URL env var as a fallback for places where headers aren't available.
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.APP_URL ?? "http://localhost:3000";
}
