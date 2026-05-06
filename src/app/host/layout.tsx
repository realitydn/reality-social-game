import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// Soft sign-in gate. No allowlist — any signed-in user can author packages.
// Per the obscurity-only stance for v1; tighten later if abuse shows up.
export default async function HostLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return <>{children}</>;
}
