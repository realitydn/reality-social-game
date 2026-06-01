import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

// Admin-only gate. The /admin console is the unified surface — sessions
// overview, staff + capability management, and (later) REALITY membership /
// perks. Only admins see it; hosts get their own scoped surface at /host and
// run their games from the /session/[id]/manage control desk. This layout
// redirect is UX only — server actions guard themselves (public POST endpoints).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!(await isAdmin(session?.user?.email))) redirect("/");
  return <>{children}</>;
}
